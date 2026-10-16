import { writeFileSync } from 'node:fs'
import { compareDocuments, type TimingStage } from '../compare-documents.ts'
import { defaultComparisonLimits } from '../limits.ts'
import { buildPdf, type Block, type PageSpec } from './corpus-pdf.ts'

/**
 * `npm run medir:desempenho [-- --paginas 10,50,100 --saida docs/comparador/desempenho.md]`
 *
 * Mede a comparação com documentos sintéticos de vários tamanhos, em três cenários:
 * - idênticos: o melhor caso (páginas com a mesma prévia não são redesenhadas);
 * - edições: três palavras alteradas e uma imagem trocada (caso típico);
 * - diagramação: fonte 11 → 10,5 pt no documento todo (pior caso: todas as páginas mudam de
 *   aparência e o texto reflui).
 * Registra tempo total, tempo por etapa, pico de memória do processo e a situação da análise
 * (se o orçamento de tempo esgotou, a comparação visual fica parcial — e isso é relatado).
 */

const argument = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined)
const sizes = (argument('--paginas') ?? '10,50,100').split(',').map(Number).filter((value) => value > 0)
const output = argument('--saida')
const scenarios = (argument('--cenarios') ?? 'idênticos,edições,diagramação').split(',') as ('idênticos' | 'edições' | 'diagramação')[]

function documentPages(count: number, options: { fontSize: number; edits: boolean }): PageSpec[] {
  return Array.from({ length: count }, (_, page) => {
    const blocks: Block[] = Array.from({ length: 10 }, (_, line) => {
      let text = `Item ${page + 1}.${line + 1} O requerente apresentará o comprovante número ${page * 100 + line} à secretaria no prazo de 30 dias.`
      if (options.edits && line === 3 && [Math.floor(count / 4), Math.floor(count / 2), count - 1].includes(page)) text = text.replace('apresentará', 'entregará')
      return { kind: 'text', x: 72, text, size: options.fontSize, width: 450, gap: 6 }
    })
    if (page % 10 === 0) {
      const variant = options.edits && page === 0 ? 3 : 0
      blocks.push({ kind: 'image', x: 360, y: 640, width: 160, height: 110, picture: { kind: 'chart', variant } })
    }
    return { blocks }
  })
}

interface Measure {
  pages: number
  scenario: string
  ms: number
  stages: Partial<Record<TimingStage, number>>
  peakMb: number
  status: string
  differences: number
  warnings: string
}

async function measure(pages: number, scenario: 'idênticos' | 'edições' | 'diagramação'): Promise<Measure> {
  const original = await buildPdf(documentPages(pages, { fontSize: 11, edits: false }))
  const updated =
    scenario === 'idênticos'
      ? original
      : await buildPdf(documentPages(pages, { fontSize: scenario === 'diagramação' ? 10.5 : 11, edits: scenario === 'edições' }))
  global.gc?.()
  const base = process.memoryUsage().rss
  let peak = base
  const sampler = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss)
  }, 25)
  const stages: Partial<Record<TimingStage, number>> = {}
  const started = performance.now()
  const result = await compareDocuments(
    { original: { fileName: 'a.pdf', bytes: original.bytes }, updated: { fileName: 'b.pdf', bytes: updated.bytes } },
    { limits: defaultComparisonLimits, onTiming: (stage, ms) => (stages[stage] = ms) },
  )
  const ms = Math.round(performance.now() - started)
  clearInterval(sampler)
  peak = Math.max(peak, process.memoryUsage().rss)
  return {
    pages,
    scenario,
    ms,
    stages,
    peakMb: Math.round((peak - base) / (1024 * 1024)),
    status: result.analysis.status,
    differences: result.differences.length,
    warnings: result.analysis.warnings.filter((warning) => warning.severity !== 'info').map((warning) => warning.code).join(', ') || '—',
  }
}

const rows: Measure[] = []
for (const pages of sizes) {
  for (const scenario of scenarios) {
    const row = await measure(pages, scenario)
    rows.push(row)
    process.stdout.write(`${pages} páginas, ${scenario}: ${row.ms} ms, +${row.peakMb} MB, ${row.status}, ${row.differences} diferenças\n`)
  }
}

const stageNames: TimingStage[] = ['exame', 'ocr', 'correspondencia', 'texto', 'visual', 'organizacao']
const lines = [
  '# Desempenho da comparação',
  '',
  `Medido por \`npm run medir:desempenho\` em ${new Intl.DateTimeFormat('sv-SE').format(new Date())}, num só processo (sem a thread do servidor), com os limites padrão (orçamento de ${defaultComparisonLimits.softBudgetMs / 1000} s). Memória: aumento do RSS do processo no pico (inclui o pdf.js e o canvas nativo).`,
  '',
  `| Páginas | Cenário | Total | ${stageNames.join(' | ')} | Pico de memória | Situação | Diferenças | Ressalvas |`,
  `|---|---|---|${stageNames.map(() => '---').join('|')}|---|---|---|---|`,
  ...rows.map(
    (row) =>
      `| ${row.pages} | ${row.scenario} | ${(row.ms / 1000).toFixed(1)} s | ${stageNames.map((stage) => `${((row.stages[stage] ?? 0) / 1000).toFixed(1)} s`).join(' | ')} | +${row.peakMb} MB | ${row.status} | ${row.differences} | ${row.warnings} |`,
  ),
  '',
]
if (output) writeFileSync(output, lines.join('\n'))
else process.stdout.write(`\n${lines.join('\n')}`)
