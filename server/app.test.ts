import { buildApp } from './app.ts'
import { loadConfig } from './config.ts'

describe('servidor', () => {
  const app = buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }))
  afterAll(() => app.close())

  it('responde em /api/health', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('devolve 404 para rotas inexistentes', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/nao-existe' })
    expect(response.statusCode).toBe(404)
  })
})
