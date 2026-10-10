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
import { buildTestApp, multipartBody } from '../test/build-test-app.ts'
import { rateLimitKey, safeReturnTo } from './keycloak-auth.ts'
import { makePdf } from '../test/make-pdf.ts'
import { purgeOldComparisonEvents } from '../comparison/audit.ts'

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
  sub: string
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
            iss: issuer, aud: grant.audience, sub: grant.sub, exp: now + 300, iat: now,
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
    // Contas já vinculadas ao Keycloak pelo sub; "antiga" continua sem vínculo.
    db.prepare("UPDATE accounts SET keycloak_sub = 'sub-' || usuario WHERE usuario IN ('admin', 'ana')").run()
    seedAccount(db, 'antiga', 'analista')
    db.prepare("UPDATE accounts SET email = 'antiga@x.gov.br' WHERE usuario = 'antiga'").run()
    app = await buildTestApp({
      db,
      env: { AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: issuer, KEYCLOAK_CLIENT_ID: CLIENT_ID, APP_BASE_URL: APP, KEYCLOAK_ADMIN_CLIENT_ID: 'aqr-admin', KEYCLOAK_ADMIN_CLIENT_SECRET: 'segredo', AUTH_LOGIN_ATTEMPTS_PER_MINUTE: '100000' },
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
  /**
   * `sub`: id do usuário no Keycloak (padrão: o do usuário criado pela API, ou `sub-<usuario>`).
   * `claimUsername`: o preferred_username que vai no token (padrão: o próprio usuário).
   */
  async function login(username: string, options: { returnTo?: string; audience?: string; sub?: string; claimUsername?: string } = {}) {
    const start = await app.inject({ method: 'GET', url: `/api/auth/login${options.returnTo ? `?returnTo=${encodeURIComponent(options.returnTo)}` : ''}` })
    expect(start.statusCode).toBe(302)
    const target = new URL(String(start.headers.location))
    expect(target.origin + target.pathname).toBe(`${issuer}/auth`)
    expect(target.searchParams.get('code_challenge_method')).toBe('S256')
    const code = `code-${grants.size}`
    grants.set(code, {
      sub: options.sub ?? identity.byName(username)?.id ?? `sub-${username}`,
      username: options.claimUsername ?? username, nonce: target.searchParams.get('nonce') ?? '', challenge: target.searchParams.get('code_challenge') ?? '',
      audience: options.audience ?? CLIENT_ID,
    })
    const state = target.searchParams.get('state') ?? ''
    expect(cookieOf(start, 'aqr_login')).toBe(state)
    expect(String(start.headers['set-cookie'])).toContain('Path=/api/auth;')
    const back = await app.inject({
      method: 'GET',
      url: `/api/auth/callback?code=${code}&state=${state}&iss=${encodeURIComponent(issuer)}`,
      headers: { cookie: `aqr_login=${state}` },
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
    const target = new URL(String(start.headers.location))
    const state = target.searchParams.get('state') ?? ''
    const bad = await app.inject({
      method: 'GET', url: `/api/auth/callback?code=forjado&state=${state}`,
      headers: { cookie: `aqr_login=${state}` },
    })
    expect(bad.headers.location).toBe(`${APP}/entrar?erro=falha`)
    expect(cookieOf(bad, 'aqr_sessao')).toBeUndefined()

    // State válido e em andamento, mas sem o cookie deste navegador: recusado (e o login do dono segue valendo).
    const pendingStart = await app.inject({ method: 'GET', url: '/api/auth/login' })
    const pendingState = new URL(String(pendingStart.headers.location)).searchParams.get('state') ?? ''
    const noCookie = await app.inject({ method: 'GET', url: `/api/auth/callback?code=x&state=${pendingState}` })
    expect(noCookie.headers.location).toBe(`${APP}/entrar?erro=expirado`)
    // O dono cancela no Keycloak: "negado" (o state ainda valia, então não foi gasto pelo pedido acima).
    const denied = await app.inject({
      method: 'GET', url: `/api/auth/callback?error=access_denied&state=${pendingState}`, headers: { cookie: `aqr_login=${pendingState}` },
    })
    expect(denied.headers.location).toBe(`${APP}/entrar?erro=negado`)
    expect(String(denied.headers['set-cookie'])).toMatch(/aqr_login=;.*Max-Age=0/)
    // O retorno de um login começado em OUTRO navegador (sem o cookie daquele state) não vale.
    const other = await app.inject({ method: 'GET', url: '/api/auth/login' })
    const otherState = new URL(String(other.headers.location)).searchParams.get('state') ?? ''
    const stolen = await app.inject({ method: 'GET', url: `/api/auth/callback?code=x&state=${otherState}` })
    expect(stolen.headers.location).toBe(`${APP}/entrar?erro=expirado`)

    const wrongAudience = await login('admin', { audience: 'outro-app' })
    expect(wrongAudience.location).toBe(`${APP}/entrar?erro=falha`)
    expect(wrongAudience.session).toBeUndefined()
  })

  it('duas abas no mesmo navegador entram ao mesmo tempo, e logins abandonados não acumulam cookies', async () => {
    let jar = ''
    const starts: string[] = []
    for (let i = 0; i < 7; i++) {
      const start = await app.inject({ method: 'GET', url: '/api/auth/login', headers: jar ? { cookie: `aqr_login=${jar}` } : {} })
      jar = cookieOf(start, 'aqr_login') ?? ''
      starts.push(new URL(String(start.headers.location)).searchParams.get('state') ?? '')
    }
    // Só os 5 mais recentes ficam no cookie (um só cookie, de tamanho limitado).
    expect(jar.split('.')).toEqual(starts.slice(-5).reverse())
    // Duas abas: as duas concluem, na ordem inversa, com o mesmo navegador (mesmo cookie).
    const tab = async () => {
      const begin = await app.inject({ method: 'GET', url: '/api/auth/login', headers: { cookie: `aqr_login=${jar}` } })
      jar = cookieOf(begin, 'aqr_login') ?? ''
      return new URL(String(begin.headers.location))
    }
    const tabs = [await tab(), await tab()]
    for (const target of tabs.reverse()) {
      const state = target.searchParams.get('state') ?? ''
      const code = `code-aba-${state}`
      grants.set(code, {
        sub: 'sub-ana', username: 'ana', audience: CLIENT_ID,
        nonce: target.searchParams.get('nonce') ?? '', challenge: target.searchParams.get('code_challenge') ?? '',
      })
      const back = await app.inject({
        method: 'GET', url: `/api/auth/callback?code=${code}&state=${state}&iss=${encodeURIComponent(issuer)}`, headers: { cookie: `aqr_login=${jar}` },
      })
      expect(cookieOf(back, 'aqr_sessao')).toBeDefined()
      jar = cookieOf(back, 'aqr_login') ?? ''
      expect(jar.split('.')).not.toContain(state)
    }
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
    // O navegador ignora tab e quebra de linha e trata "\\" como "/": nada disso pode virar "//site".
    for (const tricky of ['/\t/malicioso.example', '/\n/malicioso.example', '/\\malicioso.example', '/%09/x', `/${'a'.repeat(3000)}`]) {
      expect((await login('admin', { returnTo: tricky })).location).toMatch(new RegExp(`^${APP}/`))
      expect(safeReturnTo(tricky)).not.toMatch(/^\/\//)
    }
    expect(safeReturnTo('/\t/malicioso.example')).toBe('/')
    expect(safeReturnTo('/comparacao?x=1#y')).toBe('/comparacao?x=1#y')
    expect(new URL(safeReturnTo('/%2F%2Fmalicioso.example'), APP).origin).toBe(APP)
  })

  it('limite de tentativas agrupa o IPv6 por bloco /64', () => {
    expect(rateLimitKey('10.0.0.1')).toBe('10.0.0.1')
    expect(rateLimitKey('::ffff:10.0.0.1')).toBe('10.0.0.1')
    expect(rateLimitKey('2001:db8:1:2::1')).toBe(rateLimitKey('2001:0db8:0001:0002:ffff:1:2:3'))
    expect(rateLimitKey('2001:db8:1:2::1')).not.toBe(rateLimitKey('2001:db8:1:3::1'))
    expect(rateLimitKey('::1')).toBe('0:0:0:0::/64')
  })

  it('excesso de tentativas de login por origem é recusado', async () => {
    const limited = await buildTestApp({
      db,
      env: { AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: issuer, KEYCLOAK_CLIENT_ID: CLIENT_ID, APP_BASE_URL: APP, KEYCLOAK_ADMIN_CLIENT_ID: 'aqr-admin', KEYCLOAK_ADMIN_CLIENT_SECRET: 'segredo', AUTH_LOGIN_ATTEMPTS_PER_MINUTE: '3' },
      identityProvider: identity,
    })
    try {
      for (let i = 0; i < 3; i++) expect((await limited.inject({ method: 'GET', url: '/api/auth/login' })).headers.location).toMatch(new RegExp(`^${issuer}`))
      expect((await limited.inject({ method: 'GET', url: '/api/auth/login' })).headers.location).toBe(`${APP}/entrar?erro=muitas_tentativas`)
      // Outro bloco IPv6 tem o próprio limite; o mesmo /64 com outro endereço, não.
      const v6 = (remoteAddress: string) => limited.inject({ method: 'GET', url: '/api/auth/login', remoteAddress })
      for (let i = 0; i < 3; i++) expect((await v6(`2001:db8:1:2::${i + 1}`)).headers.location).toMatch(new RegExp(`^${issuer}`))
      expect((await v6('2001:db8:1:2:ffff::9')).headers.location).toBe(`${APP}/entrar?erro=muitas_tentativas`)
      expect((await v6('2001:db8:1:3::1')).headers.location).toMatch(new RegExp(`^${issuer}`))
    } finally {
      await limited.close()
    }
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
    // A sessão aberta foi apagada: reativar a conta não ressuscita o cookie antigo.
    expect(db.prepare('SELECT count(*) AS n FROM sessions WHERE account_id = ?').get(bruno.id)).toEqual({ n: 0 })
    const back = await app.inject({
      method: 'POST', url: `/api/admin/accounts/${bruno.id}/reativar`, headers: admin.headers, payload: { versao: bruno.versao + 1 },
    })
    expect(back.statusCode).toBe(200)
    expect((await get('/api/auth/me', analyst.headers)).statusCode).toBe(401)

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
    // Caminho codificado (`%61` = "a") cai na mesma rota, mas não escapa da conferência de origem…
    const encoded = await app.inject({
      method: 'POST', url: '/%61pi/admin/accounts', headers: { cookie: String(admin.headers.cookie), origin: 'https://malicioso.example' },
      payload: { usuario: 'intruso', nome: 'Intruso', email: 'intruso@x.gov.br', papel: 'administrador' },
    })
    expect(encoded.statusCode).toBe(403)
    // …nem da exigência de login na comparação.
    expect((await app.inject({ method: 'POST', url: '/%61pi/comparisons', headers: { origin: APP } })).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url: '/%61pi/comparisons/00000000-0000-4000-8000-000000000000' })).statusCode).toBe(401)
  })

  it('conta desativada não mantém a sessão viva com pedidos', async () => {
    const id = seedAccount(db, 'dora', 'analista')
    db.prepare("UPDATE accounts SET keycloak_sub = 'sub-dora' WHERE id = ?").run(id)
    const { headers } = await login('dora')
    // Último uso há 1 min: a sessão ainda vale pela inatividade, e um pedido normal a renovaria.
    const lastSeen = Date.now() - 60_000
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE account_id = ?').run(lastSeen, id)
    db.prepare("UPDATE accounts SET situacao = 'inativa', desativada_em = ? WHERE id = ?").run(new Date().toISOString(), id)
    expect((await get('/api/auth/me', headers)).statusCode).toBe(401)
    // Conta inativa: o pedido é recusado e NÃO conta como uso (a sessão segue lá, parada, e cai sozinha).
    expect(db.prepare('SELECT last_seen_at FROM sessions WHERE account_id = ?').all(id)).toEqual([{ last_seen_at: lastSeen }])
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

  describe('vínculo pelo sub do Keycloak', () => {
    it('o nome de usuário sozinho não basta: conta sem vínculo não entra', async () => {
      const result = await login('antiga', { sub: 'sub-outra-pessoa' })
      expect(result.location).toBe(`${APP}/entrar?erro=vinculo_pendente`)
      expect(result.session).toBeUndefined()
    })

    it('mesmo nome com outro sub (nome reaproveitado ou trocado no Keycloak) é recusado', async () => {
      const result = await login('admin', { sub: 'sub-invasor' })
      expect(result.location).toBe(`${APP}/entrar?erro=vinculo_divergente`)
      expect(result.session).toBeUndefined()
      const events = db.prepare('SELECT evento FROM access_events').all().map((row) => row.evento)
      expect(events).toEqual(expect.arrayContaining(['login.vinculo_pendente', 'login.vinculo_divergente']))
    })

    it('o sub manda: trocar o nome no Keycloak não tira o acesso nem dá acesso a outra conta', async () => {
      const renamed = await login('admin', { sub: 'sub-admin', claimUsername: 'nome-novo' })
      expect(renamed.session).toBeDefined()
      expect((await get('/api/auth/me', renamed.headers)).json<SessionUser>().usuario).toBe('admin')
      // Um sub vinculado à "ana" com o nome "admin" continua sendo a ana, nunca o administrador.
      const impostor = await login('admin', { sub: 'sub-ana' })
      expect((await get('/api/auth/me', impostor.headers)).json<SessionUser>()).toMatchObject({ usuario: 'ana', papel: 'analista' })
    })

    it('o vínculo é definitivo: o banco recusa trocar o sub ou repeti-lo em outra conta', () => {
      expect(() => db.prepare("UPDATE accounts SET keycloak_sub = 'outro' WHERE usuario = 'admin'").run()).toThrow(/vínculo/)
      expect(() => db.prepare("UPDATE accounts SET keycloak_sub = 'sub-admin' WHERE usuario = 'antiga'").run()).toThrow()
    })

    it('vincular conta antiga confere o e-mail e nunca sobrescreve', async () => {
      const admin = await login('admin')
      const id = seedAccount(db, 'legado', 'analista')
      db.prepare("UPDATE accounts SET email = 'legado@x.gov.br' WHERE id = ?").run(id)
      await identity.createUser({ usuario: 'legado', nome: 'Legado', email: 'outro-email@x.gov.br' })
      const url = `/api/admin/accounts/${id}/sincronizar`
      const mismatch = await app.inject({ method: 'POST', url, headers: admin.headers })
      expect(mismatch.statusCode).toBe(409)
      expect(mismatch.body).toMatch(/e-mail/)
      expect(db.prepare('SELECT keycloak_sub FROM accounts WHERE id = ?').get(id)).toEqual({ keycloak_sub: null })

      // Mesmo e-mail, mas ainda não confirmado no Keycloak: a pessoa poderia tê-lo trocado sozinha.
      const kc = identity.byName('legado')
      if (kc) {
        kc.email = 'LEGADO@x.gov.br'
        kc.emailVerified = false
      }
      const unverified = await app.inject({ method: 'POST', url, headers: admin.headers })
      expect(unverified.statusCode).toBe(409)
      expect(unverified.json<{ error: { code: string } }>().error.code).toBe('EMAIL_NAO_CONFIRMADO')
      expect(db.prepare('SELECT keycloak_sub FROM accounts WHERE id = ?').get(id)).toEqual({ keycloak_sub: null })
      if (kc) kc.emailVerified = true
      expect((await app.inject({ method: 'POST', url, headers: admin.headers })).statusCode).toBe(200)
      expect(db.prepare('SELECT keycloak_sub FROM accounts WHERE id = ?').get(id)).toEqual({ keycloak_sub: kc?.id })
      expect((await login('legado')).session).toBeDefined()
    })
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

      // Conta antiga, que só existe no AQR, ganha o usuário, o vínculo pelo sub e o convite ao sincronizar.
      const old = db.prepare("SELECT id FROM accounts WHERE usuario = 'antiga'").get() as { id: string }
      expect(identity.byName('antiga')).toBeUndefined()
      expect((await post(admin.headers, `/api/admin/accounts/${old.id}/sincronizar`)).statusCode).toBe(200)
      expect(identity.byName('antiga')).toMatchObject({ enabled: true })
      expect(db.prepare('SELECT keycloak_sub FROM accounts WHERE id = ?').get(old.id)).toEqual({ keycloak_sub: identity.byName('antiga')?.id })
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

  it('sair encerra a sessão no servidor e no Keycloak, pelo backend, sem token guardado', async () => {
    const { headers } = await login('ana')
    identity.loggedOut.length = 0
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers })
    expect(out.statusCode).toBe(200)
    expect(out.json()).toEqual({ keycloakEncerrado: true })
    expect(out.body).not.toMatch(/token|logoutUrl/i)
    // O encerramento no Keycloak usa o sub vinculado, com a credencial de serviço.
    expect(identity.loggedOut).toEqual(['sub-ana'])
    // O cookie antigo não vale mais, mesmo que alguém o guarde.
    expect((await get('/api/auth/me', headers)).statusCode).toBe(401)
    expect(db.prepare("SELECT detalhe, usuario FROM access_events WHERE evento = 'logout' ORDER BY ocorrido_em DESC LIMIT 1").get()).toEqual({ detalhe: null, usuario: 'ana' })
  })

  it('Keycloak fora do ar no logout: a sessão do AQR cai mesmo assim e o registro avisa', async () => {
    const { headers } = await login('ana')
    identity.down = true
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers })
    identity.down = false
    expect(out.json()).toEqual({ keycloakEncerrado: false })
    expect((await get('/api/auth/me', headers)).statusCode).toBe(401)
  })

  it('nenhum token fica no banco: a tabela de sessões não tem coluna de token e só guarda o hash', async () => {
    const columns = db.prepare('PRAGMA table_info(sessions)').all().map((row) => row.name)
    expect(columns).toEqual(['id_hash', 'account_id', 'created_at', 'expires_at', 'last_seen_at'])
    const { session } = await login('ana')
    const dump = JSON.stringify(db.prepare('SELECT * FROM sessions').all())
    expect(dump).not.toContain(String(session))
    expect(dump).not.toMatch(/eyJ/)
  })

  it('relógio da sessão: informa quando ela cai sem contar como uso', async () => {
    const { headers } = await login('ana')
    const clock = await get('/api/auth/sessao', headers)
    expect(clock.statusCode).toBe(200)
    const expiraEm = Date.parse(clock.json<{ expiraEm: string }>().expiraEm)
    // 30 min sem uso (bem antes do limite de 8 h).
    expect(expiraEm - Date.now()).toBeGreaterThan(29 * 60_000)
    expect(expiraEm - Date.now()).toBeLessThanOrEqual(30 * 60_000)
    expect(clock.headers['cache-control']).toBe('no-store')
    expect((await get('/api/auth/sessao', {})).statusCode).toBe(401)
  })

  it('enviar redefinição de senha encerra as sessões da conta no AQR e no Keycloak', async () => {
    const admin = await login('admin')
    const victim = await login('ana')
    const other = await login('ana')
    const anaId = (db.prepare("SELECT id FROM accounts WHERE usuario = 'ana'").get() as { id: string }).id
    db.prepare("UPDATE accounts SET email = 'ana@x.gov.br' WHERE id = ?").run(anaId)
    identity.loggedOut.length = 0
    const reset = await app.inject({ method: 'POST', url: `/api/admin/accounts/${anaId}/redefinir-senha`, headers: admin.headers })
    expect(reset.statusCode).toBe(204)
    expect((await get('/api/auth/me', victim.headers)).statusCode).toBe(401)
    expect((await get('/api/auth/me', other.headers)).statusCode).toBe(401)
    expect(identity.loggedOut).toContain('sub-ana')
    // O administrador não é afetado.
    expect((await get('/api/auth/me', admin.headers)).statusCode).toBe(200)
    expect(db.prepare("SELECT detalhe FROM access_events WHERE evento = 'identidade.senha_redefinicao_enviada' ORDER BY ocorrido_em DESC LIMIT 1").get()).toEqual({ detalhe: 'sessoes_encerradas' })
  })

  describe('auditoria das comparações e registros para o administrador', () => {
    async function compare(headers: Record<string, string>) {
      const first = await makePdf([['Art. 1º O prazo é de dez dias.']])
      const second = await makePdf([['Art. 1º O prazo é de quinze dias.']])
      const body = await multipartBody([
        { field: 'original', name: 'Requerimento v1.pdf', bytes: first.bytes },
        { field: 'updated', name: 'Requerimento v2.pdf', bytes: second.bytes },
      ])
      const sent = await app.inject({ method: 'POST', url: '/api/comparisons', headers: { ...headers, ...body.headers }, payload: body.payload })
      expect(sent.statusCode).toBe(202)
      const { id } = sent.json<{ id: string }>()
      for (let i = 0; i < 100; i++) {
        const job = (await get(`/api/comparisons/${id}`, headers)).json<{ status: string }>()
        if (job.status === 'completed' || job.status === 'failed') return id
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error('a comparação não terminou')
    }

    it('registra só quem comparou, quando e o resultado: nada do conteúdo nem os nomes dos arquivos', { timeout: 20_000 }, async () => {
      const analyst = await login('ana')
      const id = await compare(analyst.headers)
      const rows = db.prepare('SELECT * FROM comparison_events WHERE comparacao_id = ? ORDER BY ocorrido_em, evento').all(id)
      expect(rows.map((row) => row.evento).sort()).toEqual(['comparacao.concluida', 'comparacao.enviada'])
      expect(rows.find((row) => row.evento === 'comparacao.enviada')).toMatchObject({ usuario: 'ana' })
      expect(Number(rows.find((row) => row.evento === 'comparacao.concluida')?.diferencas)).toBeGreaterThan(0)
      expect(Object.keys(rows[0] ?? {})).not.toContain('arquivo_original')
      expect(JSON.stringify(rows)).not.toMatch(/Requerimento|\.pdf|prazo/)
      // Só inserção dentro do prazo de retenção.
      expect(() => db.exec('DELETE FROM comparison_events')).toThrow(/só pode ser apagada depois de 1 ano/)
      expect(() => db.exec('UPDATE comparison_events SET usuario = NULL')).toThrow(/não pode ser alterada/)
    })

    it('cada comparação só é vista e cancelada por quem a enviou; entregue, ela é descartada', { timeout: 20_000 }, async () => {
      const analyst = await login('ana')
      const admin = await login('admin')
      const id = await compare(analyst.headers)
      // O administrador (e qualquer outra pessoa) recebe "não encontrada", como se não existisse.
      expect((await get(`/api/comparisons/${id}`, admin.headers)).statusCode).toBe(404)
      await app.inject({ method: 'DELETE', url: `/api/comparisons/${id}`, headers: admin.headers })
      // Quem enviou ainda consegue repetir o pedido logo depois da entrega (margem de 1 min)…
      const again = await get(`/api/comparisons/${id}`, analyst.headers)
      expect(again.statusCode).toBe(200)
      expect(again.json<{ status: string }>().status).toBe('completed')
      // …e pode descartar na hora.
      expect((await app.inject({ method: 'DELETE', url: `/api/comparisons/${id}`, headers: analyst.headers })).statusCode).toBe(204)
      expect((await get(`/api/comparisons/${id}`, analyst.headers)).statusCode).toBe(404)
    })

    it('comparação cancelada por quem enviou fica registrada como cancelada', { timeout: 20_000 }, async () => {
      const analyst = await login('ana')
      const first = await makePdf([['Art. 1º O prazo é de dez dias.']])
      const second = await makePdf([['Art. 1º O prazo é de quinze dias.']])
      const body = await multipartBody([
        { field: 'original', name: 'a.pdf', bytes: first.bytes },
        { field: 'updated', name: 'b.pdf', bytes: second.bytes },
      ])
      const sent = await app.inject({ method: 'POST', url: '/api/comparisons', headers: { ...analyst.headers, ...body.headers }, payload: body.payload })
      const { id } = sent.json<{ id: string }>()
      expect((await app.inject({ method: 'DELETE', url: `/api/comparisons/${id}`, headers: analyst.headers })).statusCode).toBe(204)
      for (let i = 0; i < 100 && !db.prepare("SELECT 1 FROM comparison_events WHERE comparacao_id = ? AND evento != 'comparacao.enviada'").get(id); i++) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      expect(db.prepare("SELECT evento, detalhe FROM comparison_events WHERE comparacao_id = ? AND evento != 'comparacao.enviada'").all(id)).toEqual([
        { evento: 'comparacao.falhou', detalhe: 'CANCELLED' },
      ])
    })

    it('apaga sozinho o registro das comparações com mais de 1 ano, e só esse', async () => {
      const anaId = (db.prepare("SELECT id FROM accounts WHERE usuario = 'ana'").get() as { id: string }).id
      const old = new Date(Date.now() - 400 * 86_400_000).toISOString()
      db.prepare("INSERT INTO comparison_events (id, ocorrido_em, evento, conta_id, usuario, comparacao_id) VALUES ('antigo', ?, 'comparacao.enviada', ?, 'ana', 'c-antiga')").run(old, anaId)
      const before = Number((db.prepare('SELECT count(*) AS n FROM comparison_events').get() as { n: number }).n)
      expect(purgeOldComparisonEvents(db)).toBe(1)
      expect(Number((db.prepare('SELECT count(*) AS n FROM comparison_events').get() as { n: number }).n)).toBe(before - 1)
    })

    it('só o administrador lê os registros de acesso e de comparações, com filtro e paginação', async () => {
      const admin = await login('admin')
      const analyst = await login('ana')
      for (const path of ['/api/admin/access-events', '/api/admin/comparison-events']) {
        expect((await get(path, analyst.headers)).statusCode).toBe(403)
        expect((await get(path, {})).statusCode).toBe(401)
      }
      const access = await get('/api/admin/access-events?pageSize=2&evento=login.ok', admin.headers)
      expect(access.statusCode).toBe(200)
      const page = access.json<{ items: { evento: string }[]; total: number; pageSize: number }>()
      expect(page.items.length).toBeLessThanOrEqual(2)
      expect(page.items.every((item) => item.evento === 'login.ok')).toBe(true)
      expect(page.total).toBeGreaterThan(2)
      expect(access.body).not.toMatch(/token|eyJ/)
      const comparisons = await get('/api/admin/comparison-events?usuario=ana', admin.headers)
      expect(comparisons.json<{ items: { evento: string }[] }>().items.some((item) => item.evento === 'comparacao.enviada')).toBe(true)
      expect(comparisons.body).not.toMatch(/arquivo|\.pdf/i)
      expect((await get('/api/admin/comparison-events/resumo', analyst.headers)).statusCode).toBe(403)
      const usage = (await get('/api/admin/comparison-events/resumo', admin.headers)).json<{ items: { usuario: string; nome: string; total: number; concluidas: number; falhas: number; ultimos30Dias: number }[] }>()
      const ana = usage.items.find((item) => item.usuario === 'ana')
      expect(ana).toMatchObject({ nome: expect.any(String) })
      expect(ana?.total).toBeGreaterThanOrEqual(2)
      expect(ana?.ultimos30Dias).toBe(ana?.total)
      // Toda comparação enviada termina concluída ou com falha (cancelada conta como falha).
      expect((ana?.concluidas ?? 0) + (ana?.falhas ?? 0)).toBe(ana?.total)
      expect(ana?.falhas).toBe(1)
      expect((await get('/api/admin/access-events?evento=' + 'x'.repeat(101), admin.headers)).statusCode).toBe(400)
      expect((await get('/api/admin/access-events?evento=nao.existe', admin.headers)).statusCode).toBe(400)
      // Filtro só com espaços vale como "sem filtro" (antes, deslocava os parâmetros e dava 500).
      expect((await get('/api/admin/access-events?usuario=%20%20&evento=%20', admin.headers)).statusCode).toBe(200)
      const logouts = await get('/api/admin/access-events?evento=logout&usuario=ana', admin.headers)
      expect(logouts.statusCode).toBe(200)
    })
  })
})
