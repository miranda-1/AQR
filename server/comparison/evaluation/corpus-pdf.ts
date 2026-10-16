import { createRequire } from 'node:module'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import fontkit from '@pdf-lib/fontkit'
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas'
import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { rotateRect, unionRect } from '../geometry.ts'

/**
 * Gerador do corpus sintético (só desenvolvimento e testes). Cada página é descrita por blocos com
 * posição em pontos (origem no canto superior esquerdo da página sem rotação). O gerador devolve,
 * além do PDF, a caixa de cada bloco e de cada palavra, calculada pelas métricas das fontes e pelas
 * posições pedidas — o gabarito não vem do comparador.
 *
 * Imagens e páginas "digitalizadas" são desenhadas com @napi-rs/canvas a partir de sementes fixas,
 * então o corpus é idêntico a cada execução.
 */

export type Rgb = readonly [number, number, number]
export type FontName = 'helvetica' | 'times' | 'courier' | 'liberation'

export interface TextBlock {
  kind: 'text'
  id?: string
  x: number
  /** Topo da primeira linha. Sem ele, o bloco vem logo abaixo do texto anterior da página. */
  y?: number
  /** Espaço depois do bloco, quando o seguinte vem empilhado. */
  gap?: number
  text: string
  size?: number
  font?: FontName
  color?: Rgb
  /** Largura máxima: o texto é quebrado em linhas. */
  width?: number
  lineHeight?: number
  /** Desenha palavra por palavra (estrutura interna diferente, mesma aparência). */
  perWord?: boolean
}

export interface PictureSpec {
  /** Desenho: "paisagem", "grafico" (barras), "logo", "textura". */
  kind: 'landscape' | 'chart' | 'logo' | 'texture'
  /** Variação do desenho (cores, valores). */
  variant?: number
  /** Ajuste local: um retângulo de outra cor dentro da imagem (mudança "dentro da imagem"). */
  patch?: { x: number; y: number; width: number; height: number; color: string }
}

export interface ImageBlock {
  kind: 'image'
  id?: string
  x: number
  y: number
  width: number
  height: number
  picture: PictureSpec
  format?: 'png' | 'jpeg'
  quality?: number
}

export interface ShapeBlock {
  kind: 'rect' | 'ellipse' | 'line'
  id?: string
  x: number
  y: number
  width: number
  height: number
  stroke?: Rgb
  fill?: Rgb
  lineWidth?: number
  opacity?: number
}

export interface ScanBlock {
  kind: 'scan'
  id?: string
  /** Linhas de texto da página digitalizada (topo em `top`, margem esquerda em `left`). */
  lines: string[]
  left?: number
  top?: number
  size?: number
  lineHeight?: number
  /** Fração de pixels com ruído (0–1). */
  noise?: number
  /** Inclinação em graus. */
  skew?: number
  /** Desfoque (pixels) para simular cópia ruim. */
  blur?: number
  quality?: number
  seed?: number
  /** Assinatura manuscrita desenhada na posição indicada. */
  signature?: { x: number; y: number; width: number; height: number; seed: number }
  dpi?: number
}

export type Block = TextBlock | ImageBlock | ShapeBlock | ScanBlock

export interface PageSpec {
  size?: readonly [number, number]
  rotate?: 0 | 90 | 180 | 270
  blocks: Block[]
}

export interface BuiltWord {
  text: string
  pageNumber: number
  region: NormalizedRect
}

export interface BuiltPdf {
  bytes: Uint8Array
  /** Caixa de cada bloco com `id`, normalizada na orientação exibida da página. */
  boxes: Map<string, { pageNumber: number; region: NormalizedRect }>
  words: BuiltWord[]
}

export const A4: readonly [number, number] = [595.28, 841.89]

const fontsDir = path.join(path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json')), 'standard_fonts')
const CANVAS_FONT = 'AQR Corpus Sans'
let canvasFontRegistered = false

function canvasFont(): string {
  if (!canvasFontRegistered) {
    GlobalFonts.registerFromPath(path.join(fontsDir, 'LiberationSans-Regular.ttf'), CANVAS_FONT)
    canvasFontRegistered = true
  }
  return CANVAS_FONT
}

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawPicture(context: SKRSContext2D, width: number, height: number, picture: PictureSpec) {
  const variant = picture.variant ?? 0
  const random = seeded(1000 + variant)
  if (picture.kind === 'landscape') {
    const sky = context.createLinearGradient(0, 0, 0, height)
    sky.addColorStop(0, variant % 2 === 0 ? '#6fa8dc' : '#e69138')
    sky.addColorStop(1, '#ffffff')
    context.fillStyle = sky
    context.fillRect(0, 0, width, height)
    context.fillStyle = '#f1c232'
    context.beginPath()
    context.arc(width * (0.75 - variant * 0.2), height * 0.3, height * 0.12, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = variant % 2 === 0 ? '#38761d' : '#783f04'
    context.beginPath()
    context.moveTo(0, height)
    for (let x = 0; x <= width; x += width / 8) context.lineTo(x, height * (0.6 + 0.15 * Math.sin(x / width * 6 + variant)))
    context.lineTo(width, height)
    context.fill()
  } else if (picture.kind === 'chart') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    const bars = 6
    for (let index = 0; index < bars; index += 1) {
      const value = 0.2 + 0.7 * random()
      context.fillStyle = ['#283587', '#cc0000', '#38761d'][index % 3] ?? '#000000'
      context.fillRect((index + 0.2) * (width / bars), height * (1 - value), (width / bars) * 0.6, height * value)
    }
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.strokeRect(1, 1, width - 2, height - 2)
  } else if (picture.kind === 'logo') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.fillStyle = variant % 2 === 0 ? '#283587' : '#990000'
    context.beginPath()
    context.arc(width / 2, height / 2, Math.min(width, height) * 0.4, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#ffcc00'
    context.fillRect(width * 0.3, height * 0.45, width * 0.4, height * 0.1)
  } else {
    const image = context.createImageData(width, height)
    for (let index = 0; index < image.data.length; index += 4) {
      const value = 120 + Math.round(random() * 100)
      image.data[index] = value
      image.data[index + 1] = Math.round(value * 0.9)
      image.data[index + 2] = Math.round(value * 0.7)
      image.data[index + 3] = 255
    }
    context.putImageData(image, 0, 0)
  }
  if (picture.patch) {
    context.fillStyle = picture.patch.color
    context.fillRect(picture.patch.x * width, picture.patch.y * height, picture.patch.width * width, picture.patch.height * height)
  }
}

function pictureBytes(block: ImageBlock): Buffer {
  const pixelWidth = Math.max(8, Math.round(block.width * 2))
  const pixelHeight = Math.max(8, Math.round(block.height * 2))
  const canvas = createCanvas(pixelWidth, pixelHeight)
  drawPicture(canvas.getContext('2d'), pixelWidth, pixelHeight, block.picture)
  return block.format === 'jpeg' ? canvas.toBuffer('image/jpeg', block.quality ?? 90) : canvas.toBuffer('image/png')
}

function drawSignature(context: SKRSContext2D, scale: number, signature: NonNullable<ScanBlock['signature']>) {
  const random = seeded(signature.seed)
  context.strokeStyle = '#1a237e'
  context.lineWidth = 2.2 * scale
  context.beginPath()
  const steps = 7
  context.moveTo(signature.x * scale, (signature.y + signature.height * 0.6) * scale)
  for (let step = 1; step <= steps; step += 1) {
    const x = (signature.x + (signature.width * step) / steps) * scale
    const y = (signature.y + signature.height * (0.2 + 0.7 * random())) * scale
    context.quadraticCurveTo(x - (signature.width / steps / 2) * scale, (signature.y + signature.height * random()) * scale, x, y)
  }
  context.stroke()
}

function scanBytes(block: ScanBlock, pageSize: readonly [number, number]): Buffer {
  const dpi = block.dpi ?? 150
  const scale = dpi / 72
  const width = Math.round(pageSize[0] * scale)
  const height = Math.round(pageSize[1] * scale)
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.save()
  if (block.skew) {
    context.translate(width / 2, height / 2)
    context.rotate((block.skew * Math.PI) / 180)
    context.translate(-width / 2, -height / 2)
  }
  const size = block.size ?? 12
  const lineHeight = block.lineHeight ?? 1.6
  context.fillStyle = '#111111'
  context.font = `${size * scale}px "${canvasFont()}"`
  context.textBaseline = 'top'
  block.lines.forEach((line, index) => {
    context.fillText(line, (block.left ?? 72) * scale, ((block.top ?? 72) + index * size * lineHeight) * scale)
  })
  if (block.signature) drawSignature(context, scale, block.signature)
  context.restore()
  if (block.blur) {
    // Desfoque simples (média) para simular cópia ruim.
    const image = context.getImageData(0, 0, width, height)
    const source = new Uint8ClampedArray(image.data)
    const radius = Math.round(block.blur)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0
        let count = 0
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            sum += source[(ny * width + nx) * 4] ?? 255
            count += 1
          }
        }
        const value = Math.round(sum / count)
        const index = (y * width + x) * 4
        image.data[index] = value
        image.data[index + 1] = value
        image.data[index + 2] = value
      }
    }
    context.putImageData(image, 0, 0)
  }
  if (block.noise) {
    const random = seeded(block.seed ?? 7)
    const image = context.getImageData(0, 0, width, height)
    for (let index = 0; index < image.data.length; index += 4) {
      if (random() < block.noise) {
        const value = random() < 0.5 ? 30 : 235
        image.data[index] = value
        image.data[index + 1] = value
        image.data[index + 2] = value
      }
    }
    context.putImageData(image, 0, 0)
  }
  return canvas.toBuffer('image/jpeg', block.quality ?? 85)
}

function wrap(text: string, measure: (value: string) => number, maxWidth: number | undefined): string[] {
  if (maxWidth === undefined) return [text]
  const lines: string[] = []
  let current = ''
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word
    if (current && measure(candidate) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

interface Fonts {
  get(name: FontName): Promise<PDFFont>
}

function fontLoader(doc: PDFDocument): Fonts {
  const cache = new Map<FontName, Promise<PDFFont>>()
  return {
    get(name) {
      let font = cache.get(name)
      if (!font) {
        font =
          name === 'liberation'
            ? doc.embedFont(readFileSync(path.join(fontsDir, 'LiberationSans-Regular.ttf')), { subset: true })
            : doc.embedFont(name === 'times' ? StandardFonts.TimesRoman : name === 'courier' ? StandardFonts.Courier : StandardFonts.Helvetica)
        cache.set(name, font)
      }
      return font
    },
  }
}

function normalized(x: number, top: number, width: number, height: number, size: readonly [number, number], rotate: number): NormalizedRect {
  return rotateRect({ x: x / size[0], y: top / size[1], width: width / size[0], height: height / size[1] }, rotate)
}

async function drawText(
  page: PDFPage,
  block: TextBlock,
  fonts: Fonts,
  size: readonly [number, number],
  rotate: number,
  pageNumber: number,
  cursor: number,
): Promise<{ words: BuiltWord[]; next: number }> {
  const font = await fonts.get(block.font ?? 'helvetica')
  const fontSize = block.size ?? 12
  const ascent = font.heightAtSize(fontSize, { descender: false })
  const descent = font.heightAtSize(fontSize) - ascent
  const spaceWidth = font.widthOfTextAtSize(' ', fontSize)
  const color = block.color ? rgb(...block.color) : rgb(0, 0, 0)
  const words: BuiltWord[] = []
  let top = block.y ?? cursor
  for (const line of wrap(block.text, (value) => font.widthOfTextAtSize(value, fontSize), block.width)) {
    const baseline = size[1] - top - ascent
    if (!block.perWord) page.drawText(line, { x: block.x, y: baseline, size: fontSize, font, color })
    let x = block.x
    for (const word of line.split(' ')) {
      const width = font.widthOfTextAtSize(word, fontSize)
      if (word) {
        if (block.perWord) page.drawText(word, { x, y: baseline, size: fontSize, font, color })
        words.push({ text: word, pageNumber, region: normalized(x, top, width, ascent + descent, size, rotate) })
      }
      x += width + spaceWidth
    }
    top += fontSize * (block.lineHeight ?? 1.5)
  }
  return { words, next: top + (block.gap ?? fontSize * 0.5) }
}

/** Gera o PDF a partir das páginas descritas. */
export async function buildPdf(pages: readonly PageSpec[], options: { objectStreams?: boolean } = {}): Promise<BuiltPdf> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setCreationDate(new Date(0))
  doc.setModificationDate(new Date(0))
  doc.setProducer('AQR corpus')
  doc.setCreator('AQR corpus')
  const fonts = fontLoader(doc)
  const boxes = new Map<string, { pageNumber: number; region: NormalizedRect }>()
  const words: BuiltWord[] = []

  for (const [index, spec] of pages.entries()) {
    const pageNumber = index + 1
    const size = spec.size ?? A4
    const rotate = spec.rotate ?? 0
    const page = doc.addPage([size[0], size[1]])
    if (rotate) page.setRotation(degrees(rotate))
    let cursor = 72
    for (const block of spec.blocks) {
      let region: NormalizedRect | undefined
      if (block.kind === 'text') {
        const drawn = await drawText(page, block, fonts, size, rotate, pageNumber, cursor)
        cursor = drawn.next
        words.push(...drawn.words)
        region = unionRect(drawn.words.map((word) => word.region))
      } else if (block.kind === 'image') {
        const bytes = pictureBytes(block)
        const image = block.format === 'jpeg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes)
        page.drawImage(image, { x: block.x, y: size[1] - block.y - block.height, width: block.width, height: block.height })
        region = normalized(block.x, block.y, block.width, block.height, size, rotate)
      } else if (block.kind === 'scan') {
        const image = await doc.embedJpg(scanBytes(block, size))
        page.drawImage(image, { x: 0, y: 0, width: size[0], height: size[1] })
        const signature = block.signature
        region = signature
          ? normalized(signature.x, signature.y, signature.width, signature.height, size, rotate)
          : normalized(0, 0, size[0], size[1], size, rotate)
      } else {
        const options = {
          x: block.x,
          y: size[1] - block.y - block.height,
          width: block.width,
          height: block.height,
          borderColor: block.stroke ? rgb(...block.stroke) : undefined,
          color: block.fill ? rgb(...block.fill) : undefined,
          borderWidth: block.stroke ? (block.lineWidth ?? 1) : 0,
          opacity: block.opacity,
        }
        if (block.kind === 'rect') page.drawRectangle(options)
        else if (block.kind === 'ellipse') {
          page.drawEllipse({
            x: block.x + block.width / 2,
            y: size[1] - block.y - block.height / 2,
            xScale: block.width / 2,
            yScale: block.height / 2,
            borderColor: options.borderColor,
            color: options.color,
            borderWidth: options.borderWidth,
            opacity: block.opacity,
          })
        } else {
          page.drawLine({
            start: { x: block.x, y: size[1] - block.y },
            end: { x: block.x + block.width, y: size[1] - block.y - block.height },
            thickness: block.lineWidth ?? 1,
            color: block.stroke ? rgb(...block.stroke) : rgb(0, 0, 0),
          })
        }
        region = normalized(block.x, block.y, block.width, Math.max(block.height, block.lineWidth ?? 1), size, rotate)
      }
      if (block.id && region) boxes.set(block.id, { pageNumber, region })
    }
  }
  const bytes = await doc.save({ useObjectStreams: options.objectStreams ?? false })
  return { bytes, boxes, words }
}

/**
 * Caixa de uma sequência de palavras numa página, pelo gabarito do gerador. Com `pick`, só a parte
 * `pick` (palavras) dentro da primeira ocorrência da sequência (para palavras repetidas na página).
 */
export function wordsBox(pdf: BuiltPdf, pageNumber: number, sequence: string, pick?: string): NormalizedRect {
  const wanted = sequence.split(' ')
  const onPage = pdf.words.filter((word) => word.pageNumber === pageNumber)
  let start = onPage.findIndex((_, index) => wanted.every((text, offset) => onPage[index + offset]?.text === text))
  if (start < 0) throw new Error(`Sequência "${sequence}" ausente na página ${pageNumber}`)
  let length = wanted.length
  if (pick) {
    const picked = pick.split(' ')
    const offset = wanted.findIndex((_, index) => picked.every((text, inner) => wanted[index + inner] === text))
    if (offset < 0) throw new Error(`"${pick}" não está em "${sequence}"`)
    start += offset
    length = picked.length
  }
  const region = unionRect(onPage.slice(start, start + length).map((word) => word.region))
  if (!region) throw new Error('sem região')
  return region
}

export function boxOf(pdf: BuiltPdf, id: string): { pageNumber: number; region: NormalizedRect } {
  const box = pdf.boxes.get(id)
  if (!box) throw new Error(`Bloco "${id}" ausente`)
  return box
}
