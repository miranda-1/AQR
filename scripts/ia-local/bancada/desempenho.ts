import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { createOcrEngine } from '../../../server/documents/ocr/ocr-engine.ts'
import { avaliarDocumento, documentosDaBancada, type ResultadoPagina } from './bancada.ts'
import { estadoDaMaquina, rssDoRuntimeMb } from './maquina.ts'
import { criarClienteOllama } from './ollama.ts'

/**
 * `npx tsx scripts/ia-local/bancada/desempenho.ts [--rodadas 3]` (E11.3): várias rodadas da bancada
 * sobre o IA-2, SEM cache, separando carregamento do modelo, inferência com texto, inferência com
 * imagem, segunda leitura e verificação, e registrando o estado da máquina em cada rodada (energia,
 * modo de baixo consumo, térmico, pressão de memória, swap, carga), para explicar a variação de
 * latência entre execuções. Antes de cada rodada o modelo é descarregado (carregamento a frio).
 * Grava `docs/triagem/desempenho-ia-e11.3.md`. Pré-requisito: `scripts/ia-local/ollama.sh inferencia`.
 */

const indice = process.argv.indexOf('--rodadas')
const RODADAS = indice >= 0 ? Number(process.argv[indice + 1] ?? 3) : 3
const MODELO = 'qwen3.5:4b-q4_K_M'
const ESTADO = process.env.AQR_IA_ESTADO ?? path.join(homedir(), '.aqr-ia')

const modo = (() => {
  try {
    return readFileSync(path.join(ESTADO, 'modo'), 'utf8').trim()
  } catch {
    return ''
  }
})()
if (modo !== 'inferencia') {
  console.error('Suba o servidor do modelo sem rede: scripts/ia-local/ollama.sh inferencia')
  process.exit(2)
}

const cliente = criarClienteOllama({ endereco: 'http://127.0.0.1:11434', modelo: MODELO, timeoutMs: 180_000 })
await cliente.registrar()
const ocr = (await createOcrEngine()).engine
const documentos = await documentosDaBancada('ia2')

interface Rodada {
  estadoAntes: ReturnType<typeof estadoDaMaquina>
  estadoDepois: ReturnType<typeof estadoDaMaquina>
  paginas: ResultadoPagina[]
  carregamentoFrioMs: number
  picoRssMb: number
  modeloMb: { total: number; gpu: number } | null
  duracaoMs: number
}
const rodadas: Rodada[] = []
for (let r = 1; r <= RODADAS; r += 1) {
  await cliente.descarregar()
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const estadoAntes = estadoDaMaquina()
  let pico = 0
  const amostrador = setInterval(() => {
    pico = Math.max(pico, rssDoRuntimeMb())
  }, 500)
  const inicio = performance.now()
  const paginas: ResultadoPagina[] = []
  try {
    for (const doc of documentos) {
      const resultado = await avaliarDocumento(doc, { cliente, ocr, semente: 7, maxTokens: 400, maxPaginasPorDocumento: 6, segundaLeitura: 'paddle' })
      paginas.push(...resultado.paginas)
    }
  } finally {
    clearInterval(amostrador)
  }
  const memoria = await cliente.memoria()
  rodadas.push({
    estadoAntes,
    estadoDepois: estadoDaMaquina(),
    paginas,
    carregamentoFrioMs: paginas[0]?.runtime?.carregamentoMs ?? 0,
    picoRssMb: pico,
    modeloMb: memoria ? { total: Math.round(memoria.totalBytes / 1024 ** 2), gpu: Math.round(memoria.gpuBytes / 1024 ** 2) } : null,
    duracaoMs: Math.round(performance.now() - inicio),
  })
  console.log(`rodada ${r}: ${Math.round((performance.now() - inicio) / 1000)} s`)
}
await ocr?.close()

const quantil = (valores: number[], q: number) => {
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados.length ? (ordenados[Math.min(ordenados.length - 1, Math.ceil(q * ordenados.length) - 1)] ?? 0) : 0
}
const fmt = (valores: number[]) => (valores.length ? `${quantil(valores, 0.5)} / ${quantil(valores, 0.95)}` : '—')

const l: string[] = ['# Desempenho da IA documental local (E11.3)', '', `> Gerado por \`npx tsx scripts/ia-local/bancada/desempenho.ts --rodadas ${RODADAS}\`. IA-2 (19 páginas, 3 com imagem), sem cache, modelo descarregado antes de cada rodada. Valores em ms, "mediana / p95". Servidor do modelo sem rede, só em 127.0.0.1.`, '']
l.push('## Por rodada', '')
l.push('| Rodada | Energia | Baixo consumo | Térmico (limite de CPU) | Memória livre | Swap | Carga 1 min | Carregamento a frio | Modelo: texto (parede) | Modelo: imagem (parede) | Texto: leitura do prompt / geração (runtime) | Segunda leitura | Verificação | Pico RSS do runtime | Modelo na GPU | Duração |', '|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
rodadas.forEach((rodada, i) => {
  const texto = rodada.paginas.filter((p) => !p.comImagem && p.runtime)
  const imagem = rodada.paginas.filter((p) => p.comImagem && p.runtime)
  // A primeira página inclui o carregamento a frio: fica fora das medianas de inferência.
  const semPrimeira = (lista: ResultadoPagina[]) => lista.filter((p) => p !== rodada.paginas[0])
  const e = rodada.estadoAntes
  l.push(
    `| ${i + 1} | ${e.energia} (${e.cargaBateria}%) | ${e.baixoConsumo} | ${e.termico} → ${rodada.estadoDepois.termico} | ${e.memoriaLivre}% | ${e.swap} | ${e.carga1min} | ${rodada.carregamentoFrioMs} | ${fmt(semPrimeira(texto).map((p) => p.latenciaMs))} | ${fmt(imagem.map((p) => p.latenciaMs))} | ${fmt(semPrimeira(texto).map((p) => p.runtime?.promptMs ?? 0))} / ${fmt(semPrimeira(texto).map((p) => p.runtime?.geracaoMs ?? 0))} | ${fmt(rodada.paginas.flatMap((p) => (p.segundaLeituraMs === null ? [] : [p.segundaLeituraMs])))} | ${fmt(rodada.paginas.map((p) => p.verificacaoMs))} | ${rodada.picoRssMb} MB | ${rodada.modeloMb ? `${rodada.modeloMb.gpu}/${rodada.modeloMb.total} MB` : '?'} | ${Math.round(rodada.duracaoMs / 1000)} s |`,
  )
})
const todasTexto = rodadas.flatMap((r) => r.paginas.filter((p) => !p.comImagem && p.runtime && p !== r.paginas[0]))
const todasImagem = rodadas.flatMap((r) => r.paginas.filter((p) => p.comImagem && p.runtime))
l.push('', '## Todas as rodadas juntas', '')
l.push(`- Inferência com texto (parede): ${fmt(todasTexto.map((p) => p.latenciaMs))}; geração: ${fmt(todasTexto.map((p) => p.runtime?.geracaoMs ?? 0))}; tokens gerados por segundo (mediana): ${quantil(todasTexto.map((p) => (p.runtime?.geracaoMs ? Math.round((p.tokensGerados * 1000) / p.runtime.geracaoMs) : 0)), 0.5)}.`)
l.push(`- Inferência com imagem (parede): ${fmt(todasImagem.map((p) => p.latenciaMs))}.`)
l.push(`- Carregamento a frio do modelo: ${rodadas.map((r) => r.carregamentoFrioMs).join(', ')} ms.`)
l.push('')
writeFileSync(path.resolve('docs/triagem/desempenho-ia-e11.3.md'), `${l.join('\n')}\n`)
console.log(l.join('\n'))
