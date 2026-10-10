import { DEV_ACTOR_HEADER } from '../../../../shared/contracts/admin'
import { apiErrorSchema, parseAccount, parseAccountPage, parseAdminStatus, parseAuditPage } from '../model/api-schema'
import { AccountServiceError, type AccountService, type RequestOptions } from '../model/types'

export interface HttpAccountServiceOptions {
  /** Endereço base da API. Vazio = mesma origem (no desenvolvimento, o Vite encaminha /api). */
  baseUrl?: string
  /** Usuário informado no login visual; no modo de desenvolvimento, identifica a pessoa no servidor. */
  getActor: () => string | null
  fetch?: typeof fetch
}

const NETWORK_ERROR = 'Não foi possível falar com o servidor do AQR. Confira a conexão e tente de novo.'
const INVALID_RESPONSE = 'O servidor respondeu em um formato inesperado. Tente de novo em instantes.'

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/** Implementação real de `AccountService`: fala com `/api/admin/*`. */
export function createHttpAccountService(options: HttpAccountServiceOptions): AccountService {
  const { baseUrl = '', getActor } = options
  const fetchFn = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init))

  async function request(method: string, path: string, body?: object, requestOptions: RequestOptions = {}): Promise<unknown> {
    const headers: Record<string, string> = {}
    const actor = getActor()
    if (actor) headers[DEV_ACTOR_HEADER] = actor
    if (body) headers['content-type'] = 'application/json'

    let response: Response
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        ...(requestOptions.signal ? { signal: requestOptions.signal } : {}),
      })
    } catch (error) {
      if (requestOptions.signal?.aborted) throw error
      throw new AccountServiceError(0, 'NETWORK', NETWORK_ERROR)
    }

    const json: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
      const parsed = apiErrorSchema.safeParse(json)
      if (parsed.success) {
        throw new AccountServiceError(response.status, parsed.data.error.code, parsed.data.error.message, parsed.data.error.fields)
      }
      throw new AccountServiceError(response.status, 'HTTP_ERROR', 'O servidor não conseguiu concluir a operação. Tente de novo em instantes.')
    }
    return json
  }

  function expect<T>(value: T | undefined): T {
    if (value === undefined) throw new AccountServiceError(502, 'INVALID_RESPONSE', INVALID_RESPONSE)
    return value
  }

  const accountPath = (id: string) => `/api/admin/accounts/${encodeURIComponent(id)}`

  return {
    async getStatus(opts) {
      return expect(parseAdminStatus(await request('GET', '/api/admin/status', undefined, opts)))
    },
    async listAccounts(query = {}, opts) {
      const path = `/api/admin/accounts${queryString({ ...query })}`
      return expect(parseAccountPage(await request('GET', path, undefined, opts)))
    },
    async getAccount(id, opts) {
      return expect(parseAccount(await request('GET', accountPath(id), undefined, opts)))
    },
    async createAccount(input) {
      return expect(parseAccount(await request('POST', '/api/admin/accounts', input)))
    },
    async updateAccount(id, input) {
      return expect(parseAccount(await request('PATCH', accountPath(id), input)))
    },
    async deactivateAccount(id, input) {
      return expect(parseAccount(await request('POST', `${accountPath(id)}/desativar`, input)))
    },
    async reactivateAccount(id, input) {
      return expect(parseAccount(await request('POST', `${accountPath(id)}/reativar`, input)))
    },
    async sendPasswordLink(id) {
      await request('POST', `${accountPath(id)}/redefinir-senha`)
    },
    async syncIdentity(id) {
      return expect(parseAccount(await request('POST', `${accountPath(id)}/sincronizar`)))
    },
    async listAudit(query = {}, opts) {
      const path = `/api/admin/audit-events${queryString({ ...query })}`
      return expect(parseAuditPage(await request('GET', path, undefined, opts)))
    },
  }
}
