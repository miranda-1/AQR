import { describe, expect, it } from 'vitest'
import { demoComparisonResult } from '../mocks/demo-comparison'
import type { ComparisonResult } from '../model/types'
import { exportFileName, exportHtml, exportJson, withoutText } from './report'

const now = new Date('2026-10-15T12:30:00Z')

const partial: ComparisonResult = {
  ...demoComparisonResult,
  isDemonstration: false,
  documents: {
    ...demoComparisonResult.documents,
    updated: { ...demoComparisonResult.documents.updated, fileName: 'contrato <versão 2>.pdf' },
  },
  analysis: {
    ...demoComparisonResult.analysis,
    status: 'partial',
    warnings: [{ code: 'OCR_UNAVAILABLE', severity: 'limitation', message: 'Página 3 sem leitura do texto.', document: 'updated', pages: [3] }],
  },
}

describe('exportação do resultado', () => {
  it('JSON traz o resultado no formato do contrato', () => {
    const parsed = JSON.parse(exportJson(demoComparisonResult, { includeText: true, now })) as { result: ComparisonResult; exportedAt: string }
    expect(parsed.exportedAt).toBe(now.toISOString())
    expect(parsed.result.formatVersion).toBe(2)
    expect(parsed.result.differences).toHaveLength(demoComparisonResult.differences.length)
  })

  it('sem trechos: nenhum texto dos documentos sai na exportação', () => {
    const stripped = withoutText(demoComparisonResult)
    expect(stripped.differences.every((difference) => !difference.original?.text && !difference.updated?.text)).toBe(true)
    const html = exportHtml(demoComparisonResult, { includeText: false, now })
    for (const difference of demoComparisonResult.differences) {
      if (difference.updated?.text) expect(html).not.toContain(difference.updated.text)
    }
    expect(html).toContain('Os trechos dos documentos foram omitidos')
  })

  it('HTML diz a situação da análise e as ressalvas, e escapa o conteúdo', () => {
    const html = exportHtml(partial, { includeText: true, now })
    expect(html).toContain('A comparação foi parcial. Existem páginas ou elementos que não puderam ser analisados.')
    expect(html).toContain('Página 3 sem leitura do texto.')
    expect(html).toContain('contrato &lt;versão 2&gt;.pdf')
    expect(html).not.toContain('<versão 2>')
    expect(html).not.toMatch(/<script/iu)
  })

  it('marca a demonstração com dados fictícios', () => {
    expect(exportHtml(demoComparisonResult, { includeText: true, now })).toContain('Demonstração com dados fictícios')
  })

  it('nome de arquivo seguro', () => {
    expect(exportFileName(partial, 'html', now)).toBe('comparacao-contrato-versão-2-2026-10-15-12-30.html')
  })
})
