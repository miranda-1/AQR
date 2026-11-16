import { announceSessionEnded } from '@/features/auth/session-events'
import { DEV_ACTOR_HEADER } from '../../../../shared/contracts/admin'
import { apiErrorSchema } from '@/features/admin/model/api-schema'
import { schemas, TriagemServiceError, type RequestOptions, type TriagemService } from '../model/types'

/**
 * Serviço real da triagem: fala com `/api/triagem/status` e `/api/triagens/*`. A sessão é o cookie
 * do login real (mesma origem); no modo de desenvolvimento, a pessoa é identificada pelo usuário do
 * login visual (cabeçalho só aceito pelo servidor em pedidos locais). Respostas conferidas com os
 * mesmos esquemas zod do servidor.
 */

export interface HttpTriagemServiceOptions {
  baseUrl?: string
  getActor: () => string | null
  fetch?: typeof fetch
}

const REDE = 'Não foi possível falar com o servidor do AQR. Confira a conexão e tente de novo.'
const FORMATO = 'O servidor respondeu em um formato inesperado. Tente de novo em instantes.'

export function createHttpTriagemService(options: HttpTriagemServiceOptions): TriagemService {
  const { baseUrl = '', getActor } = options
  const fetchFn = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init))

  async function pedir(method: string, path: string, init: { body?: BodyInit; json?: object; signal?: AbortSignal; headers?: Record<string, string> } = {}): Promise<Response> {
    const headers: Record<string, string> = { ...init.headers }
    const actor = getActor()
    if (actor) headers[DEV_ACTOR_HEADER] = actor
    if (init.json) headers['content-type'] = 'application/json'
    let response: Response
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        method,
        headers,
        credentials: 'same-origin',
        ...(init.json ? { body: JSON.stringify(init.json) } : init.body ? { body: init.body } : {}),
        ...(init.signal ? { signal: init.signal } : {}),
      })
    } catch (error) {
      if (init.signal?.aborted) throw error
      throw new TriagemServiceError(0, 'NETWORK', REDE)
    }
    if (response.status === 401) announceSessionEnded()
    if (!response.ok) {
      const json: unknown = await response.json().catch(() => undefined)
      const parsed = apiErrorSchema.safeParse(json)
      if (parsed.success) throw new TriagemServiceError(response.status, parsed.data.error.code, parsed.data.error.message, parsed.data.error.fields)
      throw new TriagemServiceError(response.status, 'HTTP_ERROR', 'O servidor não conseguiu concluir a operação. Tente de novo em instantes.')
    }
    return response
  }

  async function json<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, response: Response): Promise<T> {
    const body: unknown = await response.json().catch(() => undefined)
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new TriagemServiceError(502, 'INVALID_RESPONSE', FORMATO)
    return parsed.data
  }

  const caminho = (id: string, sufixo = '') => `/api/triagens/${encodeURIComponent(id)}${sufixo}`
  const analise = (numero?: number) => (numero ? `?analise=${numero}` : '')
  const comSinal = (options?: RequestOptions) => (options?.signal ? { signal: options.signal } : {})

  return {
    async status(opts) {
      return json(schemas.status, await pedir('GET', '/api/triagem/status', comSinal(opts)))
    },
    async listar(opts) {
      return json(schemas.lista, await pedir('GET', '/api/triagens?limit=100', comSinal(opts)))
    },
    async criar(dados, arquivos, chave) {
      const form = new FormData()
      form.append('metadados', JSON.stringify(dados))
      for (const arquivo of arquivos) form.append('anexos', arquivo, arquivo.name)
      return json(schemas.criada, await pedir('POST', '/api/triagens', { body: form, headers: { 'idempotency-key': chave } }))
    },
    async detalhe(id, opts) {
      return json(schemas.detalhe, await pedir('GET', caminho(id), comSinal(opts)))
    },
    async anexos(id, numero, opts) {
      return json(schemas.anexos, await pedir('GET', caminho(id, `/anexos${analise(numero)}`), comSinal(opts)))
    },
    async avaliacoes(id, numero, opts) {
      return json(schemas.avaliacoes, await pedir('GET', caminho(id, `/avaliacoes${analise(numero)}`), comSinal(opts)))
    },
    async campos(id, numero, opts) {
      return json(schemas.campos, await pedir('GET', caminho(id, `/campos${analise(numero)}`), comSinal(opts)))
    },
    async conteudo(id, anexoId, opts) {
      const response = await pedir('GET', caminho(id, `/anexos/${encodeURIComponent(anexoId)}/conteudo`), comSinal(opts))
      return response.blob()
    },
    async confirmar(id, entrada) {
      const response = await pedir('POST', caminho(id, '/condicoes'), { json: entrada })
      const body = (await response.json()) as { triagem: unknown }
      const triagem = schemas.lista.shape.itens.element.safeParse(body.triagem)
      if (!triagem.success) throw new TriagemServiceError(502, 'INVALID_RESPONSE', FORMATO)
      return { triagem: triagem.data }
    },
    async revisar(id, entrada) {
      const response = await pedir('POST', caminho(id, '/revisoes'), { json: entrada })
      const body = (await response.json()) as { triagem: unknown; revisaoId: unknown }
      const triagem = schemas.lista.shape.itens.element.safeParse(body.triagem)
      if (!triagem.success || typeof body.revisaoId !== 'string') throw new TriagemServiceError(502, 'INVALID_RESPONSE', FORMATO)
      return { triagem: triagem.data, revisaoId: body.revisaoId }
    },
    async reprocessar(id, versaoEsperada) {
      return json(schemas.reprocessamento, await pedir('POST', caminho(id, '/reprocessar'), { json: { versaoEsperada } }))
    },
  }
}
