import { createCanvas, loadImage } from '@napi-rs/canvas'
import { DocumentFailure } from './failure.ts'
import type { ImageLimits } from './limits.ts'
import { isOcrNoise } from './ocr/merge.ts'
import type { OcrEngine } from './ocr/ocr-engine.ts'
import type { ExtractedDocument, ExtractedLine } from './pdf/extract.ts'

/**
 * Imagens avulsas (JPG, PNG). O tamanho em pixels é lido do cabeçalho ANTES de decodificar: imagem
 * pequena em bytes e gigante em pixels (bomba de descompressão) é recusada sem ser aberta.
 * A leitura do texto é por OCR local, com a confiança de cada palavra.
 */

export interface ImageSize {
  width: number
  height: number
}

const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

/** Largura e altura declaradas no cabeçalho (PNG: IHDR; JPEG: primeiro SOF). `null` se não houver. */
export function imageSize(bytes: Uint8Array): ImageSize | null {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.toString('latin1', 12, 16) === 'IHDR') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null
  let offset = 2
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return null
    const marker = buffer[offset + 1] ?? 0
    if (marker === 0xff) {
      offset += 1
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2
      continue
    }
    if (marker === 0xda || marker === 0xd9) return null
    if (SOF_MARKERS.has(marker)) {
      if (offset + 9 > buffer.length) return null
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
    }
    offset += 2 + buffer.readUInt16BE(offset + 2)
  }
  return null
}

/** Lado máximo da imagem entregue ao OCR (a mesma ordem de grandeza das páginas de PDF). */
const OCR_MAX_SIDE = 4000

export interface PreparedImage {
  png: Buffer
  width: number
  height: number
  original: ImageSize
}

/** Confere e decodifica a imagem; devolve um PNG em fundo branco, reduzido se for grande demais para o OCR. */
export async function prepareImage<L extends string>(bytes: Uint8Array, label: L, limits: ImageLimits): Promise<PreparedImage> {
  if (bytes.byteLength === 0) throw new DocumentFailure('arquivo-vazio', label)
  if (bytes.byteLength > limits.maxFileSizeBytes) throw new DocumentFailure('tamanho-excedido', label)
  const size = imageSize(bytes)
  if (!size || size.width === 0 || size.height === 0) throw new DocumentFailure('imagem-invalida', label)
  if (size.width * size.height > limits.maxPixels) throw new DocumentFailure('imagem-grande-demais', label)
  let image
  try {
    image = await loadImage(Buffer.from(bytes))
  } catch (error) {
    throw new DocumentFailure('imagem-invalida', label, { cause: error })
  }
  if (image.width !== size.width || image.height !== size.height) throw new DocumentFailure('imagem-invalida', label)
  const scale = Math.min(1, OCR_MAX_SIDE / Math.max(size.width, size.height))
  const width = Math.max(1, Math.round(size.width * scale))
  const height = Math.max(1, Math.round(size.height * scale))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  return { png: canvas.toBuffer('image/png'), width, height, original: size }
}

export interface ReadImageOptions {
  limits: ImageLimits
  ocr: OcrEngine
  /** Palavra com confiança abaixo disto é descartada como ruído. */
  minConfidence: number
}

/** Uma página, lida por OCR, com a confiança média. Imagem sem texto reconhecível volta sem linhas. */
export interface ImageDocument<L extends string = string> extends ExtractedDocument<L> {
  ocrConfidence: number
  size: ImageSize
}

export async function readImage<L extends string>(bytes: Uint8Array, label: L, options: ReadImageOptions): Promise<ImageDocument<L>> {
  const prepared = await prepareImage(bytes, label, options.limits)
  let page
  try {
    page = await options.ocr.recognizeImage(prepared)
  } catch (error) {
    throw new DocumentFailure('falha-inesperada', label, { cause: error })
  }
  const lines: ExtractedLine[] = []
  let characterCount = 0
  for (const line of page.lines) {
    const words = line.words
      .filter((word) => !isOcrNoise(word.text, word.confidence, options.minConfidence))
      .map((word) => ({ text: word.text, region: word.region, source: 'ocr' as const, confidence: word.confidence }))
    if (words.length === 0) continue
    characterCount += words.reduce((sum, word) => sum + word.text.replace(/\s/gu, '').length, 0)
    lines.push({ words })
  }
  return { role: label, pageCount: 1, pages: [{ pageNumber: 1, lines }], characterCount, ocrConfidence: page.confidence, size: prepared.original }
}
