import { IsolatedWorkerPool } from '../documents/isolated-pool.ts'
import type { TriagemSettings } from '../config.ts'
import type { AnexoTriado } from './pipeline.ts'
import type { LeituraLimites } from './reading/read.ts'
import type { TriagemWorkerInput, TriagemWorkerMessage } from './worker-protocol.ts'

export { QueueFullError } from '../documents/isolated-pool.ts'

const workerUrl = new URL(import.meta.url.endsWith('.ts') ? './worker.ts' : './worker.js', import.meta.url)

export type ResultadoThread = { status: 'concluido'; anexos: AnexoTriado[] } | { status: 'falhou'; motivo: string }

/**
 * Fila de processamento da triagem: a mesma mecânica de threads isoladas da comparação
 * (`server/documents/isolated-pool.ts`), com limites próprios de quantidade, memória e tempo.
 */
export class TriagemWorkerPool {
  private readonly pool: IsolatedWorkerPool
  private readonly settings: TriagemSettings
  private readonly limites: LeituraLimites

  constructor(settings: TriagemSettings, limites: LeituraLimites) {
    this.settings = settings
    this.limites = limites
    this.pool = new IsolatedWorkerPool(settings, { label: 'Triagem', queueFull: 'Fila de triagens cheia' })
  }

  canAccept(): boolean {
    return this.pool.canAccept()
  }

  run(anexos: { id: string; nome: string; bytes: Uint8Array }[], signal?: AbortSignal): Promise<ResultadoThread> {
    return this.pool.run<TriagemWorkerMessage, ResultadoThread>({
      workerUrl,
      ...(signal ? { signal } : {}),
      prepare: () => {
        const copias = anexos.map((anexo) => ({ id: anexo.id, nome: anexo.nome, bytes: anexo.bytes.slice() }))
        const input: TriagemWorkerInput = { anexos: copias, limites: this.limites, ocr: this.settings.ocr, ocrLanguagePath: this.settings.ocrLanguagePath }
        return { workerData: input, transferList: copias.map((copia) => copia.bytes.buffer as ArrayBuffer) }
      },
      onMessage: (message) => {
        if (message.type === 'progresso') return undefined
        if (message.type === 'concluido') return { status: 'concluido', anexos: message.anexos }
        return { status: 'falhou', motivo: message.motivo }
      },
      onTimeout: () => ({ status: 'falhou', motivo: 'tempo-esgotado' }),
      onCrash: () => ({ status: 'falhou', motivo: 'falha-inesperada' }),
    })
  }

  close(): Promise<void> {
    return this.pool.close()
  }
}
