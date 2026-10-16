import { writeFileSync } from 'node:fs'
import { corpusCases } from './cases.ts'
import type { CorpusGroup } from './evaluate.ts'
import { runCase, type CaseReport } from './run.ts'

/**
 * `npm run avaliar:corpus [-- --saida docs/comparador/avaliacao-corpus.md]`: roda o corpus inteiro e
 * escreve um relatório por categoria (encontradas, omitidas, classificação errada, localização
 * errada, falsas diferenças, tempo). Sem porcentagem global: cada categoria com os seus números.
 */

const output = process.argv.includes('--saida') ? process.argv[process.argv.indexOf('--saida') + 1] : undefined

const reports: CaseReport[] = []
for (const item of corpusCases) {
  const report = await runCase(item)
  reports.push(report)
  process.stdout.write(`${report.problems.length ? 'FALHA' : 'ok   '} ${item.id} (${report.ms} ms)\n`)
}

const groups = [...new Set(reports.map((report) => report.group))] as CorpusGroup[]
const lines: string[] = []
lines.push('# Avaliação do comparador no corpus sintético', '')
lines.push(`Gerado por \`npm run avaliar:corpus\` em ${new Intl.DateTimeFormat('sv-SE').format(new Date())}. Critérios em \`server/comparison/evaluation/evaluate.ts\`.`, '')
lines.push('## Por categoria', '')
lines.push('| Categoria | Casos | Casos sem problema | Esperadas | Encontradas | Omitidas | Classificação errada | Localização errada | Falsas | Toleradas | Tempo médio |')
lines.push('|---|---|---|---|---|---|---|---|---|---|---|')
for (const group of groups) {
  const items = reports.filter((report) => report.group === group)
  const sum = (pick: (report: CaseReport) => number) => items.reduce((total, report) => total + pick(report), 0)
  const expected = sum((report) => report.outcome.found.length + report.outcome.missed.length + report.outcome.misclassified.length + report.outcome.mislocated.length)
  lines.push(
    `| ${group} | ${items.length} | ${items.filter((report) => report.problems.length === 0).length} | ${expected} | ${sum((report) => report.outcome.found.length)} | ${sum((report) => report.outcome.missed.length)} | ${sum((report) => report.outcome.misclassified.length)} | ${sum((report) => report.outcome.mislocated.length)} | ${sum((report) => report.outcome.falsePositives.length)} | ${sum((report) => report.outcome.tolerated)} | ${Math.round(sum((report) => report.ms) / items.length)} ms |`,
  )
}
lines.push('', '## Por caso', '')
lines.push('| Caso | Categoria | Situação da análise | Resultado | Tempo |')
lines.push('|---|---|---|---|---|')
for (const report of reports) {
  const verdict = report.problems.length === 0 ? 'ok' : report.problems.join('; ').replace(/\|/gu, '/')
  lines.push(`| ${report.id} ${report.title} | ${report.group} | ${report.status} | ${verdict} | ${report.ms} ms |`)
}
const limitations = corpusCases.filter((item) => item.limitation)
if (limitations.length > 0) {
  lines.push('', '## Limitações conhecidas dos casos', '')
  for (const item of limitations) lines.push(`- **${item.id}**: ${item.limitation ?? ''}`)
}
const text = `${lines.join('\n')}\n`
if (output) writeFileSync(output, text)
else process.stdout.write(`\n${text}`)
process.exitCode = reports.some((report) => report.problems.length > 0) ? 1 : 0
