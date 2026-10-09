import { contextLabels } from './context.ts'

const lines = (...texts: string[]) => texts.map((text) => ({ pageNumber: 1, text }))

describe('contextLabels', () => {
  it('usa artigo e parágrafo, reiniciando o parágrafo a cada artigo', () => {
    expect(
      contextLabels(lines('Art. 1º Texto.', 'Continuação.', '§ 2º Detalhe.', 'Parágrafo único. Outro.', 'Artigo 3 Novo.')),
    ).toEqual(['Art. 1º', 'Art. 1º', 'Art. 1º, § 2º', 'Art. 1º, Parágrafo único', 'Artigo 3'])
  })

  it('reconhece cláusulas, títulos numerados e títulos em maiúsculas', () => {
    expect(contextLabels(lines('Cláusula Terceira – Do prazo', 'Texto.', '2.1 Do objeto', 'Texto.', 'DAS PENALIDADES', 'Texto.'))).toEqual([
      'Cláusula Terceira',
      'Cláusula Terceira',
      '2.1 Do objeto',
      '2.1 Do objeto',
      'DAS PENALIDADES',
      'DAS PENALIDADES',
    ])
  })

  it('devolve null antes do primeiro título (o resultado usa "Página N")', () => {
    expect(contextLabels(lines('Texto sem título.', 'Mais texto.'))).toEqual([null, null])
  })

  it('encurta rótulos longos', () => {
    const [label] = contextLabels(lines(`1 ${'Objeto '.repeat(10).trim()}`))
    expect(label?.length).toBeLessThanOrEqual(60)
    expect(label?.endsWith('…')).toBe(true)
  })
})
