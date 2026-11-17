import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, totalmem } from 'node:os'
import path from 'node:path'
import { createOcrEngine } from '../../../server/documents/ocr/ocr-engine.ts'
import { avaliarDocumento, documentosDaBancada, type ConjuntoBancada, type ResultadoDocumento } from './bancada.ts'
import { criarClienteOllama, ErroOllama } from './ollama.ts'
import { relatorioQwen, type Estabilidade } from './relatorio.ts'
import { ESQUEMA_JSON_SAIDA, PROMPT_SISTEMA, saidaPaginaSchema } from './tarefa.ts'

/**
 * `npm run triagem:ia-qwen -- [--modo e11.1|desenvolvimento|final] [--modelo qwen3.5:4b-q4_K_M]`
 *
 * Bancada da IA documental com o modelo local. Pré-requisito: `scripts/ia-local/ollama.sh inferencia`
 * (servidor do modelo em 127.0.0.1, sem rede). Modos:
 * - `e11.1`: IA-2 e IA-1, como na E11.1 (a primeira execução sobre o IA-2 nunca é reescrita);
 * - `desenvolvimento` (E11.3): IA-2 e IA-1, com segunda leitura (PaddleOCR) e CACHE local das
 *   respostas do modelo, para iterar na verificação → `avaliacao-ia-e11.3-desenvolvimento.md`;
 * - `final` (E11.3): IA-3, SEM cache, com segunda leitura; grava
 *   `avaliacao-ia-e11.3-final-ia3.md` uma única vez (recusa reescrever).
 *
 * Imprime só o andamento (documento, página, situação, tempo), nunca texto de documento ou resposta.
 */

function argumento(nome: string, padrao: string): string {
  const indice = process.argv.indexOf(`--${nome}`)
  return indice >= 0 ? (process.argv[indice + 1] ?? padrao) : padrao
}

const MODELO = argumento('modelo', 'qwen3.5:4b-q4_K_M')
const MODO = argumento('modo', 'e11.1')
if (!['e11.1', 'desenvolvimento', 'final'].includes(MODO)) {
  console.error('Modo desconhecido. Use e11.1, desenvolvimento ou final.')
  process.exit(2)
}
const CONJUNTOS: ConjuntoBancada[] = MODO === 'final' ? ['ia3'] : ['ia2', 'ia1']
const ENDERECO = 'http://127.0.0.1:11434'
const SEMENTE = 7
const MAX_TOKENS = 400
const ESTADO = process.env.AQR_IA_ESTADO ?? path.join(homedir(), '.aqr-ia')
const DOCS = path.resolve('docs/triagem')

/** O servidor do modelo foi iniciado pelo script no modo sem rede, e é ele que está escutando? */
function servidorSemRede(): boolean {
  try {
    const modo = readFileSync(path.join(ESTADO, 'modo'), 'utf8').trim()
    const pid = readFileSync(path.join(ESTADO, 'ollama.pid'), 'utf8').trim()
    const escutando = execFileSync('lsof', ['-nP', '-iTCP:11434', '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).trim().split('\n')
    return modo === 'inferencia' && escutando.includes(pid)
  } catch {
    return false
  }
}

/** Soma da memória residente dos processos do runtime (servidor e executor do modelo), em MB. */
function rssDoRuntimeMb(): number {
  const saida = execFileSync('ps', ['-axo', 'rss=,comm='], { encoding: 'utf8' })
  let kb = 0
  for (const linha of saida.split('\n')) {
    const [rss, ...comando] = linha.trim().split(/\s+/u)
    if (comando.join(' ').includes('ollama')) kb += Number(rss) || 0
  }
  return Math.round(kb / 1024)
}

const semRede = servidorSemRede()
if (!semRede && process.env.AQR_IA_PERMITIR_REDE !== '1') {
  console.error('O servidor do modelo não está no modo sem rede. Rode: scripts/ia-local/ollama.sh inferencia')
  process.exit(2)
}

const FINAL = path.join(DOCS, 'avaliacao-ia-e11.3-final-ia3.md')
if (MODO === 'final' && existsSync(FINAL)) {
  console.error('A avaliação final no IA-3 já foi feita e não é reescrita.')
  process.exit(2)
}

const cliente = criarClienteOllama({ endereco: ENDERECO, modelo: MODELO, timeoutMs: 180_000 })
const modelo = await cliente.registrar()
const ocr = (await createOcrEngine()).engine
let picoRss = 0
const amostrador = setInterval(() => {
  picoRss = Math.max(picoRss, rssDoRuntimeMb())
}, 500)

const inicio = performance.now()
const resultados: ResultadoDocumento[] = []
try {
  for (const conjunto of CONJUNTOS) {
    for (const doc of await documentosDaBancada(conjunto)) {
      resultados.push(
        await avaliarDocumento(doc, {
          cliente,
          ocr,
          semente: SEMENTE,
          maxTokens: MAX_TOKENS,
          maxPaginasPorDocumento: 6,
          ...(MODO === 'e11.1' ? {} : { segundaLeitura: 'paddle' as const }),
          ...(MODO === 'desenvolvimento' ? { cache: { dir: path.join(ESTADO, 'cache', 'respostas'), manifestoSha256: modelo.manifestoSha256 } } : {}),
          aoTerminarPagina: (id, pagina, r) => console.log(`${id} p.${pagina}: ${r.situacao} em ${r.latenciaMs} ms${r.comImagem ? ' (com imagem)' : ''}`),
        }),
      )
    }
  }
} finally {
  clearInterval(amostrador)
}
const memoriaRuntime = await cliente.memoria()
const duracao = performance.now() - inicio

// ---------- estabilidade depois de falhas ----------
const estabilidade: Estabilidade[] = []
const pedidoCurto = async (c = cliente, maxTokens = MAX_TOKENS) =>
  c.conversar([{ role: 'system', content: PROMPT_SISTEMA }, { role: 'user', content: 'Página 1 de 1.\nLinhas lidas pelo AQR:\nL1: MEMORIAL DESCRITIVO\nL2: Área do lote: 300,00 m²' }], ESQUEMA_JSON_SAIDA, { semente: SEMENTE, maxTokens })
const respondeDepois = async () => {
  try {
    return saidaPaginaSchema.safeParse(JSON.parse((await pedidoCurto()).conteudo)).success ? 'responde e passa no esquema' : 'responde fora do esquema'
  } catch (erro) {
    return `falha: ${erro instanceof ErroOllama ? erro.situacao : 'erro'}`
  }
}

try {
  criarClienteOllama({ endereco: 'http://10.0.0.1:11434', modelo: MODELO, timeoutMs: 1000 })
  estabilidade.push({ descricao: 'Cliente apontado para endereço fora do loopback', esperado: 'recusado antes de conectar', obtido: 'aceito', ok: false })
} catch (erro) {
  estabilidade.push({ descricao: 'Cliente apontado para endereço fora do loopback', esperado: 'recusado antes de conectar', obtido: erro instanceof ErroOllama ? erro.situacao : 'erro', ok: erro instanceof ErroOllama && erro.situacao === 'endereco-recusado' })
}

{
  const apressado = criarClienteOllama({ endereco: ENDERECO, modelo: MODELO, timeoutMs: 30 })
  let obtido = 'respondeu'
  try {
    await pedidoCurto(apressado)
  } catch (erro) {
    obtido = erro instanceof ErroOllama ? erro.situacao : 'erro'
  }
  const depois = await respondeDepois()
  estabilidade.push({ descricao: 'Pedido com tempo máximo de 30 ms', esperado: 'tempo-esgotado; o pedido seguinte funciona', obtido: `${obtido}; depois: ${depois}`, ok: obtido === 'tempo-esgotado' && depois === 'responde e passa no esquema' })
}

{
  let obtido = 'não validou'
  try {
    const resposta = await pedidoCurto(cliente, 4)
    let bruto: unknown = null
    try {
      bruto = JSON.parse(resposta.conteudo)
    } catch {
      bruto = null
    }
    obtido = saidaPaginaSchema.safeParse(bruto).success ? 'passou no esquema' : 'recusada pelo esquema'
  } catch (erro) {
    obtido = erro instanceof ErroOllama ? erro.situacao : 'erro'
  }
  const depois = await respondeDepois()
  estabilidade.push({ descricao: 'Resposta cortada (limite de 4 tokens)', esperado: 'recusada pelo esquema; o pedido seguinte funciona', obtido: `${obtido}; depois: ${depois}`, ok: obtido === 'recusada pelo esquema' && depois === 'responde e passa no esquema' })
}

{
  // O executor do modelo morre no meio de um pedido (como num estouro de memória).
  const pedido = pedidoCurto().then(
    () => 'respondeu',
    (erro: unknown) => (erro instanceof ErroOllama ? erro.situacao : 'erro'),
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  let morto = false
  try {
    execFileSync('pkill', ['-f', 'lib/ollama/llama-server'])
    morto = true
  } catch {
    morto = false
  }
  const obtido = await pedido
  const depois = await respondeDepois()
  estabilidade.push({ descricao: 'Executor do modelo encerrado no meio do pedido', esperado: 'pedido falha sem derrubar a bancada; o seguinte funciona', obtido: `${morto ? 'executor encerrado' : 'executor não encontrado'}; pedido: ${obtido}; depois: ${depois}`, ok: morto && depois === 'responde e passa no esquema' })
}

await ocr?.close()

const ambiente = {
  sistema: `macOS ${execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim()}`,
  hardware: execFileSync('sysctl', ['-n', 'machdep.cpu.brand_string'], { encoding: 'utf8' }).trim(),
  memoriaGb: Math.round(totalmem() / 1024 ** 3),
  node: process.version,
  semRede,
  modelo,
  semente: SEMENTE,
  maxTokens: MAX_TOKENS,
}
const memoria = {
  picoRssProcessoMb: picoRss || null,
  runtimeTotalMb: memoriaRuntime ? Math.round(memoriaRuntime.totalBytes / 1024 ** 2) : null,
  runtimeGpuMb: memoriaRuntime ? Math.round(memoriaRuntime.gpuBytes / 1024 ** 2) : null,
}
const primeira = path.join(DOCS, 'avaliacao-ia-e11.1-qwen-primeira-execucao.md')
let destino: string
let notas: string[]
if (MODO === 'final') {
  destino = FINAL
  notas = ['**Avaliação final da E11.3 no IA-3**: conjunto congelado antes da verificação reforçada e não usado para desenvolvê-la; respostas do modelo geradas agora, sem cache. Executada uma única vez; este arquivo não deve ser reescrito.']
} else if (MODO === 'desenvolvimento') {
  destino = path.join(DOCS, 'avaliacao-ia-e11.3-desenvolvimento.md')
  notas = ['**Resultados de DESENVOLVIMENTO da E11.3** (IA-1 e IA-2 orientaram o diagnóstico e a verificação reforçada): não são medida independente. A avaliação final está em `avaliacao-ia-e11.3-final-ia3.md`.']
} else {
  destino = CONJUNTOS.includes('ia2') && !existsSync(primeira) ? primeira : path.join(DOCS, 'avaliacao-ia-e11.1-qwen.md')
  notas = destino === primeira ? ['**Primeira execução de um modelo real sobre o IA-2** (gabarito congelado antes). Este arquivo não deve ser reescrito.'] : ['Execução posterior à primeira; a primeira está preservada em `avaliacao-ia-e11.1-qwen-primeira-execucao.md`.']
}
writeFileSync(destino, relatorioQwen(resultados, ambiente, memoria, estabilidade, duracao, notas))
console.log(`Relatório gravado em ${path.relative(process.cwd(), destino)} (${Math.round(duracao / 1000)} s).`)
