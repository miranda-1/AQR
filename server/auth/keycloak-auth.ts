import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AuthStatus, SessionClock, SessionUser } from '../../shared/contracts/auth.ts'
import { isAccountRole } from '../../shared/validation/account.ts'
import { optionalTextColumn, textColumn, type Database } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'
import type { AuthProvider } from './auth-provider.ts'
import type { IdentityProvider } from './identity-provider.ts'
import type { KeycloakClient } from './keycloak-client.ts'
import { PendingLogins } from './pending-logins.ts'
import type { Principal } from './principal.ts'
import type { SessionStore } from './session-store.ts'

export const SESSION_COOKIE = 'aqr_sessao'
export const LOGIN_COOKIE = 'aqr_login'
const PENDING_TTL_MS = 10 * 60_000
/** Logins em andamento guardados ao mesmo tempo; além disso, os mais antigos são descartados. */
const MAX_PENDING = 10_000
const STATE_FORMAT = /^[\w-]{16,128}$/u
/** Logins em andamento lembrados por navegador (abas ao mesmo tempo); os mais antigos saem. */
const MAX_LOGINS_PER_BROWSER = 5

/**
 * Chave do limite de tentativas: o IPv4 inteiro ou o bloco /64 do IPv6 (quem tem um /64 troca de
 * endereço à vontade, então o bloco é que identifica a origem).
 */
export function rateLimitKey(ip: string): string {
  if (!ip.includes(':')) return ip
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/iu.exec(ip)
  if (mapped?.[1]) return mapped[1]
  const [head = '', tail = ''] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = ip.includes('::') && tail ? tail.split(':') : []
  const groups = ip.includes('::') ? [...left, ...Array<string>(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left
  return `${groups.slice(0, 4).map((group) => group.toLowerCase().replace(/^0+(?=.)/u, '')).join(':')}::/64`
}
type AccessEvent =
  | 'login.ok'
  | 'login.sem_conta'
  | 'login.conta_inativa'
  | 'login.falha'
  | 'login.vinculo_pendente'
  | 'login.vinculo_divergente'
  | 'logout'
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export interface KeycloakAuthOptions {
  client: KeycloakClient
  sessions: SessionStore
  db: Database
  /** Endereço público do site (origem do navegador), ex.: http://localhost:5173. */
  appBaseUrl: string
  /** Credencial de serviço, usada para encerrar a sessão da pessoa no Keycloak no logout. */
  identity: IdentityProvider
  /** Inícios de login e retornos do Keycloak aceitos por IP, a cada minuto. */
  loginAttemptsPerMinute: number
}

function readCookie(request: FastifyRequest, name: string): string | undefined {
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
}

const INTERNAL = 'http://aqr.interno'

/**
 * Só caminhos internos; evita redirecionar a pessoa para outro site depois do login. O caminho é
 * interpretado como o navegador faria (que ignora tab e quebras de linha e trata `\` como `/`) e
 * precisa continuar na mesma origem.
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/')) return '/'
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/u.test(value)) return '/'
  let url: URL
  try {
    url = new URL(value, INTERNAL)
  } catch {
    return '/'
  }
  if (url.origin !== INTERNAL) return '/'
  const path = `${url.pathname}${url.search}${url.hash}`
  return path.startsWith('//') || path.startsWith('/entrar') ? '/' : path
}

/** Provedor de autenticação real: a pessoa vem da sessão do servidor e da conta ativa no banco. */
export function createKeycloakAuthProvider(options: Pick<KeycloakAuthOptions, 'sessions' | 'db'>): AuthProvider {
  const findById = options.db.prepare("SELECT id, usuario, nome, papel FROM accounts WHERE id = ? AND situacao = 'ativa'")
  return {
    kind: 'real',
    async resolvePrincipal(request): Promise<Principal | null> {
      const id = readCookie(request, SESSION_COOKIE)
      const session = options.sessions.get(id, { touch: false })
      if (!session || !id) return null
      // A conta é conferida a cada pedido: desativar ou mudar o papel vale na hora.
      const row = findById.get(session.accountId)
      if (!row) return null
      // Só pedido de conta ativa conta como uso e adia a queda por inatividade.
      options.sessions.touch(id)
      const papel = textColumn(row, 'papel')
      if (!isAccountRole(papel)) return null
      return { accountId: textColumn(row, 'id'), usuario: textColumn(row, 'usuario'), nome: textColumn(row, 'nome'), papel, origem: 'real' }
    },
  }
}

export function registerKeycloakAuthRoutes(app: FastifyInstance, options: KeycloakAuthOptions, provider: AuthProvider): void {
  const { client, sessions, db, identity } = options
  const base = new URL(options.appBaseUrl)
  const secure = base.protocol === 'https:'
  const redirectUri = new URL('/api/auth/callback', base).href
  const pending = new PendingLogins(PENDING_TTL_MS, MAX_PENDING)
  // Limite simples por origem (janela de 1 min) para iniciar login: evita encher a memória e o registro.
  // O retorno do Keycloak não conta: ele só vale com um login começado (e limitado) aqui.
  // O mapa guarda as janelas em ordem de abertura e tem teto: as mais antigas saem primeiro.
  const attempts = new Map<string, { windowStart: number; count: number }>()
  const tooManyAttempts = (ip: string): boolean => {
    const now = Date.now()
    const key = rateLimitKey(ip)
    const current = attempts.get(key)
    if (!current || now - current.windowStart >= 60_000) {
      attempts.delete(key)
      attempts.set(key, { windowStart: now, count: 1 })
      for (const [oldKey, value] of attempts) {
        if (attempts.size <= MAX_PENDING && now - value.windowStart < 60_000) break
        attempts.delete(oldKey)
      }
      return false
    }
    current.count += 1
    return current.count > options.loginAttemptsPerMinute
  }
  // A conta é localizada pelo `sub` (imutável) do Keycloak. O nome de usuário só serve para explicar a recusa.
  const findBySub = db.prepare('SELECT id, situacao FROM accounts WHERE keycloak_sub = ?')
  const findByUser = db.prepare('SELECT id, keycloak_sub FROM accounts WHERE usuario = ? COLLATE NOCASE')
  const findSub = db.prepare('SELECT keycloak_sub, usuario FROM accounts WHERE id = ?')
  const insertEvent = db.prepare('INSERT INTO access_events (id, ocorrido_em, evento, usuario, conta_id, ip, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const record = (evento: AccessEvent, request: FastifyRequest, usuario: string | null, contaId: string | null, detalhe: string | null = null): void => {
    insertEvent.run(randomUUID(), new Date().toISOString(), evento, usuario, contaId, request.ip, detalhe)
  }

  const cookie = (name: string, value: string, maxAgeSeconds: number, path = '/'): string =>
    `${name}=${value}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`
  // O cookie `aqr_login` (só em /api/auth) lista os `state` dos logins em andamento NESTE navegador
  // (até 5, separados por "."): liga o retorno do Keycloak a quem começou o login e permite abas
  // simultâneas, sem acumular um cookie por login abandonado.
  const statesOf = (request: FastifyRequest): string[] =>
    (readCookie(request, LOGIN_COOKIE) ?? '').split('.').filter((state) => STATE_FORMAT.test(state)).slice(0, MAX_LOGINS_PER_BROWSER)
  const loginCookie = (states: readonly string[]): string =>
    states.length > 0 ? cookie(LOGIN_COOKIE, states.join('.'), PENDING_TTL_MS / 1000, '/api/auth') : cookie(LOGIN_COOKIE, '', 0, '/api/auth')
  /** O cookie sem o `state` que acabou de ser usado (ou recusado). */
  const withoutState = (request: FastifyRequest, state: string | undefined): string =>
    loginCookie(statesOf(request).filter((item) => item !== state))
  const goToLoginError = (reply: FastifyReply, code: string, request?: FastifyRequest, state?: string): FastifyReply => {
    if (request && state) void reply.header('set-cookie', withoutState(request, state))
    return reply.redirect(new URL(`/entrar?erro=${code}`, base).href)
  }

  // Defesa contra requisições forjadas por outros sites: pedidos que alteram dados precisam vir da nossa origem.
  app.addHook('onRequest', async (request) => {
    // Vale para todo pedido que altera dados, qualquer que seja o caminho escrito (ex.: `/%61pi/...`).
    if (!UNSAFE_METHODS.has(request.method)) return
    if (request.headers.origin !== base.origin) {
      throw new ApiError(403, 'BAD_ORIGIN', 'Este pedido não veio do AQR. Recarregue a página e tente de novo.')
    }
  })

  app.addHook('onRequest', async (request) => {
    // Comparação de PDFs exige pessoa autenticada (qualquer papel). Usa a rota encontrada, não o
    // caminho escrito, para que um caminho codificado não escape da conferência.
    if (!(request.routeOptions.url ?? '').startsWith('/api/comparisons')) return
    if (!(await provider.resolvePrincipal(request))) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sua sessão terminou. Entre de novo para continuar.')
    }
  })

  app.get('/api/auth/status', async (): Promise<AuthStatus> => ({ mode: 'keycloak' }))

  app.get('/api/auth/me', async (request): Promise<SessionUser> => {
    const principal = await provider.resolvePrincipal(request)
    if (!principal) throw new ApiError(401, 'UNAUTHENTICATED', 'Você não está conectado. Entre para continuar.')
    return { usuario: principal.usuario, nome: principal.nome, papel: principal.papel }
  })

  // Relógio da sessão para o navegador avisar e voltar ao login na hora certa. Não conta como uso:
  // só a atividade da pessoa (cliques, teclas, pedidos de verdade) mantém a sessão aberta.
  const isActive = db.prepare("SELECT 1 AS ok FROM accounts WHERE id = ? AND situacao = 'ativa'")
  app.get('/api/auth/sessao', async (request, reply): Promise<SessionClock> => {
    const session = sessions.get(readCookie(request, SESSION_COOKIE), { touch: false })
    if (!session || !isActive.get(session.accountId)) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Sua sessão terminou. Entre de novo para continuar.')
    }
    void reply.header('cache-control', 'no-store')
    return { expiraEm: new Date(session.expiresAt).toISOString() }
  })

  app.get('/api/auth/login', async (request, reply) => {
    if (tooManyAttempts(request.ip)) return goToLoginError(reply, 'muitas_tentativas')
    const { returnTo } = request.query as { returnTo?: string }
    let started
    try {
      started = await client.startLogin(redirectUri)
    } catch (error) {
      request.log.error({ err: error }, 'Keycloak indisponível ao iniciar o login')
      return goToLoginError(reply, 'indisponivel')
    }
    pending.add(started.pending, safeReturnTo(returnTo))
    const states = [started.pending.state, ...statesOf(request)].slice(0, MAX_LOGINS_PER_BROWSER)
    return reply.header('set-cookie', loginCookie(states)).redirect(started.url)
  })

  app.get('/api/auth/callback', async (request, reply) => {
    const query = request.query as { state?: unknown; error?: unknown }
    const state = typeof query.state === 'string' && STATE_FORMAT.test(query.state) ? query.state : undefined
    // O retorno só vale no navegador que começou o login (cookie daquele `state`).
    const entry = state && statesOf(request).includes(state) ? pending.take(state) : undefined
    if (!state || !entry) return goToLoginError(reply, 'expirado', request, state)
    if (query.error) return goToLoginError(reply, 'negado', request, state)

    let result
    try {
      result = await client.finishLogin(new URL(request.url, base), entry)
    } catch (error) {
      request.log.warn({ err: error }, 'Falha ao concluir o login no Keycloak')
      record('login.falha', request, null, null)
      return goToLoginError(reply, 'falha', request, state)
    }
    const row = findBySub.get(result.identity.sub)
    if (!row) {
      // Sem vínculo pelo sub, ninguém entra, nem que o nome de usuário coincida: o nome pode ser
      // trocado ou reaproveitado no Keycloak. Contas antigas esperam o vínculo feito por um administrador.
      const byName = findByUser.get(result.identity.usuario)
      const bound = byName ? optionalTextColumn(byName, 'keycloak_sub') : null
      const event = !byName ? 'login.sem_conta' : bound ? 'login.vinculo_divergente' : 'login.vinculo_pendente'
      record(event, request, result.identity.usuario, byName ? textColumn(byName, 'id') : null)
      return goToLoginError(reply, !byName ? 'sem_conta' : bound ? 'vinculo_divergente' : 'vinculo_pendente', request, state)
    }
    if (textColumn(row, 'situacao') !== 'ativa') {
      record('login.conta_inativa', request, result.identity.usuario, textColumn(row, 'id'))
      return goToLoginError(reply, 'conta_inativa', request, state)
    }
    const id = sessions.create(textColumn(row, 'id'))
    record('login.ok', request, result.identity.usuario, textColumn(row, 'id'))
    return reply
      .header('set-cookie', [cookie(SESSION_COOKIE, id, 8 * 3600), withoutState(request, state)])
      .redirect(new URL(entry.returnTo, base).href)
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const id = readCookie(request, SESSION_COOKIE)
    const session = sessions.get(id)
    sessions.destroy(id)
    let detalhe: string | null = null
    if (session) {
      // Encerra também o login único no Keycloak, pelo backend, com a credencial de serviço (sem
      // guardar nem enviar token): o próximo "Entrar" volta a pedir usuário e senha.
      const account = findSub.get(session.accountId)
      const keycloakId = account ? optionalTextColumn(account, 'keycloak_sub') : null
      try {
        if (keycloakId) await identity.logoutUser(keycloakId)
      } catch (error) {
        detalhe = 'keycloak_nao_encerrado'
        request.log.warn({ err: error }, 'Não foi possível encerrar a sessão no Keycloak')
      }
      record('logout', request, account ? textColumn(account, 'usuario') : null, session.accountId, detalhe)
    }
    return reply.header('set-cookie', cookie(SESSION_COOKIE, '', 0)).send({ keycloakEncerrado: detalhe === null })
  })
}
