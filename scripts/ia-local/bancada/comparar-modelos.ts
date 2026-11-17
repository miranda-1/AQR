import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { createOcrEngine } from '../../../server/documents/ocr/ocr-engine.ts'
import { avaliarDocumento, documentosDaBancada, type ConjuntoBancada, type ResultadoDocumento } from './bancada.ts'
import { estadoDaMaquina, rssDoRuntimeMb, type EstadoDaMaquina } from './maquina.ts'
import { arvoreLimpa, calcularManifesto, commitAtual, CONFIGURACAO, divergencias, MODELOS, type Manifesto } from './manifesto.ts'
import { criarClienteOllama } from './ollama.ts'

/**
 * Comparação de modelos (E11.4), fora do servidor.
 *
 *   npx tsx scripts/ia-local/bancada/comparar-modelos.ts --congelar     grava o manifesto (antes)
 *   npx tsx scripts/ia-local/bancada/comparar-modelos.ts --rodadas 3    executa (servidor sem rede)
 *
 * Os dois modelos recebem os mesmos documentos, linhas, imagens, prompt, esquema, configuração e
 * verificação. Cada rodada alterna a ordem (A→B, B→A, …); antes de cada passada todos os modelos são
 * descarregados (carregamento a frio). Sem cache: toda resposta é gerada na hora. Os resultados por
 * rodada e modelo (só categorias, tempos e memória; nenhum texto de documento) vão para
 * `~/.aqr-ia/resultados/e11.4/`; o relatório sai de `relatorio-comparacao.ts`.
 */

const ESTADO = process.env.AQR_IA_ESTADO ?? path.join(homedir(), '.aqr-ia')
/** `--amostra`: teste da ferramenta (1 documento por conjunto, 1 rodada), FORA do experimento e sem conferir o manifesto. */
const AMOSTRA = process.argv.includes('--amostra')
/** `--exploratorio`: 1 rodada a partir das respostas cruas gravadas na comparação principal, com tolerância de formato de linha (igual para os dois modelos). */
const EXPLORATORIO = process.argv.includes('--exploratorio')
const SAIDA = path.join(ESTADO, 'resultados', AMOSTRA ? 'e11.4-amostra' : EXPLORATORIO ? 'e11.4-exploratorio' : 'e11.4')
const CACHE = path.join(ESTADO, 'cache', AMOSTRA ? 'e11.4-amostra' : 'e11.4')
const MANIFESTO = path.resolve('docs/triagem/e11.4-manifesto.json')
const CONJUNTOS: ConjuntoBancada[] = ['ia1', 'ia2', 'ia3', 'ia4']

export interface Execucao {
  modelo: 'A' | 'B'
  nome: string
  rodada: number
  posicaoNaRodada: number
  commit: string
  estadoAntes: EstadoDaMaquina
  estadoDepois: EstadoDaMaquina
  picoRssMb: number
  memoriaModelo: { totalMb: number; gpuMb: number } | null
  duracaoMs: number
  resultados: ResultadoDocumento[]
}

const argumento = (nome: string) => {
  const i = process.argv.indexOf(`--${nome}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function servidorSemRede(): boolean {
  try {
    return readFileSync(path.join(ESTADO, 'modo'), 'utf8').trim() === 'inferencia'
  } catch {
    return false
  }
}

if (!servidorSemRede()) {
  console.error('Suba o servidor do modelo sem rede: scripts/ia-local/ollama.sh inferencia')
  process.exit(2)
}

const clientes = { A: criarClienteOllama({ endereco: 'http://127.0.0.1:11434', modelo: MODELOS.A, timeoutMs: 240_000 }), B: criarClienteOllama({ endereco: 'http://127.0.0.1:11434', modelo: MODELOS.B, timeoutMs: 240_000 }) }
const registros = { A: await clientes.A.registrar(), B: await clientes.B.registrar() }
const atual: Manifesto = calcularManifesto({ A: registros.A.manifestoSha256, B: registros.B.manifestoSha256 })

if (process.argv.includes('--congelar')) {
  writeFileSync(MANIFESTO, `${JSON.stringify({ ...atual, registro: { A: registros.A, B: registros.B } }, null, 2)}\n`)
  console.log(`Manifesto gravado em ${path.relative(process.cwd(), MANIFESTO)}. Comite-o antes de executar a comparação.`)
  process.exit(0)
}

if (!AMOSTRA && !existsSync(MANIFESTO)) {
  console.error('Manifesto ausente: rode com --congelar e comite antes.')
  process.exit(2)
}
const gravado = AMOSTRA ? atual : (JSON.parse(readFileSync(MANIFESTO, 'utf8')) as Manifesto)
const diferencas = divergencias(gravado, atual)
if (!AMOSTRA && (diferencas.length > 0 || !arvoreLimpa())) {
  console.error(`Experimento não congelado. Divergências: ${diferencas.join('; ') || 'alterações locais não comitadas em server/, shared/, scripts/ia-local ou gabaritos'}`)
  process.exit(2)
}

const rodadas = AMOSTRA || EXPLORATORIO ? 1 : Number(argumento('rodadas') ?? 3)
const commit = commitAtual()
mkdirSync(SAIDA, { recursive: true, mode: 0o700 })
const ocr = (await createOcrEngine()).engine
const documentos = Object.fromEntries(await Promise.all(CONJUNTOS.map(async (c) => [c, (await documentosDaBancada(c)).slice(0, AMOSTRA ? 1 : undefined)] as const))) as Record<ConjuntoBancada, Awaited<ReturnType<typeof documentosDaBancada>>>

for (let rodada = 1; rodada <= rodadas; rodada += 1) {
  const ordem: ('A' | 'B')[] = rodada % 2 === 1 ? ['A', 'B'] : ['B', 'A']
  for (const [posicao, modelo] of ordem.entries()) {
    await clientes.A.descarregar()
    await clientes.B.descarregar()
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const estadoAntes = estadoDaMaquina()
    let pico = 0
    const amostrador = setInterval(() => {
      pico = Math.max(pico, rssDoRuntimeMb())
    }, 500)
    const inicio = performance.now()
    const resultados: ResultadoDocumento[] = []
    try {
      for (const conjunto of CONJUNTOS) {
        for (const doc of documentos[conjunto]) {
          resultados.push(await avaliarDocumento(doc, { cliente: clientes[modelo], ocr, semente: CONFIGURACAO.semente, maxTokens: CONFIGURACAO.maxTokens, maxPaginasPorDocumento: CONFIGURACAO.maxPaginasPorDocumento, segundaLeitura: 'paddle', cache: { dir: CACHE, manifestoSha256: registros[modelo].manifestoSha256, modo: EXPLORATORIO ? 'ler-e-gravar' : 'so-gravar' }, ...(EXPLORATORIO ? { tolerarFormatoDeLinha: true } : {}) }))
        }
      }
    } finally {
      clearInterval(amostrador)
    }
    const memoria = await clientes[modelo].memoria()
    const execucao: Execucao = {
      modelo,
      nome: MODELOS[modelo],
      rodada,
      posicaoNaRodada: posicao + 1,
      commit,
      estadoAntes,
      estadoDepois: estadoDaMaquina(),
      picoRssMb: pico,
      memoriaModelo: memoria ? { totalMb: Math.round(memoria.totalBytes / 1024 ** 2), gpuMb: Math.round(memoria.gpuBytes / 1024 ** 2) } : null,
      duracaoMs: Math.round(performance.now() - inicio),
      resultados,
    }
    writeFileSync(path.join(SAIDA, `rodada-${rodada}-${modelo}.json`), JSON.stringify(execucao), { mode: 0o600 })
    console.log(`rodada ${rodada}, modelo ${modelo} (${MODELOS[modelo]}): ${Math.round(execucao.duracaoMs / 1000)} s`)
  }
}
await ocr?.close()
