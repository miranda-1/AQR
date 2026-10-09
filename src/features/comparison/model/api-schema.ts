import * as z from 'zod/mini'
import type { ComparisonJob } from './types'

/**
 * Validação das respostas da API de comparação. Uma resposta fora do formato do contrato
 * é tratada como falha de processamento, em vez de quebrar a interface.
 */

const role = z.enum(['original', 'updated'])
const stage = z.enum(['validating', 'extracting', 'comparing', 'organizing'])
const rect = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
const location = z.object({ pageNumber: z.number().check(z.int(), z.positive()), region: z.optional(rect) })
const side = z.object({ location, text: z.string() })

const difference = z.object({
  id: z.string(),
  kind: z.enum(['addition', 'deletion', 'modification']),
  context: z.string(),
  original: z.optional(side),
  updated: z.optional(side),
  anchors: z.optional(z.object({ original: z.optional(location), updated: z.optional(location) })),
})

const documentSummary = z.object({
  role,
  fileName: z.string(),
  sizeBytes: z.number(),
  pageCount: z.number().check(z.int(), z.nonnegative()),
})

const count = z.number().check(z.int(), z.nonnegative())

const result = z.object({
  id: z.string(),
  isDemonstration: z.boolean(),
  documents: z.object({ original: documentSummary, updated: documentSummary }),
  summary: z.object({ total: count, additions: count, deletions: count, modifications: count }),
  differences: z.array(difference),
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
