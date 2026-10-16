import { COMPARISON_FORMAT_VERSION, summarize, type ComparisonResult } from '../../shared/contracts/comparison.ts'

/** Resultado vazio e completo, para testes que só precisam de um resultado válido. */
export function emptyResult(): ComparisonResult {
  const page = { pageNumber: 1, width: 595, height: 842, rotation: 0, content: 'text', textSource: 'text-layer', text: 'analyzed', visual: 'analyzed' } as const
  return {
    formatVersion: COMPARISON_FORMAT_VERSION,
    id: 'r',
    isDemonstration: false,
    documents: {
      original: { role: 'original', fileName: 'a.pdf', sizeBytes: 1, pageCount: 1 },
      updated: { role: 'updated', fileName: 'b.pdf', sizeBytes: 1, pageCount: 1 },
    },
    summary: summarize([]),
    differences: [],
    analysis: {
      status: 'complete',
      pages: { original: [{ ...page }], updated: [{ ...page }] },
      pageMatches: [{ original: 1, updated: 1, relation: 'matched' }],
      warnings: [],
      methods: { textLayer: true, visual: true, ocr: true },
    },
  }
}
