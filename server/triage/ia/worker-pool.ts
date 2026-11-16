import { IsolatedWorkerPool } from '../../documents/isolated-pool.ts'
import type { IaWorkerInput, IaWorkerMessage } from './worker-protocol.ts'

const workerUrl = new URL(import.meta.url.endsWith('.ts') ? './worker.ts' : './worker.js', import.meta.url)

export type ResultadoThreadIa =
  | { status: 'concluido'; saida: unknown; memoriaMb: number }
  | { status: 'tempo-esgotado' }
  | { status: 'memoria-ou-falha'; motivo: string }

export interface LimitesThreadIa {
  workers: number
  queueLimit: number
  timeoutMs: number
  memoriaMb: number
}

/** Fila própria da IA: não divide vaga, memória nem tempo com a leitura dos anexos. */
export class IaWorkerPool {
  private readonly pool: IsolatedWorkerPool

  constructor(limites: LimitesThreadIa) {
    this.pool = new IsolatedWorkerPool(
      { workers: limites.workers, queueLimit: limites.queueLimit, jobTimeoutMs: limites.timeoutMs, workerMemoryMb: limites.memoriaMb },
      { label: 'Sugestões de IA', queueFull: 'Fila de sugestões cheia' },
    )
  }

  canAccept(): boolean {
    return this.pool.canAccept()
  }

  run(input: IaWorkerInput, signal?: AbortSignal): Promise<ResultadoThreadIa> {
    return this.pool.run<IaWorkerMessage, ResultadoThreadIa>({
      workerUrl,
      ...(signal ? { signal } : {}),
      prepare: () => ({ workerData: input }),
      onMessage: (message) => (message.type === 'concluido' ? { status: 'concluido', saida: message.saida, memoriaMb: message.memoriaMb } : { status: 'memoria-ou-falha', motivo: message.motivo }),
      onTimeout: () => ({ status: 'tempo-esgotado' }),
      onCrash: () => ({ status: 'memoria-ou-falha', motivo: 'thread-encerrada' }),
    })
  }

  close(): Promise<void> {
    return this.pool.close()
  }
}
