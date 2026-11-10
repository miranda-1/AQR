import { Worker } from 'node:worker_threads'

/**
 * Processamento isolado em `worker_threads`, comum à comparação e à triagem: no máximo `workers`
 * tarefas ao mesmo tempo e até `queueLimit` esperando. Cada thread tem limite de memória e de
 * tempo; ao passar de qualquer um, ou se a tarefa for cancelada, a thread é encerrada sem afetar
 * as demais. O que a thread faz e o que cada mensagem significa ficam com quem chama (`IsolatedTask`).
 */

export interface IsolatedPoolSettings {
  /** Tarefas processadas ao mesmo tempo (uma thread cada). */
  workers: number
  /** Tarefas esperando vaga; acima disto `run` recusa com `QueueFullError`. */
  queueLimit: number
  /** Tempo máximo de uma tarefa, da criação da thread à resposta. */
  jobTimeoutMs: number
  /** Memória máxima de cada thread. */
  workerMemoryMb: number
}

export class QueueFullError extends Error {
  override name = 'QueueFullError'
}

export interface IsolatedTask<M, O> {
  workerUrl: URL
  /** Monta os dados da thread só quando ela vai começar (cópias não ficam na memória enquanto a tarefa espera). */
  prepare: () => { workerData: unknown; transferList?: ArrayBuffer[] }
  signal?: AbortSignal
  /** Cada mensagem da thread: devolve o resultado para encerrar a tarefa, ou `undefined` para continuar. */
  onMessage: (message: M) => O | undefined
  /** Resultado quando o tempo se esgota. */
  onTimeout: () => O
  /** Resultado quando a thread termina sem responder (erro não tratado, memória esgotada). */
  onCrash: () => O
}

function abortError(signal: AbortSignal, label: string): unknown {
  return signal.reason ?? new DOMException(`${label} cancelada`, 'AbortError')
}

export class IsolatedWorkerPool {
  private readonly settings: IsolatedPoolSettings
  /** Nome da tarefa nas mensagens de cancelamento ("Comparação" → "Comparação cancelada"). */
  private readonly label: string
  private readonly queueFullMessage: string
  private active = 0
  private readonly waiting: (() => void)[] = []
  private readonly running = new Set<Worker>()
  private closed = false

  constructor(settings: IsolatedPoolSettings, messages: { label?: string; queueFull?: string } = {}) {
    this.settings = settings
    this.label = messages.label ?? 'Tarefa'
    this.queueFullMessage = messages.queueFull ?? 'Fila cheia'
  }

  /** Há vaga para mais uma tarefa (rodando ou na fila)? */
  canAccept(): boolean {
    return !this.closed && (this.active < this.settings.workers || this.waiting.length < this.settings.queueLimit)
  }

  async run<M, O>(task: IsolatedTask<M, O>): Promise<O> {
    if (!this.canAccept()) throw new QueueFullError(this.queueFullMessage)
    await this.acquire(task.signal)
    try {
      return await this.execute(task)
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
    if (signal?.aborted) return Promise.reject(abortError(signal, this.label))
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
        reject(signal ? abortError(signal, this.label) : new Error('cancelada'))
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      this.waiting.push(start)
    })
  }

  private release() {
    this.active -= 1
    this.waiting.shift()?.()
  }

  private execute<M, O>(task: IsolatedTask<M, O>): Promise<O> {
    const { signal } = task
    if (signal?.aborted) return Promise.reject(abortError(signal, this.label))
    const { workerData, transferList } = task.prepare()

    return new Promise<O>((resolve, reject) => {
      const worker = new Worker(task.workerUrl, {
        workerData,
        ...(transferList ? { transferList } : {}),
        resourceLimits: { maxOldGenerationSizeMb: this.settings.workerMemoryMb },
        stdout: true,
        stderr: true,
      })
      this.running.add(worker)
      let settled = false

      const finish = (outcome: { value: O } | { aborted: unknown }) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        this.running.delete(worker)
        void worker.terminate()
        if ('aborted' in outcome) reject(outcome.aborted)
        else resolve(outcome.value)
      }
      const onAbort = () => finish({ aborted: signal ? abortError(signal, this.label) : new Error('cancelada') })
      const timer = setTimeout(() => {
        if (!settled) finish({ value: task.onTimeout() })
      }, this.settings.jobTimeoutMs)
      signal?.addEventListener('abort', onAbort, { once: true })

      worker.on('message', (message: M) => {
        if (settled) return
        const value = task.onMessage(message)
        if (value !== undefined) finish({ value })
      })
      // Erro fora do tratamento (ex.: memória esgotada) ou saída sem resposta.
      const crash = () => {
        if (!settled) finish({ value: task.onCrash() })
      }
      worker.on('error', crash)
      worker.on('exit', crash)
    })
  }
}
