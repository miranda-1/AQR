import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { AuthStatus, SessionClock, SessionUser } from '../../shared/contracts/auth.ts'
import { isAccountRole } from '../../shared/validation/account.ts'
import { optionalTextColumn, textColumn, type Database } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'
import type { AuthProvider } from './auth-provider.ts'
import type { IdentityProvider } from './identity-provider.ts'
import { InvalidCredentialsError, type KeycloakClient } from './keycloak-client.ts'
import type { Principal } from './principal.ts'
import type { SessionStore } from './session-store.ts'

export const SESSION_COOKIE = 'aqr_sessao'
/** Origens diferentes acompanhadas ao mesmo tempo pelo limite de tentativas; as mais antigas saem. */
const MAX_TRACKED_ORIGINS = 10_000
const SESSION_MAX_AGE_SECONDS = 8 * 3600

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

/**
 * Limite de pedidos por origem (IP ou bloco /64 do IPv6) numa janela de 1 minuto. O mapa guarda as
 * janelas em ordem de abertura e tem teto: as mais antigas saem primeiro. Devolve verdadeiro quando
 * a origem passou do limite.
 */
export function createAttemptLimiter(perMinute: number): (ip: string) => boolean {
  const attempts = new Map<string, { windowStart: number; count: number }>()
  return (ip) => {
    const now = Date.now()
    const key = rateLimitKey(ip)
    const current = attempts.get(key)
    if (!current || now - current.windowStart >= 60_000) {
      attempts.delete(key)
      attempts.set(key, { windowStart: now, count: 1 })
      for (const [oldKey, value] of attempts) {
        if (attempts.size <= MAX_TRACKED_ORIGINS && now - value.windowStart < 60_000) break
        attempts.delete(oldKey)
      }
      return false
    }
    current.count += 1
    return current.count > perMinute
  }
}

export interface KeycloakAuthOptions {
  client: KeycloakClient
  sessions: SessionStore
  db: Database
  /** Endereço público do site (origem do navegador), ex.: http://localhost:5173. */
  appBaseUrl: string
  /** Credencial de serviço, usada para encerrar a sessão da pessoa no Keycloak no logout. */
  identity: IdentityProvider
  /** Tentativas de login aceitas por origem (IP ou bloco /64 do IPv6), a cada minuto. */
  loginAttemptsPerMinute: number
}

export function readCookie(request: FastifyRequest, name: string): string | undefined {
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
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

const MESSAGES = {
  credenciais: 'Usuário ou senha incorretos. Confira e tente de novo.',
  semConta: 'Seu usuário e senha estão certos, mas você ainda não tem conta no AQR. Peça a um administrador do AQR para cadastrá-lo.',
  contaInativa: 'Sua conta do AQR está desativada. Fale com um administrador do AQR para reativá-la.',
  vinculoPendente: 'Sua conta do AQR ainda não foi vinculada ao seu acesso. Peça a um administrador do AQR para concluir o vínculo.',
  vinculoDivergente: 'Este acesso não corresponde à conta do AQR com o mesmo usuário. Por segurança, o login foi recusado; fale com um administrador do AQR.',
  muitas: 'Foram muitas tentativas de entrar em pouco tempo. Aguarde um minuto e tente de novo.',
  indisponivel: 'O sistema de login está indisponível agora. Tente de novo em alguns minutos.',
} as const

function readCredentials(body: unknown): { usuario: string; senha: string } {
  const usuario = typeof body === 'object' && body !== null && 'usuario' in body && typeof body.usuario === 'string' ? body.usuario.trim() : ''
  const senha = typeof body === 'object' && body !== null && 'senha' in body && typeof body.senha === 'string' ? body.senha : ''
  if (!usuario || !senha || usuario.length > 100 || senha.length > 256) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Informe o usuário e a senha.')
  }
  return { usuario, senha }
}

export function registerKeycloakAuthRoutes(app: FastifyInstance, options: KeycloakAuthOptions, provider: AuthProvider): void {
  const { client, sessions, db, identity } = options
  const base = new URL(options.appBaseUrl)
  const secure = base.protocol === 'https:'
  // Limite simples por origem para tentativas de login: além do bloqueio por usuário do próprio
  // Keycloak, segura quem testa muitas senhas de muitos usuários.
  const tooManyAttempts = createAttemptLimiter(options.loginAttemptsPerMinute)
  // A conta é localizada pelo `sub` (imutável) do Keycloak. O nome de usuário só serve para explicar a recusa.
  const findBySub = db.prepare('SELECT id, situacao, usuario, nome, papel FROM accounts WHERE keycloak_sub = ?')
  const findByUser = db.prepare('SELECT id, keycloak_sub FROM accounts WHERE usuario = ? COLLATE NOCASE')
  const findSub = db.prepare('SELECT keycloak_sub, usuario FROM accounts WHERE id = ?')
  const insertEvent = db.prepare('INSERT INTO access_events (id, ocorrido_em, evento, usuario, conta_id, ip, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const record = (evento: AccessEvent, request: FastifyRequest, usuario: string | null, contaId: string | null, detalhe: string | null = null): void => {
    insertEvent.run(randomUUID(), new Date().toISOString(), evento, usuario, contaId, request.ip, detalhe)
  }
  const sessionCookie = (value: string, maxAgeSeconds: number): string =>
    `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`

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

  // Login na tela do próprio AQR: o usuário e a senha vêm no corpo (JSON, só por HTTPS em produção),
  // são conferidos no Keycloak e descartados. Nada da senha vai para log, banco ou resposta.
  app.post('/api/auth/entrar', async (request, reply): Promise<SessionUser> => {
    if (tooManyAttempts(request.ip)) throw new ApiError(429, 'MUITAS_TENTATIVAS', MESSAGES.muitas)
    const { usuario, senha } = readCredentials(request.body)
    let person
    try {
      person = await client.passwordLogin(usuario, senha)
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        record('login.falha', request, usuario.toLowerCase(), null, 'credenciais_invalidas')
        throw new ApiError(401, 'CREDENCIAIS_INVALIDAS', MESSAGES.credenciais)
      }
      request.log.error({ err: error }, 'Keycloak indisponível ao conferir o login')
      throw new ApiError(503, 'INDISPONIVEL', MESSAGES.indisponivel)
    }
    const row = findBySub.get(person.sub)
    if (!row) {
      // Sem vínculo pelo sub, ninguém entra, nem que o nome de usuário coincida: o nome pode ser
      // trocado ou reaproveitado no Keycloak. Contas antigas esperam o vínculo feito por um administrador.
      const byName = findByUser.get(person.usuario)
      const bound = byName ? optionalTextColumn(byName, 'keycloak_sub') : null
      const contaId = byName ? textColumn(byName, 'id') : null
      if (!byName) {
        record('login.sem_conta', request, person.usuario, null)
        throw new ApiError(403, 'SEM_CONTA', MESSAGES.semConta)
      }
      record(bound ? 'login.vinculo_divergente' : 'login.vinculo_pendente', request, person.usuario, contaId)
      throw bound ? new ApiError(403, 'VINCULO_DIVERGENTE', MESSAGES.vinculoDivergente) : new ApiError(403, 'VINCULO_PENDENTE', MESSAGES.vinculoPendente)
    }
    const accountId = textColumn(row, 'id')
    if (textColumn(row, 'situacao') !== 'ativa') {
      record('login.conta_inativa', request, person.usuario, accountId)
      throw new ApiError(403, 'CONTA_INATIVA', MESSAGES.contaInativa)
    }
    const papel = textColumn(row, 'papel')
    if (!isAccountRole(papel)) throw new ApiError(500, 'INTERNAL', 'A conta tem um papel inválido. Fale com o suporte.')
    // Um login novo substitui a sessão que este navegador já tivesse.
    sessions.destroy(readCookie(request, SESSION_COOKIE))
    const id = sessions.create(accountId)
    record('login.ok', request, person.usuario, accountId)
    void reply.header('set-cookie', sessionCookie(id, SESSION_MAX_AGE_SECONDS)).header('cache-control', 'no-store')
    return { usuario: textColumn(row, 'usuario'), nome: textColumn(row, 'nome'), papel }
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const id = readCookie(request, SESSION_COOKIE)
    const session = sessions.get(id)
    sessions.destroy(id)
    let detalhe: string | null = null
    if (session) {
      // Encerra também a sessão aberta no Keycloak, pelo backend, com a credencial de serviço (sem
      // guardar nem enviar token).
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
    return reply.header('set-cookie', sessionCookie('', 0)).send({ keycloakEncerrado: detalhe === null })
  })
}
