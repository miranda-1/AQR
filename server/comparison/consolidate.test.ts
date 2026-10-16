import type { NormalizedRect } from '../../shared/contracts/comparison.ts'
import { consolidatePagePair, type PagePairEvidence } from './consolidate.ts'
import { makeDraft, sideFromRects } from './drafts.ts'
import type { VisualRegion } from './visual/raster-diff.ts'

const rect = (x: number, y: number, width = 0.1, height = 0.02): NormalizedRect => ({ x, y, width, height })
const region = (at: NormalizedRect, inkOriginal = 0.3, inkUpdated = 0.3): VisualRegion => ({ original: at, updated: at, pixels: 100, inkOriginal, inkUpdated })

function evidence(regions: VisualRegion[], extra: Partial<PagePairEvidence> = {}): PagePairEvidence {
  return {
    pages: { original: 1, updated: 1 },
    visualAnalyzed: true,
    regions,
    images: [],
    formatting: [],
    displaced: { original: [], updated: [] },
    words: { original: [], updated: [] },
    ...extra,
  }
}

function textDraft(at: NormalizedRect, options: { ocr?: boolean; evidence?: 'direct' | 'needs-review' } = {}) {
  return makeDraft({
    kind: 'modification',
    category: 'text',
    subtype: 'money',
    evidence: options.evidence ?? 'direct',
    methods: [options.ocr ? 'ocr' : 'text-layer'],
    ocrOnly: options.ocr ?? false,
    original: sideFromRects(1, [at], 'R$ 15.000,00'),
    updated: sideFromRects(1, [at], 'R$ 18.000,00'),
  })
}

describe('consolidatePagePair', () => {
  it('texto e pixels no mesmo lugar: uma diferença só, confirmada pelos dois métodos', () => {
    const draft = textDraft(rect(0.2, 0.3))
    const outcome = consolidatePagePair(evidence([region(rect(0.21, 0.3, 0.05))]), [draft])
    expect(outcome.drafts).toEqual([])
    expect([...draft.methods]).toEqual(['text-layer', 'visual'])
    expect(draft.evidence).toBe('corroborated')
  })

  it('mudança visual independente, perto mas fora do texto, continua sendo uma diferença própria', () => {
    const draft = textDraft(rect(0.2, 0.3))
    const outcome = consolidatePagePair(evidence([region(rect(0.2, 0.36), 0, 0.4)]), [draft])
    expect(outcome.drafts).toHaveLength(1)
    expect(outcome.drafts[0]).toMatchObject({ category: 'visual', kind: 'addition', evidence: 'direct' })
  })

  it('leitura de OCR incerta sobre mudança visual vira diferença visual, com a leitura anotada', () => {
    const draft = textDraft(rect(0.5, 0.5), { ocr: true, evidence: 'needs-review' })
    const outcome = consolidatePagePair(evidence([region(rect(0.5, 0.5))]), [draft])
    expect(outcome.discarded.has(draft)).toBe(true)
    expect(outcome.drafts[0]).toMatchObject({ category: 'visual', evidence: 'needs-review' })
    expect(outcome.drafts[0]?.notes.join(' ')).toContain('R$ 15.000,00 → R$ 18.000,00')
  })

  it('leitura de OCR incerta sem nenhuma mudança visual é descartada como ruído', () => {
    const draft = textDraft(rect(0.5, 0.5), { ocr: true, evidence: 'needs-review' })
    expect(consolidatePagePair(evidence([]), [draft]).discarded.has(draft)).toBe(true)
  })

  it('leitura de OCR confiável sem confirmação visual fica, para conferir', () => {
    const draft = textDraft(rect(0.5, 0.5), { ocr: true })
    const outcome = consolidatePagePair(evidence([]), [draft])
    expect(outcome.discarded.has(draft)).toBe(false)
    expect(draft.evidence).toBe('needs-review')
  })

  it('região sobre palavras que só mudaram de lugar (refluxo) não vira diferença', () => {
    const moved = rect(0.1, 0.6, 0.3)
    const outcome = consolidatePagePair(evidence([region(moved)], { displaced: { original: [moved], updated: [moved] } }), [])
    expect(outcome.drafts).toEqual([])
  })

  it('linha fina só com outra espessura de rasterização não vira diferença', () => {
    const line: VisualRegion = { original: rect(0.1, 0.5, 0.8, 0.003), updated: rect(0.1, 0.5, 0.8, 0.003), pixels: 700, inkOriginal: 0.5, inkUpdated: 0.25 }
    const outcome = consolidatePagePair(evidence([line], { pointSize: { x: 1 / 595, y: 1 / 842 } }), [])
    expect(outcome.drafts).toEqual([])
  })

  it('mudança sobre texto inalterado é visual, para conferir', () => {
    const words = [rect(0.1, 0.7, 0.2)]
    const outcome = consolidatePagePair(evidence([region(rect(0.12, 0.7, 0.05))], { words: { original: words, updated: words } }), [])
    expect(outcome.drafts[0]).toMatchObject({ category: 'visual', kind: 'modification', evidence: 'needs-review' })
  })
})
