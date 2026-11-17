import type { NormalizedRect } from '../../shared/contracts/comparison.ts'

/** Operações com retângulos normalizados (0–1, origem no canto superior esquerdo da página). */

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function right(rect: NormalizedRect): number {
  return rect.x + rect.width
}

export function bottom(rect: NormalizedRect): number {
  return rect.y + rect.height
}

export function area(rect: NormalizedRect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height)
}

/** Menor retângulo que contém todos, com folga opcional, limitado à página. */
export function unionRect(regions: readonly NormalizedRect[], padding = 0): NormalizedRect | undefined {
  if (regions.length === 0) return undefined
  let left = Infinity
  let top = Infinity
  let rightEdge = -Infinity
  let bottomEdge = -Infinity
  for (const region of regions) {
    left = Math.min(left, region.x)
    top = Math.min(top, region.y)
    rightEdge = Math.max(rightEdge, right(region))
    bottomEdge = Math.max(bottomEdge, bottom(region))
  }
  const x = clamp01(left - padding)
  const y = clamp01(top - padding)
  return { x, y, width: clamp01(rightEdge + padding) - x, height: clamp01(bottomEdge + padding) - y }
}

export function intersection(a: NormalizedRect, b: NormalizedRect): number {
  const width = Math.min(right(a), right(b)) - Math.max(a.x, b.x)
  const height = Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y)
  return Math.max(0, width) * Math.max(0, height)
}

/** Interseção sobre união (1 = iguais, 0 = disjuntos). */
export function iou(a: NormalizedRect, b: NormalizedRect): number {
  const shared = intersection(a, b)
  const total = area(a) + area(b) - shared
  return total > 0 ? shared / total : 0
}

/** Fração de `a` coberta por `b`. */
export function coveredFraction(a: NormalizedRect, b: NormalizedRect): number {
  const own = area(a)
  return own > 0 ? intersection(a, b) / own : 0
}

/** Os retângulos se tocam ou estão a menos de `margin` um do outro? */
export function near(a: NormalizedRect, b: NormalizedRect, margin: number): boolean {
  return a.x - margin <= right(b) && b.x - margin <= right(a) && a.y - margin <= bottom(b) && b.y - margin <= bottom(a)
}

export function expand(rect: NormalizedRect, padding: number): NormalizedRect {
  const x = clamp01(rect.x - padding)
  const y = clamp01(rect.y - padding)
  return { x, y, width: clamp01(right(rect) + padding) - x, height: clamp01(bottom(rect) + padding) - y }
}

export function center(rect: NormalizedRect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/**
 * Converte um retângulo de uma página desenhada sem rotação para a página exibida com a rotação
 * `degrees` (sentido horário, múltiplo de 90).
 */
export function rotateRect(rect: NormalizedRect, degrees: number): NormalizedRect {
  const turn = (((Math.round(degrees / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3
  if (turn === 1) return { x: 1 - bottom(rect), y: rect.x, width: rect.height, height: rect.width }
  if (turn === 2) return { x: 1 - right(rect), y: 1 - bottom(rect), width: rect.width, height: rect.height }
  if (turn === 3) return { x: rect.y, y: 1 - right(rect), width: rect.height, height: rect.width }
  return { ...rect }
}
