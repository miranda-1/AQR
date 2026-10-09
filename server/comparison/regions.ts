import type { DocumentLocation, NormalizedRect } from '../../shared/contracts/comparison.ts'
import type { Token } from './text/tokenize.ts'

/** Folga em volta do destaque, para não cortar acentos e descendentes. */
export const REGION_PADDING = 0.004

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function union(regions: readonly NormalizedRect[]): NormalizedRect | undefined {
  if (regions.length === 0) return undefined
  const left = Math.min(...regions.map((region) => region.x))
  const top = Math.min(...regions.map((region) => region.y))
  const right = Math.max(...regions.map((region) => region.x + region.width))
  const bottom = Math.max(...regions.map((region) => region.y + region.height))
  const x = clamp01(left - REGION_PADDING)
  const y = clamp01(top - REGION_PADDING)
  return { x, y, width: clamp01(right + REGION_PADDING) - x, height: clamp01(bottom + REGION_PADDING) - y }
}

/**
 * Onde o trecho está: a página em que ele começa e o retângulo que cobre as palavras dele
 * nessa página. Um trecho que continua na página seguinte é localizado pelo início.
 */
export function locationOf(tokens: readonly Token[]): DocumentLocation | undefined {
  const pageNumber = tokens[0]?.pieces[0]?.pageNumber
  if (pageNumber === undefined) return undefined
  const regions = tokens.flatMap((token) =>
    token.pieces.filter((piece) => piece.pageNumber === pageNumber).map((piece) => piece.region),
  )
  const region = union(regions)
  return region ? { pageNumber, region } : { pageNumber }
}

/**
 * Posição, no documento em que o trecho não existe, de onde ele estaria: logo depois da palavra
 * anterior (ou logo antes da seguinte, no início do documento). O retângulo tem largura zero.
 */
export function anchorAt(tokens: readonly Token[], index: number): DocumentLocation | undefined {
  const before = tokens[index - 1]?.pieces.at(-1)
  if (before) {
    const { region } = before
    return { pageNumber: before.pageNumber, region: { x: clamp01(region.x + region.width), y: region.y, width: 0, height: region.height } }
  }
  const after = tokens[index]?.pieces[0]
  if (after) {
    const { region } = after
    return { pageNumber: after.pageNumber, region: { x: region.x, y: region.y, width: 0, height: region.height } }
  }
  return undefined
}
