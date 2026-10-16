import { corpusCases } from './cases.ts'
import { runCase } from './run.ts'

/**
 * Corpus sintético com gabarito: cada caso compara dois PDFs gerados e confere, contra o gabarito
 * escrito à mão, as diferenças esperadas (tipo, página e local), a ausência de diferenças falsas e,
 * quando o caso pede, a análise (cobertura, OCR, situação). Ver docs/comparador/avaliacao-corpus.md.
 */
describe('corpus sintético do comparador', () => {
  for (const item of corpusCases) {
    it(`${item.id}: ${item.title}`, { timeout: item.timeoutMs ?? 30_000 }, async () => {
      const report = await runCase(item)
      expect(report.problems).toEqual([])
    })
  }
})
