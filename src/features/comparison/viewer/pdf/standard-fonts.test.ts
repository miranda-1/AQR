import { afterEach, describe, expect, it, vi } from 'vitest'
import { FontesPadraoLocais, fontesPadraoDisponiveis } from './standard-fonts'

afterEach(() => vi.unstubAllGlobals())

describe('fontes padrão do pdf.js servidas pelo AQR', () => {
  it('inclui as fontes que o pdf.js pede para PDFs sem fonte embutida', () => {
    expect(fontesPadraoDisponiveis()).toEqual(
      expect.arrayContaining(['FoxitDingbats.pfb', 'FoxitFixed.pfb', 'FoxitSerif.pfb', 'FoxitSymbol.pfb', 'LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf']),
    )
    expect(fontesPadraoDisponiveis()).toHaveLength(14)
  })

  it('carrega a fonte pedida da própria origem, nunca de CDN', async () => {
    const buscas: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      buscas.push(url)
      return new Response(new Uint8Array([1, 2, 3]))
    })
    const bytes = await new FontesPadraoLocais().fetch({ kind: 'standardFontDataUrl', filename: 'LiberationSans-Regular.ttf' })
    expect([...bytes]).toEqual([1, 2, 3])
    expect(buscas).toHaveLength(1)
    expect(buscas[0]).toMatch(/LiberationSans-Regular/)
    expect(buscas[0]).not.toMatch(/^https?:\/\//)
  })

  it('não inventa outros recursos (CMap, wasm) nem fontes desconhecidas', async () => {
    const fabrica = new FontesPadraoLocais({ standardFontDataUrl: 'https://cdn.exemplo/' })
    await expect(fabrica.fetch({ kind: 'cMapUrl', filename: 'Adobe-Japan1-UCS2.bcmap' })).rejects.toThrow(/cMapUrl/)
    await expect(fabrica.fetch({ kind: 'wasmUrl', filename: 'openjpeg.wasm' })).rejects.toThrow(/wasmUrl/)
    await expect(fabrica.fetch({ kind: 'standardFontDataUrl', filename: '../../etc/passwd' })).rejects.toThrow(/não incluída/)
  })
})
