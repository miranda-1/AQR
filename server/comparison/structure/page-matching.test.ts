import { matchPages, type PageFeatures } from './page-matching.ts'

/** Página com texto: palavras "<tema>-<i>" (temas distintos não têm palavras em comum). */
function page(pageNumber: number, theme: string, count = 40, extra: Partial<PageFeatures> = {}): PageFeatures {
  const words = new Map<string, number>()
  for (let index = 0; index < count; index += 1) words.set(`${theme}-${index}`, 1)
  return { pageNumber, words, wordCount: count, ...extra }
}

function blank(pageNumber: number): PageFeatures {
  return { pageNumber, words: new Map(), wordCount: 0, previewHash: 'branco', fingerprint: new Uint8Array(320).fill(255) }
}

const relations = (matches: ReturnType<typeof matchPages>['matches']) => matches.map((match) => `${match.original ?? '-'}:${match.updated ?? '-'}:${match.relation}`)

describe('matchPages', () => {
  it('liga páginas iguais na ordem', () => {
    const { matches } = matchPages([page(1, 'a'), page(2, 'b')], [page(1, 'a'), page(2, 'b')])
    expect(relations(matches)).toEqual(['1:1:matched', '2:2:matched'])
  })

  it('página incluída no início desloca a correspondência (a 1 do original é a 2 do atualizado)', () => {
    const { matches } = matchPages([page(1, 'a'), page(2, 'b')], [page(1, 'novo'), page(2, 'a'), page(3, 'b')])
    expect(relations(matches)).toEqual(['-:1:added', '1:2:matched', '2:3:matched'])
  })

  it('página excluída no meio', () => {
    const { matches } = matchPages([page(1, 'a'), page(2, 'b'), page(3, 'c')], [page(1, 'a'), page(2, 'c')])
    expect(relations(matches)).toEqual(['1:1:matched', '2:-:removed', '3:2:matched'])
  })

  it('troca de ordem vira página movida, não exclusão e inclusão', () => {
    const { matches } = matchPages([page(1, 'a'), page(2, 'b'), page(3, 'c')], [page(1, 'a'), page(2, 'c'), page(3, 'b')])
    expect(matches.filter((match) => match.relation === 'moved')).toHaveLength(1)
    expect(matches.some((match) => match.relation === 'added' || match.relation === 'removed')).toBe(false)
  })

  it('cópia repetida removida é exclusão (não refluxo) e a ligação fica ambígua', () => {
    const { matches } = matchPages([page(1, 'a'), page(2, 'b'), page(3, 'b'), page(4, 'c')], [page(1, 'a'), page(2, 'b'), page(3, 'c')])
    expect(matches.filter((match) => match.relation === 'removed')).toHaveLength(1)
    expect(matches.some((match) => match.relation === 'ambiguous')).toBe(true)
  })

  it('texto que passou para uma página nova é refluxo, não página incluída', () => {
    const first = page(1, 'a', 60)
    const updatedFirst = page(1, 'a', 45)
    const tail = new Map<string, number>()
    for (let index = 45; index < 60; index += 1) tail.set(`a-${index}`, 1)
    const { matches } = matchPages([first], [updatedFirst, { pageNumber: 2, words: tail, wordCount: 15 }])
    expect(relations(matches)).toEqual(['1:1:matched', '-:2:reflowed'])
  })

  it('páginas em branco correspondem pela aparência', () => {
    const { matches } = matchPages([page(1, 'a'), blank(2), page(3, 'c')], [page(1, 'a'), blank(2), page(3, 'c')])
    expect(relations(matches)).toEqual(['1:1:matched', '2:2:matched', '3:3:matched'])
  })
})
