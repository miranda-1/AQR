import type { ArrayChange } from 'diff'

/** Intervalo [start, end) de palavras num documento. Vazio (start === end) marca uma posição. */
export interface TokenRange {
  start: number
  end: number
}

/** Um trecho alterado: o que havia no original e o que há no atualizado. */
export interface Hunk {
  original: TokenRange
  updated: TokenRange
}

/** Trechos separados por até esta quantidade de palavras iguais viram um só. */
export const MERGE_GAP = 2

/** Converte a saída do jsdiff em trechos alterados, com os índices de cada documento. */
export function hunksFromChanges<T>(changes: readonly ArrayChange<T>[]): Hunk[] {
  const hunks: Hunk[] = []
  let originalIndex = 0
  let updatedIndex = 0
  let current: Hunk | undefined

  for (const change of changes) {
    if (!change.added && !change.removed) {
      current = undefined
      originalIndex += change.count
      updatedIndex += change.count
      continue
    }
    if (!current) {
      current = {
        original: { start: originalIndex, end: originalIndex },
        updated: { start: updatedIndex, end: updatedIndex },
      }
      hunks.push(current)
    }
    if (change.removed) {
      originalIndex += change.count
      current.original.end = originalIndex
    } else {
      updatedIndex += change.count
      current.updated.end = updatedIndex
    }
  }
  return hunks
}

/**
 * Une trechos muito próximos ("prazo de 10 dias" → "prazo de 20 dias úteis" vira uma
 * modificação só, em vez de duas diferenças coladas). As palavras iguais do meio entram no trecho.
 */
export function mergeCloseHunks(hunks: readonly Hunk[], gap = MERGE_GAP): Hunk[] {
  const merged: Hunk[] = []
  for (const hunk of hunks) {
    const previous = merged[merged.length - 1]
    if (previous && hunk.original.start - previous.original.end <= gap) {
      previous.original.end = hunk.original.end
      previous.updated.end = hunk.updated.end
    } else {
      merged.push({ original: { ...hunk.original }, updated: { ...hunk.updated } })
    }
  }
  return merged
}
