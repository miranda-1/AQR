import type {
  ComparisonAnalysis,
  ComparisonErrorCode,
  ComparisonResult,
  DetectionMethod,
  Difference,
  DifferenceCategory,
  DifferenceKind,
  DifferenceSubtype,
  DocumentLocation,
  DocumentRole,
  NormalizedRect,
} from '../../../shared/contracts/comparison.ts'
import { area, intersection, unionRect } from '../geometry.ts'

/**
 * Avaliação do comparador contra o gabarito do corpus.
 *
 * Uma diferença atende a um evento esperado quando:
 * - a categoria está entre as aceitas (e o tipo e o subtipo, se o gabarito os fixa);
 * - a página de cada lado indicado é a do gabarito;
 * - a região de cada lado com retângulo no gabarito se sobrepõe a ele, em cada eixo, em pelo menos
 *   `MIN_COVERAGE` da menor das duas extensões, e não é desproporcionalmente maior (`MAX_GROWTH`
 *   vezes a área esperada + `AREA_SLACK` da página).
 *
 * Classificação de cada evento esperado: encontrado; classificação errada (há uma diferença no
 * lugar, mas de outra categoria/tipo/subtipo); localização errada (tipo certo, página certa,
 * região fora da tolerância); omitido. Diferenças que não atendem a nenhum evento e não estão na
 * lista de toleradas do caso são falsas diferenças.
 */

export const MIN_COVERAGE = 0.5
export const MAX_GROWTH = 4
export const AREA_SLACK = 0.02

export interface ExpectedSide {
  page: number
  region?: NormalizedRect
}

export interface ExpectedEvent {
  label: string
  category: DifferenceCategory | readonly DifferenceCategory[]
  kind?: DifferenceKind | readonly DifferenceKind[]
  subtype?: DifferenceSubtype | readonly DifferenceSubtype[]
  original?: ExpectedSide
  updated?: ExpectedSide
  /** Métodos que precisam constar na diferença. */
  methods?: readonly DetectionMethod[]
}

/** Diferença que pode aparecer sem ser falsa (ex.: diagramação depois de trocar a fonte). */
export interface ToleratedRule {
  category: DifferenceCategory
  subtype?: DifferenceSubtype | readonly DifferenceSubtype[]
  reason: string
}

export interface CaseOutcome {
  found: string[]
  missed: string[]
  misclassified: { label: string; got: string }[]
  mislocated: string[]
  falsePositives: string[]
  tolerated: number
}

function list<T>(value: T | readonly T[] | undefined): readonly T[] | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? (value as readonly T[]) : [value as T]
}

function rectsOn(difference: Difference, role: DocumentRole, page: number): NormalizedRect[] {
  const side = difference[role]
  if (!side) return []
  const locations: DocumentLocation[] = [side.location, ...(side.continuedOn ?? [])]
  return locations
    .filter((location) => location.pageNumber === page)
    .flatMap((location) => location.regions ?? (location.region ? [location.region] : []))
}

/**
 * Sobreposição por eixo, relativa à menor das duas extensões: o destaque precisa cobrir pelo menos
 * `MIN_COVERAGE` da largura e da altura do menor dos dois (o esperado ou o encontrado). Assim um
 * destaque só da vírgula trocada, ou um com folga de altura, vale; um destaque muito maior que o
 * esperado não vale (`MAX_GROWTH`).
 */
function regionFits(rects: readonly NormalizedRect[], expected: NormalizedRect): boolean {
  const union = unionRect(rects)
  if (!union) return false
  const overlapX = Math.min(union.x + union.width, expected.x + expected.width) - Math.max(union.x, expected.x)
  const overlapY = Math.min(union.y + union.height, expected.y + expected.height) - Math.max(union.y, expected.y)
  const fitsX = overlapX / Math.max(Math.min(union.width, expected.width), 1e-9) >= MIN_COVERAGE
  const fitsY = overlapY / Math.max(Math.min(union.height, expected.height), 1e-9) >= MIN_COVERAGE
  const touching = rects.some((rect) => intersection(rect, expected) > 0)
  return fitsX && fitsY && touching && area(union) <= MAX_GROWTH * area(expected) + AREA_SLACK
}

function typeMatches(difference: Difference, event: ExpectedEvent): boolean {
  if (!(list(event.category) ?? []).includes(difference.category)) return false
  const kinds = list(event.kind)
  if (kinds && !kinds.includes(difference.kind)) return false
  const subtypes = list(event.subtype)
  if (subtypes && !subtypes.includes(difference.subtype)) return false
  if (event.methods && !event.methods.every((method) => difference.methods.includes(method))) return false
  return true
}

function pageOf(difference: Difference, role: DocumentRole): number | undefined {
  return difference[role]?.location.pageNumber
}

function pagesMatch(difference: Difference, event: ExpectedEvent): boolean {
  return (['original', 'updated'] as const).every((role) => {
    const expected = event[role]
    if (!expected) return true
    const rects = rectsOn(difference, role, expected.page)
    return pageOf(difference, role) === expected.page || rects.length > 0
  })
}

function regionsMatch(difference: Difference, event: ExpectedEvent): boolean {
  return (['original', 'updated'] as const).every((role) => {
    const expected = event[role]
    if (!expected?.region) return true
    return regionFits(rectsOn(difference, role, expected.page), expected.region)
  })
}

/** Toca o lugar do evento (para reconhecer classificação errada). */
function touchesEvent(difference: Difference, event: ExpectedEvent): boolean {
  return (['original', 'updated'] as const).some((role) => {
    const expected = event[role]
    if (!expected) return false
    const rects = rectsOn(difference, role, expected.page)
    if (!expected.region) return rects.length > 0
    return rects.some((rect) => intersection(rect, expected.region ?? rect) > 0)
  })
}

function describe(difference: Difference): string {
  const pages = `${pageOf(difference, 'original') ?? '-'}→${pageOf(difference, 'updated') ?? '-'}`
  const text = difference.updated?.text || difference.original?.text || difference.updated?.detail || difference.original?.detail || ''
  return `${difference.category}/${difference.kind}/${difference.subtype} p.${pages} "${text.slice(0, 40)}"`
}

function tolerated(difference: Difference, rules: readonly ToleratedRule[]): boolean {
  return rules.some((rule) => {
    if (rule.category !== difference.category) return false
    const subtypes = list(rule.subtype)
    return !subtypes || subtypes.includes(difference.subtype)
  })
}

export function evaluateResult(result: ComparisonResult, expected: readonly ExpectedEvent[], rules: readonly ToleratedRule[] = []): CaseOutcome {
  const outcome: CaseOutcome = { found: [], missed: [], misclassified: [], mislocated: [], falsePositives: [], tolerated: 0 }
  const used = new Set<string>()
  for (const event of expected) {
    const candidates = result.differences.filter((difference) => !used.has(difference.id))
    const exact = candidates.find((difference) => typeMatches(difference, event) && pagesMatch(difference, event) && regionsMatch(difference, event))
    if (exact) {
      used.add(exact.id)
      outcome.found.push(event.label)
      continue
    }
    const wrongPlace = candidates.find((difference) => typeMatches(difference, event) && pagesMatch(difference, event))
    if (wrongPlace) {
      used.add(wrongPlace.id)
      outcome.mislocated.push(event.label)
      continue
    }
    const wrongType = candidates.find((difference) => touchesEvent(difference, event))
    if (wrongType) {
      used.add(wrongType.id)
      outcome.misclassified.push({ label: event.label, got: describe(wrongType) })
      continue
    }
    outcome.missed.push(event.label)
  }
  for (const difference of result.differences) {
    if (used.has(difference.id)) continue
    if (tolerated(difference, rules)) outcome.tolerated += 1
    else outcome.falsePositives.push(describe(difference))
  }
  return outcome
}

export interface CorpusExpectation {
  original: Uint8Array
  updated: Uint8Array
  expected: ExpectedEvent[]
}

export type CorpusGroup = 'texto' | 'imagem' | 'estrutura' | 'aparência' | 'digitalizado' | 'negativo' | 'entrada'

export interface CorpusCase {
  id: string
  title: string
  group: CorpusGroup
  build: () => Promise<CorpusExpectation>
  tolerated?: ToleratedRule[]
  /** A comparação deve falhar com este erro (arquivos corrompidos, protegidos). */
  expectFailure?: { code: ComparisonErrorCode; document?: DocumentRole }
  /** Conferência da análise (cobertura, OCR, situação); devolve o problema ou `undefined`. */
  checkAnalysis?: (analysis: ComparisonAnalysis) => string | undefined
  /** Limitação conhecida do caso, documentada no relatório. */
  limitation?: string
  /** Tempo máximo do teste (OCR e documentos longos). */
  timeoutMs?: number
}

export function isClean(outcome: CaseOutcome): boolean {
  return outcome.missed.length === 0 && outcome.misclassified.length === 0 && outcome.mislocated.length === 0 && outcome.falsePositives.length === 0
}
