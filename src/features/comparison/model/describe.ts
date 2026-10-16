import type {
  AnalysisStatus,
  DetectionMethod,
  Difference,
  DifferenceCategory,
  DifferenceSubtype,
  EvidenceLevel,
  MethodCoverage,
  PageContentType,
  PageMatch,
} from './types'

/**
 * Textos da interface e do relatório para os campos do resultado. As descrições saem só dos
 * campos (categoria, tipo, subtipo): nenhuma explicação é inventada além do que o resultado diz.
 */

export const categoryLabels: Record<DifferenceCategory, { label: string; plural: string }> = {
  text: { label: 'Texto', plural: 'Texto' },
  image: { label: 'Imagem', plural: 'Imagens' },
  visual: { label: 'Elemento visual', plural: 'Elementos visuais' },
  structure: { label: 'Estrutura', plural: 'Estrutura' },
  formatting: { label: 'Formatação', plural: 'Formatação' },
}

export const methodLabels: Record<DetectionMethod, string> = {
  'text-layer': 'texto do PDF',
  ocr: 'OCR',
  visual: 'comparação visual',
  objects: 'objetos do PDF',
  structure: 'correspondência de páginas',
}

export const evidenceLabels: Record<EvidenceLevel, { label: string; hint: string }> = {
  corroborated: { label: 'Confirmada', hint: 'Dois métodos independentes apontam a mesma diferença.' },
  direct: { label: 'Detectada', hint: 'Um método encontrou a diferença diretamente no arquivo.' },
  'needs-review': { label: 'Conferir', hint: 'Evidência fraca ou classificação incerta: confira no documento.' },
}

export const statusLabels: Record<AnalysisStatus, string> = {
  complete: 'Análise concluída',
  'with-caveats': 'Análise concluída com ressalvas',
  partial: 'Comparação parcial',
}

export const contentLabels: Record<PageContentType, string> = {
  text: 'texto',
  scanned: 'digitalizada',
  mixed: 'texto e imagens',
  blank: 'em branco',
  graphics: 'só desenhos ou imagens',
  'insufficient-text': 'pouco texto extraível',
  uncertain: 'não examinada',
}

export const coverageLabels: Record<MethodCoverage, string> = {
  analyzed: 'analisado',
  'low-confidence': 'confiança baixa',
  'not-analyzed': 'não analisado',
  'not-applicable': 'não se aplica',
}

export const relationLabels: Record<PageMatch['relation'], string> = {
  matched: 'Corresponde',
  moved: 'Movida',
  added: 'Incluída',
  removed: 'Excluída',
  reflowed: 'Conteúdo redistribuído',
  ambiguous: 'Correspondência ambígua',
}

const subtypeDescriptions: Record<DifferenceSubtype, Partial<Record<Difference['kind'], string>> & { default: string }> = {
  words: { addition: 'Texto incluído.', deletion: 'Texto excluído.', move: 'Texto movido.', default: 'Texto alterado.' },
  number: { default: 'Número alterado.' },
  date: { default: 'Data alterada.' },
  money: { default: 'Valor monetário alterado.' },
  identifier: { default: 'Número de identificação alterado.' },
  'page-number': { default: 'Numeração de página alterada.' },
  image: { addition: 'Imagem incluída.', deletion: 'Imagem excluída.', default: 'Imagem alterada.' },
  'image-content': { default: 'Imagem trocada ou modificada.' },
  'image-position': { default: 'Imagem reposicionada.' },
  'image-size': { default: 'Imagem redimensionada.' },
  graphic: {
    addition: 'Elemento gráfico incluído.',
    deletion: 'Elemento gráfico excluído.',
    default: 'Região visualmente alterada.',
  },
  page: { addition: 'Página incluída.', deletion: 'Página excluída.', move: 'Página movida.', default: 'Página alterada.' },
  'page-size': { default: 'Tamanho da página alterado.' },
  'page-rotation': { default: 'Orientação da página alterada.' },
  font: { default: 'Fonte alterada, sem mudança no texto.' },
  'font-size': { default: 'Tamanho da fonte alterado, sem mudança no texto.' },
  color: { default: 'Cor do texto alterada, sem mudança no texto.' },
  'text-position': { default: 'Texto reposicionado, sem mudança no conteúdo.' },
  layout: { default: 'Diagramação alterada, sem mudança no texto.' },
}

/** Frase curta que diz o que mudou (ex.: "Valor monetário alterado."). */
export function describeDifference(difference: Pick<Difference, 'kind' | 'subtype'>): string {
  const entry = subtypeDescriptions[difference.subtype]
  return entry[difference.kind] ?? entry.default
}

/** "p. 5" ou "p. 5 → p. 7", pela página de cada lado. */
export function pageSpan(difference: Difference): string {
  const original = difference.original?.location.pageNumber ?? difference.anchors?.original?.pageNumber
  const updated = difference.updated?.location.pageNumber ?? difference.anchors?.updated?.pageNumber
  if (difference.original && difference.updated && original !== updated) return `p. ${original} → p. ${updated}`
  return `p. ${difference.updated ? updated : original}`
}

export function methodsText(methods: readonly DetectionMethod[]): string {
  const labels = methods.map((method) => methodLabels[method])
  if (labels.length <= 1) return labels.join('')
  return `${labels.slice(0, -1).join(', ')} e ${labels.at(-1) ?? ''}`
}
