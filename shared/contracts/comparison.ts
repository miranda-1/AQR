/**
 * Tipos de dados da comparação de PDFs, compartilhados pelo frontend e pelo servidor.
 *
 * Só dados puros: nada de DOM nem de Node. O frontend os importa por
 * `src/features/comparison/model/types.ts`, que também define `ComparisonService`.
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
  /**
   * Posição no documento em que o trecho não existe (o original de uma adição, o atualizado
   * de uma exclusão), para os dois painéis rolarem juntos. Opcional.
   */
  anchors?: Partial<Record<DocumentRole, DocumentLocation>>
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

/**
 * Tarefa de comparação na API (`POST /api/comparisons`, `GET /api/comparisons/:id`).
 * O servidor guarda só o resultado, em memória, por tempo limitado; os PDFs nunca são gravados.
 */
export type ComparisonJob =
  | { id: string; status: 'queued' }
  | { id: string; status: 'processing'; stage: ComparisonStage }
  | { id: string; status: 'completed'; result: ComparisonResult }
  | { id: string; status: 'failed'; error: ComparisonError }

export function summarize(differences: readonly Difference[]): ComparisonSummary {
  const summary: ComparisonSummary = { total: differences.length, additions: 0, deletions: 0, modifications: 0 }
  for (const difference of differences) {
    if (difference.kind === 'addition') summary.additions += 1
    else if (difference.kind === 'deletion') summary.deletions += 1
    else summary.modifications += 1
  }
  return summary
}
