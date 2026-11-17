import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type Tesseract from 'tesseract.js'

/**
 * Onde o Tesseract encontra o modelo de português. No servidor: o pacote `@tesseract.js-data/por`
 * no disco (nunca a CDN padrão do tesseract.js). A versão do navegador está em `ocr.browser.ts`.
 */

const requireFromHere = createRequire(import.meta.url)

/** Pasta do modelo de português incluído nas dependências (versão "best_int", mais precisa). */
export function defaultLanguagePath(): string | undefined {
  try {
    return path.join(path.dirname(requireFromHere.resolve('@tesseract.js-data/por/package.json')), '4.0.0_best_int')
  } catch {
    return undefined
  }
}

/** Opções do worker do Tesseract, ou o motivo de o OCR não estar disponível. */
export function tesseractPlatformOptions(languagePath: string | undefined): { options: Partial<Tesseract.WorkerOptions> } | { reason: string } {
  if (!languagePath || !existsSync(path.join(languagePath, 'por.traineddata.gz'))) return { reason: 'modelo de português do OCR não encontrado' }
  return { options: { langPath: languagePath } }
}
