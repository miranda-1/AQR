// Fluxo real: Keycloak 26.8.0 + API do AQR. Uso: node live-e2e.mjs <pdf1> <pdf2>
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const API = 'http://127.0.0.1:3100'
const APP = 'http://localhost:5173'
const results = []
const check = (name, ok, extra = '') => {
  results.push(ok)
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${name}${extra ? ` — ${extra}` : ''}`)
}

class Jar {
  cookies = new Map()
  store(res) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';')
      const i = pair.indexOf('=')
      const k = pair.slice(0, i), v = pair.slice(i + 1)
      if (v === '' || /Max-Age=0/i.test(c)) this.cookies.delete(k)
      else this.cookies.set(k, v)
    }
  }
  header(url) {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
  }
}

// Um jar por domínio (Keycloak e API ficam em hosts diferentes).
async function browserLogin(username, password) {
  const kc = new Jar(), api = new Jar()
  const hop = async (url, init = {}) => {
    const u = new URL(url)
    const jar = u.port === '8080' ? kc : api
    const res = await fetch(url, { ...init, redirect: 'manual', headers: { ...(init.headers ?? {}), cookie: jar.header() } })
    jar.store(res)
    return res
  }
  let res = await hop(`${API}/api/auth/login?returnTo=%2Fadministracao%2Fcontas`)
  let url = res.headers.get('location')
  res = await hop(url)
  const html = await res.text()
  const action = html.match(/action="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')
  if (!action) return { api, final: 'sem-formulario', html }
  res = await hop(action, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password, credentialId: '' }),
  })
  if (res.status === 200) return { api, final: 'rejeitado-pelo-keycloak' }
  url = res.headers.get('location')
  while (url) {
    // O callback aponta para o site (5173); o proxy do Vite o levaria à API.
    const target = url.startsWith(APP) ? url.replace(APP, API) : url
    if (target.startsWith(`${API}/entrar`) || target.startsWith(APP)) return { api, final: url }
    res = await hop(target)
    url = res.headers.get('location')
    if (!url) return { api, final: `status-${res.status}` }
    if (url.startsWith(APP) && !url.startsWith(`${APP}/api`)) return { api, final: url }
  }
  return { api, final: 'fim' }
}

const call = (jar, method, path, extra = {}) =>
  fetch(`${API}${path}`, { method, headers: { cookie: jar.header(), origin: APP, ...(extra.headers ?? {}) }, body: extra.body, redirect: 'manual' })

// Recuperação de senha: "Esqueceu a senha?" do Keycloak + e-mail no Mailpit (http://localhost:8025).
const KC = 'http://localhost:8080'
const MAIL = 'http://localhost:8025'
async function resetPasswordByEmail(username, newPassword) {
  const jar = new Jar()
  const hop = async (url, init = {}) => {
    const res = await fetch(url, { ...init, redirect: 'manual', headers: { ...(init.headers ?? {}), cookie: jar.header() } })
    jar.store(res)
    return res
  }
  const follow = async (url) => {
    let res = await hop(url)
    while (res.status >= 300 && res.status < 400) res = await hop(new URL(res.headers.get('location'), url).href)
    return res
  }
  const formAction = (html) => html.match(/action="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')
  await fetch(`${MAIL}/api/v1/messages`, { method: 'DELETE' })
  let res = await hop(`${API}/api/auth/login`)
  res = await follow(res.headers.get('location'))
  let html = await res.text()
  const forgot = html.match(/href="([^"]*reset-credentials[^"]*)"/)?.[1]?.replaceAll('&amp;', '&')
  if (!forgot) return 'sem-link-esqueci-a-senha'
  res = await follow(new URL(forgot, KC).href)
  html = await res.text()
  res = await hop(formAction(html), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username }) })
  let link
  for (let i = 0; i < 20 && !link; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const list = await (await fetch(`${MAIL}/api/v1/messages`)).json()
    const id = list.messages?.[0]?.ID
    if (id) link = (await (await fetch(`${MAIL}/api/v1/message/${id}`)).json()).Text.match(/https?:\/\/\S*action-token\S*/)?.[0]
  }
  if (!link) return 'email-nao-chegou'
  res = await follow(link)
  html = await res.text()
  const proceed = html.match(/href="([^"]*action-token[^"]*)"/)?.[1]?.replaceAll('&amp;', '&')
  if (!html.includes('password-new') && proceed) html = await (await follow(new URL(proceed, KC).href)).text()
  if (!html.includes('password-new')) return 'sem-formulario-de-nova-senha'
  res = await hop(formAction(html), {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 'password-new': newPassword, 'password-confirm': newPassword }),
  })
  return res.status < 500 ? 'ok' : `status-${res.status}`
}
// Volta a senha do usuário de recuperação ao valor do realm (para o script poder rodar de novo).
async function restorePassword(username, password) {
  const tokenRes = await fetch(`${KC}/realms/master/protocol/openid-connect/token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: 'admin', password: 'admin' }),
  })
  const { access_token: token } = await tokenRes.json()
  const auth = { authorization: `Bearer ${token}` }
  const [user] = await (await fetch(`${KC}/admin/realms/aqr/users?username=${username}&exact=true`, { headers: auth })).json()
  await fetch(`${KC}/admin/realms/aqr/users/${user.id}/reset-password`, {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'password', value: password, temporary: false }),
  })
}
await restorePassword('recuperacao', 'recuperacao-dev-123')
const resetStep = await resetPasswordByEmail('recuperacao', 'NovaSenha-dev-456')
check('recuperação de senha: e-mail chega ao Mailpit e a nova senha é aceita', resetStep === 'ok', resetStep)
check('após recuperar, a senha antiga deixa de valer', (await browserLogin('recuperacao', 'recuperacao-dev-123')).final === 'rejeitado-pelo-keycloak')
const afterReset = await browserLogin('recuperacao', 'NovaSenha-dev-456')
check('após recuperar, a nova senha autentica no Keycloak (sem conta no AQR → bloqueado)', afterReset.final.includes('erro=sem_conta'), afterReset.final)
await restorePassword('recuperacao', 'recuperacao-dev-123')

// 1. sem login
check('sem sessão: /api/auth/me = 401', (await fetch(`${API}/api/auth/me`)).status === 401)

// 2. login errado
const wrong = await browserLogin('admin', 'senha-errada')
check('senha errada: Keycloak rejeita, sem sessão', wrong.final === 'rejeitado-pelo-keycloak' && !wrong.api.cookies.has('aqr_sessao'), wrong.final)

// 3. login correto, mas sem conta no AQR
const ghost = await browserLogin('semconta', 'semconta-dev-123')
check('autenticado no Keycloak sem conta no AQR: bloqueado', ghost.final.includes('erro=sem_conta') && !ghost.api.cookies.has('aqr_sessao'), ghost.final)

// 4. admin
const admin = await browserLogin('admin', 'admin-dev-123')
check('admin entra e volta para a página pedida', admin.final === `${APP}/administracao/contas` && admin.api.cookies.has('aqr_sessao'), admin.final)
const me = await (await call(admin.api, 'GET', '/api/auth/me')).json()
check('/api/auth/me = administrador', me.papel === 'administrador', JSON.stringify(me))
const cookieValue = admin.api.cookies.get('aqr_sessao')
check('cookie de sessão é opaco (não é JWT)', !cookieValue.includes('.') && cookieValue.length >= 40)

// 5. cria analista
const created = await call(admin.api, 'POST', '/api/admin/accounts', {
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ usuario: 'ana', nome: 'Ana Analista', email: null, papel: 'analista' }),
})
const ana = await created.json()
check('admin cria o analista "ana"', created.status === 201, `status ${created.status}`)

// 6. analista: permissão
const analyst = await browserLogin('ana', 'ana-dev-123')
check('analista entra', analyst.api.cookies.has('aqr_sessao'), analyst.final)
check('analista não administra contas (403)', (await call(analyst.api, 'GET', '/api/admin/accounts')).status === 403)

// 7. comparação com os dois PDFs, como analista
const form = new FormData()
const [p1, p2] = process.argv.slice(2)
form.append('original', new Blob([readFileSync(p1)], { type: 'application/pdf' }), basename(p1))
form.append('updated', new Blob([readFileSync(p2)], { type: 'application/pdf' }), basename(p2))
const noAuth = await fetch(`${API}/api/comparisons`, { method: 'POST', headers: { origin: APP }, body: form })
check('comparação sem login = 401', noAuth.status === 401)
const sent = await call(analyst.api, 'POST', '/api/comparisons', { body: form })
const job = await sent.json()
check('analista envia os PDFs', sent.status === 202 || sent.status === 201, `status ${sent.status}`)
let state = job
for (let i = 0; i < 60 && state.status !== 'completed' && state.status !== 'failed'; i++) {
  await new Promise((r) => setTimeout(r, 1000))
  state = await (await call(analyst.api, 'GET', `/api/comparisons/${job.id}`)).json()
}
const diffs = state.result?.differences?.length ?? state.result?.summary?.total
check('comparação concluída com diferenças', state.status === 'completed' && diffs > 0, `status=${state.status} diferenças=${diffs}`)

// 8. desativação imediata
const off = await call(admin.api, 'POST', `/api/admin/accounts/${ana.id}/desativar`, {
  headers: { 'content-type': 'application/json' }, body: JSON.stringify({ versao: ana.versao }),
})
check('admin desativa "ana"', off.status === 200)
check('sessão do analista cai na hora (401)', (await call(analyst.api, 'GET', '/api/auth/me')).status === 401)
const again = await browserLogin('ana', 'ana-dev-123')
check('login da conta desativada é bloqueado', again.final.includes('erro=conta_inativa'), again.final)

// 9. logout
const out = await call(admin.api, 'POST', '/api/auth/logout')
const { logoutUrl } = await out.json()
check('logout devolve URL do Keycloak', typeof logoutUrl === 'string' && logoutUrl.includes('id_token_hint='))
check('depois do logout a sessão não vale', (await call(admin.api, 'GET', '/api/auth/me')).status === 401)

console.log(results.every(Boolean) ? 'TUDO OK' : 'HÁ FALHAS')
process.exit(results.every(Boolean) ? 0 : 1)
