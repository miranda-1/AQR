import type { PageMatch } from '../../../shared/contracts/comparison.ts'

/**
 * Correspondência entre as páginas dos dois documentos, sem usar o número da página como identidade:
 * a página 5 do original pode ser a 7 do atualizado.
 *
 * 1. Semelhança de cada par: palavras em comum (coeficiente de Dice sobre a contagem de palavras)
 *    quando as duas páginas têm texto; aparência (grade de cinzas da prévia) quando não têm; páginas
 *    com a mesma prévia exata são idênticas.
 * 2. Alinhamento em ordem (programação dinâmica numa faixa em torno da diagonal), que só liga duas
 *    páginas se a semelhança passar de `MATCH_THRESHOLD`.
 * 3. Entre as páginas que sobraram dos dois lados, pares muito parecidos são páginas movidas.
 * 4. Página que sobrou cujo texto está no excedente do outro documento (palavras que lá sobram
 *    depois de descontar todas as demais páginas deste) é refluxo, não página nova. Uma cópia
 *    repetida não é refluxo: a outra cópia já consome as mesmas palavras.
 * 5. Página com gêmea idêntica no mesmo documento, cuja quantidade de gêmeas difere entre os dois,
 *    tem correspondência ambígua.
 */

export interface PageFeatures {
  pageNumber: number
  /** Parte do texto veio do OCR (instável para identificar a página). */
  ocr?: boolean
  /** Contagem de cada palavra (chave normalizada) da página. */
  words: Map<string, number>
  wordCount: number
  /** Resumo exato da prévia (ausente se a página não foi desenhada). */
  previewHash?: string
  /** Grade de cinzas da prévia. */
  fingerprint?: Uint8Array
}

/** Semelhança mínima para ligar duas páginas na ordem. */
export const MATCH_THRESHOLD = 0.35
/** Semelhança mínima para ligar duas páginas fora de ordem (página movida). */
export const MOVE_THRESHOLD = 0.8
/** Fração das palavras de uma página sobrando que precisa existir no outro documento para ser refluxo. */
export const REFLOW_CONTAINMENT = 0.6
/** Palavras mínimas para a semelhança ser medida pelo texto. */
const MIN_WORDS_FOR_TEXT = 8
/** Largura mínima da faixa de alinhamento (páginas de distância da diagonal). */
const MIN_BAND = 25
/** Limite de comparações entre páginas que sobraram (proteção de tempo). */
const MAX_LEFTOVER_PAIRS = 40_000

function dice(a: Map<string, number>, aCount: number, b: Map<string, number>, bCount: number): number {
  if (aCount + bCount === 0) return 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  let shared = 0
  for (const [word, count] of small) shared += Math.min(count, large.get(word) ?? 0)
  return (2 * shared) / (aCount + bCount)
}

/** 1 = mesma aparência; 0 = nenhuma tinta em comum. Duas páginas em branco valem 1. */
export function visualSimilarity(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) return 0
  let difference = 0
  let ink = 0
  for (let index = 0; index < a.length; index += 1) {
    const inkA = 255 - (a[index] ?? 255)
    const inkB = 255 - (b[index] ?? 255)
    difference += Math.abs(inkA - inkB)
    ink += inkA + inkB
  }
  return ink < 1 ? 1 : Math.max(0, 1 - difference / ink)
}

export function pageSimilarity(a: PageFeatures, b: PageFeatures): number {
  if (a.previewHash && a.previewHash === b.previewHash) return 1
  const visual = a.fingerprint && b.fingerprint ? visualSimilarity(a.fingerprint, b.fingerprint) : undefined
  if ((a.ocr || b.ocr) && visual !== undefined) {
    // Texto de OCR varia entre duas digitalizações do mesmo papel: vale o que for mais parecido.
    return Math.max(visual, dice(a.words, a.wordCount, b.words, b.wordCount))
  }
  if (a.wordCount >= MIN_WORDS_FOR_TEXT && b.wordCount >= MIN_WORDS_FOR_TEXT) {
    const text = dice(a.words, a.wordCount, b.words, b.wordCount)
    return visual === undefined ? text : 0.85 * text + 0.15 * visual
  }
  if (a.wordCount > 0 && b.wordCount > 0) {
    const text = dice(a.words, a.wordCount, b.words, b.wordCount)
    return visual === undefined ? text : 0.5 * text + 0.5 * visual
  }
  // Uma página com texto e a outra sem: só a aparência compara (ex.: digitalização sem OCR).
  return visual ?? 0
}

interface Alignment {
  pairs: [number, number][]
}

/** Alinhamento em ordem que maximiza a soma de (semelhança − limiar) dos pares ligados. */
function alignInOrder(original: readonly PageFeatures[], updated: readonly PageFeatures[]): Alignment {
  const n = original.length
  const m = updated.length
  const band = Math.max(MIN_BAND, Math.abs(n - m) + 10)
  const width = m + 1
  const score = new Float64Array((n + 1) * width)
  const move = new Uint8Array((n + 1) * width) // 0 = diagonal, 1 = pula original, 2 = pula atualizado
  const inBand = (i: number, j: number) => Math.abs(i * (m / Math.max(1, n)) - j) <= band

  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= m; j += 1) {
      if (i === 0 && j === 0) continue
      let best = -Infinity
      let choice = 1
      if (i > 0) {
        best = score[(i - 1) * width + j] ?? 0
        choice = 1
      }
      if (j > 0 && (score[i * width + j - 1] ?? 0) > best) {
        best = score[i * width + j - 1] ?? 0
        choice = 2
      }
      if (i > 0 && j > 0 && inBand(i, j)) {
        const similarity = pageSimilarity(original[i - 1] as PageFeatures, updated[j - 1] as PageFeatures)
        if (similarity >= MATCH_THRESHOLD) {
          const candidate = (score[(i - 1) * width + j - 1] ?? 0) + similarity - MATCH_THRESHOLD + 1e-6
          if (candidate > best) {
            best = candidate
            choice = 0
          }
        }
      }
      score[i * width + j] = best
      move[i * width + j] = choice
    }
  }

  const pairs: [number, number][] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    const choice = move[i * width + j]
    if (i > 0 && j > 0 && choice === 0) {
      pairs.push([i - 1, j - 1])
      i -= 1
      j -= 1
    } else if (i > 0 && (choice === 1 || j === 0)) {
      i -= 1
    } else {
      j -= 1
    }
  }
  return { pairs: pairs.reverse() }
}

function bagOf(pages: readonly PageFeatures[]): Map<string, number> {
  const bag = new Map<string, number>()
  for (const page of pages) for (const [word, count] of page.words) bag.set(word, (bag.get(word) ?? 0) + count)
  return bag
}

/**
 * Fração das palavras da página que estão no excedente do outro documento: o que o outro tem a
 * mais do que todas as demais páginas deste documento (`ownTotal` menos a própria página).
 */
function reflowContainment(page: PageFeatures, ownTotal: ReadonlyMap<string, number>, otherTotal: ReadonlyMap<string, number>): number {
  if (page.wordCount === 0) return 0
  let found = 0
  for (const [word, count] of page.words) {
    const ownElsewhere = (ownTotal.get(word) ?? 0) - count
    const surplus = Math.max(0, (otherTotal.get(word) ?? 0) - ownElsewhere)
    found += Math.min(count, surplus)
  }
  return found / page.wordCount
}

/** Chave de identidade de uma página, para achar gêmeas (prévia idêntica ou mesmo texto). */
function twinKey(page: PageFeatures): string {
  if (page.wordCount > 0) {
    return `t:${[...page.words.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([word, count]) => `${word}×${count}`).join(' ')}`
  }
  return page.previewHash ? `v:${page.previewHash}` : `p:${page.pageNumber}`
}

export interface PageMatchingResult {
  matches: PageMatch[]
}

/** Liga as páginas dos dois documentos. A lista sai na ordem do documento atualizado. */
export function matchPages(original: readonly PageFeatures[], updated: readonly PageFeatures[]): PageMatchingResult {
  const { pairs } = alignInOrder(original, updated)
  const matchedOriginal = new Set(pairs.map(([i]) => i))
  const matchedUpdated = new Set(pairs.map(([, j]) => j))
  const leftoverOriginal = original.map((_, index) => index).filter((index) => !matchedOriginal.has(index))
  const leftoverUpdated = updated.map((_, index) => index).filter((index) => !matchedUpdated.has(index))

  // Páginas movidas: pares fora de ordem muito parecidos, do mais parecido para o menos.
  const moved: [number, number][] = []
  if (leftoverOriginal.length * leftoverUpdated.length <= MAX_LEFTOVER_PAIRS) {
    const candidates: { i: number; j: number; similarity: number }[] = []
    for (const i of leftoverOriginal) {
      for (const j of leftoverUpdated) {
        const similarity = pageSimilarity(original[i] as PageFeatures, updated[j] as PageFeatures)
        if (similarity >= MOVE_THRESHOLD) candidates.push({ i, j, similarity })
      }
    }
    candidates.sort((a, b) => b.similarity - a.similarity || a.i - b.i)
    const usedO = new Set<number>()
    const usedU = new Set<number>()
    for (const { i, j } of candidates) {
      if (usedO.has(i) || usedU.has(j)) continue
      usedO.add(i)
      usedU.add(j)
      moved.push([i, j])
    }
  }
  const movedO = new Set(moved.map(([i]) => i))
  const movedU = new Set(moved.map(([, j]) => j))

  // Gêmeas: páginas com o mesmo conteúdo dentro de cada documento.
  const twinsOriginal = new Map<string, number>()
  const twinsUpdated = new Map<string, number>()
  for (const page of original) twinsOriginal.set(twinKey(page), (twinsOriginal.get(twinKey(page)) ?? 0) + 1)
  for (const page of updated) twinsUpdated.set(twinKey(page), (twinsUpdated.get(twinKey(page)) ?? 0) + 1)
  const ambiguous = (i: number, j: number) => {
    const keyO = twinKey(original[i] as PageFeatures)
    const keyU = twinKey(updated[j] as PageFeatures)
    const countO = twinsOriginal.get(keyO) ?? 1
    const countU = twinsUpdated.get(keyU) ?? 1
    return (countO > 1 || countU > 1) && (keyO !== keyU || countO !== countU)
  }

  // Sobras que não se moveram: novas, excluídas ou refluxo (conteúdo que sobra do outro lado).
  const totalOriginal = bagOf(original)
  const totalUpdated = bagOf(updated)

  const matches: PageMatch[] = []
  for (const [i, j] of pairs) {
    matches.push({
      original: (original[i] as PageFeatures).pageNumber,
      updated: (updated[j] as PageFeatures).pageNumber,
      relation: ambiguous(i, j) ? 'ambiguous' : 'matched',
    })
  }
  for (const [i, j] of moved) {
    matches.push({ original: (original[i] as PageFeatures).pageNumber, updated: (updated[j] as PageFeatures).pageNumber, relation: 'moved' })
  }
  for (const i of leftoverOriginal) {
    if (movedO.has(i)) continue
    const page = original[i] as PageFeatures
    matches.push({ original: page.pageNumber, relation: reflowContainment(page, totalOriginal, totalUpdated) >= REFLOW_CONTAINMENT ? 'reflowed' : 'removed' })
  }
  for (const j of leftoverUpdated) {
    if (movedU.has(j)) continue
    const page = updated[j] as PageFeatures
    matches.push({ updated: page.pageNumber, relation: reflowContainment(page, totalUpdated, totalOriginal) >= REFLOW_CONTAINMENT ? 'reflowed' : 'added' })
  }

  // Ordem de leitura: pelo atualizado; as que só existem no original entram depois da anterior.
  const position = (match: PageMatch) => {
    if (match.updated !== undefined) return match.updated
    const previous = pairs.filter(([i]) => (original[i] as PageFeatures).pageNumber < (match.original ?? 0)).at(-1)
    return previous ? (updated[previous[1]] as PageFeatures).pageNumber + 0.5 : 0.5
  }
  matches.sort((a, b) => position(a) - position(b) || (a.original ?? 0) - (b.original ?? 0))
  return { matches }
}
