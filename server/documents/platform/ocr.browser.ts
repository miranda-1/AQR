import type Tesseract from 'tesseract.js'
import type * as NoServidor from './ocr.ts'

/**
 * Versão do navegador de `ocr.ts`: o worker do tesseract.js, o núcleo WebAssembly e o modelo de
 * português são servidos pelo próprio AQR em `/ocr/<versão>/` (copiados no build pelo plugin
 * `arquivosDoOcr` do `vite.config.ts`). Nada vem da CDN padrão do tesseract.js.
 */

/** Pasta dos arquivos do OCR no site (a mesma do `vite.config.ts`). */
export const OCR_ASSETS_DIR = 'ocr/7.0.0'

export function defaultLanguagePath(): string | undefined {
  return undefined
}

export function tesseractPlatformOptions(_languagePath: string | undefined): { options: Partial<Tesseract.WorkerOptions> } | { reason: string } {
  void _languagePath
  const base = new URL(`${import.meta.env.BASE_URL}${OCR_ASSETS_DIR}/`, self.location.origin).href
  return { options: { langPath: base, corePath: base, workerPath: `${base}worker.min.js`, workerBlobURL: false } }
}

;({ defaultLanguagePath, tesseractPlatformOptions }) satisfies Omit<typeof NoServidor, never>
