import { writeFileSync } from 'node:fs'
import { loadCatalog } from '../catalog/catalog.ts'
import { casosDeAvaliacao } from './casos.ts'
import { compararEstrategias, resumoIncremental } from './incremental.ts'
import { CATALOGO_DIR } from './run.ts'

/**
 * `npm run triagem:incremental -- [arquivo.md]`: compara o reprocessamento incremental com a
 * execução integral nos quatro conjuntos sintéticos (sem OCR) e grava o relatório.
 */
const destino = process.argv[2] ?? 'docs/triagem/incremental-x-integral.md'
const inicio = Date.now()
const catalogo = await loadCatalog(CATALOGO_DIR)
const casos = await casosDeAvaliacao()
const medidas = await compararEstrategias(casos, catalogo)
writeFileSync(
  destino,
  `# Reprocessamento incremental × execução integral

> Gerado por \`npm run triagem:incremental\`. Não editar à mão. Só pacotes sintéticos (DSD, VAL, IND, NOV), sem OCR.

Para cada pacote, o processo é criado e analisado; depois, em sequência, a completude é confirmada, a condição da regra 028 é confirmada nos dois sentidos e, para cada nome de campo extraído, um valor é corrigido para outro (diverge) e de volta ao valor mais frequente (harmoniza). Cada passo é um reprocessamento.

O serviço sempre roda as 19 regras (execução integral) e grava esse resultado. A coluna "incremental puro erraria" conta os reprocessamentos em que alguma regra **fora** do mapa \`DEPENDENCIAS\` mudou de resultado: a estratégia que só recalcula as regras do mapa teria gravado essa regra desatualizada.

${resumoIncremental(medidas)}
`,
)
console.log(`Relatório gravado em ${destino} (${Math.round((Date.now() - inicio) / 1000)} s, ${medidas.length} reprocessamentos).`)
