import type { FastifyInstance } from 'fastify'
import type { Account, AccountPage, AuditEvent, Page } from '../../shared/contracts/admin.ts'
import type { ApiErrorBody } from '../../shared/contracts/api-error.ts'
import { openDatabase, type Database } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { seedAccount } from '../test/accounts.ts'
import { buildTestApp } from '../test/build-test-app.ts'

const ADMIN = { 'x-aqr-dev-actor': 'admin' }

describe('rotas de contas e auditoria', () => {
  let app: FastifyInstance
  let db: Database
  let adminId: string
  beforeAll(async () => {
    db = openDatabase(':memory:')
    migrate(db)
    adminId = seedAccount(db, 'admin', 'administrador')
    seedAccount(db, 'analista', 'analista')
    app = await buildTestApp({ env: { ADMIN_API_MODE: 'dev' }, db })
  })
  afterAll(async () => {
    await app.close()
    db.close()
  })

  const call = (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object, headers = ADMIN) =>
    app.inject({ method, url, headers, ...(payload ? { payload } : {}) })
  const errorCode = (body: string) => (JSON.parse(body) as ApiErrorBody).error.code

  it('exige administrador em todas as rotas', async () => {
    expect((await call('GET', '/api/admin/accounts', undefined, {} as typeof ADMIN)).statusCode).toBe(401)
    expect((await call('GET', '/api/admin/audit-events', undefined, { 'x-aqr-dev-actor': 'analista' })).statusCode).toBe(403)
  })

  it('cria, lista, busca e detalha', async () => {
    const created = await call('POST', '/api/admin/accounts', { usuario: 'Maria.Silva', nome: ' Maria  Silva ', email: 'maria@x.gov.br', papel: 'analista' })
    expect(created.statusCode).toBe(201)
    const account = created.json<Account>()
    expect(account).toMatchObject({ usuario: 'maria.silva', nome: 'Maria Silva', situacao: 'ativa', versao: 1 })

    const found = (await call('GET', '/api/admin/accounts?q=maria&papel=analista&situacao=ativa')).json<AccountPage>()
    expect(found.total).toBe(1)
    expect((await call('GET', `/api/admin/accounts/${account.id}`)).statusCode).toBe(200)
    expect((await call('GET', '/api/admin/accounts/inexistente')).statusCode).toBe(404)
    const page = (await call('GET', '/api/admin/accounts?pageSize=1&page=2')).json<AccountPage>()
    expect(page).toMatchObject({ page: 2, pageSize: 1, total: 3 })
  })

  it('valida campos e recusa duplicados', async () => {
    const bad = await call('POST', '/api/admin/accounts', { usuario: 'AB', nome: '', papel: 'chefe' })
    expect(bad.statusCode).toBe(400)
    expect(errorCode(bad.body)).toBe('VALIDATION_FAILED')
    const duplicate = await call('POST', '/api/admin/accounts', { usuario: 'ADMIN', nome: 'Outro', papel: 'analista' })
    expect(duplicate.statusCode).toBe(409)
    expect((await call('GET', '/api/admin/accounts?papel=chefe')).statusCode).toBe(400)
    expect((await call('GET', '/api/admin/accounts?page=abc')).statusCode).toBe(400)
  })

  it('edita com versão, detecta conflito, desativa e reativa com auditoria', async () => {
    const { id } = (await call('POST', '/api/admin/accounts', { usuario: 'joao', nome: 'João', papel: 'analista' })).json<Account>()
    const edited = await call('PATCH', `/api/admin/accounts/${id}`, { nome: 'João Souza', email: '', papel: 'analista', versao: 1 })
    expect(edited.json<Account>()).toMatchObject({ nome: 'João Souza', versao: 2 })
    const stale = await call('PATCH', `/api/admin/accounts/${id}`, { nome: 'X', papel: 'analista', versao: 1 })
    expect(stale.statusCode).toBe(409)
    expect((await call('POST', `/api/admin/accounts/${id}/desativar`, { versao: 2, motivo: 'Saiu' })).json<Account>().situacao).toBe('inativa')
    expect((await call('POST', `/api/admin/accounts/${id}/reativar`, { versao: 3 })).json<Account>().situacao).toBe('ativa')

    const audit = (await call('GET', `/api/admin/audit-events?contaId=${id}`)).json<Page<AuditEvent>>()
    expect(audit.items.map((event) => event.acao)).toEqual(['conta.reativada', 'conta.desativada', 'conta.editada', 'conta.criada'])
    expect(audit.items[1]?.detalhes.motivo).toBe('Saiu')
    expect((await call('GET', '/api/admin/audit-events?acao=conta.criada')).json<Page<AuditEvent>>().total).toBeGreaterThan(0)
    expect((await call('GET', '/api/admin/audit-events?acao=outra')).statusCode).toBe(400)
  })

  it('protege o último administrador e a própria conta', async () => {
    const self = await call('POST', `/api/admin/accounts/${adminId}/desativar`, { versao: 1 })
    expect(self.statusCode).toBe(422)
    expect(errorCode(self.body)).toBe('SELF_DEACTIVATION')
    const demote = await call('PATCH', `/api/admin/accounts/${adminId}`, { nome: 'A', papel: 'analista', versao: 1 })
    expect(demote.statusCode).toBe(422)
    expect(errorCode(demote.body)).toBe('LAST_ACTIVE_ADMIN')
    expect((await call('POST', `/api/admin/accounts/${adminId}/desativar`, {})).statusCode).toBe(400)
  })
})
