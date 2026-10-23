/**
 * Contratos da comparação de PDFs.
 *
 * Estes tipos descrevem o que o frontend espera receber de um serviço de
 * comparação. Nesta branch (`master`, só frontend) são preenchidos por dados demonstrativos
 * (services/mock-comparison-service.ts); na `dev`, pelo servidor.
 *
 * Os tipos de dados ficam em `contracts.ts` (na `dev`, em `shared/contracts/comparison.ts`, para o
 * servidor usar os mesmos); aqui são reexportados junto com o contrato do serviço.
 */

import type { ComparisonOutcome, ComparisonProgress } from './contracts'

export * from './contracts'

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
