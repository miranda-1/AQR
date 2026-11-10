import { gerarPacote } from '../triage/corpus/generate.ts'
import { PACOTES } from '../triage/corpus/pacotes.ts'
import { defined } from '../test/defined.ts'
import { DocumentFailure } from './failure.ts'
import { imageSize, prepareImage, readImage } from './image.ts'
import { defaultImageLimits } from './limits.ts'
import { createOcrEngine, type OcrEngine } from './ocr/ocr-engine.ts'

async function arquivo(pacoteId: string, nome: string): Promise<Uint8Array> {
  const pacote = await gerarPacote(defined(PACOTES.find((item) => item.id === pacoteId)))
  return defined(pacote.arquivos.find((item) => item.nome === nome)).bytes
}

async function failureOf(promise: Promise<unknown>): Promise<DocumentFailure> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  )
  if (!(error instanceof DocumentFailure)) throw new Error(`Esperava DocumentFailure, veio ${String(error)}`)
  return error
}

describe('imagens avulsas', () => {
  it('lê o tamanho do cabeçalho de JPG e PNG sem decodificar', async () => {
    expect(imageSize(await arquivo('DSD-04', 'ficha-cadastral.jpg'))).toEqual({ width: 1240, height: 1754 })
    expect(imageSize(await arquivo('DSD-05', 'ficha-cadastral.png'))).toEqual({ width: 1240, height: 1754 })
    expect(imageSize(await arquivo('DSD-30', 'matricula.jpg'))).toEqual({ width: 1754, height: 1240 })
    expect(imageSize(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBeNull()
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull()
  })

  it('recusa imagem vazia, grande demais em bytes ou em pixels, e inválida', async () => {
    const jpg = await arquivo('DSD-04', 'ficha-cadastral.jpg')
    expect((await failureOf(prepareImage(new Uint8Array(), 'anexo-1', defaultImageLimits))).reason).toBe('arquivo-vazio')
    expect((await failureOf(prepareImage(jpg, 'anexo-1', { ...defaultImageLimits, maxFileSizeBytes: 10 }))).reason).toBe('tamanho-excedido')
    const pixels = await failureOf(prepareImage(jpg, 'anexo-1', { ...defaultImageLimits, maxPixels: 1000 }))
    expect(pixels.reason).toBe('imagem-grande-demais')
    expect(pixels.document).toBe('anexo-1')
    expect((await failureOf(prepareImage(jpg.subarray(0, 300), 'anexo-1', defaultImageLimits))).reason).toBe('imagem-invalida')
  })

  it('prepara a imagem para o OCR em fundo branco, preservando o tamanho original informado', async () => {
    const prepared = await prepareImage(await arquivo('DSD-05', 'ficha-cadastral.png'), 'anexo-1', defaultImageLimits)
    expect(prepared.original).toEqual({ width: 1240, height: 1754 })
    expect([prepared.width, prepared.height]).toEqual([1240, 1754])
    expect(prepared.png.subarray(1, 4).toString('latin1')).toBe('PNG')
  })

  describe('com OCR local', () => {
    let engine: OcrEngine
    beforeAll(async () => {
      const created = await createOcrEngine()
      if (!created.engine) throw new Error(created.reason)
      engine = created.engine
    }, 60_000)
    afterAll(async () => {
      await engine.close()
    })

    it('lê o texto de um JPG com a confiança por palavra e a região de cada uma', async () => {
      const lido = await readImage(await arquivo('DSD-05', 'requerimento.jpg'), 'anexo-1', { limits: defaultImageLimits, ocr: engine, minConfidence: 45 })
      const texto = lido.pages.flatMap((page) => page.lines.flatMap((line) => line.words.map((word) => word.text))).join(' ')
      expect(lido.role).toBe('anexo-1')
      expect(lido.pageCount).toBe(1)
      expect(texto).toContain('DESDOBRO')
      expect(texto).toContain('90417')
      expect(lido.ocrConfidence).toBeGreaterThan(70)
      const palavra = defined(lido.pages[0]?.lines.flatMap((line) => line.words).find((word) => word.text === 'DESDOBRO'))
      expect(palavra.source).toBe('ocr')
      expect(palavra.confidence).toBeGreaterThan(0)
      expect(palavra.region.x).toBeGreaterThan(0)
      expect(palavra.region.x + palavra.region.width).toBeLessThanOrEqual(1)
    }, 60_000)
  })
})
