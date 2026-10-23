import { analysisStatusOf, summarize, type Difference, type PageAnalysis } from './contracts'

const text: Pick<Difference, 'category' | 'subtype' | 'methods' | 'evidence'> = { category: 'text', subtype: 'words', methods: ['text-layer'], evidence: 'direct' }

describe('summarize', () => {
  it('conta as diferenças por tipo, categoria e evidência', () => {
    const differences: Difference[] = [
      { ...text, id: 'd-1', kind: 'addition', context: 'Art. 1', updated: { location: { pageNumber: 1 }, text: 'novo' } },
      { ...text, id: 'd-2', kind: 'deletion', context: 'Art. 2', original: { location: { pageNumber: 1 }, text: 'antigo' } },
      {
        ...text,
        id: 'd-3',
        kind: 'modification',
        context: 'Art. 3',
        original: { location: { pageNumber: 2 }, text: 'dez' },
        updated: { location: { pageNumber: 2 }, text: 'vinte' },
      },
      {
        ...text,
        id: 'd-4',
        kind: 'move',
        category: 'image',
        subtype: 'image-position',
        context: 'Página 3',
        evidence: 'needs-review',
        original: { location: { pageNumber: 3 }, text: '' },
        updated: { location: { pageNumber: 3 }, text: '' },
      },
    ]
    expect(summarize(differences)).toEqual({
      total: 4,
      additions: 1,
      deletions: 1,
      modifications: 1,
      moves: 1,
      byCategory: { text: 3, image: 1, visual: 0, structure: 0, formatting: 0 },
      needsReview: 1,
    })
  })

  it('devolve zeros sem diferenças', () => {
    expect(summarize([])).toMatchObject({ total: 0, additions: 0, deletions: 0, modifications: 0, moves: 0, needsReview: 0 })
  })
})

describe('analysisStatusOf', () => {
  const page = (overrides: Partial<PageAnalysis> = {}): PageAnalysis => ({
    pageNumber: 1,
    width: 595,
    height: 842,
    rotation: 0,
    content: 'text',
    textSource: 'text-layer',
    text: 'analyzed',
    visual: 'analyzed',
    ...overrides,
  })

  it('completa quando todos os métodos aplicáveis rodaram, sem ressalvas', () => {
    expect(analysisStatusOf({ original: [page()], updated: [page({ visual: 'not-applicable' })] }, [])).toBe('complete')
  })

  it('com ressalvas quando há OCR de baixa confiança ou ressalva de qualidade', () => {
    expect(analysisStatusOf({ original: [page({ text: 'low-confidence' })], updated: [page()] }, [])).toBe('with-caveats')
    expect(
      analysisStatusOf({ original: [page()], updated: [page()] }, [{ code: 'OCR_USED', severity: 'caveat', message: 'x' }]),
    ).toBe('with-caveats')
  })

  it('parcial quando alguma página ficou sem um método aplicável ou há limitação', () => {
    expect(analysisStatusOf({ original: [page({ text: 'not-analyzed' })], updated: [page()] }, [])).toBe('partial')
    expect(analysisStatusOf({ original: [page({ content: 'uncertain' })], updated: [page()] }, [])).toBe('partial')
    expect(
      analysisStatusOf({ original: [page()], updated: [page()] }, [{ code: 'VISUAL_LIMIT_REACHED', severity: 'limitation', message: 'x' }]),
    ).toBe('partial')
  })

  it('aviso informativo não muda a situação', () => {
    expect(
      analysisStatusOf({ original: [page()], updated: [page()] }, [{ code: 'READING_ORDER_UNCERTAIN', severity: 'info', message: 'x' }]),
    ).toBe('complete')
  })
})
