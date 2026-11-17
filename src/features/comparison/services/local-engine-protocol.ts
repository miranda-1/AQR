import type { ComparisonError, ComparisonResult, ComparisonStage, DocumentRole } from '../model/types'

/**
 * Mensagens entre a página e o Web Worker que roda o motor de comparação no navegador
 * (`../local-engine/engine.worker.ts`). Os bytes dos PDFs são transferidos, não copiados.
 */
export interface LocalEngineRequest {
  documents: Record<DocumentRole, { fileName: string; bytes: Uint8Array }>
}

export type LocalEngineMessage =
  | { type: 'progress'; stage: ComparisonStage }
  | { type: 'completed'; result: ComparisonResult }
  | { type: 'failed'; error: ComparisonError }
