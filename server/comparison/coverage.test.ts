import { compareDocuments } from './compare-documents.ts'
import { buildPdf, type ScanBlock } from './evaluation/corpus-pdf.ts'
import { defaultComparisonLimits, type ComparisonLimits } from './limits.ts'
import { createOcrEngine } from './ocr/ocr-engine.ts'
import { makePdf } from '../test/make-pdf.ts'

/**
 * Situação da análise quando parte do documento não pode ser analisada: a comparação termina,
 * mas diz o que ficou de fora (nunca "nenhuma diferença" como se tudo tivesse sido visto).
 */

const scan = (lines: string[]): ScanBlock => ({ kind: 'scan', lines, left: 72, top: 90, size: 14, lineHeight: 1.8 })
const TEXT = [['Art. 1º O prazo é de dez dias.', 'Art. 2º A taxa é de cem unidades.']]

async function compare(original: Uint8Array, updated: Uint8Array, limits: Partial<ComparisonLimits>) {
  return compareDocuments(
    { original: { fileName: 'a.pdf', bytes: original }, updated: { fileName: 'b.pdf', bytes: updated } },
    { limits: { ...defaultComparisonLimits, ...limits } },
  )
}

describe('cobertura da análise', () => {
  it('OCR desligado com página digitalizada: parcial, página sem leitura, aparência ainda comparada', { timeout: 60_000 }, async () => {
    const original = await buildPdf([{ blocks: [scan(['Processo nº 4521/2026', 'Parecer favorável.'])] }])
    const updated = await buildPdf([{ blocks: [scan(['Processo nº 4581/2026', 'Parecer favorável.'])] }])
    const result = await compare(original.bytes, updated.bytes, { ocr: false })
    expect(result.analysis.status).toBe('partial')
    expect(result.analysis.pages.updated[0]).toMatchObject({ content: 'scanned', text: 'not-analyzed', visual: 'analyzed' })
    expect(result.analysis.warnings.map((warning) => warning.code)).toContain('OCR_UNAVAILABLE')
    // Sem OCR, a troca do número aparece pela comparação visual.
    expect(result.differences.some((difference) => difference.category === 'visual')).toBe(true)
  })

  it('comparação visual desligada: parcial, texto comparado e aparência marcada como não analisada', async () => {
    const original = await makePdf(TEXT)
    const updated = await makePdf([['Art. 1º O prazo é de quinze dias.', 'Art. 2º A taxa é de cem unidades.']])
    const result = await compare(original.bytes, updated.bytes, { visual: false })
    expect(result.analysis.status).toBe('partial')
    expect(result.analysis.pages.original[0]).toMatchObject({ text: 'analyzed', visual: 'not-analyzed' })
    expect(result.analysis.warnings.map((warning) => warning.code)).toContain('VISUAL_UNAVAILABLE')
    expect(result.differences).toHaveLength(1)
    expect(result.differences[0]?.methods).toEqual(['text-layer'])
  })

  it('orçamento de tempo esgotado: parcial, com as páginas sem comparação visual apontadas', async () => {
    const original = await makePdf([...TEXT, ['Art. 3º Outra página.']])
    const updated = await makePdf([['Art. 1º O prazo é de quinze dias.', 'Art. 2º A taxa é de cem unidades.'], ['Art. 3º Outra página.']])
    const result = await compare(original.bytes, updated.bytes, { softBudgetMs: 0 })
    expect(result.analysis.status).toBe('partial')
    const warning = result.analysis.warnings.find((item) => item.code === 'VISUAL_LIMIT_REACHED')
    expect(warning?.pages).toEqual([1, 2])
    // O texto continua comparado: a diferença aparece, sem confirmação visual.
    expect(result.differences.map((difference) => difference.category)).toEqual(['text'])
  })

  it('quando nem a comparação por linhas cabe nos limites, compara página a página em vez de falhar', async () => {
    const original = await makePdf([['Art. 1º O prazo é de dez dias.'], ['Art. 2º A taxa é de cem unidades.']])
    const updated = await makePdf([['Art. 1º O prazo é de vinte dias.'], ['Art. 2º A taxa é de cem unidades.']])
    const result = await compare(original.bytes, updated.bytes, { maxDiffTokens: 1, maxEditLength: 1 })
    expect(result.analysis.status).toBe('with-caveats')
    expect(result.analysis.warnings.find((warning) => warning.code === 'TEXT_ALIGNED_BY_LINES')?.message).toContain('página a página')
    expect(result.differences.map((difference) => difference.original?.location.pageNumber)).toEqual([1])
  })

  it('nenhuma diferença com análise completa só quando tudo foi examinado', async () => {
    const pdf = await makePdf(TEXT)
    const result = await compare(pdf.bytes, pdf.bytes, {})
    expect(result.differences).toEqual([])
    expect(result.analysis.status).toBe('complete')
  })
})

describe('motor de OCR', () => {
  it('sem o modelo de português, não inicia e diz o motivo (nunca busca na rede)', async () => {
    const created = await createOcrEngine('/caminho/que/nao/existe')
    expect(created.engine).toBeUndefined()
    expect('reason' in created ? created.reason : '').toContain('modelo de português')
  })
})
