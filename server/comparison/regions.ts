import type { DocumentLocation, NormalizedRect } from '../../shared/contracts/comparison.ts'
import { bottom, clamp01, right, unionRect } from './geometry.ts'
import type { Token, TokenPiece } from './text/tokenize.ts'

/** Folga em volta do destaque, para não cortar acentos e descendentes. */
export const REGION_PADDING = 0.004

/**
 * Junta os pedaços de palavra de uma página em retângulos por linha: pedaços na mesma faixa
 * vertical e próximos na horizontal formam um retângulo; uma diferença que ocupa várias linhas ou
 * colunas vira vários retângulos precisos em vez de um bloco enorme.
 */
export function lineRects(pieces: readonly TokenPiece[]): NormalizedRect[] {
  const sorted = [...pieces].sort((a, b) => a.region.y - b.region.y || a.region.x - b.region.x)
  const rects: NormalizedRect[] = []
  for (const piece of sorted) {
    const region = piece.region
    const target = rects.find((rect) => {
      const overlap = Math.min(bottom(rect), bottom(region)) - Math.max(rect.y, region.y)
      const sameBand = overlap >= 0.5 * Math.min(rect.height, region.height)
      const gap = region.x > right(rect) ? region.x - right(rect) : rect.x > right(region) ? rect.x - right(region) : 0
      return sameBand && gap <= 3 * Math.max(rect.height, region.height)
    })
    if (target) {
      const merged = unionRect([target, region]) ?? target
      Object.assign(target, merged)
    } else {
      rects.push({ ...region })
    }
  }
  return rects.map((rect) => unionRect([rect], REGION_PADDING) ?? rect)
}

/** Localização de um conjunto de pedaços numa página: retângulo total e, se houver mais de um, as partes. */
function locationOnPage(pageNumber: number, pieces: readonly TokenPiece[]): DocumentLocation {
  const rects = lineRects(pieces)
  const region = unionRect(rects)
  const location: DocumentLocation = { pageNumber }
  if (region) location.region = region
  if (rects.length > 1) location.regions = rects
  return location
}

/**
 * Onde o trecho está: a página em que ele começa (com o retângulo total e as partes por linha) e,
 * se ele continuar em outras páginas, a localização em cada uma delas.
 */
export function locationsOf(tokens: readonly Token[]): { location: DocumentLocation; continuedOn: DocumentLocation[] } | undefined {
  const byPage = new Map<number, TokenPiece[]>()
  for (const token of tokens) {
    for (const piece of token.pieces) {
      const list = byPage.get(piece.pageNumber) ?? []
      list.push(piece)
      byPage.set(piece.pageNumber, list)
    }
  }
  const pages = [...byPage.keys()]
  const first = pages[0]
  if (first === undefined) return undefined
  return {
    location: locationOnPage(first, byPage.get(first) ?? []),
    continuedOn: pages.slice(1).map((page) => locationOnPage(page, byPage.get(page) ?? [])),
  }
}

/** Compatibilidade: só a localização da primeira página. */
export function locationOf(tokens: readonly Token[]): DocumentLocation | undefined {
  return locationsOf(tokens)?.location
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
