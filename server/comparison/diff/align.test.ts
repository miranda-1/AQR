import { extractedFromText } from '../../test/extracted.ts'
import { ComparisonFailure } from '../failure.ts'
import { defaultComparisonLimits } from '../limits.ts'
import { joinTokens, tokenize, type TokenizedDocument } from '../text/tokenize.ts'
import { alignDocuments } from './align.ts'
import { mergeCloseHunks } from './hunks.ts'

function doc(...pages: string[][]): TokenizedDocument {
  return tokenize(extractedFromText(pages))
}

/** Os trechos como texto, para conferir com facilidade. */
function describeHunks(original: TokenizedDocument, updated: TokenizedDocument, limits = defaultComparisonLimits) {
  const slice = (document: TokenizedDocument, start: number, end: number) => joinTokens(document.tokens.slice(start, end))
  return alignDocuments(original, updated, limits).hunks.map((hunk) => ({
    original: slice(original, hunk.original.start, hunk.original.end),
    updated: slice(updated, hunk.updated.start, hunk.updated.end),
  }))
}

describe('alignDocuments', () => {
  it('não acha diferença em documentos idênticos', () => {
    const text = ['Art. 1º Fica instituída a licença.', 'Art. 2º Esta lei entra em vigor.']
    expect(describeHunks(doc(text), doc(text))).toEqual([])
  })

  it('ignora mudança só de diagramação (quebras de linha e de página)', () => {
    const original = doc(['Art. 1º Fica instituída', 'a licença ambiental simplificada.'], ['Art. 2º Vigência imediata.'])
    const updated = doc(['Art. 1º Fica instituída a licença', 'ambiental simplificada. Art. 2º', 'Vigência imediata.'])
    expect(describeHunks(original, updated)).toEqual([])
  })

  it('ignora hifenização de fim de linha e ligaduras', () => {
    const original = doc(['O requeri-', 'mento de ﬁscalização'])
    const updated = doc(['O requerimento de fiscalização'])
    expect(describeHunks(original, updated)).toEqual([])
  })

  it('aponta uma inserção', () => {
    const hunks = describeHunks(doc(['O prazo é de dez dias.']), doc(['O prazo é de dez dias úteis.']))
    expect(hunks).toEqual([{ original: '', updated: 'úteis' }])
  })

  it('aponta inserção de palavras inteiras sem tocar no resto', () => {
    const hunks = describeHunks(
      doc(['Primeiro parágrafo.', 'Terceiro parágrafo.']),
      doc(['Primeiro parágrafo.', 'Segundo parágrafo novo.', 'Terceiro parágrafo.']),
    )
    expect(hunks).toEqual([{ original: '', updated: 'Segundo parágrafo novo.' }])
  })

  it('aponta uma remoção', () => {
    const hunks = describeHunks(
      doc(['Primeiro parágrafo.', 'Parágrafo que será removido.', 'Último parágrafo.']),
      doc(['Primeiro parágrafo.', 'Último parágrafo.']),
    )
    expect(hunks).toEqual([{ original: 'Parágrafo que será removido.', updated: '' }])
  })

  it('aponta uma modificação', () => {
    const hunks = describeHunks(doc(['O prazo é de dez dias corridos.']), doc(['O prazo é de vinte dias corridos.']))
    expect(hunks).toEqual([{ original: 'dez', updated: 'vinte' }])
  })

  it('une alterações separadas por até duas palavras iguais', () => {
    const hunks = describeHunks(doc(['prazo de 10 dias corridos']), doc(['prazo de 20 dias úteis']))
    expect(hunks).toEqual([{ original: '10 dias corridos', updated: '20 dias úteis' }])
  })

  it('mantém separadas alterações distantes, inclusive em páginas diferentes', () => {
    const original = doc(['Art. 1º O valor é de cem reais.'], ['Art. 2º O prazo é de dez dias.'])
    const updated = doc(['Art. 1º O valor é de duzentos reais.'], ['Art. 2º O prazo é de quinze dias.'])
    expect(describeHunks(original, updated)).toEqual([
      { original: 'cem', updated: 'duzentos' },
      { original: 'dez', updated: 'quinze' },
    ])
  })

  it('cai para a comparação por linhas quando a de palavras passa do limite', () => {
    const original = doc(['linha igual', 'linha antiga a b c d', 'outra linha igual'])
    const updated = doc(['linha igual', 'linha nova e f g h', 'outra linha igual'])
    const limits = { ...defaultComparisonLimits, maxDiffTokens: 5 }
    const alignment = alignDocuments(original, updated, limits)
    expect(alignment.level).toBe('linhas')
    expect(describeHunks(original, updated, limits)).toEqual([
      { original: 'linha antiga a b c d', updated: 'linha nova e f g h' },
    ])
  })

  it('recusa com erro de domínio quando nem por linhas cabe nos limites', () => {
    const original = doc(['a', 'b', 'c', 'd'])
    const updated = doc(['e', 'f', 'g', 'h'])
    const limits = { ...defaultComparisonLimits, maxDiffTokens: 1, maxEditLength: 1 }
    expect(() => alignDocuments(original, updated, limits)).toThrow(ComparisonFailure)
  })
})

describe('mergeCloseHunks', () => {
  it('une só trechos próximos', () => {
    const hunks = [
      { original: { start: 0, end: 1 }, updated: { start: 0, end: 1 } },
      { original: { start: 3, end: 4 }, updated: { start: 3, end: 3 } },
      { original: { start: 10, end: 11 }, updated: { start: 9, end: 10 } },
    ]
    expect(mergeCloseHunks(hunks)).toEqual([
      { original: { start: 0, end: 4 }, updated: { start: 0, end: 3 } },
      { original: { start: 10, end: 11 }, updated: { start: 9, end: 10 } },
    ])
  })
})
