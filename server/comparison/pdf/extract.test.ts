import { defined } from '../../test/defined.ts'
import { failureOf } from '../../test/failure.ts'
import { intersectionOverUnion } from '../../test/geometry.ts'
import { makeImageOnlyPdf, makePasswordProtectedPdf, makePdf } from '../../test/make-pdf.ts'
import { defaultComparisonLimits, type ComparisonLimits } from '../limits.ts'
import { extractDocument } from './extract.ts'

describe('extractDocument', () => {
  it('extrai as palavras na ordem, com página e posição', async () => {
    const pdf = await makePdf([
      ['Art. 1º Fica instituído o requerimento de licença ambiental.', 'Parágrafo único: aplicação imediata.'],
      ['Art. 2º Revogam-se as disposições em contrário.'],
    ])
    const document = await extractDocument(pdf.bytes, 'original', defaultComparisonLimits)

    expect(document.pageCount).toBe(2)
    const words = document.pages.flatMap((page) =>
      page.lines.flatMap((line) => line.words.map((word) => ({ ...word, pageNumber: page.pageNumber }))),
    )
    expect(words.map((word) => word.text)).toEqual(pdf.words.map((word) => word.text))
    expect(document.pages[0]?.lines).toHaveLength(2)

    // O pdf.js informa a largura de cada trecho, não de cada letra: a posição de uma palavra no meio
    // da linha é estimada. Critério do plano: IoU ≥ 0,5 em todas; na média, exige-se mais.
    const scores = words.map((word, index) => {
      const expected = defined(pdf.words[index])
      expect(word.pageNumber).toBe(expected.pageNumber)
      return intersectionOverUnion(word.region, expected.region)
    })
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(0.5)
    expect(scores.reduce((sum, score) => sum + score, 0) / scores.length).toBeGreaterThanOrEqual(0.75)
  })

  it('preserva acentos e cedilha', async () => {
    const pdf = await makePdf([['Licença ambiental de operação: análise técnica concluída.']])
    const document = await extractDocument(pdf.bytes, 'updated', defaultComparisonLimits)
    expect(document.pages[0]?.lines[0]?.words.map((word) => word.text).join(' ')).toBe(
      'Licença ambiental de operação: análise técnica concluída.',
    )
  })

  it('recusa arquivo que não é PDF', async () => {
    const bytes = new TextEncoder().encode('isto não é um PDF, é um texto qualquer')
    const failure = await failureOf(extractDocument(bytes, 'original', defaultComparisonLimits))
    expect(failure.reason).toBe('assinatura-ausente')
    expect(failure.toComparisonError()).toEqual({ code: 'INCOMPATIBLE_DOCUMENT', document: 'original' })
  })

  it('recusa PDF corrompido sem travar', async () => {
    const pdf = await makePdf([['Texto suficiente para ser um documento válido.']])
    const corrupted = new Uint8Array(pdf.bytes.subarray(0, 300))
    const failure = await failureOf(extractDocument(corrupted, 'updated', defaultComparisonLimits))
    expect(failure.toComparisonError()).toEqual({ code: 'INCOMPATIBLE_DOCUMENT', document: 'updated' })
  })

  it('recusa PDF protegido por senha', async () => {
    const failure = await failureOf(extractDocument(await makePasswordProtectedPdf(), 'original', defaultComparisonLimits))
    expect(failure.reason).toBe('protegido-por-senha')
    expect(failure.code).toBe('INCOMPATIBLE_DOCUMENT')
  })

  it('aponta PDF sem texto (digitalizado) com erro próprio, sem OCR', async () => {
    const failure = await failureOf(extractDocument(await makeImageOnlyPdf(2), 'updated', defaultComparisonLimits))
    expect(failure.reason).toBe('sem-texto')
    expect(failure.toComparisonError()).toEqual({ code: 'NO_EXTRACTABLE_TEXT', document: 'updated' })
  })

  it('aplica os limites de tamanho, páginas e texto', async () => {
    const pdf = await makePdf([['Primeira página com texto.'], ['Segunda página com texto.']])
    const limits = (overrides: Partial<ComparisonLimits>) => ({ ...defaultComparisonLimits, ...overrides })

    expect((await failureOf(extractDocument(pdf.bytes, 'original', limits({ maxFileSizeBytes: 100 })))).reason).toBe(
      'tamanho-excedido',
    )
    expect((await failureOf(extractDocument(pdf.bytes, 'original', limits({ maxPages: 1 })))).reason).toBe('paginas-demais')
    expect((await failureOf(extractDocument(pdf.bytes, 'original', limits({ maxTextCharacters: 10 })))).reason).toBe(
      'texto-demais',
    )
    expect((await failureOf(extractDocument(new Uint8Array(), 'original', defaultComparisonLimits))).reason).toBe(
      'arquivo-vazio',
    )
  })

  it('não altera os bytes recebidos', async () => {
    const pdf = await makePdf([['Documento que será lido duas vezes.']])
    const copy = pdf.bytes.slice()
    await extractDocument(pdf.bytes, 'original', defaultComparisonLimits)
    expect(pdf.bytes).toEqual(copy)
  })
})
