import { ComparisonFailure, asComparisonFailure } from '../comparison/failure.ts'
import { defaultComparisonLimits } from '../comparison/limits.ts'
import * as comparisonExtract from '../comparison/pdf/extract.ts'
import * as comparisonLoad from '../comparison/pdf/load.ts'
import { makePasswordProtectedPdf, makePdf } from '../test/make-pdf.ts'
import { failureOf } from '../test/failure.ts'
import { DocumentFailure } from './failure.ts'
import { analyzeDocument, extractDocument } from './pdf/extract.ts'
import { openPdf } from './pdf/load.ts'

/**
 * Regressão da extração para `server/documents/`: a leitura comum aceita qualquer rótulo e erra com
 * `DocumentFailure`; a comparação, pelas fachadas antigas, continua recebendo `ComparisonFailure`
 * com o mesmo motivo e o papel do documento.
 */

async function documentFailureOf(promise: Promise<unknown>): Promise<DocumentFailure> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  )
  if (!(error instanceof DocumentFailure)) throw new Error(`Esperava DocumentFailure, veio ${String(error)}`)
  return error
}

const corrupted = new Uint8Array([...new TextEncoder().encode('%PDF-1.7\n'), ...new Uint8Array(200).fill(65)])

describe('leitura compartilhada', () => {
  it('aceita qualquer rótulo de documento (ex.: o anexo da triagem)', async () => {
    const { bytes } = await makePdf([['Memorial descritivo do lote F7']])
    const analyzed = await analyzeDocument(bytes, 'anexo-7', defaultComparisonLimits)
    expect(analyzed.role).toBe('anexo-7')
    await analyzed.close()
    const extracted = await extractDocument(bytes, 'anexo-7', defaultComparisonLimits)
    expect(extracted.pages[0]?.lines[0]?.words.map((word) => word.text)).toEqual(['Memorial', 'descritivo', 'do', 'lote', 'F7'])
  })

  it('erra com DocumentFailure e o rótulo do anexo', async () => {
    const failure = await documentFailureOf(openPdf(corrupted, 'anexo-3', defaultComparisonLimits))
    expect([failure.reason, failure.document]).toEqual(['pdf-corrompido', 'anexo-3'])
    expect((await documentFailureOf(openPdf(await makePasswordProtectedPdf(), 'anexo-4', defaultComparisonLimits))).reason).toBe('protegido-por-senha')
    expect((await documentFailureOf(analyzeDocument(new Uint8Array(), 'anexo-5', defaultComparisonLimits))).reason).toBe('arquivo-vazio')
  })

  it('a comparação continua recebendo ComparisonFailure com o mesmo motivo e o papel do documento', async () => {
    const opened = await failureOf(comparisonLoad.openPdf(corrupted, 'updated', defaultComparisonLimits))
    expect(opened).toBeInstanceOf(ComparisonFailure)
    expect([opened.reason, opened.document, opened.code]).toEqual(['pdf-corrompido', 'updated', 'INCOMPATIBLE_DOCUMENT'])
    expect(opened.cause).toBeDefined()
    expect(opened.message).toBe('Falha na comparação: pdf-corrompido (documento updated)')

    const analyzed = await failureOf(comparisonExtract.analyzeDocument(new Uint8Array(), 'original', defaultComparisonLimits))
    expect([analyzed.reason, analyzed.document]).toEqual(['arquivo-vazio', 'original'])

    const { bytes } = await makePdf([['']])
    const extracted = await failureOf(comparisonExtract.extractDocument(bytes, 'original', defaultComparisonLimits))
    expect([extracted.reason, extracted.code]).toEqual(['sem-texto', 'NO_EXTRACTABLE_TEXT'])

    expect(() => comparisonLoad.assertPdfBytes(new TextEncoder().encode('nada'), 'original', defaultComparisonLimits)).toThrow(ComparisonFailure)
  })

  it('motivo só de imagem vira falha inesperada; outros erros passam sem mudança', () => {
    const converted = asComparisonFailure(new DocumentFailure('imagem-grande-demais', 'original'), 'original')
    expect(converted).toBeInstanceOf(ComparisonFailure)
    expect((converted as ComparisonFailure).reason).toBe('falha-inesperada')
    const other = new Error('outro')
    expect(asComparisonFailure(other, 'original')).toBe(other)
    expect((asComparisonFailure(new DocumentFailure('tempo-esgotado'), 'updated') as ComparisonFailure).document).toBeUndefined()
  })
})
