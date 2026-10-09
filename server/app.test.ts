import type { FastifyInstance } from 'fastify'
import { buildTestApp } from './test/build-test-app.ts'

describe('servidor', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildTestApp()
  })
  afterAll(() => app.close())

  it('responde em /api/health, sem cache e com cabeçalhos de segurança', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('devolve 404 em JSON, com mensagem em português, para rotas inexistentes', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/nao-existe' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Endereço não encontrado.' } })
  })
})
