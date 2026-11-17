import { defined } from '../test/defined.ts'
import { makePdf } from '../test/make-pdf.ts'
import { compareDocuments } from './compare-documents.ts'

/**
 * Medição de desempenho do comparador (fora da suíte funcional): `npm run test:desempenho`.
 * O limite é o mesmo de sempre (10 s para dois documentos de 100 páginas). Rode com a máquina
 * livre: com o modelo local da IA carregado e a suíte inteira em paralelo, ele falhou uma vez
 * sem nenhuma mudança no comparador (E11.3). A correção do resultado desse mesmo caso é conferida
 * na suíte funcional (`compare-documents.test.ts`, "documento longo").
 */
describe('compareDocuments: desempenho', () => {
  it('compara dois documentos de 100 páginas em menos de 10 s', { timeout: 60_000 }, async () => {
    const pages = Array.from({ length: 100 }, (_, page) => Array.from({ length: 40 }, (_, line) => `Art. ${page * 40 + line + 1} O requerente apresentará o documento número ${page}-${line} à secretaria.`))
    const changed = pages.map((page) => [...page])
    for (const index of [5, 40, 77, 99]) {
      const page = defined(changed[index])
      page[10] = `${page[10] ?? ''} Texto acrescentado.`
    }
    const [original, updated] = await Promise.all([makePdf(pages, { fontSize: 9, lineHeight: 1.6 }), makePdf(changed, { fontSize: 9, lineHeight: 1.6 })])

    const started = performance.now()
    const result = await compareDocuments({ original: { fileName: 'original.pdf', bytes: original.bytes }, updated: { fileName: 'atualizado.pdf', bytes: updated.bytes } })
    const elapsed = performance.now() - started

    expect(result.summary).toMatchObject({ total: 4, additions: 4 })
    expect(elapsed).toBeLessThan(10_000)
  })
})
