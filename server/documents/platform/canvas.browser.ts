import type * as NoServidor from './canvas.ts'
import type { PageCanvas } from './canvas.ts'

/** Versão do navegador de `canvas.ts`: `OffscreenCanvas`, que funciona dentro de Web Workers. */

export function createPageCanvas(width: number, height: number): PageCanvas {
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('O navegador não ofereceu um canvas 2D.')
  return { canvas, context, png: () => canvas.convertToBlob({ type: 'image/png' }) }
}

;({ createPageCanvas }) satisfies Omit<typeof NoServidor, never>
