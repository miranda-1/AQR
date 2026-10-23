import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance } from 'fastify'
import { ComparisonJobStore } from './comparison/job-store.ts'
import { comparisonLimitsFor } from './comparison/limits.ts'
import { registerComparisonRoutes } from './comparison/routes.ts'
import { ComparisonWorkerPool } from './comparison/worker-pool.ts'
import type { ServerConfig } from './config.ts'
import { registerErrorHandling } from './http/errors.ts'

/** JSON da API é pequeno; os PDFs chegam por multipart, com limites próprios. */
const JSON_BODY_LIMIT = 64 * 1024

/**
 * Monta o servidor sem abrir porta, para os testes usarem `app.inject()`.
 */
export async function buildApp(config: ServerConfig): Promise<FastifyInstance> {
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
  })

  return app
}
