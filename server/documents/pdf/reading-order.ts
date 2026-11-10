import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { bottom, right, unionRect } from '../geometry.ts'

/**
 * Ordem de leitura de uma página com colunas ou tabelas.
 *
 * O pdf.js entrega o texto na ordem em que foi desenhado, que costuma ser a de leitura. Quando um
 * gerador desenha linha a linha atravessando colunas, as duas colunas se misturam numa linha só.
 * Aqui as linhas são partidas onde há um vão grande entre palavras e reagrupadas por um corte XY
 * conservador:
 *
 * - um "corredor" vertical vazio que atravessa todo o bloco separa colunas, que são lidas uma depois
 *   da outra (de cima para baixo, da esquerda para a direita);
 * - se os dois lados do corredor têm trechos curtos alinhados pela mesma linha de base, é uma tabela,
 *   lida linha a linha (célula a célula, da esquerda para a direita);
 * - um vão horizontal que atravessa a página só é usado se separar um cabeçalho de um bloco em colunas.
 *
 * Sem corredor nenhum, a ordem original do PDF é mantida: nada muda nos documentos de uma coluna.
 */

export interface LayoutWord {
  region: NormalizedRect
}

export interface LayoutLine<W extends LayoutWord> {
  words: W[]
}

interface Segment<W extends LayoutWord> {
  words: W[]
  box: NormalizedRect
  /** Posição da linha original (desempate e ordem estável). */
  order: number
  /** Altura típica da letra no trecho. */
  height: number
}

export type ReadingOrderKind = 'stream' | 'columns' | 'table'

export interface ReadingOrderResult<W extends LayoutWord> {
  lines: LayoutLine<W>[]
  /** Como a página foi lida: na ordem do PDF, em colunas ou como tabela. */
  kind: ReadingOrderKind
}

/** Vão entre palavras (em alturas de letra) a partir do qual a linha é partida em trechos. */
const SEGMENT_GAP = 1.6
/** Largura mínima de um corredor entre colunas (em alturas de letra). */
const MIN_GUTTER = 1.2
/** Trechos de no máximo tantas palavras, em média, contam como células de tabela. */
const TABLE_CELL_WORDS = 4
/** Fração de trechos alinhados pela linha de base para que dois lados formem uma tabela. */
const TABLE_ALIGNMENT = 0.6

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function segmentsOf<W extends LayoutWord>(lines: readonly LayoutLine<W>[]): Segment<W>[] {
  const segments: Segment<W>[] = []
  lines.forEach((line, order) => {
    const height = median(line.words.map((word) => word.region.height)) || 0.01
    let current: W[] = []
    const flush = () => {
      const box = unionRect(current.map((word) => word.region))
      if (box) segments.push({ words: current, box, order, height })
      current = []
    }
    for (const word of line.words) {
      const previous = current[current.length - 1]
      if (previous && word.region.x - right(previous.region) > SEGMENT_GAP * height) flush()
      current.push(word)
    }
    flush()
  })
  return segments
}

/** Intervalos ocupados numa direção, já unidos. */
function occupied(ranges: readonly [number, number][]): [number, number][] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}

/** Maior corredor vertical vazio que atravessa o conjunto, com trechos dos dois lados. */
function verticalGutter<W extends LayoutWord>(segments: readonly Segment<W>[]): number | undefined {
  if (segments.length < 4) return undefined
  const height = median(segments.map((segment) => segment.height))
  const spans = occupied(segments.map((segment) => [segment.box.x, right(segment.box)]))
  let best: { at: number; width: number } | undefined
  for (let index = 1; index < spans.length; index += 1) {
    const gapStart = spans[index - 1]?.[1] ?? 0
    const gapEnd = spans[index]?.[0] ?? 0
    const width = gapEnd - gapStart
    if (width < MIN_GUTTER * height) continue
    const at = (gapStart + gapEnd) / 2
    const left = segments.filter((segment) => right(segment.box) <= at).length
    const rightSide = segments.length - left
    if (left < 2 || rightSide < 2) continue
    if (!best || width > best.width) best = { at, width }
  }
  return best?.at
}

/** Vãos horizontais que atravessam o conjunto (posições de corte, de cima para baixo). */
function horizontalGaps<W extends LayoutWord>(segments: readonly Segment<W>[]): number[] {
  const spans = occupied(segments.map((segment) => [segment.box.y, bottom(segment.box)]))
  const gaps: number[] = []
  for (let index = 1; index < spans.length; index += 1) {
    gaps.push(((spans[index - 1]?.[1] ?? 0) + (spans[index]?.[0] ?? 0)) / 2)
  }
  return gaps
}

function baseline(segment: Segment<LayoutWord>): number {
  return bottom(segment.box)
}

/** Os dois lados de um corredor parecem colunas de uma tabela (trechos curtos na mesma linha)? */
function looksLikeTable<W extends LayoutWord>(left: readonly Segment<W>[], rightSide: readonly Segment<W>[]): boolean {
  const all = [...left, ...rightSide]
  const wordsPerSegment = all.reduce((sum, segment) => sum + segment.words.length, 0) / all.length
  if (wordsPerSegment > TABLE_CELL_WORDS) return false
  const [smaller, larger] = left.length <= rightSide.length ? [left, rightSide] : [rightSide, left]
  const aligned = smaller.filter((segment) =>
    larger.some((other) => Math.abs(baseline(other) - baseline(segment)) <= 0.4 * Math.max(segment.height, other.height)),
  ).length
  return aligned / smaller.length >= TABLE_ALIGNMENT
}

/** Linha a linha (pela linha de base), célula a célula da esquerda para a direita. */
function rowMajor<W extends LayoutWord>(segments: readonly Segment<W>[]): Segment<W>[] {
  const sorted = [...segments].sort((a, b) => baseline(a) - baseline(b) || a.box.x - b.box.x)
  const rows: Segment<W>[][] = []
  for (const segment of sorted) {
    const row = rows[rows.length - 1]
    const reference = row?.[0]
    if (row && reference && Math.abs(baseline(reference) - baseline(segment)) <= 0.4 * Math.max(reference.height, segment.height)) {
      row.push(segment)
    } else {
      rows.push([segment])
    }
  }
  return rows.flatMap((row) => row.sort((a, b) => a.box.x - b.box.x))
}

function streamOrder<W extends LayoutWord>(segments: readonly Segment<W>[]): Segment<W>[] {
  return [...segments].sort((a, b) => a.order - b.order || a.box.x - b.box.x)
}

interface CutResult<W extends LayoutWord> {
  segments: Segment<W>[]
  kind: ReadingOrderKind
}

function cut<W extends LayoutWord>(segments: Segment<W>[], depth: number): CutResult<W> {
  if (depth > 8 || segments.length < 4) return { segments: streamOrder(segments), kind: 'stream' }

  const gutter = verticalGutter(segments)
  if (gutter !== undefined) {
    const left = segments.filter((segment) => right(segment.box) <= gutter)
    const rightSide = segments.filter((segment) => right(segment.box) > gutter)
    if (looksLikeTable(left, rightSide)) return { segments: rowMajor(segments), kind: 'table' }
    const first = cut(left, depth + 1)
    const second = cut(rightSide, depth + 1)
    const kind = first.kind === 'table' || second.kind === 'table' ? 'table' : 'columns'
    return { segments: [...first.segments, ...second.segments], kind }
  }

  // Sem corredor no bloco inteiro: procura um vão horizontal que isole um bloco em colunas
  // (ex.: título ou cabeçalho em largura total acima de duas colunas).
  for (const at of horizontalGaps(segments)) {
    const top = segments.filter((segment) => bottom(segment.box) <= at)
    const below = segments.filter((segment) => bottom(segment.box) > at)
    if (verticalGutter(top) !== undefined || verticalGutter(below) !== undefined) {
      const first = cut(top, depth + 1)
      const second = cut(below, depth + 1)
      const kinds = [first.kind, second.kind]
      const kind = kinds.includes('table') ? 'table' : kinds.includes('columns') ? 'columns' : 'stream'
      return { segments: [...first.segments, ...second.segments], kind }
    }
  }
  return { segments: streamOrder(segments), kind: 'stream' }
}

/**
 * Reordena as linhas de uma página pela ordem de leitura. Sem colunas nem tabelas, devolve as
 * linhas como vieram (mesma ordem, mesmas linhas).
 */
export function readingOrder<W extends LayoutWord>(lines: readonly LayoutLine<W>[]): ReadingOrderResult<W> {
  const segments = segmentsOf(lines)
  const result = cut(segments, 0)
  if (result.kind === 'stream') return { lines: [...lines], kind: 'stream' }
  return { lines: result.segments.map((segment) => ({ words: segment.words })), kind: result.kind }
}
