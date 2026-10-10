import { createHash, createSign, generateKeyPairSync } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import type { Account } from '../../shared/contracts/admin.ts'
import type { SessionUser } from '../../shared/contracts/auth.ts'
import { openDatabase, type Database } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { seedAccount } from '../test/accounts.ts'
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
  beforeAll(async () => {
    db = openDatabase(':memory:')
    migrate(db)
    seedAccount(db, 'admin', 'administrador')
    seedAccount(db, 'ana', 'analista')
    app = await buildTestApp({
      db,
      env: { AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: issuer, KEYCLOAK_CLIENT_ID: CLIENT_ID, APP_BASE_URL: APP },
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
      payload: { usuario: 'bruno', nome: 'Bruno Souza', email: null, papel: 'analista' },
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
      payload: { usuario: 'intruso', nome: 'Intruso', email: null, papel: 'administrador' },
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
      env: { AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: issuer, KEYCLOAK_CLIENT_ID: CLIENT_ID, APP_BASE_URL: APP },
    })
    expect((await restarted.inject({ method: 'GET', url: '/api/auth/me', headers })).statusCode).toBe(200)
    await restarted.close()

    const events = db.prepare('SELECT evento, usuario FROM access_events ORDER BY ocorrido_em').all().map((row) => row.evento)
    expect(events).toEqual(expect.arrayContaining(['login.ok', 'login.sem_conta', 'login.conta_inativa', 'login.falha']))
    expect(() => db.exec('DELETE FROM access_events')).toThrow(/não podem ser apagados/)
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
