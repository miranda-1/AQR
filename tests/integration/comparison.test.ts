import type { FastifyInstance } from 'fastify'
import type { AddressInfo } from 'node:net'
import { createHttpComparisonService } from '@/features/comparison/services/http-comparison-service'
import { buildTestApp } from '../../server/test/build-test-app.ts'
import { makeImageOnlyPdf, makePdf } from '../../server/test/make-pdf.ts'

/**
 * Ponta a ponta da comparação: o mesmo serviço que a tela usa (`createHttpComparisonService`)
 * conversa por HTTP com o servidor real, que processa PDFs reais em threads reais.
 */

let app: FastifyInstance
let baseUrl: string

beforeAll(async () => {
  app = await buildTestApp()
  await app.listen({ host: '127.0.0.1', port: 0 })
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`
})
afterAll(() => app.close())

async function pdfFile(name: string, pages: string[][]): Promise<File> {
  return new File([(await makePdf(pages)).bytes.slice()], name, { type: 'application/pdf' })
}

describe('comparação de ponta a ponta', () => {
  it('compara dois PDFs reais e devolve as diferenças com etapas e posições', { timeout: 30_000 }, async () => {
    const original = await pdfFile('Requerimento v1.pdf', [
      ['Art. 1º O prazo é de dez dias corridos.', 'Art. 2º A taxa é de cem unidades fiscais.'],
      ['Art. 3º Revogam-se as disposições em contrário.'],
    ])
    const updated = await pdfFile('Requerimento v2.pdf', [
      ['Art. 1º O prazo é de quinze dias corridos.', 'Art. 2º A taxa é de cem unidades fiscais.'],
      ['Art. 3º Revogam-se as disposições em contrário.', 'Art. 4º Esta norma entra em vigor na data da publicação.'],
    ])
    const stages: string[] = []
    const service = createHttpComparisonService({ baseUrl, pollIntervalMs: 50 })
    const outcome = await service.compare({ original, updated }, { onProgress: ({ stage }) => stages.push(stage) })

    if (outcome.status !== 'completed') throw new Error(`Esperava conclusão, veio ${JSON.stringify(outcome)}`)
    expect(stages[0]).toBe('validating')
    expect(outcome.result.isDemonstration).toBe(false)
    expect(outcome.result.documents.original).toMatchObject({ fileName: 'Requerimento v1.pdf', pageCount: 2 })
    // O resultado real passou pela validação do frontend (formato 2) sem perder nada.
    expect(outcome.result.formatVersion).toBe(2)
    expect(outcome.result.summary).toMatchObject({ total: 2, additions: 1, deletions: 0, modifications: 1, moves: 0 })
    expect(outcome.result.analysis.status).toBe('complete')
    expect(outcome.result.analysis.pageMatches).toEqual([
      { original: 1, updated: 1, relation: 'matched' },
      { original: 2, updated: 2, relation: 'matched' },
    ])
    const [modification, addition] = outcome.result.differences
    expect(modification).toMatchObject({
      kind: 'modification',
      category: 'text',
      context: 'Art. 1º',
      original: { text: 'dez' },
      updated: { text: 'quinze' },
      evidence: 'corroborated',
    })
    expect(addition).toMatchObject({ kind: 'addition', context: 'Art. 4º', anchors: { original: { pageNumber: 2 } } })
    expect(addition?.updated?.location.region?.width).toBeGreaterThan(0)
  })

  it('PDF sem texto: comparado pela aparência, com a página marcada como sem texto', { timeout: 30_000 }, async () => {
    const original = new File([(await makeImageOnlyPdf()).slice()], 'desenhos.pdf', { type: 'application/pdf' })
    const updated = await pdfFile('texto.pdf', [['Texto suficiente para ser comparado com outro documento.']])
    const outcome = await createHttpComparisonService({ baseUrl, pollIntervalMs: 50 }).compare({ original, updated })
    if (outcome.status !== 'completed') throw new Error(`Esperava conclusão, veio ${JSON.stringify(outcome)}`)
    expect(outcome.result.analysis.pages.original[0]).toMatchObject({ content: 'graphics', textSource: 'none' })
  })

  it('PDF sem texto num servidor sem comparação visual nem OCR: erro claro, apontando o documento', { timeout: 30_000 }, async () => {
    const restricted = await buildTestApp({ comparison: { visual: false, ocr: false } })
    await restricted.listen({ host: '127.0.0.1', port: 0 })
    try {
      const url = `http://127.0.0.1:${(restricted.server.address() as AddressInfo).port}`
      const original = new File([(await makeImageOnlyPdf()).slice()], 'digitalizado.pdf', { type: 'application/pdf' })
      const updated = await pdfFile('texto.pdf', [['Texto suficiente para ser comparado com outro documento.']])
      const outcome = await createHttpComparisonService({ baseUrl: url, pollIntervalMs: 50 }).compare({ original, updated })
      expect(outcome).toEqual({ status: 'failed', error: { code: 'NO_EXTRACTABLE_TEXT', document: 'original' } })
    } finally {
      await restricted.close()
    }
  })

  it('arquivo que não é PDF: recusado no envio como documento incompatível', async () => {
    const original = new File(['não sou PDF'], 'falso.pdf', { type: 'application/pdf' })
    const updated = await pdfFile('texto.pdf', [['Texto suficiente para ser comparado.']])
    const outcome = await createHttpComparisonService({ baseUrl }).compare({ original, updated })
    expect(outcome).toEqual({ status: 'failed', error: { code: 'INCOMPATIBLE_DOCUMENT', document: 'original' } })
  })

  it('servidor fora do ar: falha de processamento, sem travar', async () => {
    const original = await pdfFile('a.pdf', [['Texto a.']])
    const outcome = await createHttpComparisonService({ baseUrl: 'http://127.0.0.1:1' }).compare({ original, updated: original })
    expect(outcome).toEqual({ status: 'failed', error: { code: 'PROCESSING_FAILED' } })
  })
})
