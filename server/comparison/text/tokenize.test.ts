import { extractedFromText } from '../../test/extracted.ts'
import { normalizeWord } from './normalize.ts'
import { joinTokens, tokenize } from './tokenize.ts'

/** Caracteres invisíveis ou combinantes ficam explícitos pelos códigos, para o teste ser legível. */
const char = (code: number) => String.fromCodePoint(code)

describe('normalizeWord', () => {
  it('desfaz ligaduras, aspas e traços tipográficos e remove invisíveis', () => {
    expect(normalizeWord(`${char(0xfb01)}scalização`)).toBe('fiscalização')
    expect(normalizeWord(`${char(0x201c)}licença${char(0x201d)}`)).toBe('"licença"')
    expect(normalizeWord(`d${char(0x2019)}água`)).toBe("d'água")
    expect(normalizeWord(`2020${char(0x2013)}2024`)).toBe('2020-2024')
    expect(normalizeWord(`ambi${char(0xad)}ental`)).toBe('ambiental')
    expect(normalizeWord(char(0x200b))).toBe('')
  })

  it('mantém maiúsculas, acentos e pontuação', () => {
    expect(normalizeWord('Art.')).toBe('Art.')
    expect(normalizeWord('art.')).not.toBe(normalizeWord('Art.'))
    expect(normalizeWord('análise')).not.toBe(normalizeWord('analise'))
  })

  it('unifica formas decompostas e compostas do mesmo acento', () => {
    const decomposed = `a${char(0x301)}rea`
    const composed = `${char(0xe1)}rea`
    expect(decomposed).not.toBe(composed)
    expect(normalizeWord(decomposed)).toBe(normalizeWord(composed))
  })
})

describe('tokenize', () => {
  it('produz uma sequência de palavras atravessando linhas e páginas', () => {
    const { tokens, lines } = tokenize(extractedFromText([['Primeira linha', 'segunda linha'], ['Outra página']]))
    expect(tokens.map((token) => token.key)).toEqual(['Primeira', 'linha', 'segunda', 'linha', 'Outra', 'página'])
    expect(tokens.map((token) => token.lineIndex)).toEqual([0, 0, 1, 1, 2, 2])
    expect(lines.map((line) => line.pageNumber)).toEqual([1, 1, 2])
    expect(tokens[4]?.pieces[0]?.pageNumber).toBe(2)
  })

  it('separa a pontuação que abre e fecha a palavra, sem perder o texto original', () => {
    const { tokens } = tokenize(extractedFromText([['Prazo (dez dias).', 'Art. 1º']]))
    // NFKC transforma o ordinal "º" em "o": "1º" e "1o" contam como iguais.
    expect(tokens.map((token) => token.key)).toEqual(['Prazo', '(', 'dez', 'dias', ').', 'Art', '.', '1o'])
    expect(tokens[7]?.text).toBe('1º')
    expect(joinTokens(tokens.slice(0, 5))).toBe('Prazo (dez dias).')
    const [opening, word] = [tokens[1], tokens[2]]
    expect(opening?.pieces[0]?.region.x).toBeLessThan(word?.pieces[0]?.region.x ?? 0)
  })

  it('une a palavra hifenizada no fim da linha, guardando os dois pedaços', () => {
    const { tokens } = tokenize(extractedFromText([['O requeri-', 'mento foi aceito']]))
    expect(tokens.map((token) => token.key)).toEqual(['O', 'requerimento', 'foi', 'aceito'])
    expect(tokens[1]?.pieces).toHaveLength(2)
    expect(tokens[1]?.lineIndex).toBe(0)
  })

  it('não une quando a linha seguinte começa com maiúscula ou o hífen está sozinho', () => {
    expect(tokenize(extractedFromText([['Ver anexo-', 'Mapa 1']])).tokens.map((token) => token.key)).toEqual([
      'Ver',
      'anexo-',
      'Mapa',
      '1',
    ])
    expect(tokenize(extractedFromText([['Item -', 'descrição']])).tokens.map((token) => token.key)).toEqual([
      'Item',
      '-',
      'descrição',
    ])
  })
})
