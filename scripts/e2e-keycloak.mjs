// Ponta a ponta com Keycloak real + Mailpit + API do AQR (ver docs/login-keycloak.md).
// Uso: node scripts/e2e-keycloak.mjs <original.pdf> <revisado.pdf>
// Pré-requisitos: docker compose -f docker/compose.yml up -d; API em PORT=3100 com AUTH_MODE=keycloak,
// KEYCLOAK_ADMIN_CLIENT_ID=aqr-admin KEYCLOAK_ADMIN_CLIENT_SECRET=aqr-admin-dev-secret e banco novo
// com o administrador "admin" (npm run admin:criar). Só para desenvolvimento local.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const API = 'http://127.0.0.1:3100'
const APP = 'http://localhost:5173'
const KC = 'http://localhost:8080'
const MAIL = 'http://localhost:8025'
const results = []
const check = (name, ok, extra = '') => {
  results.push(ok)
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${name}${extra ? ` — ${extra}` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const form = (data) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data) })
const formAction = (html) => html.match(/action="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')

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
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
  }
}

/** Um navegador mínimo: um jar de cookies por servidor (Keycloak e API). */
function browser() {
  const jars = { kc: new Jar(), api: new Jar() }
  const hop = async (url, init = {}) => {
    const jar = new URL(url).port === '8080' ? jars.kc : jars.api
    const res = await fetch(url, { ...init, redirect: 'manual', headers: { ...(init.headers ?? {}), cookie: jar.header() } })
    jar.store(res)
    return res
  }
  const follow = async (url, init) => {
    let res = await hop(url, init)
    while (res.status >= 300 && res.status < 400) {
      const next = new URL(res.headers.get('location'), url).href
      if (next.startsWith(APP)) return { res, final: next }
      res = await hop(next)
    }
    return { res, final: url }
  }
  return { jars, hop, follow }
}

async function login(username, password, returnTo = '%2Fadministracao%2Fcontas') {
  const b = browser()
  const start = await b.hop(`${API}/api/auth/login?returnTo=${returnTo}`)
  const page = await b.follow(start.headers.get('location'))
  const action = formAction(await page.res.text())
  if (!action) return { api: b.jars.api, final: 'sem-formulario' }
  const sent = await b.hop(action, form({ username, password, credentialId: '' }))
  if (sent.status === 200) return { api: b.jars.api, final: 'rejeitado-pelo-keycloak' }
  let url = sent.headers.get('location')
  while (url) {
    const target = url.startsWith(APP) ? url.replace(APP, API) : url
    if (url.startsWith(APP) && !url.startsWith(`${APP}/api`)) return { api: b.jars.api, final: url }
    const res = await b.hop(target)
    url = res.headers.get('location') ? new URL(res.headers.get('location'), target).href : null
    if (!url) return { api: b.jars.api, final: `status-${res.status}` }
  }
  return { api: b.jars.api, final: 'fim' }
}

const call = (jar, method, path, extra = {}) =>
  fetch(`${API}${path}`, { method, headers: { cookie: jar.header(), origin: APP, ...(extra.headers ?? {}) }, body: extra.body, redirect: 'manual' })
const json = (jar, method, path, data) =>
  call(jar, method, path, { headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })

// ---- Mailpit ----
async function waitForMail(to, since) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/messages`)).json()
    const found = (list.messages ?? []).find((m) => m.To.some((t) => t.Address === to) && new Date(m.Created).getTime() >= since)
    if (found) return (await (await fetch(`${MAIL}/api/v1/message/${found.ID}`)).json()).Text
    await sleep(500)
  }
  return null
}
const linkOf = (text) => text?.match(/https?:\/\/\S*action-token\S*/)?.[0]

/** Abre o link do e-mail e define a senha, como a pessoa faria. */
async function setPasswordFromLink(link, password) {
  const b = browser()
  let { res } = await b.follow(link)
  let html = await res.text()
  const proceed = html.match(/href="([^"]*action-token[^"]*)"/)?.[1]?.replaceAll('&amp;', '&')
  if (!html.includes('password-new') && proceed) html = await (await b.follow(new URL(proceed, KC).href)).res.text()
  if (!html.includes('password-new')) return false
  const sent = await b.hop(formAction(html), form({ 'password-new': password, 'password-confirm': password }))
  return sent.status < 500
}

// ---- API Admin do Keycloak (só para conferir o resultado) ----
async function kcAdmin(path) {
  const t = await fetch(`${KC}/realms/master/protocol/openid-connect/token`, form({ grant_type: 'password', client_id: 'admin-cli', username: 'admin', password: 'admin' }))
  const { access_token: token } = await t.json()
  return (await fetch(`${KC}/admin/realms/aqr/${path}`, { headers: { authorization: `Bearer ${token}` } })).json()
}

// ============ 1. Recuperação de senha pelo "Esqueceu a senha?" ============
{
  const b = browser()
  const t0 = Date.now()
  const start = await b.hop(`${API}/api/auth/login`)
  const page = await b.follow(start.headers.get('location'))
  const forgot = (await page.res.text()).match(/href="([^"]*reset-credentials[^"]*)"/)?.[1]?.replaceAll('&amp;', '&')
  check('tela do Keycloak oferece "Esqueceu a senha?"', Boolean(forgot))
  const askPage = await b.follow(new URL(forgot, KC).href)
  await b.hop(formAction(await askPage.res.text()), form({ username: 'recuperacao' }))
  const link = linkOf(await waitForMail('recuperacao@aqr.local', t0))
  check('e-mail de recuperação chega ao Mailpit', Boolean(link))
  check('nova senha definida pelo link', link && (await setPasswordFromLink(link, 'NovaSenha-dev-456')))
  check('senha antiga deixa de valer', (await login('recuperacao', 'recuperacao-dev-123')).final === 'rejeitado-pelo-keycloak')
  check('nova senha autentica (sem conta no AQR → bloqueado)', (await login('recuperacao', 'NovaSenha-dev-456')).final.includes('erro=sem_conta'))
  // devolve a senha original para a próxima execução
  const t = await fetch(`${KC}/realms/master/protocol/openid-connect/token`, form({ grant_type: 'password', client_id: 'admin-cli', username: 'admin', password: 'admin' }))
  const auth = { authorization: `Bearer ${(await t.json()).access_token}` }
  const [u] = await (await fetch(`${KC}/admin/realms/aqr/users?username=recuperacao&exact=true`, { headers: auth })).json()
  await fetch(`${KC}/admin/realms/aqr/users/${u.id}/reset-password`, { method: 'PUT', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'password', value: 'recuperacao-dev-123', temporary: false }) })
}

// ============ 2. Acesso sem login e login errado ============
check('sem sessão: /api/auth/me = 401', (await fetch(`${API}/api/auth/me`)).status === 401)
const wrong = await login('admin', 'senha-errada')
check('senha errada: Keycloak rejeita, sem sessão', wrong.final === 'rejeitado-pelo-keycloak' && !wrong.api.cookies.has('aqr_sessao'))
check('autenticado sem conta no AQR: bloqueado', (await login('semconta', 'semconta-dev-123')).final.includes('erro=sem_conta'))

// ============ 3. Administrador ============
const admin = await login('admin', 'admin-dev-123')
check('admin entra e volta à página pedida', admin.final === `${APP}/administracao/contas` && admin.api.cookies.has('aqr_sessao'), admin.final)
const me = await (await call(admin.api, 'GET', '/api/auth/me')).json()
check('/api/auth/me = administrador', me.papel === 'administrador')
check('cookie de sessão é opaco (não é JWT)', !admin.api.cookies.get('aqr_sessao').includes('.'))

// ============ 4. Admin cria o analista: nasce no Keycloak e recebe convite ============
const noEmail = await json(admin.api, 'POST', '/api/admin/accounts', { usuario: 'ana', nome: 'Ana Analista', email: null, papel: 'analista' })
check('criar conta sem e-mail é recusado (o convite precisa dele)', noEmail.status === 400)
check('usuário ainda não existe no Keycloak', (await kcAdmin('users?username=ana&exact=true')).length === 0)

const t1 = Date.now()
const created = await json(admin.api, 'POST', '/api/admin/accounts', { usuario: 'ana', nome: 'Ana Analista', email: 'ana@aqr.local', papel: 'analista' })
const ana = await created.json()
check('admin cria a conta "ana"', created.status === 201 && !ana.aviso, `status ${created.status} ${ana.aviso ?? ''}`)
const [kcAna] = await kcAdmin('users?username=ana&exact=true')
check('usuário nasce no Keycloak (ativo, com nome e e-mail, sem senha)', kcAna?.enabled === true && kcAna.email === 'ana@aqr.local' && kcAna.firstName === 'Ana' && kcAna.lastName === 'Analista')
check('antes de definir a senha, "ana" não consegue entrar', (await login('ana', 'qualquer-coisa')).final === 'rejeitado-pelo-keycloak')

// ============ 5. Convite por e-mail: a pessoa define a própria senha ============
const invite = await waitForMail('ana@aqr.local', t1)
const inviteLink = linkOf(invite)
check('convite chega ao Mailpit com link para definir a senha', Boolean(inviteLink))
check('ana define a senha pelo link', inviteLink && (await setPasswordFromLink(inviteLink, 'Ana-dev-123')))
const analyst = await login('ana', 'Ana-dev-123')
check('ana entra com a senha que ela definiu', analyst.api.cookies.has('aqr_sessao'), analyst.final)
check('analista não administra contas (403)', (await call(analyst.api, 'GET', '/api/admin/accounts')).status === 403)
check('analista não provisiona acessos (403)', (await call(analyst.api, 'POST', `/api/admin/accounts/${ana.id}/redefinir-senha`)).status === 403)

// ============ 6. Comparação dos dois PDFs ============
const [p1, p2] = process.argv.slice(2)
const mkForm = () => {
  const f = new FormData()
  f.append('original', new Blob([readFileSync(p1)], { type: 'application/pdf' }), basename(p1))
  f.append('updated', new Blob([readFileSync(p2)], { type: 'application/pdf' }), basename(p2))
  return f
}
check('comparação sem login = 401', (await fetch(`${API}/api/comparisons`, { method: 'POST', headers: { origin: APP }, body: mkForm() })).status === 401)
const sent = await call(analyst.api, 'POST', '/api/comparisons', { body: mkForm() })
const job = await sent.json()
let state = job
for (let i = 0; i < 60 && state.status !== 'completed' && state.status !== 'failed'; i++) {
  await sleep(1000)
  state = await (await call(analyst.api, 'GET', `/api/comparisons/${job.id}`)).json()
}
const diffs = state.result?.differences?.length
check('analista compara os dois PDFs', state.status === 'completed' && diffs > 0, `diferenças=${diffs}`)

// ============ 7. Bloqueio, reativação e redefinição pelo administrador ============
const off = await json(admin.api, 'POST', `/api/admin/accounts/${ana.id}/desativar`, { versao: ana.versao })
const offBody = await off.json()
check('admin desativa "ana"', off.status === 200 && !offBody.aviso, offBody.aviso ?? '')
check('usuário bloqueado no Keycloak (enabled=false)', (await kcAdmin('users?username=ana&exact=true'))[0]?.enabled === false)
check('sessão do analista cai na hora (401)', (await call(analyst.api, 'GET', '/api/auth/me')).status === 401)
check('login bloqueado no Keycloak mesmo com a senha certa', (await login('ana', 'Ana-dev-123')).final === 'rejeitado-pelo-keycloak')
check('redefinir senha de conta desativada é recusado (422)', (await call(admin.api, 'POST', `/api/admin/accounts/${ana.id}/redefinir-senha`)).status === 422)

const on = await json(admin.api, 'POST', `/api/admin/accounts/${ana.id}/reativar`, { versao: offBody.versao })
const onBody = await on.json()
check('admin reativa "ana"', on.status === 200 && !onBody.aviso)
check('usuário reativado no Keycloak', (await kcAdmin('users?username=ana&exact=true'))[0]?.enabled === true)
check('ana volta a entrar com a mesma senha', (await login('ana', 'Ana-dev-123')).api.cookies.has('aqr_sessao'))

const t2 = Date.now()
const reset = await call(admin.api, 'POST', `/api/admin/accounts/${ana.id}/redefinir-senha`)
check('admin pede redefinição de senha (204)', reset.status === 204)
const resetLink = linkOf(await waitForMail('ana@aqr.local', t2))
check('e-mail de redefinição chega ao Mailpit', Boolean(resetLink))
check('ana define a nova senha', resetLink && (await setPasswordFromLink(resetLink, 'Ana-nova-456')))
check('senha antiga deixa de valer', (await login('ana', 'Ana-dev-123')).final === 'rejeitado-pelo-keycloak')
check('nova senha funciona', (await login('ana', 'Ana-nova-456')).api.cookies.has('aqr_sessao'))

// ============ 8. Sincronização e logout ============
const sync = await call(admin.api, 'POST', `/api/admin/accounts/${ana.id}/sincronizar`)
check('sincronizar com o Keycloak (200)', sync.status === 200)
const out = await call(admin.api, 'POST', '/api/auth/logout')
check('logout devolve a URL de encerramento do Keycloak', (await out.json()).logoutUrl?.includes('id_token_hint='))
check('depois do logout a sessão não vale', (await call(admin.api, 'GET', '/api/auth/me')).status === 401)

console.log(results.every(Boolean) ? 'TUDO OK' : 'HÁ FALHAS')
process.exit(results.every(Boolean) ? 0 : 1)
