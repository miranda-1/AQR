import * as z from 'zod/mini'
import type { ComparisonJob } from './types'

/**
 * Validação das respostas da API de comparação. Uma resposta fora do formato do contrato
 * (inclusive de outra versão do formato) é tratada como falha de processamento, em vez de
 * quebrar a interface ou ser mostrada pela metade.
 */

const role = z.enum(['original', 'updated'])
const stage = z.enum(['validating', 'extracting', 'comparing', 'organizing'])
const count = z.number().check(z.int(), z.nonnegative())
const pageNumber = z.number().check(z.int(), z.positive())
const rect = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
const location = z.object({ pageNumber, region: z.optional(rect), regions: z.optional(z.array(rect)) })
const side = z.object({
  location,
  text: z.string(),
  detail: z.optional(z.string()),
  continuedOn: z.optional(z.array(location)),
})

const category = z.enum(['text', 'image', 'visual', 'structure', 'formatting'])
const subtype = z.enum([
  'words',
  'number',
  'date',
  'money',
  'identifier',
  'page-number',
  'image',
  'image-content',
  'image-position',
  'image-size',
  'graphic',
  'page',
  'page-size',
  'page-rotation',
  'font',
  'font-size',
  'color',
  'text-position',
  'layout',
])
const method = z.enum(['text-layer', 'ocr', 'visual', 'objects', 'structure'])

const difference = z.object({
  id: z.string(),
  kind: z.enum(['addition', 'deletion', 'modification', 'move']),
  category,
  subtype,
  context: z.string(),
  original: z.optional(side),
  updated: z.optional(side),
  anchors: z.optional(z.object({ original: z.optional(location), updated: z.optional(location) })),
  methods: z.array(method),
  evidence: z.enum(['corroborated', 'direct', 'needs-review']),
  notes: z.optional(z.array(z.string())),
})

const documentSummary = z.object({
  role,
  fileName: z.string(),
  sizeBytes: z.number(),
  pageCount: z.number().check(z.int(), z.nonnegative()),
})

const coverage = z.enum(['analyzed', 'low-confidence', 'not-analyzed', 'not-applicable'])
const pageAnalysis = z.object({
  pageNumber,
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  content: z.enum(['text', 'scanned', 'mixed', 'blank', 'graphics', 'insufficient-text', 'uncertain']),
  textSource: z.enum(['text-layer', 'ocr', 'text-layer+ocr', 'none']),
  text: coverage,
  visual: coverage,
  ocrConfidence: z.optional(z.number()),
})

const analysis = z.object({
  status: z.enum(['complete', 'with-caveats', 'partial']),
  pages: z.object({ original: z.array(pageAnalysis), updated: z.array(pageAnalysis) }),
  pageMatches: z.array(
    z.object({
      original: z.optional(pageNumber),
      updated: z.optional(pageNumber),
      relation: z.enum(['matched', 'moved', 'added', 'removed', 'reflowed', 'ambiguous']),
    }),
  ),
  warnings: z.array(
    z.object({
      code: z.enum([
        'PAGES_WITHOUT_TEXT',
        'OCR_USED',
        'OCR_LOW_CONFIDENCE',
        'OCR_UNAVAILABLE',
        'OCR_LIMIT_REACHED',
        'OCR_NOISE_DISCARDED',
        'VISUAL_UNAVAILABLE',
        'VISUAL_LIMIT_REACHED',
        'PAGE_RENDER_FAILED',
        'AMBIGUOUS_PAGE_MATCH',
        'TEXT_ALIGNED_BY_LINES',
        'READING_ORDER_UNCERTAIN',
        'IMAGE_TEXT_NOT_READ',
      ]),
      severity: z.enum(['info', 'caveat', 'limitation']),
      message: z.string(),
      document: z.optional(role),
      pages: z.optional(z.array(pageNumber)),
    }),
  ),
  methods: z.object({ textLayer: z.boolean(), visual: z.boolean(), ocr: z.boolean() }),
})

const byCategory = z.object({ text: count, image: count, visual: count, structure: count, formatting: count })

const result = z.object({
  formatVersion: z.literal(2),
  id: z.string(),
  isDemonstration: z.boolean(),
  documents: z.object({ original: documentSummary, updated: documentSummary }),
  summary: z.object({
    total: count,
    additions: count,
    deletions: count,
    modifications: count,
    moves: count,
    byCategory,
    needsReview: count,
  }),
  differences: z.array(difference),
  analysis,
})

const comparisonError = z.object({
  code: z.enum(['PROCESSING_FAILED', 'INCOMPATIBLE_DOCUMENT', 'NO_EXTRACTABLE_TEXT']),
  document: z.optional(role),
})

export const comparisonJobSchema = z.discriminatedUnion('status', [
  z.object({ id: z.string(), status: z.literal('queued') }),
  z.object({ id: z.string(), status: z.literal('processing'), stage }),
  z.object({ id: z.string(), status: z.literal('completed'), result }),
  z.object({ id: z.string(), status: z.literal('failed'), error: comparisonError }),
])

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), document: z.optional(role) }),
})

/** O formato validado precisa caber no contrato (checagem em tempo de compilação). */
export function parseComparisonJob(value: unknown): ComparisonJob | undefined {
  const parsed = comparisonJobSchema.safeParse(value)
  if (!parsed.success) return undefined
  const job: ComparisonJob = parsed.data
  return job
}
