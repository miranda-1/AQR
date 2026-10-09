import type { NormalizedRect } from '../../shared/contracts/comparison.ts'

/** Interseção sobre união de dois retângulos (1 = iguais, 0 = disjuntos). */
export function intersectionOverUnion(a: NormalizedRect, b: NormalizedRect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  const intersection = Math.max(0, width) * Math.max(0, height)
  return intersection / (a.width * a.height + b.width * b.height - intersection)
}

/** Menor retângulo que contém todos, com folga opcional em volta. */
export function unionOf(regions: readonly NormalizedRect[], padding = 0): NormalizedRect {
  const left = Math.min(...regions.map((region) => region.x)) - padding
  const top = Math.min(...regions.map((region) => region.y)) - padding
  const right = Math.max(...regions.map((region) => region.x + region.width)) + padding
  const bottom = Math.max(...regions.map((region) => region.y + region.height)) + padding
  return { x: left, y: top, width: right - left, height: bottom - top }
}
