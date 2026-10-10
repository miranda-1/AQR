import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AuthStatus, SessionUser } from '../../shared/contracts/auth.ts'
import { isAccountRole } from '../../shared/validation/account.ts'
import { optionalTextColumn, textColumn, type Database } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'
import type { AuthProvider } from './auth-provider.ts'
import type { IdentityProvider } from './identity-provider.ts'
import type { KeycloakClient, PendingLogin } from './keycloak-client.ts'
import type { Principal } from './principal.ts'
import type { SessionStore } from './session-store.ts'

export const SESSION_COOKIE = 'aqr_sessao'
export const LOGIN_COOKIE = 'aqr_login'
const PENDING_TTL_MS = 10 * 60_000
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
}

function readCookie(request: FastifyRequest, name: string): string | undefined {
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
}

/** Só caminhos internos; evita redirecionar a pessoa para outro site depois do login. */
export function safeReturnTo(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') && !value.startsWith('/entrar')) {
    return value
  }
  return '/'
}

/** Provedor de autenticação real: a pessoa vem da sessão do servidor e da conta ativa no banco. */
export function createKeycloakAuthProvider(options: Pick<KeycloakAuthOptions, 'sessions' | 'db'>): AuthProvider {
  const findById = options.db.prepare("SELECT id, usuario, nome, papel FROM accounts WHERE id = ? AND situacao = 'ativa'")
  return {
    kind: 'real',
    async resolvePrincipal(request): Promise<Principal | null> {
      const session = options.sessions.get(readCookie(request, SESSION_COOKIE))
      if (!session) return null
      // A conta é conferida a cada pedido: desativar ou mudar o papel vale na hora.
      const row = findById.get(session.accountId)
      if (!row) return null
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
  const pending = new Map<string, PendingLogin & { returnTo: string; expiresAt: number }>()
  // A conta é localizada pelo `sub` (imutável) do Keycloak. O nome de usuário só serve para explicar a recusa.
  const findBySub = db.prepare('SELECT id, situacao FROM accounts WHERE keycloak_sub = ?')
  const findByUser = db.prepare('SELECT id, keycloak_sub FROM accounts WHERE usuario = ? COLLATE NOCASE')
  const findSub = db.prepare('SELECT keycloak_sub FROM accounts WHERE id = ?')
  const insertEvent = db.prepare('INSERT INTO access_events (id, ocorrido_em, evento, usuario, conta_id, ip, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const record = (evento: AccessEvent, request: FastifyRequest, usuario: string | null, contaId: string | null, detalhe: string | null = null): void => {
    insertEvent.run(randomUUID(), new Date().toISOString(), evento, usuario, contaId, request.ip, detalhe)
  }

  const cookie = (name: string, value: string, maxAgeSeconds: number): string =>
    `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`
  const goToLoginError = (reply: FastifyReply, code: string): FastifyReply =>
    reply.header('set-cookie', cookie(LOGIN_COOKIE, '', 0)).redirect(new URL(`/entrar?erro=${code}`, base).href)

  // Defesa contra requisições forjadas por outros sites: pedidos que alteram dados precisam vir da nossa origem.
  app.addHook('onRequest', async (request) => {
    if (!UNSAFE_METHODS.has(request.method) || !request.url.startsWith('/api/')) return
    if (request.headers.origin !== base.origin) {
      throw new ApiError(403, 'BAD_ORIGIN', 'Este pedido não veio do AQR. Recarregue a página e tente de novo.')
    }
  })

  app.addHook('onRequest', async (request) => {
    // Comparação de PDFs exige pessoa autenticada (qualquer papel).
    if (!request.url.startsWith('/api/comparisons')) return
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

  app.get('/api/auth/login', async (request, reply) => {
    const { returnTo } = request.query as { returnTo?: string }
    let started
    try {
      started = await client.startLogin(redirectUri)
    } catch (error) {
      request.log.error({ err: error }, 'Keycloak indisponível ao iniciar o login')
      return goToLoginError(reply, 'indisponivel')
    }
    pending.set(started.pending.state, { ...started.pending, returnTo: safeReturnTo(returnTo), expiresAt: Date.now() + PENDING_TTL_MS })
    return reply.header('set-cookie', cookie(LOGIN_COOKIE, started.pending.state, PENDING_TTL_MS / 1000)).redirect(started.url)
  })

  app.get('/api/auth/callback', async (request, reply) => {
    const state = readCookie(request, LOGIN_COOKIE)
    const entry = state ? pending.get(state) : undefined
    if (state) pending.delete(state)
    if (!entry || entry.expiresAt < Date.now()) return goToLoginError(reply, 'expirado')
    if ((request.query as { error?: string }).error) return goToLoginError(reply, 'negado')

    let result
    try {
      result = await client.finishLogin(new URL(request.url, base), entry)
    } catch (error) {
      request.log.warn({ err: error }, 'Falha ao concluir o login no Keycloak')
      record('login.falha', request, null, null)
      return goToLoginError(reply, 'falha')
    }
    const row = findBySub.get(result.identity.sub)
    if (!row) {
      // Sem vínculo pelo sub, ninguém entra, nem que o nome de usuário coincida: o nome pode ser
      // trocado ou reaproveitado no Keycloak. Contas antigas esperam o vínculo feito por um administrador.
      const byName = findByUser.get(result.identity.usuario)
      const bound = byName ? optionalTextColumn(byName, 'keycloak_sub') : null
      const event = !byName ? 'login.sem_conta' : bound ? 'login.vinculo_divergente' : 'login.vinculo_pendente'
      record(event, request, result.identity.usuario, byName ? textColumn(byName, 'id') : null)
      return goToLoginError(reply, !byName ? 'sem_conta' : bound ? 'vinculo_divergente' : 'vinculo_pendente')
    }
    if (textColumn(row, 'situacao') !== 'ativa') {
      record('login.conta_inativa', request, result.identity.usuario, textColumn(row, 'id'))
      return goToLoginError(reply, 'conta_inativa')
    }
    const id = sessions.create({ accountId: textColumn(row, 'id') })
    record('login.ok', request, result.identity.usuario, textColumn(row, 'id'))
    return reply
      .header('set-cookie', [cookie(SESSION_COOKIE, id, 8 * 3600), cookie(LOGIN_COOKIE, '', 0)])
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
      const sub = findSub.get(session.accountId)
      const keycloakId = sub ? optionalTextColumn(sub, 'keycloak_sub') : null
      try {
        if (keycloakId) await identity.logoutUser(keycloakId)
      } catch (error) {
        detalhe = 'keycloak_nao_encerrado'
        request.log.warn({ err: error }, 'Não foi possível encerrar a sessão no Keycloak')
      }
      record('logout', request, null, session.accountId, detalhe)
    }
    return reply.header('set-cookie', cookie(SESSION_COOKIE, '', 0)).send({ keycloakEncerrado: detalhe === null })
  })
}
