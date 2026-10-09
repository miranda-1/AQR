import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerAdminRoutes } from './admin/routes.ts'
import { createDevAuthProvider } from './auth/dev-auth-provider.ts'
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
}

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
  })

  // Administração: o banco só é aberto quando ela está ligada.
  if (config.adminMode === 'dev') {
    const db = deps.db ?? openDatabase(config.databasePath)
    migrate(db)
    if (!deps.db) app.addHook('onClose', async () => db.close())
    app.log.warn('Administração em modo de desenvolvimento: sem autenticação real, só para este computador.')
    registerAdminRoutes(app, { mode: 'dev', auth: createDevAuthProvider(db) })
  } else {
    registerAdminRoutes(app, { mode: 'disabled' })
  }

  return app
}
