import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { compareDocuments } from '../compare-documents.ts'
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

/**
 * Robustez a outros geradores: o mesmo PDF regravado pelo Ghostscript (mantém a Helvetica) não pode
 * gerar diferença nenhuma; regravado pelo Cairo (troca a Helvetica pela Nimbus Sans, outra fonte de
 * fato), só "fonte alterada", nunca texto ou elemento visual. Roda só onde as ferramentas existem.
 */
const hasTool = (tool: string) => {
  try {
    execFileSync('which', [tool], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

describe('corpus regravado por outros geradores', () => {
  const sample = ['02-palavra-modificada', '24-tabela', '25-multiplas-colunas', '29-cabecalho-rodape']
  const rewrite = (tool: 'gs' | 'pdftocairo', bytes: Uint8Array): Uint8Array => {
    const dir = mkdtempSync(path.join(tmpdir(), 'aqr-corpus-'))
    try {
      const input = path.join(dir, 'entrada.pdf')
      const output = path.join(dir, 'saida.pdf')
      writeFileSync(input, bytes)
      if (tool === 'gs') execFileSync('gs', ['-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=pdfwrite', `-sOutputFile=${output}`, input])
      else execFileSync('pdftocairo', ['-pdf', input, output])
      return new Uint8Array(readFileSync(output))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  for (const id of sample) {
    it.skipIf(!hasTool('gs'))(`${id} regravado pelo Ghostscript: nenhuma diferença`, { timeout: 30_000 }, async () => {
      const item = corpusCases.find((entry) => entry.id === id)
      const built = await item?.build()
      if (!built) throw new Error(id)
      const result = await compareDocuments({ original: { fileName: 'a.pdf', bytes: built.original }, updated: { fileName: 'b.pdf', bytes: rewrite('gs', built.original) } })
      expect(result.differences.map((difference) => `${difference.category}/${difference.subtype}`)).toEqual([])
    })

    it.skipIf(!hasTool('pdftocairo'))(`${id} regravado pelo Cairo: só a troca real de fonte`, { timeout: 30_000 }, async () => {
      const item = corpusCases.find((entry) => entry.id === id)
      const built = await item?.build()
      if (!built) throw new Error(id)
      const result = await compareDocuments({ original: { fileName: 'a.pdf', bytes: built.original }, updated: { fileName: 'b.pdf', bytes: rewrite('pdftocairo', built.original) } })
      expect(result.differences.filter((difference) => !(difference.category === 'formatting' && difference.subtype === 'font'))).toEqual([])
    })
  }
})
