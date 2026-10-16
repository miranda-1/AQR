import type {
  DetectionMethod,
  Difference,
  DifferenceCategory,
  DifferenceKind,
  DifferenceSide,
  DifferenceSubtype,
  DocumentLocation,
  DocumentRole,
  EvidenceLevel,
  NormalizedRect,
} from '../../shared/contracts/comparison.ts'
import { unionRect } from './geometry.ts'

/**
 * Diferença em construção. Cada motor produz rascunhos; a consolidação junta evidências e descarta
 * duplicidades; no fim, cada rascunho vira uma `Difference` com id e contexto.
 */
export interface Draft {
  kind: DifferenceKind
  category: DifferenceCategory
  subtype: DifferenceSubtype
  original?: DifferenceSide
  updated?: DifferenceSide
  anchors?: Partial<Record<DocumentRole, DocumentLocation>>
  methods: Set<DetectionMethod>
  evidence: EvidenceLevel
  notes: string[]
  /** Contexto já conhecido (texto); os demais são calculados pela posição. */
  context?: string
  /** Só palavras de OCR, dos dois lados (candidata a ruído de reconhecimento). */
  ocrOnly?: boolean
}

export function makeDraft(
  init: Pick<Draft, 'kind' | 'category' | 'subtype' | 'evidence'> & Partial<Omit<Draft, 'methods' | 'notes'>> & {
    methods: DetectionMethod[]
    notes?: string[]
  },
): Draft {
  const { methods, notes = [], ...rest } = init
  return { ...rest, methods: new Set(methods), notes: [...notes] }
}

/** Lado de uma diferença a partir de retângulos numa página. */
export function sideFromRects(pageNumber: number, rects: readonly NormalizedRect[], text = '', detail?: string): DifferenceSide {
  const region = unionRect(rects)
  const location: DocumentLocation = { pageNumber }
  if (region) location.region = region
  if (rects.length > 1) location.regions = [...rects]
  const side: DifferenceSide = { location, text }
  if (detail) side.detail = detail
  return side
}

export const FULL_PAGE: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 }

/** Retângulos de um lado da diferença por página (partes, ou o retângulo total, mais as continuações). */
export function rectsOf(side: DifferenceSide | undefined): { pageNumber: number; rects: NormalizedRect[] }[] {
  if (!side) return []
  const pages = [side.location, ...(side.continuedOn ?? [])]
  return pages.map((location) => ({
    pageNumber: location.pageNumber,
    rects: location.regions ?? (location.region ? [location.region] : []),
  }))
}

export function finalize(draft: Draft, id: string, context: string): Difference {
  const methodOrder: DetectionMethod[] = ['text-layer', 'ocr', 'objects', 'visual', 'structure']
  const difference: Difference = {
    id,
    kind: draft.kind,
    category: draft.category,
    subtype: draft.subtype,
    context,
    methods: methodOrder.filter((method) => draft.methods.has(method)),
    evidence: draft.evidence,
  }
  if (draft.original) difference.original = draft.original
  if (draft.updated) difference.updated = draft.updated
  if (draft.anchors && Object.keys(draft.anchors).length > 0) difference.anchors = draft.anchors
  const notes = [...new Set(draft.notes)]
  if (notes.length > 0) difference.notes = notes
  return difference
}
