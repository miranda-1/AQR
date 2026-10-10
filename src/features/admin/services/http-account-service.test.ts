import { createHttpAccountService } from './http-account-service'
import { AccountServiceError } from '../model/types'

const account = {
  id: 'a1', usuario: 'maria', nome: 'Maria', email: null, papel: 'analista', situacao: 'ativa',
  criadaEm: '2026-10-10T12:00:00.000Z', atualizadaEm: '2026-10-10T12:00:00.000Z', desativadaEm: null, versao: 1,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('createHttpAccountService', () => {
  it('envia o usuário do login no cabeçalho e monta a busca', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = []
    const fetchStub: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init })
      return json({ items: [account], total: 1, page: 1, pageSize: 20 })
    }
    const service = createHttpAccountService({ getActor: () => 'admin', fetch: fetchStub })
    const page = await service.listAccounts({ q: 'ma ria', papel: 'analista', page: 2 })
    expect(page.items[0]?.usuario).toBe('maria')
    expect(calls[0]?.url).toBe('/api/admin/accounts?q=ma+ria&papel=analista&page=2')
    expect(calls[0]?.init?.headers).toMatchObject({ 'x-aqr-dev-actor': 'admin' })
  })

  it('envia JSON nas alterações', async () => {
    let sent: RequestInit | undefined
    const fetchStub: typeof fetch = async (_input, init) => {
      sent = init
      return json({ ...account, versao: 2 })
    }
    const service = createHttpAccountService({ getActor: () => null, fetch: fetchStub })
    await service.deactivateAccount('a/1', { versao: 1, motivo: 'Saiu' })
    expect(sent?.method).toBe('POST')
    expect(sent?.body).toBe('{"versao":1,"motivo":"Saiu"}')
  })

  it('traduz erros da API, com os campos', async () => {
    const fetchStub: typeof fetch = async () =>
      json({ error: { code: 'USERNAME_TAKEN', message: 'Este usuário institucional já está em uso.', fields: { usuario: 'Em uso.' } } }, 409)
    const service = createHttpAccountService({ getActor: () => 'admin', fetch: fetchStub })
    const error = await service.createAccount({ usuario: 'x', nome: 'X', email: null, papel: 'analista' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AccountServiceError)
    expect(error).toMatchObject({ status: 409, code: 'USERNAME_TAKEN', fields: { usuario: 'Em uso.' } })
  })

  it('trata rede fora do ar e resposta fora do contrato', async () => {
    const down = createHttpAccountService({ getActor: () => null, fetch: async () => Promise.reject(new TypeError('falhou')) })
    await expect(down.getStatus()).rejects.toMatchObject({ code: 'NETWORK' })
    const odd = createHttpAccountService({ getActor: () => null, fetch: async () => json({ foo: 1 }) })
    await expect(odd.getAccount('a1')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
})
