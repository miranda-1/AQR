/**
 * Tipos de dados da comparação de PDFs, compartilhados pelo frontend e pelo servidor.
 *
 * Só dados puros: nada de DOM nem de Node. O frontend os importa por
 * `src/features/comparison/model/types.ts`, que também define `ComparisonService`.
 *
 * Formato 2 (`formatVersion: 2`): além das diferenças de texto, o resultado traz a categoria e os
 * métodos de cada diferença, a cobertura da análise por página, a correspondência entre páginas e
 * as ressalvas. "Nenhuma diferença" nunca significa "documentos iguais": significa que nada foi
 * detectado nas áreas analisadas, e `analysis` diz quais foram.
 */

export const COMPARISON_FORMAT_VERSION = 2

export type DocumentRole = 'original' | 'updated'

/** O que aconteceu com o trecho: incluído, excluído, alterado ou mudado de lugar. */
export type DifferenceKind = 'addition' | 'deletion' | 'modification' | 'move'

/**
 * Natureza da diferença:
 * - `text`: conteúdo textual (camada de texto do PDF ou OCR);
 * - `image`: imagem incorporada (incluída, excluída, trocada, movida ou redimensionada);
 * - `visual`: região cuja aparência mudou sem que outro método explique a causa (desenhos,
 *   linhas, carimbos, assinaturas digitalizadas);
 * - `structure`: páginas (incluídas, excluídas, movidas, tamanho ou orientação);
 * - `formatting`: aparência do texto sem mudança de conteúdo (fonte, tamanho, cor, posição, diagramação).
 */
export type DifferenceCategory = 'text' | 'image' | 'visual' | 'structure' | 'formatting'

export type DifferenceSubtype =
  // texto
  | 'words'
  | 'number'
  | 'date'
  | 'money'
  | 'identifier'
  | 'page-number'
  // imagem
  | 'image'
  | 'image-content'
  | 'image-position'
  | 'image-size'
  // visual
  | 'graphic'
  // estrutura
  | 'page'
  | 'page-size'
  | 'page-rotation'
  // formatação
  | 'font'
  | 'font-size'
  | 'color'
  | 'text-position'
  | 'layout'

/**
 * Como a diferença foi encontrada:
 * - `text-layer`: texto extraído do PDF;
 * - `ocr`: texto reconhecido na imagem da página;
 * - `visual`: comparação das páginas renderizadas;
 * - `objects`: objetos do PDF (imagens e fontes);
 * - `structure`: correspondência entre páginas.
 */
export type DetectionMethod = 'text-layer' | 'ocr' | 'visual' | 'objects' | 'structure'

/**
 * Força da evidência, sem pontuação inventada:
 * - `corroborated`: dois métodos independentes apontam a mesma diferença;
 * - `direct`: um método determinístico encontrou a diferença (ex.: texto extraído diferente);
 * - `needs-review`: evidência fraca ou classificação incerta (OCR de baixa confiança,
 *   região visual sem causa identificada); pede conferência humana.
 */
export type EvidenceLevel = 'corroborated' | 'direct' | 'needs-review'

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
  /** Retângulo que envolve o trecho nesta página (para rolar até ele). */
  region?: NormalizedRect
  /**
   * Partes do trecho, quando ele ocupa áreas separadas (várias linhas, colunas). Sem este campo,
   * `region` é a área inteira. Sempre dentro da página `pageNumber`.
   */
  regions?: NormalizedRect[]
}

/** Um lado de uma diferença: onde ela está e qual o texto naquele documento. */
export interface DifferenceSide {
  location: DocumentLocation
  /** Texto do trecho; vazio em diferenças sem texto (imagens, regiões visuais). */
  text: string
  /** Descrição do estado neste lado, quando não é texto (ex.: "Fonte sem serifa, 12 pt"). */
  detail?: string
  /** O trecho continua nestas páginas (diferença que atravessa a quebra de página). */
  continuedOn?: DocumentLocation[]
}

export interface Difference {
  id: string
  kind: DifferenceKind
  category: DifferenceCategory
  subtype: DifferenceSubtype
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
  /** Métodos que sustentam a diferença (pelo menos um). */
  methods: DetectionMethod[]
  evidence: EvidenceLevel
  /** Ressalvas desta diferença (ex.: "Texto reconhecido por OCR com confiança baixa."). */
  notes?: string[]
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
  moves: number
  byCategory: Record<DifferenceCategory, number>
  /** Diferenças que pedem conferência humana. */
  needsReview: number
}

/** Conteúdo de uma página, pelo que a extração e a renderização mostraram. */
export type PageContentType =
  /** Texto extraível em quantidade compatível com o que aparece na página. */
  | 'text'
  /** Imagem da página inteira sem texto extraível (digitalização). */
  | 'scanned'
  /** Texto extraível e imagens grandes, que podem conter mais texto. */
  | 'mixed'
  /** Nada visível. */
  | 'blank'
  /** Só desenhos ou imagens pequenas, sem texto: comparada só pela aparência. */
  | 'graphics'
  /** Pouco texto extraível para o que aparece na página. */
  | 'insufficient-text'
  /** A página não pôde ser examinada. */
  | 'uncertain'

/**
 * Cobertura de um método numa página:
 * - `analyzed`: o método rodou e o resultado entra na comparação;
 * - `low-confidence`: rodou, mas parte do resultado é pouco confiável (OCR);
 * - `not-analyzed`: o método se aplicava, mas não rodou (limite, falha ou indisponível);
 * - `not-applicable`: o método não se aplica a esta página (ex.: OCR numa página com texto).
 */
export type MethodCoverage = 'analyzed' | 'low-confidence' | 'not-analyzed' | 'not-applicable'

export interface PageAnalysis {
  pageNumber: number
  /** Tamanho em pontos (1/72 pol.), já com a rotação aplicada. */
  width: number
  height: number
  /** Rotação declarada no PDF (0, 90, 180, 270). */
  rotation: number
  content: PageContentType
  /** De onde veio o texto comparado. */
  textSource: 'text-layer' | 'ocr' | 'text-layer+ocr' | 'none'
  text: MethodCoverage
  visual: MethodCoverage
  /** Confiança média informada pelo Tesseract (0–100), só nas páginas com OCR. */
  ocrConfidence?: number
}

/**
 * Relação entre páginas dos dois documentos. `original` ou `updated` ausente quando a página só
 * existe de um lado.
 * - `matched`: correspondem, na mesma ordem relativa;
 * - `moved`: correspondem, mas a página mudou de posição na sequência;
 * - `added` / `removed`: só existe num dos documentos, com conteúdo que não aparece no outro;
 * - `reflowed`: só existe num dos documentos, mas o conteúdo dela está nas páginas do outro
 *   (o texto mudou de página por causa de inclusões ou exclusões); é comparada pelo texto;
 * - `ambiguous`: há mais de uma correspondência possível (páginas repetidas, vazias); a ligação é
 *   a mais provável pela ordem, não uma certeza.
 */
export interface PageMatch {
  original?: number
  updated?: number
  relation: 'matched' | 'moved' | 'added' | 'removed' | 'reflowed' | 'ambiguous'
}

export type AnalysisWarningCode =
  | 'PAGES_WITHOUT_TEXT'
  | 'OCR_USED'
  | 'OCR_LOW_CONFIDENCE'
  | 'OCR_UNAVAILABLE'
  | 'OCR_LIMIT_REACHED'
  | 'OCR_NOISE_DISCARDED'
  | 'VISUAL_UNAVAILABLE'
  | 'VISUAL_LIMIT_REACHED'
  | 'PAGE_RENDER_FAILED'
  | 'AMBIGUOUS_PAGE_MATCH'
  | 'TEXT_ALIGNED_BY_LINES'
  | 'READING_ORDER_UNCERTAIN'
  | 'IMAGE_TEXT_NOT_READ'

/**
 * Ressalva da análise.
 * - `info`: só informa o método usado;
 * - `caveat`: a análise ocorreu, mas com qualidade reduzida;
 * - `limitation`: parte do documento não foi analisada por algum método aplicável.
 */
export interface AnalysisWarning {
  code: AnalysisWarningCode
  severity: 'info' | 'caveat' | 'limitation'
  message: string
  document?: DocumentRole
  pages?: number[]
}

/**
 * Situação da análise (a comparação terminou; falhas impeditivas são `ComparisonError`):
 * - `complete`: todos os métodos aplicáveis rodaram em todas as páginas, sem ressalvas;
 * - `with-caveats`: todas as páginas foram examinadas, mas parte com qualidade reduzida
 *   (OCR, correspondência ambígua, ordem de leitura incerta);
 * - `partial`: alguma página ou método aplicável ficou sem análise.
 */
export type AnalysisStatus = 'complete' | 'with-caveats' | 'partial'

export interface ComparisonAnalysis {
  status: AnalysisStatus
  pages: Record<DocumentRole, PageAnalysis[]>
  pageMatches: PageMatch[]
  warnings: AnalysisWarning[]
  /** Métodos disponíveis nesta execução (desligados por configuração ou por falta de recurso). */
  methods: { textLayer: boolean; visual: boolean; ocr: boolean }
}

export interface ComparisonResult {
  formatVersion: typeof COMPARISON_FORMAT_VERSION
  id: string
  /** true quando o resultado vem de dados fictícios. */
  isDemonstration: boolean
  documents: Record<DocumentRole, DocumentSummary>
  summary: ComparisonSummary
  differences: Difference[]
  analysis: ComparisonAnalysis
}

export type ComparisonErrorCode =
  /** Falha inesperada durante o processamento. */
  | 'PROCESSING_FAILED'
  /** Arquivo corrompido, protegido por senha ou que não é um PDF válido. */
  | 'INCOMPATIBLE_DOCUMENT'
  /** Nenhum método disponível consegue ler o documento (sem texto, com OCR e comparação visual desligados). */
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

export const differenceCategories: readonly DifferenceCategory[] = ['text', 'image', 'visual', 'structure', 'formatting']

export function summarize(differences: readonly Difference[]): ComparisonSummary {
  const summary: ComparisonSummary = {
    total: differences.length,
    additions: 0,
    deletions: 0,
    modifications: 0,
    moves: 0,
    byCategory: { text: 0, image: 0, visual: 0, structure: 0, formatting: 0 },
    needsReview: 0,
  }
  for (const difference of differences) {
    if (difference.kind === 'addition') summary.additions += 1
    else if (difference.kind === 'deletion') summary.deletions += 1
    else if (difference.kind === 'move') summary.moves += 1
    else summary.modifications += 1
    summary.byCategory[difference.category] += 1
    if (difference.evidence === 'needs-review') summary.needsReview += 1
  }
  return summary
}

/** Situação da análise a partir das páginas e ressalvas (regra única para servidor e testes). */
export function analysisStatusOf(
  pages: Record<DocumentRole, readonly PageAnalysis[]>,
  warnings: readonly AnalysisWarning[],
): AnalysisStatus {
  const all = [...pages.original, ...pages.updated]
  const notAnalyzed = all.some((page) => page.text === 'not-analyzed' || page.visual === 'not-analyzed' || page.content === 'uncertain')
  if (notAnalyzed || warnings.some((warning) => warning.severity === 'limitation')) return 'partial'
  const reduced = all.some((page) => page.text === 'low-confidence' || page.visual === 'low-confidence')
  if (reduced || warnings.some((warning) => warning.severity === 'caveat')) return 'with-caveats'
  return 'complete'
}
