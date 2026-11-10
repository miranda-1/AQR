import type { FastifyInstance } from 'fastify'
import { openDatabase, type Database } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { seedAccount } from '../test/accounts.ts'
import { buildTestApp } from '../test/build-test-app.ts'
import { defined } from '../test/defined.ts'
import { FakeIdentityProvider } from '../test/fake-identity.ts'
import { FakeMailer } from '../test/fake-mailer.ts'
import { LINK_LIFETIME_MS, PasswordLinks } from './password-links.ts'
import { SessionStore } from './session-store.ts'

const APP = 'http://localhost:5173'
const env = (attempts = '100000') => ({
  AUTH_MODE: 'keycloak',
  // O cliente OIDC só procura o Keycloak no primeiro login; estas rotas não fazem login.
  KEYCLOAK_ISSUER: 'http://127.0.0.1:9/realms/aqr',
  KEYCLOAK_CLIENT_ID: 'aqr-web',
  KEYCLOAK_CLIENT_SECRET: 'segredo-web',
  KEYCLOAK_ADMIN_CLIENT_ID: 'aqr-admin',
  KEYCLOAK_ADMIN_CLIENT_SECRET: 'segredo',
  APP_BASE_URL: APP,
  AUTH_LOGIN_ATTEMPTS_PER_MINUTE: attempts,
})

/** O e-mail sai em segundo plano: espera a fila de promessas andar. */
const flush = () => new Promise((resolve) => setImmediate(resolve))

describe('senha pelas páginas do AQR', () => {
  let app: FastifyInstance
  let db: Database
  let identity: FakeIdentityProvider
  let mailer: FakeMailer
  let maria: string

  beforeEach(async () => {
    db = openDatabase(':memory:')
    migrate(db)
    identity = new FakeIdentityProvider()
    mailer = new FakeMailer()
    const sub = await identity.createUser({ usuario: 'maria', nome: 'Maria Souza', email: 'maria@x.gov.br' })
    maria = seedAccount(db, 'maria', 'analista')
    db.prepare("UPDATE accounts SET nome = 'Maria Souza', email = 'maria@x.gov.br', keycloak_sub = ? WHERE id = ?").run(sub, maria)
    app = await buildTestApp({ db, env: env(), identityProvider: identity, mailer })
  })
  afterEach(async () => {
    await app.close()
    db.close()
  })

  const post = (url: string, payload: object, headers: Record<string, string> = { origin: APP }) => app.inject({ method: 'POST', url, headers, payload })
  const events = (evento: string) => db.prepare('SELECT detalhe FROM access_events WHERE evento = ?').all(evento).map((row) => row.detalhe)

  it('"Esqueceu a senha?" envia o link do AQR; a pessoa define a senha e o link deixa de valer', async () => {
    const sessions = new SessionStore(db, { maxAgeMs: 3600_000, idleMs: 3600_000 })
    sessions.create(maria)

    const asked = await post('/api/auth/senha/esqueci', { usuario: 'Maria' })
    expect(asked.statusCode).toBe(202)
    await flush()
    const mail = defined(mailer.lastTo('maria@x.gov.br'))
    expect(mail.assunto).toBe('Nova senha do AQR')
    expect(mail.texto).toContain('Olá, Maria.')
    expect(mail.texto).not.toMatch(/keycloak/i)
    const codigo = defined(mailer.codeFor('maria@x.gov.br'))

    const info = await post('/api/auth/senha/verificar', { codigo })
    expect(info.json()).toEqual({ finalidade: 'recuperacao', usuario: 'maria', nome: 'Maria' })

    const short = await post('/api/auth/senha/definir', { codigo, senha: 'curta' })
    expect(short.statusCode).toBe(422)
    const withUser = await post('/api/auth/senha/definir', { codigo, senha: 'Maria-2026-segura' })
    expect(withUser.json<{ error: { message: string } }>().error.message).toMatch(/não pode conter o seu usuário/)

    const ok = await post('/api/auth/senha/definir', { codigo, senha: 'Lagoa-azul-2026' })
    expect(ok.statusCode).toBe(200)
    expect(ok.json()).toEqual({ usuario: 'maria' })
    const sub = defined(identity.byName('maria')).id
    expect(identity.passwords.get(sub)).toBe('Lagoa-azul-2026')
    expect(identity.users.get(sub)?.emailVerified).toBe(true)
    // Sessões abertas com a senha antiga caem, aqui e no sistema de login.
    expect(db.prepare('SELECT count(*) AS n FROM sessions').get()).toEqual({ n: 0 })
    expect(identity.loggedOut).toContain(sub)
    expect(events('senha.definida')).toEqual(['recuperacao'])
    expect(events('senha.recuperacao_pedida')).toEqual(['enviado'])
    // A resposta nunca devolve a senha.
    expect(ok.body).not.toContain('Lagoa-azul-2026')

    const again = await post('/api/auth/senha/definir', { codigo, senha: 'Outra-senha-2026' })
    expect(again.statusCode).toBe(410)
    expect((await post('/api/auth/senha/verificar', { codigo })).statusCode).toBe(410)
  })

  it('a resposta é a mesma exista a conta ou não; conta desativada ou sem acesso não recebe link', async () => {
    const inactive = seedAccount(db, 'inativa', 'analista', 'inativa')
    db.prepare("UPDATE accounts SET email = 'inativa@x.gov.br', keycloak_sub = 'kc-x' WHERE id = ?").run(inactive)
    const unlinked = seedAccount(db, 'semacesso', 'analista')
    db.prepare("UPDATE accounts SET email = 'semacesso@x.gov.br' WHERE id = ?").run(unlinked)

    const answers = await Promise.all(['ninguem', 'inativa', 'semacesso', 'maria@x.gov.br'].map((usuario) => post('/api/auth/senha/esqueci', { usuario })))
    expect(answers.map((res) => [res.statusCode, res.body])).toEqual(Array(4).fill([202, '{"ok":true}']))
    await flush()
    // Só a conta ativa, com acesso, recebe o link (e também pelo e-mail digitado).
    expect(mailer.sent.map((mail) => mail.para)).toEqual(['maria@x.gov.br'])
    expect(events('senha.recuperacao_pedida').sort()).toEqual(['conta_inativa', 'enviado', 'sem_acesso', 'sem_conta'])
    expect((await post('/api/auth/senha/esqueci', { usuario: '' })).statusCode).toBe(400)
  })

  it('um link novo invalida o anterior; desativar a conta invalida todos', async () => {
    await post('/api/auth/senha/esqueci', { usuario: 'maria' })
    await flush()
    const first = defined(mailer.codeFor('maria@x.gov.br'))
    await post('/api/auth/senha/esqueci', { usuario: 'maria' })
    await flush()
    const second = defined(mailer.codeFor('maria@x.gov.br'))
    expect(second).not.toBe(first)
    expect((await post('/api/auth/senha/verificar', { codigo: first })).statusCode).toBe(410)
    expect((await post('/api/auth/senha/verificar', { codigo: second })).statusCode).toBe(200)

    db.prepare("UPDATE accounts SET situacao = 'inativa', desativada_em = '2026-11-09' WHERE id = ?").run(maria)
    expect((await post('/api/auth/senha/definir', { codigo: second, senha: 'Lagoa-azul-2026' })).statusCode).toBe(410)
  })

  it('senha recusada pela política do sistema de login ou sistema fora do ar: o link continua valendo', async () => {
    await post('/api/auth/senha/esqueci', { usuario: 'maria' })
    await flush()
    const codigo = defined(mailer.codeFor('maria@x.gov.br'))

    identity.rejectPassword = (senha) => senha.length < 12
    const weak = await post('/api/auth/senha/definir', { codigo, senha: 'Lagoa-2026' })
    expect(weak.statusCode).toBe(422)
    expect(weak.body).not.toMatch(/keycloak|minimum/i)

    identity.down = true
    const down = await post('/api/auth/senha/definir', { codigo, senha: 'Lagoa-azul-2026-longa' })
    identity.down = false
    expect(down.statusCode).toBe(503)

    expect((await post('/api/auth/senha/definir', { codigo, senha: 'Lagoa-azul-2026-longa' })).statusCode).toBe(200)
  })

  it('exige a origem do AQR e limita as tentativas por origem', async () => {
    expect((await post('/api/auth/senha/esqueci', { usuario: 'maria' }, { origin: 'https://outro.site' })).statusCode).toBe(403)
    expect((await post('/api/auth/senha/definir', { codigo: 'x', senha: 'y' }, {})).statusCode).toBe(403)

    const limited = await buildTestApp({ db, env: env('2'), identityProvider: identity, mailer })
    const codes = []
    for (let i = 0; i < 3; i += 1) {
      codes.push((await limited.inject({ method: 'POST', url: '/api/auth/senha/verificar', headers: { origin: APP }, payload: { codigo: 'a'.repeat(43) } })).statusCode)
    }
    await limited.close()
    expect(codes).toEqual([410, 410, 429])
  })
})

describe('links de senha', () => {
  it('guardam só o hash, vencem sozinhos e valem uma vez', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    const id = seedAccount(db, 'joana', 'analista')
    let now = Date.parse('2026-11-09T12:00:00Z')
    const links = new PasswordLinks(db, APP, () => now)

    const url = links.issue(id, 'recuperacao')
    const codigo = defined(new URL(url).hash.slice(1))
    expect(url.startsWith(`${APP}/definir-senha#`)).toBe(true)
    expect(JSON.stringify(db.prepare('SELECT * FROM password_links').all())).not.toContain(codigo)
    expect(links.find(codigo)).toEqual({ accountId: id, finalidade: 'recuperacao' })
    expect(links.find('nao-e-um-codigo')).toBeNull()

    now += LINK_LIFETIME_MS.recuperacao + 1
    expect(links.find(codigo)).toBeNull()
    expect(links.consume(codigo, id)).toBe(false)

    const invite = defined(new URL(links.issue(id, 'convite')).hash.slice(1))
    now += LINK_LIFETIME_MS.recuperacao + 1
    expect(links.find(invite)?.finalidade).toBe('convite')
    expect(links.consume(invite, id)).toBe(true)
    expect(links.consume(invite, id)).toBe(false)
    expect(links.activeCount(id)).toBe(0)
    db.close()
  })
})
