import { summarize, type Difference } from './comparison.ts'

describe('summarize', () => {
  it('conta as diferenças por tipo', () => {
    const differences: Difference[] = [
      { id: 'd-1', kind: 'addition', context: 'Art. 1', updated: { location: { pageNumber: 1 }, text: 'novo' } },
      { id: 'd-2', kind: 'deletion', context: 'Art. 2', original: { location: { pageNumber: 1 }, text: 'antigo' } },
      {
        id: 'd-3',
        kind: 'modification',
        context: 'Art. 3',
        original: { location: { pageNumber: 2 }, text: 'dez' },
        updated: { location: { pageNumber: 2 }, text: 'vinte' },
      },
      {
        id: 'd-4',
        kind: 'addition',
        context: 'Art. 4',
        updated: { location: { pageNumber: 3 }, text: 'outro' },
        anchors: { original: { pageNumber: 3 } },
      },
    ]
    expect(summarize(differences)).toEqual({ total: 4, additions: 2, deletions: 1, modifications: 1 })
  })

  it('devolve zeros sem diferenças', () => {
    expect(summarize([])).toEqual({ total: 0, additions: 0, deletions: 0, modifications: 0 })
  })
})
