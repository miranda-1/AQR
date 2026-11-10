// Ponta a ponta com Keycloak real + Mailpit + API do AQR (ver docs/login-keycloak.md).
// Uso: node scripts/e2e-keycloak.mjs <original.pdf> <revisado.pdf>
// Pré-requisitos: docker compose -f docker/dev/compose.yml up -d; API em PORT=3100 com as variáveis de
// docker/dev/aqr-login.env (Keycloak, SMTP do Mailpit) e AUTH_LOGIN_ATTEMPTS_PER_MINUTE=1000
// (o script faz dezenas de logins por minuto do mesmo IP; o padrão é 30) e banco novo
// com o administrador "admin" criado SEM o login real (npm run admin:criar sem AUTH_MODE, portanto sem vínculo)
// e as MESMAS variáveis exportadas neste terminal (o script chama admin:vincular). Só para desenvolvimento local.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
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

/** Entra pela tela do AQR, como o navegador faria: `final` é "ok" ou o código de erro da API. */
async function login(username, password, b = browser()) {
  const res = await b.hop(`${API}/api/auth/entrar`, {
    method: 'POST',
    headers: { origin: APP, 'content-type': 'application/json' },
    body: JSON.stringify({ usuario: username, senha: password }),
  })
  const body = await res.json().catch(() => null)
  return { b, api: b.jars.api, final: res.ok ? 'ok' : (body?.error?.code ?? `status-${res.status}`), body }
}

const call = (jar, method, path, extra = {}) =>
  fetch(`${API}${path}`, { method, headers: { cookie: jar.header(), origin: APP, ...(extra.headers ?? {}) }, body: extra.body, redirect: 'manual' })
const json = (jar, method, path, data) =>
  call(jar, method, path, { headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })

// ---- Mailpit ----
async function waitForMail(to, since, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/messages`)).json()
    const found = (list.messages ?? []).find((m) => m.To.some((t) => t.Address === to) && new Date(m.Created).getTime() >= since)
    if (found) return (await (await fetch(`${MAIL}/api/v1/message/${found.ID}`)).json()).Text
    await sleep(500)
  }
  return null
}
/** O link do e-mail é sempre do AQR (página /definir-senha, código depois do #); nunca do Keycloak. */
const linkOf = (text) => text?.match(/https?:\/\/\S*\/definir-senha#[A-Za-z0-9_-]+/)?.[0]
const postApi = (path, data) => fetch(`${API}${path}`, { method: 'POST', headers: { origin: APP, 'content-type': 'application/json' }, body: JSON.stringify(data) })

/** Abre o link do e-mail e define a senha na página do AQR, como a pessoa faria (a página só chama a API). */
async function setPasswordFromLink(link, password) {
  const codigo = new URL(link).hash.slice(1)
  if (!(await postApi('/api/auth/senha/verificar', { codigo })).ok) return false
  return (await postApi('/api/auth/senha/definir', { codigo, senha: password })).ok
}

// ---- API Admin do Keycloak (só para conferir o resultado) ----
async function kcAdmin(path) {
  const t = await fetch(`${KC}/realms/master/protocol/openid-connect/token`, form({ grant_type: 'password', client_id: 'admin-cli', username: 'admin', password: 'admin' }))
  const { access_token: token } = await t.json()
  return (await fetch(`${KC}/admin/realms/aqr/${path}`, { headers: { authorization: `Bearer ${token}` } })).json()
}

// ============ 1. O Keycloak fica escondido ============
{
  const status = await (await fetch(`${API}/api/auth/status`)).json()
  check('status não expõe endereço do Keycloak', JSON.stringify(status) === '{"mode":"keycloak"}', JSON.stringify(status))
  // "recuperacao" existe no Keycloak, mas não no AQR: a resposta é a mesma e nenhum e-mail sai.
  const t0 = Date.now()
  const asked = await postApi('/api/auth/senha/esqueci', { usuario: 'recuperacao' })
  check('"Esqueceu a senha?" responde igual para quem não tem conta (202)', asked.status === 202)
  check('nenhum e-mail sai para quem não tem conta no AQR', (await waitForMail('recuperacao@aqr.local', t0, 6)) === null)
}

// ============ 2. Acesso sem login e login errado ============
check('sem sessão: /api/auth/me = 401', (await fetch(`${API}/api/auth/me`)).status === 401)
const wrong = await login('admin', 'senha-errada')
check('senha errada: Keycloak rejeita, sem sessão', wrong.final === 'CREDENCIAIS_INVALIDAS' && !wrong.api.cookies.has('aqr_sessao'), wrong.final)
check('autenticado sem conta no AQR: bloqueado', (await login('semconta', 'semconta-dev-123')).final === 'SEM_CONTA')

// ============ 3. Administrador ============
// O primeiro administrador (criado por `npm run admin:criar`) ainda não tem vínculo pelo sub: não entra
// só porque o nome de usuário coincide. O operador o vincula no servidor, conferindo a identidade.
const unlinked = await login('admin', 'admin-dev-123')
check('administrador sem vínculo pelo sub NÃO entra (vinculo_pendente)', unlinked.final === 'VINCULO_PENDENTE' && !unlinked.api.cookies.has('aqr_sessao'), unlinked.final)
const linked = spawnSync('npx', ['tsx', 'server/scripts/vincular-identidade.ts', '--usuario', 'admin', '--confirmo-identidade'], { encoding: 'utf8', env: process.env })
check('operador vincula o administrador ao sub do Keycloak (admin:vincular)', linked.status === 0 && linked.stdout.includes('Vinculada: admin'), (linked.stdout + linked.stderr).trim())
const relinked = spawnSync('npx', ['tsx', 'server/scripts/vincular-identidade.ts', '--usuario', 'admin', '--confirmo-identidade'], { encoding: 'utf8', env: process.env })
check('vincular de novo não faz nada (vínculo definitivo)', relinked.status === 0 && relinked.stdout.includes('Nenhuma conta sem vínculo'))

const admin = await login('admin', 'admin-dev-123')
check('admin entra pela tela do AQR (senha conferida no Keycloak)', admin.final === 'ok' && admin.body?.papel === 'administrador' && admin.api.cookies.has('aqr_sessao'), admin.final)
check('a resposta do login não traz token nem senha', !JSON.stringify(admin.body).match(/token|admin-dev-123/i))
// O cliente do AQR é confidencial: sem o segredo, ninguém troca senha por token direto no Keycloak.
const direct = await fetch(`${KC}/realms/aqr/protocol/openid-connect/token`, form({ grant_type: 'password', client_id: 'aqr-web', username: 'admin', password: 'admin-dev-123' }))
check('direto no Keycloak, sem o segredo do AQR, a senha não vira token', direct.status === 401 || direct.status === 400, `status ${direct.status}`)
check('login vindo de outro site é recusado (403)', (await fetch(`${API}/api/auth/entrar`, { method: 'POST', headers: { origin: 'https://malicioso.example', 'content-type': 'application/json' }, body: JSON.stringify({ usuario: 'admin', senha: 'admin-dev-123' }) })).status === 403)
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
check('antes de definir a senha, "ana" não consegue entrar', (await login('ana', 'qualquer-coisa')).final === 'CREDENCIAIS_INVALIDAS')

// ============ 5. Convite por e-mail: a pessoa define a própria senha ============
const invite = await waitForMail('ana@aqr.local', t1)
const inviteLink = linkOf(invite)
check('convite chega ao Mailpit com link para a página do AQR', Boolean(inviteLink) && inviteLink.startsWith(`${APP}/definir-senha#`))
check('o convite não cita o Keycloak nem leva a ele', !/keycloak|:8080/i.test(invite ?? ''))
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
check('a comparação da ana não aparece para o administrador (404)', (await call(admin.api, 'GET', `/api/comparisons/${job.id}`)).status === 404)
check('entregue, a ana pode descartar o resultado na hora', (await call(analyst.api, 'DELETE', `/api/comparisons/${job.id}`)).status === 204 && (await call(analyst.api, 'GET', `/api/comparisons/${job.id}`)).status === 404)

// ============ 7. Bloqueio, reativação e redefinição pelo administrador ============
const off = await json(admin.api, 'POST', `/api/admin/accounts/${ana.id}/desativar`, { versao: ana.versao })
const offBody = await off.json()
check('admin desativa "ana"', off.status === 200 && !offBody.aviso, offBody.aviso ?? '')
check('usuário bloqueado no Keycloak (enabled=false)', (await kcAdmin('users?username=ana&exact=true'))[0]?.enabled === false)
check('sessão do analista cai na hora (401)', (await call(analyst.api, 'GET', '/api/auth/me')).status === 401)
check('login bloqueado no Keycloak mesmo com a senha certa', (await login('ana', 'Ana-dev-123')).final === 'CREDENCIAIS_INVALIDAS')
check('redefinir senha de conta desativada é recusado (422)', (await call(admin.api, 'POST', `/api/admin/accounts/${ana.id}/redefinir-senha`)).status === 422)

const on = await json(admin.api, 'POST', `/api/admin/accounts/${ana.id}/reativar`, { versao: offBody.versao })
const onBody = await on.json()
check('admin reativa "ana"', on.status === 200 && !onBody.aviso)
check('usuário reativado no Keycloak', (await kcAdmin('users?username=ana&exact=true'))[0]?.enabled === true)
const anaBack = await login('ana', 'Ana-dev-123')
check('ana volta a entrar com a mesma senha', anaBack.api.cookies.has('aqr_sessao'))

const t2 = Date.now()
const reset = await call(admin.api, 'POST', `/api/admin/accounts/${ana.id}/redefinir-senha`)
check('admin pede redefinição de senha (204)', reset.status === 204)
check('redefinição encerra as sessões da ana no AQR (401)', (await call(anaBack.api, 'GET', '/api/auth/me')).status === 401)
check('o administrador segue conectado', (await call(admin.api, 'GET', '/api/auth/me')).status === 200)
const resetLink = linkOf(await waitForMail('ana@aqr.local', t2))
check('e-mail de redefinição chega ao Mailpit', Boolean(resetLink))
check('ana define a nova senha', resetLink && (await setPasswordFromLink(resetLink, 'Ana-nova-456')))
check('senha antiga deixa de valer', (await login('ana', 'Ana-dev-123')).final === 'CREDENCIAIS_INVALIDAS')
check('nova senha funciona', (await login('ana', 'Ana-nova-456')).api.cookies.has('aqr_sessao'))
check('o link de senha vale uma vez só (410)', (await postApi('/api/auth/senha/definir', { codigo: new URL(resetLink).hash.slice(1), senha: 'Outra-senha-999' })).status === 410)

// ============ 7b. A própria pessoa pede nova senha ("Esqueceu a senha?", pelo e-mail) ============
const t3 = Date.now()
check('ana pede link pelo e-mail (202)', (await postApi('/api/auth/senha/esqueci', { usuario: 'ana@aqr.local' })).status === 202)
const forgotLink = linkOf(await waitForMail('ana@aqr.local', t3))
check('e-mail de nova senha chega com link do AQR', Boolean(forgotLink))
check('ana define a senha pela página do AQR', forgotLink && (await setPasswordFromLink(forgotLink, 'Ana-esqueci-789')))
check('e entra com ela', (await login('ana', 'Ana-esqueci-789')).api.cookies.has('aqr_sessao'))

// ============ 8. Sincronização e logout ============
const sync = await call(admin.api, 'POST', `/api/admin/accounts/${ana.id}/sincronizar`)
check('sincronizar acesso (200)', sync.status === 200)
// ============ 9. Registros para o administrador (acessos e comparações) ============
const access = await (await call(admin.api, 'GET', '/api/admin/access-events?pageSize=100')).json()
const kinds = new Set(access.items.map((e) => e.evento))
check('administrador lê os registros de acesso', ['login.ok', 'login.vinculo_pendente', 'login.sem_conta', 'identidade.criada', 'identidade.bloqueada', 'identidade.senha_redefinicao_enviada', 'identidade.vinculada'].every((k) => kinds.has(k)), [...kinds].join(', '))
check('analista não lê os registros de acesso (403)', (await call(analyst.api, 'GET', '/api/admin/access-events')).status !== 200)
const cmp = await (await call(admin.api, 'GET', '/api/admin/comparison-events?usuario=ana')).json()
const sentEvent = cmp.items.find((e) => e.evento === 'comparacao.enviada')
check('a comparação está no registro só com quem e o resultado (sem nomes de arquivo)', Boolean(sentEvent) && cmp.items.some((e) => e.evento === 'comparacao.concluida' && e.diferencas === diffs) && !JSON.stringify(cmp).includes(basename(p1)) && !JSON.stringify(cmp).includes('arquivo'), JSON.stringify(sentEvent))
const usage = await (await call(admin.api, 'GET', '/api/admin/comparison-events/resumo')).json()
check('resumo conta as comparações da ana', usage.items?.find((u) => u.usuario === 'ana')?.total >= 1, JSON.stringify(usage.items))
const clock = await call(admin.api, 'GET', '/api/auth/sessao')
const left = Date.parse((await clock.json()).expiraEm) - Date.now()
check('relógio da sessão: cai em até 30 min sem uso', clock.status === 200 && left > 25 * 60_000 && left <= 30 * 60_000, `${Math.round(left / 1000)} s`)

// ============ 10. Logout: encerra também a sessão no Keycloak, sem token guardado ============
const sso = await login('admin', 'admin-dev-123')
const [adminKc] = await kcAdmin('users?username=admin&exact=true')
check('com o login, o Keycloak tem sessão aberta do admin', (await kcAdmin(`users/${adminKc.id}/sessions`)).length > 0)
const out = await call(sso.api, 'POST', '/api/auth/logout')
check('logout responde sem URL nem token', JSON.stringify(await out.json()) === '{"keycloakEncerrado":true}')
check('depois do logout a sessão não vale', (await call(sso.api, 'GET', '/api/auth/me')).status === 401)
check('depois do logout, nenhuma sessão do admin fica aberta no Keycloak', (await kcAdmin(`users/${adminKc.id}/sessions`)).length === 0)
if (process.env.DATABASE_PATH) {
  const db = new DatabaseSync(process.env.DATABASE_PATH, { readOnly: true })
  const cols = db.prepare('PRAGMA table_info(sessions)').all().map((c) => c.name)
  check('o banco não guarda id_token nem JWT', !cols.includes('id_token') && !JSON.stringify(db.prepare('SELECT * FROM sessions').all()).includes('eyJ'), cols.join(','))
  db.close()
}

console.log(results.every(Boolean) ? 'TUDO OK' : 'HÁ FALHAS')
process.exit(results.every(Boolean) ? 0 : 1)
