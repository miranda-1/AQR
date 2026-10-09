import Fastify, { type FastifyInstance } from 'fastify'
import type { ServerConfig } from './config.ts'

/**
 * Monta o servidor sem abrir porta, para os testes usarem `app.inject()`.
 * As rotas da comparação e da administração entram aqui nos próximos passos do plano.
 */
export function buildApp(config: ServerConfig): FastifyInstance {
  const app = Fastify({ logger: { level: config.logLevel } })

  app.get('/api/health', async () => ({ status: 'ok' as const }))

  return app
}
