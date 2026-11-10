import type { ComparisonOutcome, ComparisonStage, DocumentRole } from '../../shared/contracts/comparison.ts'
import type { ComparisonSettings } from '../config.ts'
import { IsolatedWorkerPool } from '../documents/isolated-pool.ts'
import type { FailureReason } from './failure.ts'
import type { ComparisonLimits } from './limits.ts'
import type { WorkerInput, WorkerMessage } from './worker-protocol.ts'

export { QueueFullError } from '../documents/isolated-pool.ts'

/** No desenvolvimento e nos testes o código é TypeScript; no build, JavaScript. */
const workerUrl = new URL(import.meta.url.endsWith('.ts') ? './worker.ts' : './worker.js', import.meta.url)

export interface RunOptions {
  signal?: AbortSignal
  onProgress?: (stage: ComparisonStage) => void
  /** Motivo interno da falha, para o log (nunca vai para a interface). */
  onFailureReason?: (reason: FailureReason) => void
}

export type PoolSettings = Pick<ComparisonSettings, 'workers' | 'queueLimit' | 'jobTimeoutMs' | 'workerMemoryMb'>

/**
 * Executa comparações em threads isoladas (`worker_threads`), no máximo `workers` ao mesmo tempo
 * e com até `queueLimit` esperando. Cada thread tem limite de memória e de tempo; ao passar
 * de qualquer um, ou se a comparação for cancelada, a thread é encerrada. A mecânica das threads
 * é a de `server/documents/isolated-pool.ts`; aqui fica o que cada mensagem significa.
 */
export class ComparisonWorkerPool {
  private readonly pool: IsolatedWorkerPool
  private readonly limits: ComparisonLimits

  constructor(settings: PoolSettings, limits: ComparisonLimits) {
    this.pool = new IsolatedWorkerPool(settings, { label: 'Comparação', queueFull: 'Fila de comparações cheia' })
    this.limits = limits
  }

  /** Há vaga para mais uma comparação (rodando ou na fila)? */
  canAccept(): boolean {
    return this.pool.canAccept()
  }

  run(documents: WorkerInput['documents'], options: RunOptions = {}): Promise<ComparisonOutcome> {
    const { signal, onProgress, onFailureReason } = options
    const failed = (reason: FailureReason): ComparisonOutcome => {
      onFailureReason?.(reason)
      return { status: 'failed', error: { code: 'PROCESSING_FAILED' } }
    }
    return this.pool.run<WorkerMessage, ComparisonOutcome>({
      workerUrl,
      ...(signal ? { signal } : {}),
      prepare: () => {
        // Cópias transferidas para a thread: o chamador mantém os seus bytes.
        const copies = Object.fromEntries(
          (['original', 'updated'] as const).map((role: DocumentRole) => [
            role,
            { fileName: documents[role].fileName, bytes: documents[role].bytes.slice() },
          ]),
        ) as WorkerInput['documents']
        const input: WorkerInput = { documents: copies, limits: this.limits }
        return { workerData: input, transferList: [copies.original.bytes.buffer, copies.updated.bytes.buffer] as ArrayBuffer[] }
      },
      onMessage: (message) => {
        if (message.type === 'progress') {
          onProgress?.(message.stage)
          return undefined
        }
        if (message.type === 'completed') return { status: 'completed', result: message.result }
        onFailureReason?.(message.reason)
        return { status: 'failed', error: message.error }
      },
      onTimeout: () => failed('tempo-esgotado'),
      onCrash: () => failed('falha-inesperada'),
    })
  }

  /** Encerra as threads em andamento (ao desligar o servidor). */
  close(): Promise<void> {
    return this.pool.close()
  }
}
