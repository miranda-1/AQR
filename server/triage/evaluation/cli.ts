import { writeFileSync } from 'node:fs'
import { relatorio } from './report.ts'
import { avaliar } from './run.ts'

/**
 * `npm run triagem:avaliar -- [arquivo.md]`: roda a triagem sobre os conjuntos sintéticos de
 * desenvolvimento e de validação e grava o relatório (padrão: `docs/triagem/avaliacao-e4-e6.md`).
 * Só dados fictícios; nada sai do computador.
 */
const destino = process.argv[2] ?? 'docs/triagem/avaliacao-e4-e6.md'
const avaliacao = await avaliar()
writeFileSync(destino, relatorio(avaliacao))
console.log(`Relatório gravado em ${destino} (${Math.round(avaliacao.duracaoMs / 1000)} s).`)
