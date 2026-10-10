import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerAdminRoutes } from './admin/routes.ts'
import type { AuthStatus } from '../shared/contracts/auth.ts'
import type { AuthProvider } from './auth/auth-provider.ts'
import { createComparisonAudit } from './comparison/audit.ts'
import { IdentityProvisioner } from './admin/identity-sync.ts'
import { KeycloakIdentityProvider, type IdentityProvider } from './auth/identity-provider.ts'
import { createDevAuthProvider } from './auth/dev-auth-provider.ts'
import { createKeycloakAuthProvider, registerKeycloakAuthRoutes } from './auth/keycloak-auth.ts'
import { KeycloakClient } from './auth/keycloak-client.ts'
import { SessionStore } from './auth/session-store.ts'
import { openDatabase, type Database } from './db/database.ts'
import { migrate } from './db/migrate.ts'
import { ComparisonJobStore } from './comparison/job-store.ts'
import { defaultComparisonLimits } from './comparison/limits.ts'
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
}

/** Duração da sessão depois do login. */
const SESSION_TTL_MS = 8 * 3600_000

/**
 * Monta o servidor sem abrir porta, para os testes usarem `app.inject()`.
 */
export async function buildApp(config: ServerConfig, deps: AppDependencies = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.logLevel },
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

  // Login real: precisa vir antes das demais rotas, porque registra os ganchos que as protegem.
  let realAuth: AuthProvider | null = null
  let realDb: Database | null = null
  let realIdentity: IdentityProvider | null = null
  if (config.keycloak) {
    const db = deps.db ?? openDatabase(config.databasePath)
    migrate(db)
    if (!deps.db) app.addHook('onClose', async () => db.close())
    const sessions = new SessionStore(db, SESSION_TTL_MS)
    const sweep = setInterval(() => {
      try {
        sessions.purgeExpired()
      } catch {
        // Banco já fechado durante o desligamento.
      }
    }, 60_000)
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
        appClientId: config.keycloak.clientId,
        appBaseUrl: config.keycloak.appBaseUrl,
      })
    registerKeycloakAuthRoutes(app, { client, sessions, db, appBaseUrl: config.keycloak.appBaseUrl, identity: realIdentity }, provider)
    realAuth = provider
    realDb = db
  } else {
    app.get('/api/auth/status', async (): Promise<AuthStatus> => ({ mode: 'visual' }))
  }

  const store = new ComparisonJobStore(config.comparison.resultTtlMs)
  const pool = new ComparisonWorkerPool(config.comparison, {
    ...defaultComparisonLimits,
    maxFileSizeBytes: config.comparison.maxFileSizeBytes,
  })
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
    resultTtlMs: config.comparison.resultTtlMs,
    ...(realAuth && realDb
      ? { audit: createComparisonAudit(realDb, realAuth, (message, error) => app.log.error({ err: error }, message)) }
      : {}),
  })

  // Administração: o banco só é aberto quando ela está ligada.
  if (realAuth && realDb && realIdentity) {
    registerAdminRoutes(app, { mode: 'real', auth: realAuth, db: realDb, identity: new IdentityProvisioner(realIdentity, realDb) })
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
