import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import { registerAdminRoutes } from './admin/routes.ts'
import type { AuthStatus } from '../shared/contracts/auth.ts'
import type { AuthProvider } from './auth/auth-provider.ts'
import { createComparisonAudit, purgeOldComparisonEvents } from './comparison/audit.ts'
import { IdentityProvisioner } from './admin/identity-sync.ts'
import { KeycloakIdentityProvider, type IdentityProvider } from './auth/identity-provider.ts'
import { createDevAuthProvider } from './auth/dev-auth-provider.ts'
import { createKeycloakAuthProvider, registerKeycloakAuthRoutes } from './auth/keycloak-auth.ts'
import { KeycloakClient } from './auth/keycloak-client.ts'
import { SmtpMailer, type Mailer } from './auth/mailer.ts'
import { PasswordLinks } from './auth/password-links.ts'
import { registerPasswordRoutes } from './auth/password-routes.ts'
import { SessionStore } from './auth/session-store.ts'
import { openDatabase, type Database } from './db/database.ts'
import { migrate } from './db/migrate.ts'
import { ComparisonJobStore } from './comparison/job-store.ts'
import { comparisonLimitsFor } from './comparison/limits.ts'
import { registerComparisonRoutes } from './comparison/routes.ts'
import { ComparisonWorkerPool } from './comparison/worker-pool.ts'
import type { ServerConfig } from './config.ts'
import { registerErrorHandling } from './http/errors.ts'

/** JSON da API é pequeno; os PDFs chegam por multipart, com limites próprios. */
const JSON_BODY_LIMIT = 64 * 1024

export interface AppDependencies {
  /** Banco já aberto (testes). Sem ele, a administração abre `config.databasePath`. */
  db?: Database
  /** Cliente do Keycloak (testes trocam por um servidor OIDC falso). */
  keycloakClient?: KeycloakClient
  /** Provedor de identidades (testes trocam por um falso). */
  identityProvider?: IdentityProvider
  /** Envio de e-mail (testes trocam por uma caixa em memória). */
  mailer?: Mailer
}

/** Sessão: cai depois de 30 min sem uso e, em qualquer caso, 8 h depois do login (decisão do responsável). */
const SESSION_LIMITS = { maxAgeMs: 8 * 3600_000, idleMs: 30 * 60_000 }

/** No login real: cada comparação pertence a quem a enviou e fica registrada (sem conteúdo nem nomes). */
function comparisonAccess(auth: AuthProvider, db: Database, log: (message: string, error: unknown) => void) {
  return {
    audit: createComparisonAudit(db, log),
    identify: async (request: FastifyRequest) => {
      const principal = await auth.resolvePrincipal(request)
      return principal ? { accountId: principal.accountId, usuario: principal.usuario } : null
    },
  }
}

/**
 * Monta o servidor sem abrir porta, para os testes usarem `app.inject()`.
 */
export async function buildApp(config: ServerConfig, deps: AppDependencies = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.logLevel },
    // Só os proxies informados em TRUST_PROXY podem dizer o IP de quem acessa (X-Forwarded-For).
    trustProxy: config.trustProxy.length > 0 ? config.trustProxy : false,
    bodyLimit: JSON_BODY_LIMIT,
    // Ids de requisição curtos e sem dados do cliente.
    disableRequestLogging: config.environment === 'test',
  })
  registerErrorHandling(app)

  app.addHook('onSend', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff')
    reply.header('referrer-policy', 'no-referrer')
    if (!reply.hasHeader('cache-control')) reply.header('cache-control', 'no-store')
  })

  await app.register(multipart, { limits: { fileSize: config.comparison.maxFileSizeBytes, files: 2, fields: 0, parts: 2 } })

  app.get('/api/health', async () => ({ status: 'ok' as const }))

  // Atrás de um proxy não informado em TRUST_PROXY, todo pedido parece vir do mesmo IP: os registros
  // perdem o IP real e o limite de tentativas de login passa a valer para todos juntos. Avisa uma vez.
  if (config.trustProxy.length === 0) {
    let warned = false
    app.addHook('onRequest', async (request) => {
      if (warned || request.headers['x-forwarded-for'] === undefined) return
      warned = true
      request.log.warn('Chegou um pedido com X-Forwarded-For e TRUST_PROXY está vazio. Se o AQR estiver atrás de um proxy reverso, informe o IP dele em TRUST_PROXY.')
    })
  }

  // Login real: precisa vir antes das demais rotas, porque registra os ganchos que as protegem.
  let realAuth: AuthProvider | null = null
  let realDb: Database | null = null
  let realIdentity: IdentityProvider | null = null
  let realMail: { mailer: Mailer; links: PasswordLinks } | null = null
  if (config.keycloak) {
    const db = deps.db ?? openDatabase(config.databasePath)
    migrate(db)
    if (!deps.db) app.addHook('onClose', async () => db.close())
    const sessions = new SessionStore(db, SESSION_LIMITS)
    const links = new PasswordLinks(db, config.keycloak.appBaseUrl)
    // Limpeza periódica: sessões vencidas (a cada minuto); links de senha velhos e registro de comparações com mais de 1 ano (a cada hora).
    let minutes = 0
    const housekeeping = () => {
      try {
        sessions.purgeExpired()
        if (minutes++ % 60 === 0) {
          purgeOldComparisonEvents(db)
          links.purge()
        }
      } catch (error) {
        // Banco já fechado durante o desligamento.
        if (db.isOpen) app.log.error({ err: error }, 'Falha na limpeza periódica do banco')
      }
    }
    housekeeping()
    const sweep = setInterval(housekeeping, 60_000)
    sweep.unref()
    app.addHook('onClose', async () => clearInterval(sweep))
    const provider = createKeycloakAuthProvider({ sessions, db })
    const client = deps.keycloakClient ?? new KeycloakClient(config.keycloak)
    realIdentity =
      deps.identityProvider ??
      new KeycloakIdentityProvider({
        issuer: config.keycloak.issuer,
        adminClientId: config.keycloak.adminClientId,
        adminClientSecret: config.keycloak.adminClientSecret,
      })
    const mailer = deps.mailer ?? new SmtpMailer(config.keycloak.smtp)
    registerKeycloakAuthRoutes(app, { client, sessions, db, appBaseUrl: config.keycloak.appBaseUrl, identity: realIdentity, loginAttemptsPerMinute: config.keycloak.loginAttemptsPerMinute }, provider)
    registerPasswordRoutes(app, { db, identity: realIdentity, links, mailer, attemptsPerMinute: config.keycloak.loginAttemptsPerMinute })
    realMail = { mailer, links }
    realAuth = provider
    realDb = db
  } else {
    app.get('/api/auth/status', async (): Promise<AuthStatus> => ({ mode: 'visual' }))
  }

  const store = new ComparisonJobStore(config.comparison.resultTtlMs)
  const pool = new ComparisonWorkerPool(config.comparison, comparisonLimitsFor(config.comparison))
  const purge = setInterval(() => store.purgeExpired(), 60_000)
  purge.unref()
  app.addHook('onClose', async () => {
    clearInterval(purge)
    store.clear()
    await pool.close()
  })
  registerComparisonRoutes(app, {
    store,
    pool,
    maxFileSizeBytes: config.comparison.maxFileSizeBytes,
    ...(realAuth && realDb ? comparisonAccess(realAuth, realDb, (message, error) => app.log.error({ err: error }, message)) : {}),
  })

  // Administração: o banco só é aberto quando ela está ligada.
  if (realAuth && realDb && realIdentity && realMail) {
    registerAdminRoutes(app, { mode: 'real', auth: realAuth, db: realDb, identity: new IdentityProvisioner(realIdentity, realDb, realMail) })
  } else if (config.adminMode === 'dev') {
    const db = deps.db ?? openDatabase(config.databasePath)
    migrate(db)
    if (!deps.db) app.addHook('onClose', async () => db.close())
    app.log.warn('Administração em modo de desenvolvimento: sem autenticação real, só para este computador.')
    registerAdminRoutes(app, { mode: 'dev', auth: createDevAuthProvider(db), db })
  } else {
    registerAdminRoutes(app, { mode: 'disabled' })
  }

  return app
}
