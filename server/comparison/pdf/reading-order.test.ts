import { readingOrder, type LayoutLine } from './reading-order.ts'

interface Word {
  text: string
  region: { x: number; y: number; width: number; height: number }
}

/** Linha com palavras de largura fixa a partir de x, na altura y. */
function line(y: number, ...segments: [number, string][]): LayoutLine<Word> {
  const words: Word[] = []
  for (const [x, text] of segments) {
    text.split(' ').forEach((word, index) => words.push({ text: word, region: { x: x + index * 0.06, y, width: 0.05, height: 0.012 } }))
  }
  return { words }
}

const text = (lines: readonly LayoutLine<Word>[]) => lines.map((item) => item.words.map((word) => word.text).join(' '))

describe('readingOrder', () => {
  it('mantém a ordem do PDF numa página de uma coluna', () => {
    const lines = [line(0.1, [0.1, 'um dois três']), line(0.13, [0.1, 'quatro cinco seis']), line(0.16, [0.1, 'sete oito'])]
    const result = readingOrder(lines)
    expect(result.kind).toBe('stream')
    expect(result.lines).toEqual(lines)
  })

  it('lê duas colunas de prosa uma depois da outra, mesmo desenhadas linha a linha', () => {
    const lines = [0, 1, 2, 3].map((row) => line(0.2 + row * 0.03, [0.1, `e${row}a e${row}b e${row}c e${row}d e${row}e`], [0.55, `d${row}a d${row}b d${row}c d${row}d d${row}e`]))
    const result = readingOrder(lines)
    expect(result.kind).toBe('columns')
    expect(text(result.lines).slice(0, 4).every((value) => value.startsWith('e'))).toBe(true)
    expect(text(result.lines).slice(4).every((value) => value.startsWith('d'))).toBe(true)
  })

  it('lê uma tabela linha a linha, célula a célula', () => {
    const lines = [0, 1, 2, 3].map((row) => line(0.2 + row * 0.03, [0.1, `item${row}`], [0.4, `${row}`], [0.7, `${row},00`]))
    const result = readingOrder(lines)
    expect(result.kind).toBe('table')
    expect(text(result.lines)).toEqual(['item0', '0', '0,00', 'item1', '1', '1,00', 'item2', '2', '2,00', 'item3', '3', '3,00'])
  })

  it('separa um título de largura total acima das colunas', () => {
    const title = line(0.1, [0.1, 'TÍTULO GERAL QUE ATRAVESSA AS DUAS COLUNAS DA PÁGINA INTEIRA'])
    const body = [0, 1, 2, 3].map((row) => line(0.2 + row * 0.03, [0.1, `e${row}a e${row}b e${row}c e${row}d e${row}e`], [0.55, `d${row}a d${row}b d${row}c d${row}d d${row}e`]))
    const result = readingOrder([title, ...body])
    expect(text(result.lines)[0]?.startsWith('TÍTULO')).toBe(true)
    expect(text(result.lines)[1]?.startsWith('e0a')).toBe(true)
    expect(text(result.lines)[5]?.startsWith('d0a')).toBe(true)
  })
})
