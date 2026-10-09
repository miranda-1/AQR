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
    if (changes) return { hunks: mergeCloseHunks(hunksFromChanges(changes)), level: 'palavras' }
  }
  const byLines = alignByLines(original, updated, limits)
  if (byLines) return { hunks: byLines, level: 'linhas' }
  throw new ComparisonFailure('comparacao-excedeu-limites')
}
