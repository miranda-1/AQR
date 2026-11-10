import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import Tesseract from 'tesseract.js'
import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { clamp01 } from '../geometry.ts'

/**
 * OCR local com Tesseract (tesseract.js, WebAssembly) e o modelo de português do pacote
 * `@tesseract.js-data/por`. Nada sai do servidor: o modelo é lido do disco local (nunca da CDN
 * padrão do tesseract.js), sem cache gravado, e a imagem da página fica só na memória.
 */

export interface OcrWord {
  text: string
  region: NormalizedRect
  /** Confiança informada pelo Tesseract (0–100). */
  confidence: number
}

export interface OcrLine {
  words: OcrWord[]
}

export interface OcrPage {
  lines: OcrLine[]
  /** Confiança média das palavras (0–100), como informada pelo Tesseract. */
  confidence: number
}

export interface OcrEngine {
  recognize(page: PDFPageProxy): Promise<OcrPage>
  /** Imagem avulsa já validada e convertida para PNG (ver `server/documents/image.ts`). */
  recognizeImage(image: { png: Buffer; width: number; height: number }): Promise<OcrPage>
  close(): Promise<void>
}

/** Largura da imagem enviada ao OCR (≈ 240 dpi numa página A4). */
export const OCR_IMAGE_WIDTH = 2000

const requireFromHere = createRequire(import.meta.url)

/** Pasta do modelo de português incluído nas dependências (versão "best_int", mais precisa). */
export function defaultLanguagePath(): string | undefined {
  try {
    return path.join(path.dirname(requireFromHere.resolve('@tesseract.js-data/por/package.json')), '4.0.0_best_int')
  } catch {
    return undefined
  }
}

async function pagePng(page: PDFPageProxy): Promise<{ png: Buffer; width: number; height: number }> {
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: Math.min(OCR_IMAGE_WIDTH / base.width, 4000 / base.height) })
  const width = Math.max(1, Math.round(viewport.width))
  const height = Math.max(1, Math.round(viewport.height))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  const parameters = { canvasContext: context, canvas, viewport, background: '#ffffff' } as unknown as Parameters<PDFPageProxy['render']>[0]
  await page.render(parameters).promise
  return { png: canvas.toBuffer('image/png'), width, height }
}

/**
 * Cria o motor de OCR. Devolve `undefined` (e o motivo) quando o modelo não está disponível ou o
 * Tesseract não inicia: a comparação segue sem OCR e as páginas que dependiam dele ficam marcadas.
 */
export async function createOcrEngine(languagePath = defaultLanguagePath()): Promise<{ engine: OcrEngine } | { engine: undefined; reason: string }> {
  if (!languagePath || !existsSync(path.join(languagePath, 'por.traineddata.gz'))) {
    return { engine: undefined, reason: 'modelo de português do OCR não encontrado' }
  }
  let worker: Tesseract.Worker
  try {
    worker = await Tesseract.createWorker('por', Tesseract.OEM.LSTM_ONLY, {
      langPath: languagePath,
      cacheMethod: 'none',
      gzip: true,
      logger: () => undefined,
      errorHandler: () => undefined,
    })
  } catch {
    return { engine: undefined, reason: 'o Tesseract não iniciou' }
  }

  async function recognizePng(png: Buffer, width: number, height: number): Promise<OcrPage> {
    const { data } = await worker.recognize(png, {}, { blocks: true, text: false })
    const lines: OcrLine[] = []
    let confidenceSum = 0
    let wordCount = 0
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          const words: OcrWord[] = []
          for (const word of line.words) {
            const text = word.text.trim()
            if (!text) continue
            const x = clamp01(word.bbox.x0 / width)
            const y = clamp01(word.bbox.y0 / height)
            words.push({
              text,
              confidence: Math.round(word.confidence),
              region: { x, y, width: clamp01(word.bbox.x1 / width) - x, height: clamp01(word.bbox.y1 / height) - y },
            })
            confidenceSum += word.confidence
            wordCount += 1
          }
          if (words.length > 0) lines.push({ words })
        }
      }
    }
    return { lines, confidence: wordCount > 0 ? Math.round(confidenceSum / wordCount) : 0 }
  }

  return {
    engine: {
      async recognize(page) {
        const { png, width, height } = await pagePng(page)
        return recognizePng(png, width, height)
      },
      recognizeImage: ({ png, width, height }) => recognizePng(png, width, height),
      async close() {
        await worker.terminate()
      },
    },
  }
}
