import { writeFileSync } from 'node:fs'
import { executarBenchmark, relatorioBenchmark } from './ia-benchmark.ts'

/**
 * `npm run triagem:ia-benchmark -- [arquivo.md]`: benchmark técnico da IA documental (E11.0) nos
 * conjuntos sintéticos, com o provedor SIMULADO. Não mede qualidade de modelo real.
 */
const destino = process.argv[2] ?? 'docs/triagem/avaliacao-ia-e11.0.md'
const inicio = Date.now()
const resultados = await executarBenchmark(['ia1', 'validacao', 'independente', 'novo'])
const notas = [
  'A primeira execução (gabarito IA-1 já congelado e comitado) está preservada sem alteração em `avaliacao-ia-e11.0-primeira-execucao.md`. Ela achou 1 valor incorreto verificado no IA-1 (caso IA1-07: duas áreas no memorial; o valor estava impresso na região, mas era ambíguo).',
  'Depois dela, a verificação passou a recusar valor ambíguo no documento (`valor-ambiguo-no-documento`). O gabarito não mudou. Por ter orientado essa correção, o IA-1 deixou de ser medida independente para a verificação; continua sendo o primeiro registro e um teste de regressão.',
  'Também a partir dela, a extração do motor ignora linhas com cara de instrução ao sistema (caso IA1-10: matrícula plantada numa instrução era lida como campo). Na linha de base do IA-1, o valor errado caiu de 1 para 0; VAL, IND e NOV não mudaram.',
]
writeFileSync(destino, relatorioBenchmark(resultados, Date.now() - inicio, notas))
console.log(`Relatório gravado em ${destino} (${Math.round((Date.now() - inicio) / 1000)} s).`)
