/**
 * Contratos da comparação de PDFs.
 *
 * Estes tipos descrevem o que o frontend espera receber de um serviço de
 * comparação. Hoje são preenchidos por dados demonstrativos
 * (services/mock-comparison-service.ts); no futuro, pelo backend.
 */

export type DocumentRole = 'original' | 'updated'

export type DifferenceKind = 'addition' | 'deletion' | 'modification'

/** Retângulo normalizado (0–1) relativo à página, para destacar um trecho. */
export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface DocumentLocation {
  /** Página, começando em 1. */
  pageNumber: number
  region?: NormalizedRect
}

/** Um lado de uma diferença: onde ela está e qual o texto naquele documento. */
export interface DifferenceSide {
  location: DocumentLocation
  text: string
}

export interface Difference {
  id: string
  kind: DifferenceKind
  /** Rótulo curto para localizar a diferença (ex.: seção ou cláusula). */
  context: string
  /** Ausente em adições. */
  original?: DifferenceSide
  /** Ausente em exclusões. */
  updated?: DifferenceSide
}

export interface DocumentSummary {
  role: DocumentRole
  fileName: string
  sizeBytes: number
  pageCount: number
}

export interface ComparisonSummary {
  total: number
  additions: number
  deletions: number
  modifications: number
}

export interface ComparisonResult {
  id: string
  /** true quando o resultado vem de dados fictícios. */
  isDemonstration: boolean
  documents: Record<DocumentRole, DocumentSummary>
  summary: ComparisonSummary
  differences: Difference[]
}

export type ComparisonErrorCode =
  /** Falha inesperada durante o processamento. */
  | 'PROCESSING_FAILED'
  /** Arquivo corrompido, protegido por senha ou que não é um PDF válido. */
  | 'INCOMPATIBLE_DOCUMENT'
  /** PDF digitalizado (imagem) sem texto extraível. */
  | 'NO_EXTRACTABLE_TEXT'

export interface ComparisonError {
  code: ComparisonErrorCode
  /** Documento relacionado ao erro, quando aplicável. */
  document?: DocumentRole
}

export type ComparisonStage = 'validating' | 'extracting' | 'comparing' | 'organizing'

export interface ComparisonProgress {
  stage: ComparisonStage
}

export type ComparisonOutcome =
  | { status: 'completed'; result: ComparisonResult }
  | { status: 'failed'; error: ComparisonError }

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

export function summarize(differences: readonly Difference[]): ComparisonSummary {
  const summary: ComparisonSummary = { total: differences.length, additions: 0, deletions: 0, modifications: 0 }
  for (const difference of differences) {
    if (difference.kind === 'addition') summary.additions += 1
    else if (difference.kind === 'deletion') summary.deletions += 1
    else summary.modifications += 1
  }
  return summary
}
