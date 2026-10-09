import { Worker } from 'node:worker_threads'
import type { ComparisonOutcome, ComparisonStage, DocumentRole } from '../../shared/contracts/comparison.ts'
import type { ComparisonSettings } from '../config.ts'
import type { FailureReason } from './failure.ts'
import type { ComparisonLimits } from './limits.ts'
import type { WorkerInput, WorkerMessage } from './worker-protocol.ts'

/** No desenvolvimento e nos testes o código é TypeScript; no build, JavaScript. */
const workerUrl = new URL(import.meta.url.endsWith('.ts') ? './worker.ts' : './worker.js', import.meta.url)

export interface RunOptions {
  signal?: AbortSignal
  onProgress?: (stage: ComparisonStage) => void
  /** Motivo interno da falha, para o log (nunca vai para a interface). */
  onFailureReason?: (reason: FailureReason) => void
}

export type PoolSettings = Pick<ComparisonSettings, 'workers' | 'queueLimit' | 'jobTimeoutMs' | 'workerMemoryMb'>

export class QueueFullError extends Error {
  override name = 'QueueFullError'
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Comparação cancelada', 'AbortError')
}

/**
 * Executa comparações em threads isoladas (`worker_threads`), no máximo `workers` ao mesmo tempo
 * e com até `queueLimit` esperando. Cada thread tem limite de memória e de tempo; ao passar
 * de qualquer um, ou se a comparação for cancelada, a thread é encerrada.
 */
export class ComparisonWorkerPool {
  private readonly settings: PoolSettings
  private readonly limits: ComparisonLimits
  private active = 0
  private readonly waiting: (() => void)[] = []
  private readonly running = new Set<Worker>()
  private closed = false

  constructor(settings: PoolSettings, limits: ComparisonLimits) {
    this.settings = settings
    this.limits = limits
  }

  /** Há vaga para mais uma comparação (rodando ou na fila)? */
  canAccept(): boolean {
    return !this.closed && (this.active < this.settings.workers || this.waiting.length < this.settings.queueLimit)
  }

  async run(documents: WorkerInput['documents'], options: RunOptions = {}): Promise<ComparisonOutcome> {
    if (!this.canAccept()) throw new QueueFullError('Fila de comparações cheia')
    await this.acquire(options.signal)
    try {
      return await this.execute(documents, options)
    } finally {
      this.release()
    }
  }

  /** Encerra as threads em andamento (ao desligar o servidor). */
  async close(): Promise<void> {
    this.closed = true
    await Promise.all([...this.running].map((worker) => worker.terminate()))
  }

  private acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError(signal))
    if (this.active < this.settings.workers) {
      this.active += 1
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
      const start = () => {
        signal?.removeEventListener('abort', onAbort)
        this.active += 1
        resolve()
      }
      const onAbort = () => {
        const index = this.waiting.indexOf(start)
        if (index >= 0) this.waiting.splice(index, 1)
        reject(signal ? abortError(signal) : new Error('cancelada'))
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      this.waiting.push(start)
    })
  }

  private release() {
    this.active -= 1
    this.waiting.shift()?.()
  }

  private execute(documents: WorkerInput['documents'], options: RunOptions): Promise<ComparisonOutcome> {
    const { signal, onProgress, onFailureReason } = options
    if (signal?.aborted) return Promise.reject(abortError(signal))

    // Cópias transferidas para a thread: o chamador mantém os seus bytes.
    const copies = Object.fromEntries(
      (['original', 'updated'] as const).map((role: DocumentRole) => [
        role,
        { fileName: documents[role].fileName, bytes: documents[role].bytes.slice() },
      ]),
    ) as WorkerInput['documents']
    const input: WorkerInput = { documents: copies, limits: this.limits }

    return new Promise<ComparisonOutcome>((resolve, reject) => {
      const worker = new Worker(workerUrl, {
        workerData: input,
        transferList: [copies.original.bytes.buffer, copies.updated.bytes.buffer] as ArrayBuffer[],
        resourceLimits: { maxOldGenerationSizeMb: this.settings.workerMemoryMb },
        stdout: true,
        stderr: true,
      })
      this.running.add(worker)
      let settled = false

      const finish = (outcome: ComparisonOutcome | { aborted: unknown }) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        this.running.delete(worker)
        void worker.terminate()
        if ('aborted' in outcome) reject(outcome.aborted)
        else resolve(outcome)
      }
      const fail = (reason: FailureReason) => {
        onFailureReason?.(reason)
        finish({ status: 'failed', error: { code: 'PROCESSING_FAILED' } })
      }
      const onAbort = () => finish({ aborted: signal ? abortError(signal) : new Error('cancelada') })
      const timer = setTimeout(() => fail('tempo-esgotado'), this.settings.jobTimeoutMs)
      signal?.addEventListener('abort', onAbort, { once: true })

      worker.on('message', (message: WorkerMessage) => {
        if (message.type === 'progress') onProgress?.(message.stage)
        else if (message.type === 'completed') finish({ status: 'completed', result: message.result })
        else {
          onFailureReason?.(message.reason)
          finish({ status: 'failed', error: message.error })
        }
      })
      // Erro fora do tratamento (ex.: memória esgotada) ou saída sem resposta.
      worker.on('error', () => fail('falha-inesperada'))
      worker.on('exit', () => fail('falha-inesperada'))
    })
  }
}
