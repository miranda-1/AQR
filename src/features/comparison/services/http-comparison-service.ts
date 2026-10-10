import { announceSessionEnded } from '@/features/auth/session-events'
import { apiErrorSchema, parseComparisonJob } from '../model/api-schema'
import type { ComparisonError, ComparisonJob, ComparisonOutcome, ComparisonService, ComparisonStage, CompareOptions } from '../model/types'

export interface HttpComparisonServiceOptions {
  /** Endereço base da API. Vazio = mesma origem (no desenvolvimento, o Vite encaminha /api). */
  baseUrl?: string
  pollIntervalMs?: number
  fetch?: typeof fetch
}

/** Consultas seguidas que podem falhar por rede antes de desistir. */
const MAX_POLL_FAILURES = 3

const failed = (error: ComparisonError): ComparisonOutcome => ({ status: 'failed', error })
const processingFailed = () => failed({ code: 'PROCESSING_FAILED' })

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

/** Erro de envio → erro do contrato. Arquivo recusado aponta o documento; o resto é falha de processamento. */
async function outcomeFromErrorResponse(response: Response): Promise<ComparisonOutcome> {
  const body: unknown = await response.json().catch(() => undefined)
  const parsed = apiErrorSchema.safeParse(body)
  const document = parsed.success ? parsed.data.error.document : undefined
  if ((response.status === 400 || response.status === 413 || response.status === 415) && document) {
    return failed({ code: 'INCOMPATIBLE_DOCUMENT', document })
  }
  return processingFailed()
}

/**
 * Implementação real de `ComparisonService`: envia os dois PDFs para `POST /api/comparisons` e
 * acompanha a tarefa (`GET /api/comparisons/:id`) até o resultado. Cancelar (`signal`) avisa o
 * servidor (`DELETE`), que descarta a tarefa. Falhas de rede ou respostas fora do contrato viram
 * `PROCESSING_FAILED`.
 */
export function createHttpComparisonService(options: HttpComparisonServiceOptions = {}): ComparisonService {
  const { baseUrl = '', pollIntervalMs = 700 } = options
  const fetchFn = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init))

  return {
    async compare(input, { signal, onProgress }: CompareOptions = {}) {
      if (!input.original || !input.updated) return processingFailed()

      const form = new FormData()
      form.append('original', input.original, input.original.name)
      form.append('updated', input.updated, input.updated.name)

      let response: Response
      try {
        response = await fetchFn(`${baseUrl}/api/comparisons`, { method: 'POST', body: form, signal })
      } catch (error) {
        if (signal?.aborted) throw error
        return processingFailed()
      }
      if (response.status === 401) announceSessionEnded()
      if (!response.ok) return outcomeFromErrorResponse(response)

      let job = parseComparisonJob(await response.json().catch(() => undefined))
      if (!job) return processingFailed()
      const jobUrl = `${baseUrl}/api/comparisons/${encodeURIComponent(job.id)}`
      const cancelOnServer = () => {
        void fetchFn(jobUrl, { method: 'DELETE', keepalive: true }).catch(() => undefined)
      }

      let lastStage: ComparisonStage | undefined
      let failures = 0
      try {
        onProgress?.({ stage: 'validating' })
        lastStage = 'validating'
        for (;;) {
          const current: ComparisonJob = job
          if (current.status === 'completed') return { status: 'completed', result: current.result }
          if (current.status === 'failed') return failed(current.error)
          if (current.status === 'processing' && current.stage !== lastStage) {
            lastStage = current.stage
            onProgress?.({ stage: current.stage })
          }

          await wait(pollIntervalMs, signal)
          try {
            const poll = await fetchFn(jobUrl, { signal, cache: 'no-store' })
            if (poll.status === 401) announceSessionEnded()
            if (!poll.ok) return processingFailed()
            const next = parseComparisonJob(await poll.json().catch(() => undefined))
            if (!next) return processingFailed()
            job = next
            failures = 0
          } catch (error) {
            if (signal?.aborted) throw error
            failures += 1
            if (failures >= MAX_POLL_FAILURES) return processingFailed()
          }
        }
      } catch (error) {
        if (signal?.aborted) cancelOnServer()
        throw error
      }
    },
  }
}
