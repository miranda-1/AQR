import { diffArrays } from 'diff'
import { ComparisonFailure } from '../failure.ts'
import type { ComparisonLimits } from '../limits.ts'
import type { TokenizedDocument } from '../text/tokenize.ts'
import { hunksFromChanges, mergeCloseHunks, type Hunk } from './hunks.ts'

export type AlignmentLevel = 'palavras' | 'linhas'

export interface Alignment {
  hunks: Hunk[]
  /** Nível em que a comparação foi feita. "linhas" só quando a de palavras passou dos limites. */
  level: AlignmentLevel
}

type DiffLimits = Pick<ComparisonLimits, 'maxDiffTokens' | 'maxEditLength' | 'diffTimeoutMs'>

/** Chave de cada linha: as chaves das palavras que começam nela. */
function lineKeys(document: TokenizedDocument): { keys: string[]; firstToken: number[] } {
  const words: string[][] = document.lines.map(() => [])
  const firstToken: number[] = document.lines.map(() => document.tokens.length)
  document.tokens.forEach((token, index) => {
    words[token.lineIndex]?.push(token.key)
    if (index < (firstToken[token.lineIndex] ?? 0)) firstToken[token.lineIndex] = index
  })
  // Linha sem palavra própria (só a continuação de uma hifenização) aponta para a seguinte.
  for (let line = firstToken.length - 2; line >= 0; line -= 1) {
    if ((words[line]?.length ?? 0) === 0) firstToken[line] = firstToken[line + 1] ?? document.tokens.length
  }
  return { keys: words.map((list) => list.join(' ')), firstToken }
}

function tokenIndexOfLine(firstToken: readonly number[], line: number, tokenCount: number): number {
  return line < firstToken.length ? (firstToken[line] ?? tokenCount) : tokenCount
}

function alignByLines(original: TokenizedDocument, updated: TokenizedDocument, limits: DiffLimits): Hunk[] | undefined {
  const a = lineKeys(original)
  const b = lineKeys(updated)
  const changes = diffArrays(a.keys, b.keys, { maxEditLength: limits.maxEditLength, timeout: limits.diffTimeoutMs })
  if (!changes) return undefined
  return hunksFromChanges(changes).map((hunk) => ({
    original: {
      start: tokenIndexOfLine(a.firstToken, hunk.original.start, original.tokens.length),
      end: tokenIndexOfLine(a.firstToken, hunk.original.end, original.tokens.length),
    },
    updated: {
      start: tokenIndexOfLine(b.firstToken, hunk.updated.start, updated.tokens.length),
      end: tokenIndexOfLine(b.firstToken, hunk.updated.end, updated.tokens.length),
    },
  }))
}

function startsLine(document: TokenizedDocument, index: number): boolean {
  const token = document.tokens[index]
  const previous = document.tokens[index - 1]
  return token !== undefined && (previous === undefined || previous.lineIndex !== token.lineIndex)
}

/**
 * Uma adição ou exclusão pura entre palavras repetidas tem várias posições equivalentes
 * ("Art. 6º … vez." ou "6º … vez. Art."). Desliza o trecho, só por palavras iguais e sem
 * encostar nos vizinhos, até começar numa linha, que é como uma pessoa leria a mudança.
 */
function slideToLineStart(hunks: readonly Hunk[], original: TokenizedDocument, updated: TokenizedDocument): Hunk[] {
  const slid: Hunk[] = []
  hunks.forEach((hunk, index) => slid.push(slide(hunk, slid[index - 1], hunks[index + 1], original, updated)))
  return slid
}

function slide(
  hunk: Hunk,
  previous: Hunk | undefined,
  next: Hunk | undefined,
  original: TokenizedDocument,
  updated: TokenizedDocument,
): Hunk {
  const isAddition = hunk.original.start === hunk.original.end
  const isDeletion = hunk.updated.start === hunk.updated.end
  if (isAddition === isDeletion) return hunk
  // "side" é o intervalo com palavras; "other", a posição vazia no outro documento.
  const [side, other, document, otherDocument] = isAddition
    ? ([hunk.updated, hunk.original, updated, original] as const)
    : ([hunk.original, hunk.updated, original, updated] as const)
  const pick = (neighbor: Hunk) => (isAddition ? [neighbor.updated, neighbor.original] : [neighbor.original, neighbor.updated])
  const [previousSide, previousOther] = previous ? pick(previous) : []
  const [nextSide, nextOther] = next ? pick(next) : []
  const sideFloor = previousSide?.end ?? 0
  const otherFloor = previousOther?.end ?? 0
  const sideCeiling = nextSide?.start ?? document.tokens.length
  const otherCeiling = nextOther?.start ?? otherDocument.tokens.length
  const key = (position: number) => document.tokens[position]?.key

  let left = 0
  while (
    side.start - left - 1 >= sideFloor &&
    other.start - left - 1 >= otherFloor &&
    key(side.start - left - 1) === key(side.end - left - 1)
  ) {
    left += 1
  }
  for (let shift = -left; ; shift += 1) {
    if (startsLine(document, side.start + shift)) {
      const moved = { start: side.start + shift, end: side.end + shift }
      const movedOther = { start: other.start + shift, end: other.end + shift }
      return isAddition ? { original: movedOther, updated: moved } : { original: moved, updated: movedOther }
    }
    const canMoveRight =
      side.end + shift + 1 <= sideCeiling &&
      other.start + shift + 1 <= otherCeiling &&
      key(side.start + shift) === key(side.end + shift)
    if (!canMoveRight) return hunk
  }
}

/**
 * Compara os dois documentos palavra a palavra (jsdiff, algoritmo de Myers), atravessando linhas
 * e páginas, de modo que o mesmo texto em outra diagramação não gera diferença. Se os documentos
 * forem grandes ou diferentes demais para isso, compara linha a linha; se nem assim couber nos
 * limites, recusa com `ComparisonFailure`.
 */
export function alignDocuments(original: TokenizedDocument, updated: TokenizedDocument, limits: DiffLimits): Alignment {
  if (original.tokens.length + updated.tokens.length <= limits.maxDiffTokens) {
    const changes = diffArrays(
      original.tokens.map((token) => token.key),
      updated.tokens.map((token) => token.key),
      { maxEditLength: limits.maxEditLength, timeout: limits.diffTimeoutMs },
    )
    if (changes) {
      const hunks = slideToLineStart(hunksFromChanges(changes), original, updated)
      return { hunks: mergeCloseHunks(hunks), level: 'palavras' }
    }
  }
  const byLines = alignByLines(original, updated, limits)
  if (byLines) return { hunks: byLines, level: 'linhas' }
  throw new ComparisonFailure('comparacao-excedeu-limites')
}
