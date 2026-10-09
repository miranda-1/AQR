import type { ComparisonError, ComparisonResult, ComparisonStage, DocumentRole } from '../../shared/contracts/comparison.ts'
import type { FailureReason } from './failure.ts'
import type { ComparisonLimits } from './limits.ts'

/** Dados que a thread de comparação recebe (os bytes são transferidos, não copiados). */
export interface WorkerInput {
  documents: Record<DocumentRole, { fileName: string; bytes: Uint8Array }>
  limits: ComparisonLimits
}

/** Mensagens da thread de comparação para o servidor. */
export type WorkerMessage =
  | { type: 'progress'; stage: ComparisonStage }
  | { type: 'completed'; result: ComparisonResult }
  | { type: 'failed'; error: ComparisonError; reason: FailureReason }
