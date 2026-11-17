import type { DifferenceKind, DifferenceSubtype, NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { area, coveredFraction, iou } from '../geometry.ts'
import type { ImagePlacement } from '../pdf/page-objects.ts'
import type { Raster } from '../pdf/render.ts'
import { regionSignature, signatureDistance, type VisualRegion } from './raster-diff.ts'

/**
 * Imagens incorporadas: cada imagem desenhada na página (posição lida da lista de operadores do PDF)
 * ganha uma assinatura da aparência (grade 12 × 12 de cinzas do recorte renderizado). A assinatura
 * não depende da compressão nem da resolução da imagem, então uma imagem recomprimida continua igual.
 *
 * Pares, nesta ordem:
 * 1. mesma aparência: igual, movida (`image-position`) ou redimensionada (`image-size`); se a
 *    comparação visual achou mudança dentro dela, `image-content` (alteração dentro da imagem);
 * 2. aparência diferente no mesmo lugar: imagem trocada (`image-content`);
 * 3. o que sobra: incluída (só no atualizado) ou excluída (só no original).
 *
 * Imagens que cobrem metade da página ou mais são digitalizações: ficam para o OCR e a comparação visual.
 */

export interface ImageEvent {
  kind: DifferenceKind
  subtype: DifferenceSubtype
  original?: NormalizedRect
  updated?: NormalizedRect
  /** Descrição de cada lado (tamanho na página), para a lista. */
  detail?: { original?: string; updated?: string }
}

/** Distância máxima de assinatura (0–255) para duas imagens terem a mesma aparência. */
export const SAME_IMAGE_DISTANCE = 14
/** Deslocamento mínimo (fração da página) para contar como imagem movida. */
const MOVE_TOLERANCE = 0.006
/** Variação mínima de largura ou altura (fração) para contar como redimensionada. */
const SIZE_TOLERANCE = 0.03
/** Imagens menores que isto (fração da página) são ignoradas (ícones, marcadores, ruído). */
const MIN_IMAGE_AREA = 0.0004
const SCAN_COVERAGE = 0.5

interface Placed {
  region: NormalizedRect
  signature: Uint8Array
}

function placed(images: readonly ImagePlacement[], raster: Raster): Placed[] {
  return images
    .filter((image) => area(image.region) >= MIN_IMAGE_AREA && area(image.region) < SCAN_COVERAGE)
    .map((image) => ({ region: image.region, signature: regionSignature(raster, image.region) }))
}

function sizeLabel(region: NormalizedRect, pageWidthPt: number, pageHeightPt: number): string {
  const toCm = (points: number) => ((points / 72) * 2.54).toFixed(1).replace('.', ',')
  return `${toCm(region.width * pageWidthPt)} × ${toCm(region.height * pageHeightPt)} cm`
}

export interface ImageComparisonInput {
  original: { images: readonly ImagePlacement[]; raster: Raster; widthPt: number; heightPt: number }
  updated: { images: readonly ImagePlacement[]; raster: Raster; widthPt: number; heightPt: number }
  /** Regiões em que a comparação visual achou mudança (para detectar alteração dentro da imagem). */
  visualRegions: readonly VisualRegion[]
}

export function compareImages(input: ImageComparisonInput): ImageEvent[] {
  const before = placed(input.original.images, input.original.raster)
  const after = placed(input.updated.images, input.updated.raster)
  const label = (side: 'original' | 'updated', region: NormalizedRect) =>
    sizeLabel(region, input[side].widthPt, input[side].heightPt)
  const events: ImageEvent[] = []
  const usedBefore = new Set<number>()
  const usedAfter = new Set<number>()

  // 1. Mesma aparência.
  const sameCandidates: { i: number; j: number; score: number }[] = []
  before.forEach((a, i) =>
    after.forEach((b, j) => {
      const distance = signatureDistance(a.signature, b.signature)
      if (distance <= SAME_IMAGE_DISTANCE) sameCandidates.push({ i, j, score: iou(a.region, b.region) - distance / 255 })
    }),
  )
  sameCandidates.sort((x, y) => y.score - x.score)
  for (const { i, j } of sameCandidates) {
    if (usedBefore.has(i) || usedAfter.has(j)) continue
    usedBefore.add(i)
    usedAfter.add(j)
    const a = before[i] as Placed
    const b = after[j] as Placed
    const resized =
      Math.abs(a.region.width - b.region.width) > SIZE_TOLERANCE * Math.max(a.region.width, b.region.width) ||
      Math.abs(a.region.height - b.region.height) > SIZE_TOLERANCE * Math.max(a.region.height, b.region.height)
    const moved = Math.abs(a.region.x - b.region.x) > MOVE_TOLERANCE || Math.abs(a.region.y - b.region.y) > MOVE_TOLERANCE
    const detail = { original: label('original', a.region), updated: label('updated', b.region) }
    if (resized) {
      events.push({ kind: 'modification', subtype: 'image-size', original: a.region, updated: b.region, detail })
    } else if (moved) {
      events.push({ kind: 'move', subtype: 'image-position', original: a.region, updated: b.region, detail })
    } else if (input.visualRegions.some((region) => coveredFraction(region.updated, b.region) >= 0.6)) {
      events.push({ kind: 'modification', subtype: 'image-content', original: a.region, updated: b.region, detail })
    }
  }

  // 2. Aparência diferente no mesmo lugar: trocada.
  const replaceCandidates: { i: number; j: number; overlap: number }[] = []
  before.forEach((a, i) => {
    if (usedBefore.has(i)) return
    after.forEach((b, j) => {
      if (usedAfter.has(j)) return
      const overlap = iou(a.region, b.region)
      if (overlap >= 0.5) replaceCandidates.push({ i, j, overlap })
    })
  })
  replaceCandidates.sort((x, y) => y.overlap - x.overlap)
  for (const { i, j } of replaceCandidates) {
    if (usedBefore.has(i) || usedAfter.has(j)) continue
    usedBefore.add(i)
    usedAfter.add(j)
    const a = before[i] as Placed
    const b = after[j] as Placed
    events.push({
      kind: 'modification',
      subtype: 'image-content',
      original: a.region,
      updated: b.region,
      detail: { original: label('original', a.region), updated: label('updated', b.region) },
    })
  }

  // 3. Sobras.
  before.forEach((a, i) => {
    if (!usedBefore.has(i)) events.push({ kind: 'deletion', subtype: 'image', original: a.region, detail: { original: label('original', a.region) } })
  })
  after.forEach((b, j) => {
    if (!usedAfter.has(j)) events.push({ kind: 'addition', subtype: 'image', updated: b.region, detail: { updated: label('updated', b.region) } })
  })
  return events
}
