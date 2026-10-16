import type { DifferenceSubtype, NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { intersection } from '../geometry.ts'
import type { FontDescriptor } from '../pdf/page-objects.ts'
import type { Raster } from '../pdf/render.ts'
import { lineRects } from '../regions.ts'
import { joinTokens, type Token, type TokenPiece } from '../text/tokenize.ts'
import { inkColor, inkColorChangedInPlace, type VisualRegion } from './raster-diff.ts'

/**
 * Formatação do texto que não mudou de conteúdo. Para cada palavra igual nos dois documentos
 * (pareada pelo alinhamento do texto), na mesma página correspondente:
 * - fonte: assinatura da fonte diferente (`page-objects.ts`);
 * - tamanho: altura da fonte varia mais que `SIZE_TOLERANCE`;
 * - cor: a cor média da tinta da palavra, medida nas páginas renderizadas, varia mais que
 *   `COLOR_TOLERANCE` (só onde a comparação visual achou mudança);
 * - posição: a palavra se deslocou mais que `POSITION_TOLERANCE`, sem que uma inclusão ou exclusão
 *   de texto antes dela na mesma página explique o deslocamento.
 * Palavras seguidas com a mesma mudança formam um trecho; muitos trechos na mesma página viram uma
 * diferença só para a página inteira (ex.: "Diagramação alterada").
 */

export const SIZE_TOLERANCE = 0.08
export const COLOR_TOLERANCE = 60
export const POSITION_TOLERANCE = 0.008
/** Acima de tantos trechos do mesmo tipo numa página, eles viram uma diferença de página. */
export const MAX_RUNS_PER_PAGE = 6
/** Retângulos guardados numa diferença de página inteira. */
const MAX_RECTS = 40

export interface EqualPair {
  original: Token
  updated: Token
  /** Uma inclusão ou exclusão de texto antes desta palavra, na mesma página, explica um deslocamento. */
  reflowed: boolean
}

export interface FormattingEvent {
  subtype: DifferenceSubtype
  /** A mudança cobre a página quase toda (muitos trechos), não um trecho. */
  pageWide: boolean
  originalRects: NormalizedRect[]
  updatedRects: NormalizedRect[]
  text: string
  detail: { original?: string; updated?: string }
}

export interface FormattingInput {
  pairs: readonly EqualPair[]
  fonts: { original: ReadonlyMap<string, FontDescriptor>; updated: ReadonlyMap<string, FontDescriptor> }
  rasters?: { original: Raster; updated: Raster }
  visualRegions: readonly VisualRegion[]
}

type Change = 'font' | 'font-size' | 'color' | 'text-position'

interface Observation {
  pair: EqualPair
  changes: Set<Change>
  /** Mudanças que não dá para medir nesta palavra (pontuação, pouca tinta): não interrompem um trecho. */
  unknown: Set<Change>
  shift: { dx: number; dy: number }
  colors?: { original: [number, number, number]; updated: [number, number, number] }
}

function firstPiece(token: Token): TokenPiece | undefined {
  return token.pieces[0]
}

function fontLabel(font: FontDescriptor | undefined, size: number | undefined): string {
  const family = font ? ({ serif: 'com serifa', 'sans-serif': 'sem serifa', monospace: 'monoespaçada' }[font.family] ?? font.family) : 'desconhecida'
  const style = [font?.bold ? 'negrito' : '', font?.italic ? 'itálico' : ''].filter(Boolean).join(', ')
  const sizeText = size ? `, ${size.toFixed(1).replace('.', ',')} pt` : ''
  return `Fonte ${family}${style ? ` (${style})` : ''}${sizeText}`
}

function colorLabel(color: [number, number, number]): string {
  const hex = color.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')
  return `Cor #${hex.toUpperCase()}`
}

function touchesVisualChange(region: NormalizedRect, regions: readonly VisualRegion[], side: 'original' | 'updated'): boolean {
  return regions.some((visual) => intersection(visual[side], region) > 0)
}

function observe(input: FormattingInput, pair: EqualPair): Observation {
  const changes = new Set<Change>()
  const unknown = new Set<Change>()
  const a = pair.original
  const b = pair.updated
  const pieceA = firstPiece(a)
  const pieceB = firstPiece(b)
  const shift = { dx: (pieceB?.region.x ?? 0) - (pieceA?.region.x ?? 0), dy: (pieceB?.region.y ?? 0) - (pieceA?.region.y ?? 0) }
  const observation: Observation = { pair, changes, unknown, shift }
  if (!pieceA || !pieceB) return observation
  const textLayer = a.style.source === 'text-layer' && b.style.source === 'text-layer'

  if (textLayer) {
    const fontA = a.style.font ? input.fonts.original.get(a.style.font) : undefined
    const fontB = b.style.font ? input.fonts.updated.get(b.style.font) : undefined
    if (fontA && fontB && fontA.signature !== fontB.signature) changes.add('font')
    const sizeA = a.style.fontSize
    const sizeB = b.style.fontSize
    if (sizeA && sizeB && Math.abs(sizeA - sizeB) / Math.max(sizeA, sizeB) > SIZE_TOLERANCE) changes.add('font-size')
    if (!pair.reflowed && (Math.abs(shift.dx) > POSITION_TOLERANCE || Math.abs(shift.dy) > POSITION_TOLERANCE)) changes.add('text-position')
  }

  const measurable = /[\p{L}\p{N}]/u.test(a.text)
  if (!measurable) unknown.add('color')
  if (
    input.rasters &&
    measurable &&
    (touchesVisualChange(pieceA.region, input.visualRegions, 'original') || touchesVisualChange(pieceB.region, input.visualRegions, 'updated'))
  ) {
    const colorA = inkColor(input.rasters.original, pieceA.region)
    const colorB = inkColor(input.rasters.updated, pieceB.region)
    if (!colorA || !colorB) unknown.add('color')
    if (colorA && colorB) {
      const distance = Math.max(...colorA.map((value, index) => Math.abs(value - (colorB[index] ?? 0))))
      // No mesmo lugar, a comparação pixel a pixel separa mudança de cor de um traço que cruza a palavra.
      const inPlace = Math.abs(shift.dx) < 0.002 && Math.abs(shift.dy) < 0.002
      const confirmed = inPlace
        ? inkColorChangedInPlace(input.rasters.original, pieceA.region, input.rasters.updated, pieceB.region, COLOR_TOLERANCE)
        : true
      if (distance > COLOR_TOLERANCE && confirmed === true) {
        changes.add('color')
        observation.colors = { original: colorA, updated: colorB }
      }
    }
  }
  return observation
}

function sameRun(a: Observation, b: Observation, change: Change): boolean {
  if (!a.changes.has(change) || !b.changes.has(change)) return false
  if (change === 'text-position') {
    return Math.abs(a.shift.dx - b.shift.dx) <= POSITION_TOLERANCE / 2 && Math.abs(a.shift.dy - b.shift.dy) <= POSITION_TOLERANCE / 2
  }
  return true
}

function detailOf(change: Change, first: Observation, input: FormattingInput): { original?: string; updated?: string } {
  const a = first.pair.original
  const b = first.pair.updated
  if (change === 'font' || change === 'font-size') {
    return {
      original: fontLabel(a.style.font ? input.fonts.original.get(a.style.font) : undefined, a.style.fontSize),
      updated: fontLabel(b.style.font ? input.fonts.updated.get(b.style.font) : undefined, b.style.fontSize),
    }
  }
  if (change === 'color' && first.colors) {
    return { original: colorLabel(first.colors.original), updated: colorLabel(first.colors.updated) }
  }
  return {}
}

function eventOf(change: Change, run: readonly Observation[], input: FormattingInput, pageWide: boolean): FormattingEvent | undefined {
  const first = run[0]
  if (!first) return undefined
  const originalRects = lineRects(run.flatMap((item) => item.pair.original.pieces)).slice(0, MAX_RECTS)
  const updatedRects = lineRects(run.flatMap((item) => item.pair.updated.pieces)).slice(0, MAX_RECTS)
  const tokens = run.map((item) => item.pair.updated)
  const text = joinTokens(tokens)
  return {
    subtype: pageWide && change === 'text-position' ? 'layout' : change,
    pageWide,
    originalRects,
    updatedRects,
    text: text.length > 280 ? `${text.slice(0, 279).trimEnd()}…` : text,
    detail: detailOf(change, first, input),
  }
}

/** Diferenças de formatação de um par de páginas correspondentes. */
export function compareFormatting(input: FormattingInput): FormattingEvent[] {
  const observations = input.pairs.map((pair) => observe(input, pair))
  const events: FormattingEvent[] = []
  for (const change of ['font', 'font-size', 'color', 'text-position'] as const) {
    const runs: Observation[][] = []
    let current: Observation[] = []
    /** Palavras sem medida (pontuação) depois do trecho atual, que entram nele se ele continuar. */
    let pending: Observation[] = []
    for (const observation of observations) {
      const last = current[current.length - 1]
      if (observation.changes.has(change) && (!last || sameRun(last, observation, change))) {
        current.push(...pending, observation)
        pending = []
      } else if (observation.unknown.has(change) && current.length > 0) {
        pending.push(observation)
      } else {
        if (current.length > 0) runs.push(current)
        current = observation.changes.has(change) ? [observation] : []
        pending = []
      }
    }
    if (current.length > 0) runs.push(current)
    if (runs.length === 0) continue
    const affected = runs.reduce((sum, run) => sum + run.length, 0)
    const pageWide = runs.length > MAX_RUNS_PER_PAGE || (observations.length >= 20 && affected / observations.length > 0.6)
    if (pageWide) {
      const event = eventOf(change, runs.flat(), input, true)
      if (event) events.push(event)
    } else {
      for (const run of runs) {
        const event = eventOf(change, run, input, false)
        if (event) events.push(event)
      }
    }
  }
  return events
}
