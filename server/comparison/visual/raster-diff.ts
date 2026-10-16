import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import type { Raster } from '../pdf/render.ts'

/**
 * Comparação de duas páginas renderizadas com a mesma largura.
 *
 * 1. Alinhamento: estima um deslocamento global (dx, dy) comparando os perfis de tinta das linhas
 *    e colunas, para que uma página inteira deslocada não vire uma página inteira "diferente".
 * 2. Máscara: um pixel difere se a maior diferença entre os canais RGB passa de `COLOR_TOLERANCE`
 *    e o tom de um dos lados fica fora da faixa de tons da vizinhança (raio `NEIGHBOR_RADIUS`) do
 *    outro documento — o que absorve serrilhado (antialiasing) e bordas deslocadas por fração de
 *    pixel sem esconder traços novos.
 * 3. Ruído: a máscara é reduzida a células de `CELL` × `CELL` pixels; célula com menos de
 *    `MIN_CELL_PIXELS` pixels diferentes é descartada (pontos soltos, compressão).
 * 4. Regiões: células próximas (até `MERGE_CELLS` células) se juntam por componentes conexos;
 *    componentes com menos de `MIN_REGION_PIXELS` pixels são descartados. Cada componente vira um
 *    retângulo nos dois documentos (o do atualizado já com o deslocamento global).
 * 5. Realinhamento local: uma região pequena que desaparece com um deslocamento de até
 *    `LOCAL_SHIFT` pixels é diferença de posicionamento imperceptível e é descartada.
 *
 * Tolerâncias medidas no corpus sintético (`server/comparison/evaluation/`): ver
 * `docs/comparador/algoritmos.md`.
 */

export const COLOR_TOLERANCE = 48
export const NEIGHBOR_RADIUS = 1
export const CELL = 4
export const MIN_CELL_PIXELS = 2
export const MERGE_CELLS = 2
export const MIN_REGION_PIXELS = 12
/**
 * Deslocamento local tolerado (pixels; 2 px ≈ 0,4 mm a 120 dpi): uma região pequena que fica igual
 * ao deslocar um dos lados em até tanto é diferença de posicionamento imperceptível (geradores
 * diferentes arredondam a posição das palavras de modo diferente), não mudança de aparência.
 */
export const LOCAL_SHIFT = 2
/** Regiões maiores que isto (pixels) não passam pelo realinhamento local (custo). */
const LOCAL_SHIFT_MAX_AREA = 60_000
/** Deslocamento global máximo procurado, em fração da largura. */
export const MAX_SHIFT_FRACTION = 0.04
const INK_LEVEL = 200

export interface VisualRegion {
  original: NormalizedRect
  updated: NormalizedRect
  /** Pixels diferentes na região. */
  pixels: number
  /** Fração da região com tinta em cada documento (0 = em branco). */
  inkOriginal: number
  inkUpdated: number
}

export interface RasterDiff {
  regions: VisualRegion[]
  /** Deslocamento global aplicado ao atualizado, em pixels. */
  shift: { dx: number; dy: number }
  /** Fração dos pixels da página que diferem. */
  changedFraction: number
}

export function grayAt(raster: Raster, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return 255
  const index = (y * raster.width + x) * 4
  const { data } = raster
  return ((data[index] ?? 255) * 299 + (data[index + 1] ?? 255) * 587 + (data[index + 2] ?? 255) * 114) / 1000
}

function profiles(raster: Raster): { rows: Float64Array; columns: Float64Array } {
  const rows = new Float64Array(raster.height)
  const columns = new Float64Array(raster.width)
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      const ink = 255 - grayAt(raster, x, y)
      rows[y] = (rows[y] ?? 0) + ink
      columns[x] = (columns[x] ?? 0) + ink
    }
  }
  return { rows, columns }
}

/** Deslocamento de `b` em relação a `a` que melhor alinha os dois perfis. */
function bestShift(a: Float64Array, b: Float64Array, maxShift: number): number {
  let best = 0
  let bestCost = Infinity
  for (let shift = -maxShift; shift <= maxShift; shift += 1) {
    let cost = 0
    let count = 0
    for (let index = 0; index < a.length; index += 1) {
      const other = index + shift
      if (other < 0 || other >= b.length) continue
      cost += Math.abs((a[index] ?? 0) - (b[other] ?? 0))
      count += 1
    }
    if (count === 0) continue
    const normalized = cost / count + Math.abs(shift) * 1e-6
    if (normalized < bestCost) {
      bestCost = normalized
      best = shift
    }
  }
  return best
}

export function estimateShift(a: Raster, b: Raster): { dx: number; dy: number } {
  const maxShift = Math.max(2, Math.round(Math.max(a.width, b.width) * MAX_SHIFT_FRACTION))
  const pa = profiles(a)
  const pb = profiles(b)
  return { dx: bestShift(pa.columns, pb.columns, maxShift), dy: bestShift(pa.rows, pb.rows, maxShift) }
}

function channelDistance(a: Raster, ax: number, ay: number, b: Raster, bx: number, by: number): number {
  const outsideA = ax < 0 || ay < 0 || ax >= a.width || ay >= a.height
  const outsideB = bx < 0 || by < 0 || bx >= b.width || by >= b.height
  const ia = (ay * a.width + ax) * 4
  const ib = (by * b.width + bx) * 4
  let max = 0
  for (let channel = 0; channel < 3; channel += 1) {
    const va = outsideA ? 255 : (a.data[ia + channel] ?? 255)
    const vb = outsideB ? 255 : (b.data[ib + channel] ?? 255)
    max = Math.max(max, Math.abs(va - vb))
  }
  return max
}

/**
 * O pixel (x, y) de `a` cabe na faixa de tons da vizinhança correspondente de `b` (com o
 * deslocamento), canal a canal, com folga de `COLOR_TOLERANCE`? Uma borda deslocada por fração de
 * pixel produz tons intermediários entre os vizinhos, que ficam dentro da faixa; um traço novo sobre
 * fundo branco, não.
 */
function hasMatchingNeighbor(a: Raster, x: number, y: number, b: Raster, dx: number, dy: number): boolean {
  const outsideA = x < 0 || y < 0 || x >= a.width || y >= a.height
  const ia = (y * a.width + x) * 4
  for (let channel = 0; channel < 3; channel += 1) {
    const value = outsideA ? 255 : (a.data[ia + channel] ?? 255)
    let min = 255
    let max = 0
    for (let oy = -NEIGHBOR_RADIUS; oy <= NEIGHBOR_RADIUS; oy += 1) {
      for (let ox = -NEIGHBOR_RADIUS; ox <= NEIGHBOR_RADIUS; ox += 1) {
        const bx = x + dx + ox
        const by = y + dy + oy
        const inside = bx >= 0 && by >= 0 && bx < b.width && by < b.height
        const other = inside ? (b.data[(by * b.width + bx) * 4 + channel] ?? 255) : 255
        if (other < min) min = other
        if (other > max) max = other
      }
    }
    if (value < min - COLOR_TOLERANCE || value > max + COLOR_TOLERANCE) return false
  }
  return true
}

function inkFraction(raster: Raster, left: number, top: number, right: number, bottom: number): number {
  let ink = 0
  let total = 0
  for (let y = Math.max(0, top); y < Math.min(raster.height, bottom); y += 1) {
    for (let x = Math.max(0, left); x < Math.min(raster.width, right); x += 1) {
      total += 1
      if (grayAt(raster, x, y) < INK_LEVEL) ink += 1
    }
  }
  return total > 0 ? ink / total : 0
}

function normalized(left: number, top: number, right: number, bottom: number, raster: Raster): NormalizedRect {
  const x = Math.max(0, left) / raster.width
  const y = Math.max(0, top) / raster.height
  return {
    x,
    y,
    width: Math.min(raster.width, right) / raster.width - x,
    height: Math.min(raster.height, bottom) / raster.height - y,
  }
}

/** Pixels diferentes numa caixa de `a` comparada com `b` deslocado de (dx, dy). */
function mismatches(a: Raster, b: Raster, left: number, top: number, right: number, bottom: number, dx: number, dy: number): number {
  let count = 0
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      if (channelDistance(a, x, y, b, x + dx, y + dy) <= COLOR_TOLERANCE) continue
      if (hasMatchingNeighbor(a, x, y, b, dx, dy) && hasMatchingNeighbor(b, x + dx, y + dy, a, -dx, -dy)) continue
      count += 1
    }
  }
  return count
}

/** A região some com um pequeno deslocamento local? */
function vanishesWithLocalShift(a: Raster, b: Raster, left: number, top: number, right: number, bottom: number, shift: { dx: number; dy: number }): boolean {
  if ((right - left) * (bottom - top) > LOCAL_SHIFT_MAX_AREA) return false
  const margin = LOCAL_SHIFT + 1
  const box = [Math.max(0, left - margin), Math.max(0, top - margin), Math.min(a.width, right + margin), Math.min(a.height, bottom + margin)] as const
  for (let oy = -LOCAL_SHIFT; oy <= LOCAL_SHIFT; oy += 1) {
    for (let ox = -LOCAL_SHIFT; ox <= LOCAL_SHIFT; ox += 1) {
      if (ox === 0 && oy === 0) continue
      if (mismatches(a, b, box[0], box[1], box[2], box[3], shift.dx + ox, shift.dy + oy) < MIN_REGION_PIXELS) return true
    }
  }
  return false
}

export interface DiffOptions {
  /**
   * Lado mínimo (pixels) de uma região. Em páginas digitalizadas, pontos de sujeira menores que
   * isto, isolados, são ruído de digitalização (padrão: 0, sem filtro).
   */
  minRegionSide?: number
  /** Pixels diferentes mínimos de uma região (padrão: `MIN_REGION_PIXELS`). */
  minRegionPixels?: number
}

/** Compara duas páginas renderizadas (mesma largura) e devolve as regiões que mudaram. */
export function diffRasters(a: Raster, b: Raster, shift = estimateShift(a, b), options: DiffOptions = {}): RasterDiff {
  const { dx, dy } = shift
  const width = Math.max(a.width, b.width)
  const height = Math.max(a.height, b.height - dy, a.height)
  const columns = Math.ceil(width / CELL)
  const rows = Math.ceil(height / CELL)
  const cells = new Uint16Array(columns * rows)
  let changed = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (channelDistance(a, x, y, b, x + dx, y + dy) <= COLOR_TOLERANCE) continue
      // Igual só se cada lado achar a sua cor na vizinhança do outro (serrilhado, meio pixel de
      // deslocamento); basta um lado sem correspondente para o pixel contar como diferente.
      if (hasMatchingNeighbor(a, x, y, b, dx, dy) && hasMatchingNeighbor(b, x + dx, y + dy, a, -dx, -dy)) continue
      changed += 1
      const cell = Math.floor(y / CELL) * columns + Math.floor(x / CELL)
      cells[cell] = (cells[cell] ?? 0) + 1
    }
  }

  // Componentes conexos das células ativas, unindo células a até MERGE_CELLS de distância.
  const active = (index: number) => (cells[index] ?? 0) >= MIN_CELL_PIXELS
  const label = new Int32Array(columns * rows).fill(-1)
  const regions: VisualRegion[] = []
  let component = 0
  for (let start = 0; start < cells.length; start += 1) {
    if (!active(start) || (label[start] ?? -1) >= 0) continue
    const stack = [start]
    label[start] = component
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let pixels = 0
    while (stack.length > 0) {
      const current = stack.pop() ?? 0
      const cx = current % columns
      const cy = Math.floor(current / columns)
      minX = Math.min(minX, cx)
      maxX = Math.max(maxX, cx)
      minY = Math.min(minY, cy)
      maxY = Math.max(maxY, cy)
      pixels += cells[current] ?? 0
      for (let oy = -MERGE_CELLS; oy <= MERGE_CELLS; oy += 1) {
        for (let ox = -MERGE_CELLS; ox <= MERGE_CELLS; ox += 1) {
          const nx = cx + ox
          const ny = cy + oy
          if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) continue
          const neighbor = ny * columns + nx
          if (!active(neighbor) || (label[neighbor] ?? -1) >= 0) continue
          label[neighbor] = component
          stack.push(neighbor)
        }
      }
    }
    component += 1
    if (pixels < (options.minRegionPixels ?? MIN_REGION_PIXELS)) continue
    const left = minX * CELL
    const top = minY * CELL
    const right = (maxX + 1) * CELL
    const bottom = (maxY + 1) * CELL
    const side = options.minRegionSide ?? 0
    if (right - left < side && bottom - top < side) continue
    if (vanishesWithLocalShift(a, b, left, top, right, bottom, shift)) continue
    regions.push({
      original: normalized(left, top, right, bottom, a),
      updated: normalized(left + dx, top + dy, right + dx, bottom + dy, b),
      pixels,
      inkOriginal: inkFraction(a, left, top, right, bottom),
      inkUpdated: inkFraction(b, left + dx, top + dy, right + dx, bottom + dy),
    })
  }
  return { regions, shift, changedFraction: changed / Math.max(1, width * height) }
}

function median(values: number[]): number {
  values.sort((a, b) => a - b)
  return values[Math.floor(values.length / 2)] ?? 0
}

/**
 * Cor da tinta (pixels bem mais escuros que o fundo) dentro de uma região: mediana de cada canal,
 * para que um traço de outra cor cruzando a palavra (carimbo, sublinhado) não mude o resultado.
 * `undefined` se não houver tinta.
 */
export function inkColor(raster: Raster, region: NormalizedRect): [number, number, number] | undefined {
  const left = Math.floor(region.x * raster.width)
  const top = Math.floor(region.y * raster.height)
  const right = Math.ceil((region.x + region.width) * raster.width)
  const bottom = Math.ceil((region.y + region.height) * raster.height)
  const pixels: { gray: number; index: number }[] = []
  for (let y = Math.max(0, top); y < Math.min(raster.height, bottom); y += 1) {
    for (let x = Math.max(0, left); x < Math.min(raster.width, right); x += 1) {
      const gray = grayAt(raster, x, y)
      if (gray <= 150) pixels.push({ gray, index: (y * raster.width + x) * 4 })
    }
  }
  if (pixels.length < MIN_INK_PIXELS) return undefined
  // Só o miolo dos traços (o terço mais escuro): a espessura do traço e o serrilhado não mudam a cor.
  pixels.sort((a, b) => a.gray - b.gray)
  const core = pixels.slice(0, Math.max(MIN_INK_PIXELS / 2, Math.ceil(pixels.length / 3)))
  const channel = (offset: number) => median(core.map((pixel) => raster.data[pixel.index + offset] ?? 0))
  return [channel(0), channel(1), channel(2)]
}

/** Pixels de tinta mínimos para medir a cor de um trecho (um ponto final tem menos). */
export const MIN_INK_PIXELS = 12

/**
 * A cor da tinta mudou num trecho que ficou no mesmo lugar? Compara só os pixels que têm tinta nas
 * duas versões (o desenho das letras): numa mudança de cor, quase todos diferem; num traço de outra
 * cor cruzando a palavra (carimbo, sublinhado), só uma parte.
 */
export function inkColorChangedInPlace(a: Raster, regionA: NormalizedRect, b: Raster, regionB: NormalizedRect, tolerance: number): boolean | undefined {
  const left = Math.floor(regionA.x * a.width)
  const top = Math.floor(regionA.y * a.height)
  const width = Math.ceil(regionA.width * a.width)
  const height = Math.ceil(regionA.height * a.height)
  const scaleX = (regionB.width * b.width) / Math.max(1, regionA.width * a.width)
  const scaleY = (regionB.height * b.height) / Math.max(1, regionA.height * a.height)
  let both = 0
  let changed = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ax = left + x
      const ay = top + y
      const bx = Math.round(regionB.x * b.width + x * scaleX)
      const by = Math.round(regionB.y * b.height + y * scaleY)
      if (grayAt(a, ax, ay) > 110 || grayAt(b, bx, by) > 110) continue
      both += 1
      if (channelDistance(a, ax, ay, b, bx, by) > tolerance) changed += 1
    }
  }
  if (both < MIN_INK_PIXELS) return undefined
  return changed / both >= 0.6
}

/** Grade de cinzas (size × size) de uma região, para comparar imagens independentemente da escala. */
export function regionSignature(raster: Raster, region: NormalizedRect, size = 12): Uint8Array {
  const signature = new Uint8Array(size * size)
  const left = region.x * raster.width
  const top = region.y * raster.height
  const width = Math.max(1, region.width * raster.width)
  const height = Math.max(1, region.height * raster.height)
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      let sum = 0
      let count = 0
      const x0 = Math.floor(left + (column * width) / size)
      const x1 = Math.max(x0 + 1, Math.floor(left + ((column + 1) * width) / size))
      const y0 = Math.floor(top + (row * height) / size)
      const y1 = Math.max(y0 + 1, Math.floor(top + ((row + 1) * height) / size))
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          sum += grayAt(raster, x, y)
          count += 1
        }
      }
      signature[row * size + column] = Math.round(sum / Math.max(1, count))
    }
  }
  return signature
}

/** Diferença média (0–255) entre duas assinaturas de mesmo tamanho. */
export function signatureDistance(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length || a.length === 0) return 255
  let total = 0
  for (let index = 0; index < a.length; index += 1) total += Math.abs((a[index] ?? 0) - (b[index] ?? 0))
  return total / a.length
}
