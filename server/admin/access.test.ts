import type { FastifyInstance } from 'fastify'
import type { ApiErrorBody } from '../../shared/contracts/api-error.ts'
import { openDatabase, type Database } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { seedAccount } from '../test/accounts.ts'
import { buildTestApp } from '../test/build-test-app.ts'

const code = (body: string) => (JSON.parse(body) as ApiErrorBody).error.code

describe('administração desligada (padrão)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildTestApp()
  })
  afterAll(() => app.close())

  it('informa que não está disponível e não expõe nenhuma rota', async () => {
    expect((await app.inject({ url: '/api/admin/status' })).json()).toEqual({ available: false, mode: 'disabled' })
    const me = await app.inject({ url: '/api/admin/me', headers: { 'x-aqr-dev-actor': 'admin' } })
    expect(me.statusCode).toBe(404)
    expect(code(me.body)).toBe('NOT_FOUND')
  })
})

describe('administração em modo de desenvolvimento', () => {
  let app: FastifyInstance
  let db: Database
  beforeAll(async () => {
    db = openDatabase(':memory:')
    migrate(db)
    seedAccount(db, 'admin.ativo', 'administrador')
    seedAccount(db, 'admin.inativo', 'administrador', 'inativa')
    seedAccount(db, 'analista.ativo', 'analista')
    app = await buildTestApp({ env: { ADMIN_API_MODE: 'dev' }, db })
  })
  afterAll(async () => {
    await app.close()
    db.close()
  })

  const me = (headers: Record<string, string>, remoteAddress = '127.0.0.1') =>
    app.inject({ url: '/api/admin/me', headers, remoteAddress })

  it('informa que está disponível em modo de desenvolvimento', async () => {
    expect((await app.inject({ url: '/api/admin/status' })).json()).toEqual({ available: true, mode: 'dev' })
  })

  it('identifica um administrador ativo pelo cabeçalho, sem diferenciar maiúsculas', async () => {
    const response = await me({ 'x-aqr-dev-actor': 'Admin.Ativo' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ usuario: 'admin.ativo', papel: 'administrador', origem: 'dev' })
  })

  it.each([
    ['sem cabeçalho', {}],
    ['usuário inexistente', { 'x-aqr-dev-actor': 'ninguem' }],
    ['conta inativa', { 'x-aqr-dev-actor': 'admin.inativo' }],
    ['valor fora do formato', { 'x-aqr-dev-actor': "x' OR '1'='1" }],
  ])('recusa com 401: %s', async (_, headers) => {
    const response = await me(headers)
    expect(response.statusCode).toBe(401)
    expect(code(response.body)).toBe('UNAUTHENTICATED')
  })

  it('recusa com 403 quem não é administrador', async () => {
    const response = await me({ 'x-aqr-dev-actor': 'analista.ativo' })
    expect(response.statusCode).toBe(403)
    expect(code(response.body)).toBe('FORBIDDEN')
  })

  it('recusa pedidos de outro computador', async () => {
    const response = await me({ 'x-aqr-dev-actor': 'admin.ativo' }, '192.168.0.20')
    expect(response.statusCode).toBe(403)
    expect(code(response.body)).toBe('LOCAL_ONLY')
  })

  it('recusa pedidos vindos de outro site, aceita o próprio site local', async () => {
    const evil = await me({ 'x-aqr-dev-actor': 'admin.ativo', origin: 'https://site-malicioso.example' })
    expect(evil.statusCode).toBe(403)
    const local = await me({ 'x-aqr-dev-actor': 'admin.ativo', origin: 'http://localhost:5173' })
    expect(local.statusCode).toBe(200)
  })
})
