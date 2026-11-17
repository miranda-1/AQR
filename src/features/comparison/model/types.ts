/**
 * Contratos da comparação de PDFs.
 *
 * Estes tipos descrevem o que o frontend espera receber de um serviço de
 * comparação. Hoje são preenchidos por dados demonstrativos
 * (services/mock-comparison-service.ts); no futuro, pelo backend.
 *
 * Os tipos de dados ficam em `shared/contracts/comparison.ts`, para o servidor usar
 * os mesmos; aqui são reexportados junto com o contrato do serviço, que é só do frontend.
 */

import type { ComparisonOutcome, ComparisonProgress } from '../../../../shared/contracts/comparison'

export * from '../../../../shared/contracts/comparison'

export interface ComparisonInput {
  original: File | null
  updated: File | null
}

export interface CompareOptions {
  signal?: AbortSignal
  onProgress?: (progress: ComparisonProgress) => void
}

/** Contrato que a implementação real (HTTP) deverá cumprir. */
export interface ComparisonService {
  compare(input: ComparisonInput, options?: CompareOptions): Promise<ComparisonOutcome>
}
