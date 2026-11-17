import type { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { FontesPadraoLocais } from '../../../src/features/comparison/viewer/pdf/standard-fonts.ts'
import type * as NoServidor from './pdfjs.ts'

/**
 * Versão do navegador de `pdfjs.ts`, para o motor rodando num Web Worker (sem `document`):
 * - fontes padrão servidas pelo próprio AQR (a mesma fábrica do visualizador), sem CDN;
 * - canvas auxiliares em `OffscreenCanvas` (o padrão do pdf.js no navegador cria `<canvas>`);
 * - filtros desligados, como no servidor (o padrão do navegador cria SVG no `document`);
 * - sem `ImageDecoder`, como no servidor, para as imagens saírem iguais nos dois ambientes.
 */

interface CanvasEContexto {
  canvas: OffscreenCanvas | null
  context: OffscreenCanvasRenderingContext2D | null
}

class CanvasForaDaTela {
  constructor(_opcoes?: unknown) {
    void _opcoes
  }

  create(width: number, height: number): CanvasEContexto {
    if (width <= 0 || height <= 0) throw new Error('Tamanho de canvas inválido')
    const canvas = new OffscreenCanvas(width, height)
    return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) }
  }

  reset(alvo: CanvasEContexto, width: number, height: number): void {
    if (!alvo.canvas) throw new Error('Canvas não informado')
    alvo.canvas.width = width
    alvo.canvas.height = height
  }

  destroy(alvo: CanvasEContexto): void {
    if (alvo.canvas) alvo.canvas.width = alvo.canvas.height = 0
    alvo.canvas = null
    alvo.context = null
  }
}

/** O mesmo que o `BaseFilterFactory` do pdf.js, usado no servidor: nenhum filtro. */
class SemFiltros {
  constructor(_opcoes?: unknown) {
    void _opcoes
  }
  addFilter(): string {
    return 'none'
  }
  addHCMFilter(): string {
    return 'none'
  }
  addAlphaFilter(): string {
    return 'none'
  }
  addLuminosityFilter(): string {
    return 'none'
  }
  addKnockoutFilter(): string {
    return 'none'
  }
  addHighlightHCMFilter(): string {
    return 'none'
  }
  addSelectionHCMFilter(): string {
    return 'none'
  }
  addSelectionFilter(): string {
    return 'none'
  }
  createSelectionStyle(): null {
    return null
  }
  destroy(): void {}
}

type DocumentInitParameters = NonNullable<Parameters<typeof getDocument>[0]>

export const pdfjsPlatformOptions: DocumentInitParameters = {
  BinaryDataFactory: FontesPadraoLocais,
  CanvasFactory: CanvasForaDaTela,
  FilterFactory: SemFiltros,
  isImageDecoderSupported: false,
}

;({ pdfjsPlatformOptions }) satisfies Omit<typeof NoServidor, never>
