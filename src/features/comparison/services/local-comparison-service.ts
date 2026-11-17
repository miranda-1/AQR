import type { ComparisonOutcome, ComparisonService, ComparisonStage, CompareOptions } from '../model/types'
import { LOCAL_COMPARISON_TIMEOUT_MS, LOCAL_TIMEOUT_GRACE_MS } from './local-engine-limits'
import type { LocalEngineMessage, LocalEngineRequest } from './local-engine-protocol'

/** O que o serviço precisa de um Web Worker (permite substituí-lo nos testes). */
export interface EngineWorker {
  postMessage(message: LocalEngineRequest, transfer: Transferable[]): void
  addEventListener(type: 'message', listener: (event: MessageEvent<LocalEngineMessage>) => void): void
  addEventListener(type: 'error' | 'messageerror', listener: () => void): void
  terminate(): void
}

export interface LocalComparisonServiceOptions {
  createWorker?: () => EngineWorker
  /** Tempo máximo de uma comparação, já com a margem para organizar o resultado. */
  timeoutMs?: number
}

const createEngineWorker = (): EngineWorker =>
  new Worker(new URL('../local-engine/engine.worker.ts', import.meta.url), { type: 'module', name: 'aqr-comparacao' })

const processingFailed: ComparisonOutcome = { status: 'failed', error: { code: 'PROCESSING_FAILED' } }

/**
 * Implementação de `ComparisonService` que compara no próprio navegador: o motor real do servidor
 * (`server/comparison/`) roda num Web Worker, com os mesmos limites e o mesmo resultado. Usada na
 * versão pública, que não tem servidor. Os PDFs não saem do computador.
 *
 * Cada comparação abre um worker e o encerra no fim (resultado, falha, cancelamento ou tempo
 * esgotado), descartando tudo o que ficou na memória dele. Uma falha do worker vira
 * `PROCESSING_FAILED`, e a próxima comparação começa num worker novo.
 */
export function createLocalComparisonService(options: LocalComparisonServiceOptions = {}): ComparisonService {
  const { createWorker = createEngineWorker, timeoutMs = LOCAL_COMPARISON_TIMEOUT_MS + LOCAL_TIMEOUT_GRACE_MS } = options

  return {
    async compare(input, { signal, onProgress }: CompareOptions = {}) {
      if (!input.original || !input.updated) return processingFailed
      signal?.throwIfAborted()
      const [original, updated] = await Promise.all([input.original.arrayBuffer(), input.updated.arrayBuffer()])
      signal?.throwIfAborted()

      let worker: EngineWorker
      try {
        worker = createWorker()
      } catch {
        return processingFailed
      }

      return new Promise<ComparisonOutcome>((resolve, reject) => {
        let lastStage: ComparisonStage | undefined
        let finished = false
        const finish = (settle: () => void) => {
          if (finished) return
          finished = true
          clearTimeout(timer)
          signal?.removeEventListener('abort', onAbort)
          worker.terminate()
          settle()
        }
        const onAbort = () => finish(() => reject(signal?.reason))
        const timer = setTimeout(() => finish(() => resolve(processingFailed)), timeoutMs)
        signal?.addEventListener('abort', onAbort, { once: true })

        worker.addEventListener('message', (event: MessageEvent<LocalEngineMessage>) => {
          const message = event.data
          if (message.type === 'progress') {
            if (message.stage !== lastStage && !finished) {
              lastStage = message.stage
              onProgress?.({ stage: message.stage })
            }
          } else if (message.type === 'completed') finish(() => resolve({ status: 'completed', result: message.result }))
          else finish(() => resolve({ status: 'failed', error: message.error }))
        })
        const onWorkerError = () => finish(() => resolve(processingFailed))
        worker.addEventListener('error', onWorkerError)
        worker.addEventListener('messageerror', onWorkerError)

        const request: LocalEngineRequest = {
          documents: {
            original: { fileName: input.original?.name ?? 'original.pdf', bytes: new Uint8Array(original) },
            updated: { fileName: input.updated?.name ?? 'atualizado.pdf', bytes: new Uint8Array(updated) },
          },
        }
        worker.postMessage(request, [original, updated])
      })
    },
  }
}
