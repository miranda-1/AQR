import { createHash, createSign, generateKeyPairSync } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import type { Account } from '../../shared/contracts/admin.ts'
import type { SessionUser } from '../../shared/contracts/auth.ts'
import { openDatabase, type Database } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { seedAccount } from '../test/accounts.ts'
import { FakeIdentityProvider } from '../test/fake-identity.ts'
import { buildTestApp } from '../test/build-test-app.ts'

/**
 * Fluxo de login real contra um servidor OIDC falso (HTTP de verdade, tokens RS256 assinados).
 * Quem valida o protocolo é a biblioteca `openid-client`; aqui testamos a nossa cola:
 * sessão, conta no banco, papéis, desativação, origem e redirecionamentos.
 */

const CLIENT_ID = 'aqr-web'
const APP = 'http://localhost:5173'
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const b64 = (value: object | Buffer) => Buffer.from(value instanceof Buffer ? value : JSON.stringify(value)).toString('base64url')

function signToken(claims: object): string {
  const head = b64({ alg: 'RS256', typ: 'JWT', kid: 'k1' })
  const body = b64(claims)
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(privateKey)
  return `${head}.${body}.${b64(sig)}`
}

interface Grant {
  username: string
  nonce: string
  challenge: string
  audience: string
}

let fake: Server
let issuer: string
const grants = new Map<string, Grant>()

beforeAll(async () => {
  fake = createServer((req, res) => {
    const url = new URL(req.url ?? '/', issuer)
    const json = (body: object) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body))
    if (url.pathname.endsWith('/.well-known/openid-configuration')) {
      return json({
        issuer,
        authorization_endpoint: `${issuer}/auth`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/certs`,
        end_session_endpoint: `${issuer}/logout`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
      })
    }
    if (url.pathname.endsWith('/certs')) return json({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }] })
    if (url.pathname.endsWith('/token') && req.method === 'POST') {
      let raw = ''
      req.on('data', (chunk: Buffer) => (raw += chunk.toString()))
      req.on('end', () => {
        const form = new URLSearchParams(raw)
        const grant = grants.get(form.get('code') ?? '')
        const verifier = form.get('code_verifier') ?? ''
        const challenge = createHash('sha256').update(verifier).digest('base64url')
        if (!grant || grant.challenge !== challenge) return void res.writeHead(400, { 'content-type': 'application/json' }).end('{"error":"invalid_grant"}')
        const now = Math.floor(Date.now() / 1000)
        json({
          token_type: 'Bearer',
          access_token: 'nao-usado',
          id_token: signToken({
            iss: issuer, aud: grant.audience, sub: `sub-${grant.username}`, exp: now + 300, iat: now,
            nonce: grant.nonce, preferred_username: grant.username, name: grant.username.toUpperCase(),
          }),
        })
      })
      return
    }
    res.writeHead(404).end()
  })
  await new Promise<void>((resolve) => fake.listen(0, '127.0.0.1', resolve))
  issuer = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/realms/aqr`
})
afterAll(() => new Promise<void>((resolve) => fake.close(() => resolve())))

describe('login real com Keycloak', () => {
  let app: FastifyInstance
  let db: Database
  const identity = new FakeIdentityProvider()
  beforeAll(async () => {
    db = openDatabase(':memory:')
    migrate(db)
    seedAccount(db, 'admin', 'administrador')
    seedAccount(db, 'ana', 'analista')
    app = await buildTestApp({
      db,
      env: { AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: issuer, KEYCLOAK_CLIENT_ID: CLIENT_ID, APP_BASE_URL: APP, KEYCLOAK_ADMIN_CLIENT_ID: 'aqr-admin', KEYCLOAK_ADMIN_CLIENT_SECRET: 'segredo' },
      identityProvider: identity,
    })
  })
  afterAll(async () => {
    await app.close()
    db.close()
  })

  const cookieOf = (res: LightMyRequestResponse, name: string): string | undefined => {
    const raw = res.headers['set-cookie']
    const list = Array.isArray(raw) ? raw : raw ? [raw] : []
    const found = list.find((c) => c.startsWith(`${name}=`))
    const value = found?.split(';')[0]?.slice(name.length + 1)
    return value || undefined
  }

  /** Percorre o login como o navegador faria. Devolve o cookie de sessão (se houve) e o destino final. */
  async function login(username: string, options: { returnTo?: string; audience?: string } = {}) {
    const start = await app.inject({ method: 'GET', url: `/api/auth/login${options.returnTo ? `?returnTo=${encodeURIComponent(options.returnTo)}` : ''}` })
    expect(start.statusCode).toBe(302)
    const target = new URL(String(start.headers.location))
    expect(target.origin + target.pathname).toBe(`${issuer}/auth`)
    expect(target.searchParams.get('code_challenge_method')).toBe('S256')
    const code = `code-${grants.size}`
    grants.set(code, {
      username, nonce: target.searchParams.get('nonce') ?? '', challenge: target.searchParams.get('code_challenge') ?? '',
      audience: options.audience ?? CLIENT_ID,
    })
    const loginCookie = cookieOf(start, 'aqr_login')
    const back = await app.inject({
      method: 'GET',
      url: `/api/auth/callback?code=${code}&state=${target.searchParams.get('state')}&iss=${encodeURIComponent(issuer)}`,
      headers: { cookie: `aqr_login=${loginCookie}` },
    })
    const session = cookieOf(back, 'aqr_sessao')
    const headers: Record<string, string> = session ? { cookie: `aqr_sessao=${session}`, origin: APP } : { origin: APP }
    return { session, location: String(back.headers.location), headers }
  }

  const get = (url: string, headers: Record<string, string>) => app.inject({ method: 'GET', url, headers })

  it('recusa quem não entrou', async () => {
    expect((await get('/api/auth/me', {})).statusCode).toBe(401)
    expect((await get('/api/admin/accounts', {})).statusCode).toBe(401)
    expect((await app.inject({ method: 'POST', url: '/api/comparisons', headers: { origin: APP } })).statusCode).toBe(401)
    expect((await get('/api/auth/status', {})).json()).toEqual({ mode: 'keycloak' })
  })

  it('entra com senha certa: sessão opaca em cookie HttpOnly, sem tokens no navegador', async () => {
    const start = await app.inject({ method: 'GET', url: '/api/auth/login' })
    expect(String(start.headers['set-cookie'])).toMatch(/HttpOnly/)
    const { session, location, headers } = await login('admin')
    expect(location).toBe(`${APP}/`)
    expect(session).toMatch(/^[\w-]{40,}$/)
    expect(session?.split('.')).toHaveLength(1)
    const me = await get('/api/auth/me', headers)
    expect(me.json<SessionUser>()).toMatchObject({ usuario: 'admin', papel: 'administrador' })
    expect(me.body).not.toMatch(/token/i)
  })

  it('login errado: código inválido, estado trocado ou token de outro aplicativo não criam sessão', async () => {
    const start = await app.inject({ method: 'GET', url: '/api/auth/login' })
    const loginCookie = cookieOf(start, 'aqr_login')
    const target = new URL(String(start.headers.location))
    const bad = await app.inject({
      method: 'GET', url: `/api/auth/callback?code=forjado&state=${target.searchParams.get('state')}`,
      headers: { cookie: `aqr_login=${loginCookie}` },
    })
    expect(bad.headers.location).toBe(`${APP}/entrar?erro=falha`)
    expect(cookieOf(bad, 'aqr_sessao')).toBeUndefined()

    const noCookie = await app.inject({ method: 'GET', url: '/api/auth/callback?code=x&state=y' })
    expect(noCookie.headers.location).toBe(`${APP}/entrar?erro=expirado`)

    const wrongAudience = await login('admin', { audience: 'outro-app' })
    expect(wrongAudience.location).toBe(`${APP}/entrar?erro=falha`)
    expect(wrongAudience.session).toBeUndefined()

    const denied = await app.inject({ method: 'GET', url: `/api/auth/callback?error=access_denied`, headers: { cookie: 'aqr_login=nada' } })
    expect(denied.statusCode).toBe(302)
  })

  it('autenticar não basta: precisa de conta no AQR', async () => {
    const result = await login('desconhecida')
    expect(result.location).toBe(`${APP}/entrar?erro=sem_conta`)
    expect(result.session).toBeUndefined()
  })

  it('só aceita caminhos internos em returnTo', async () => {
    expect((await login('admin', { returnTo: '/administracao/contas' })).location).toBe(`${APP}/administracao/contas`)
    expect((await login('admin', { returnTo: 'https://malicioso.example' })).location).toBe(`${APP}/`)
    expect((await login('admin', { returnTo: '//malicioso.example' })).location).toBe(`${APP}/`)
  })

  it('administrador cria analista, analista não administra e a desativação vale na hora', async () => {
    const admin = await login('admin')
    const created = await app.inject({
      method: 'POST', url: '/api/admin/accounts', headers: admin.headers,
      payload: { usuario: 'bruno', nome: 'Bruno Souza', email: 'bruno@x.gov.br', papel: 'analista' },
    })
    expect(created.statusCode).toBe(201)
    const bruno = created.json<Account>()

    const analyst = await login('bruno')
    expect((await get('/api/auth/me', analyst.headers)).json<SessionUser>().papel).toBe('analista')
    expect((await get('/api/admin/accounts', analyst.headers)).statusCode).toBe(403)
    // Comparação liberada para qualquer papel autenticado (sem arquivos, a API responde 415, não 401).
    expect((await app.inject({ method: 'POST', url: '/api/comparisons', headers: analyst.headers })).statusCode).not.toBe(401)

    const off = await app.inject({
      method: 'POST', url: `/api/admin/accounts/${bruno.id}/desativar`, headers: admin.headers, payload: { versao: bruno.versao },
    })
    expect(off.statusCode).toBe(200)
    expect((await get('/api/auth/me', analyst.headers)).statusCode).toBe(401)
    expect((await get('/api/admin/accounts', analyst.headers)).statusCode).toBe(401)
    const again = await login('bruno')
    expect(again.location).toBe(`${APP}/entrar?erro=conta_inativa`)

    const audit = await get('/api/admin/audit-events', admin.headers)
    expect(audit.body).toContain('conta.desativada')
    expect(audit.body).toContain('"origem":"real"')
  })

  it('bloqueia pedidos que alteram dados vindos de outra origem', async () => {
    const admin = await login('admin')
    const forged = await app.inject({
      method: 'POST', url: '/api/admin/accounts', headers: { cookie: String(admin.headers.cookie), origin: 'https://malicioso.example' },
      payload: { usuario: 'intruso', nome: 'Intruso', email: 'intruso@x.gov.br', papel: 'administrador' },
    })
    expect(forged.statusCode).toBe(403)
    const noOrigin = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: String(admin.headers.cookie) } })
    expect(noOrigin.statusCode).toBe(403)
  })

  it('sessões sobrevivem a reinício, ficam no banco só como hash e os acessos são registrados', async () => {
    const { session, headers } = await login('ana')
    expect(JSON.stringify(db.prepare('SELECT * FROM sessions').all())).not.toContain(String(session))

    const restarted = await buildTestApp({
      db,
      env: { AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: issuer, KEYCLOAK_CLIENT_ID: CLIENT_ID, APP_BASE_URL: APP, KEYCLOAK_ADMIN_CLIENT_ID: 'aqr-admin', KEYCLOAK_ADMIN_CLIENT_SECRET: 'segredo' },
      identityProvider: identity,
    })
    expect((await restarted.inject({ method: 'GET', url: '/api/auth/me', headers })).statusCode).toBe(200)
    await restarted.close()

    const events = db.prepare('SELECT evento, usuario FROM access_events ORDER BY ocorrido_em').all().map((row) => row.evento)
    expect(events).toEqual(expect.arrayContaining(['login.ok', 'login.sem_conta', 'login.conta_inativa', 'login.falha']))
    expect(() => db.exec('DELETE FROM access_events')).toThrow(/não podem ser apagados/)
  })

  describe('provisionamento da identidade no Keycloak', () => {
    const post = (headers: Record<string, string>, url: string, payload?: object) =>
      app.inject({ method: 'POST', url, headers, ...(payload ? { payload } : {}) })

    it('criar conta cria o usuário no Keycloak e envia o convite; sem e-mail, recusa', async () => {
      const admin = await login('admin')
      const noEmail = await post(admin.headers, '/api/admin/accounts', { usuario: 'carla', nome: 'Carla Lima', email: null, papel: 'analista' })
      expect(noEmail.statusCode).toBe(400)
      expect(noEmail.body).toMatch(/convite/)
      expect(identity.byName('carla')).toBeUndefined()

      const ok = await post(admin.headers, '/api/admin/accounts', { usuario: 'carla', nome: 'Carla Lima', email: 'carla@x.gov.br', papel: 'analista' })
      expect(ok.statusCode).toBe(201)
      expect(ok.json<Account>().aviso).toBeUndefined()
      const kc = identity.byName('carla')
      expect(kc).toMatchObject({ email: 'carla@x.gov.br', nome: 'Carla Lima', enabled: true })
      expect(identity.emails).toContain(kc?.id)
      expect(ok.body).not.toMatch(/senha|password/i)
    })

    it('conta duplicada no AQR desfaz o usuário criado no Keycloak', async () => {
      const admin = await login('admin')
      const before = identity.users.size
      // "ana" já existe no AQR, mas não no Keycloak falso: o usuário criado precisa ser removido.
      const dup = await post(admin.headers, '/api/admin/accounts', { usuario: 'ana', nome: 'Outra Ana', email: 'outra@x.gov.br', papel: 'analista' })
      expect(dup.statusCode).toBe(409)
      expect(identity.users.size).toBe(before)
    })

    it('Keycloak fora do ar: não cria conta; e-mail com falha: cria e avisa', async () => {
      const admin = await login('admin')
      identity.down = true
      const down = await post(admin.headers, '/api/admin/accounts', { usuario: 'duda', nome: 'Duda Reis', email: 'duda@x.gov.br', papel: 'analista' })
      identity.down = false
      expect(down.statusCode).toBe(502)
      expect(db.prepare("SELECT 1 FROM accounts WHERE usuario = 'duda'").get()).toBeUndefined()

      identity.mailDown = true
      const noMail = await post(admin.headers, '/api/admin/accounts', { usuario: 'duda', nome: 'Duda Reis', email: 'duda@x.gov.br', papel: 'analista' })
      identity.mailDown = false
      expect(noMail.statusCode).toBe(201)
      expect(noMail.json<Account>().aviso).toMatch(/e-mail de convite não foi enviado/)
      // O convite pode ser reenviado depois.
      const resend = await post(admin.headers, `/api/admin/accounts/${noMail.json<Account>().id}/redefinir-senha`)
      expect(resend.statusCode).toBe(204)
      expect(identity.emails).toContain(identity.byName('duda')?.id)
    })

    it('bloquear e reativar refletem no Keycloak; redefinir exige conta ativa; sincronizar cria contas antigas', async () => {
      const admin = await login('admin')
      const created = (
        await post(admin.headers, '/api/admin/accounts', { usuario: 'edu', nome: 'Edu Prado', email: 'edu@x.gov.br', papel: 'analista' })
      ).json<Account>()
      const kcId = identity.byName('edu')?.id ?? ''

      const off = await post(admin.headers, `/api/admin/accounts/${created.id}/desativar`, { versao: created.versao })
      expect(off.statusCode).toBe(200)
      expect(identity.users.get(kcId)?.enabled).toBe(false)
      expect(identity.loggedOut).toContain(kcId)
      const blockedReset = await post(admin.headers, `/api/admin/accounts/${created.id}/redefinir-senha`)
      expect(blockedReset.statusCode).toBe(422)

      const on = await post(admin.headers, `/api/admin/accounts/${created.id}/reativar`, { versao: off.json<Account>().versao })
      expect(on.statusCode).toBe(200)
      expect(identity.users.get(kcId)?.enabled).toBe(true)

      // Keycloak fora do ar na desativação: o AQR bloqueia mesmo assim e avisa; sincronizar conclui depois.
      identity.down = true
      const partial = await post(admin.headers, `/api/admin/accounts/${created.id}/desativar`, { versao: on.json<Account>().versao })
      identity.down = false
      expect(partial.statusCode).toBe(200)
      expect(partial.json<Account>()).toMatchObject({ situacao: 'inativa' })
      expect(partial.json<Account>().aviso).toMatch(/já está bloqueado/)
      expect(identity.users.get(kcId)?.enabled).toBe(true)
      expect((await post(admin.headers, `/api/admin/accounts/${created.id}/sincronizar`)).statusCode).toBe(200)
      expect(identity.users.get(kcId)?.enabled).toBe(false)

      // Conta antiga, que só existe no AQR (ana), ganha o usuário e o convite ao sincronizar.
      const ana = db.prepare("SELECT id FROM accounts WHERE usuario = 'ana'").get() as { id: string }
      db.prepare("UPDATE accounts SET email = 'ana@x.gov.br' WHERE usuario = 'ana'").run()
      expect(identity.byName('ana')).toBeUndefined()
      expect((await post(admin.headers, `/api/admin/accounts/${ana.id}/sincronizar`)).statusCode).toBe(200)
      expect(identity.byName('ana')).toMatchObject({ enabled: true })
    })

    it('só administrador provisiona e tudo fica registrado', async () => {
      const analyst = await login('ana')
      const forbidden = await post(analyst.headers, '/api/admin/accounts', { usuario: 'x1x', nome: 'X', email: 'x@x.gov.br', papel: 'analista' })
      expect(forbidden.statusCode).toBe(403)
      expect(identity.byName('x1x')).toBeUndefined()
      const events = db.prepare('SELECT DISTINCT evento FROM access_events').all().map((row) => row.evento)
      expect(events).toEqual(
        expect.arrayContaining(['identidade.criada', 'identidade.convite_enviado', 'identidade.bloqueada', 'identidade.reativada', 'identidade.falha', 'identidade.sincronizada']),
      )
    })
  })

  it('sair encerra a sessão no servidor e aponta o encerramento no Keycloak', async () => {
    const { headers } = await login('ana')
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers })
    expect(out.statusCode).toBe(200)
    const { logoutUrl } = out.json<{ logoutUrl: string | null }>()
    expect(logoutUrl).toContain(`${issuer}/logout`)
    expect(logoutUrl).toContain('id_token_hint=')
    // O cookie antigo não vale mais, mesmo que alguém o guarde.
    expect((await get('/api/auth/me', headers)).statusCode).toBe(401)
  })
})
