import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PROMPT_SHA256, TAREFA_VERSAO, ESQUEMA_JSON_SAIDA } from './tarefa.ts'

/**
 * Manifesto de congelamento da comparação de modelos (E11.4): o que precisa ser idêntico para os
 * dois modelos e durante todas as rodadas. A comparação recusa rodar se qualquer item divergir do
 * manifesto comitado antes do experimento (`docs/triagem/e11.4-manifesto.json`).
 */

const RAIZ = path.resolve(import.meta.dirname, '../../..')

export const ARQUIVOS_VERIFICADOR = [
  'server/triage/ia/verificacao.ts',
  'server/triage/ia/verificacao-reforcada.ts',
  'server/triage/ia/verificacao-classe.ts',
  'server/triage/ia/dirigida-a-maquina.ts',
  'server/triage/reading/instrucoes.ts',
] as const

export const ARQUIVOS_BANCADA = [
  'scripts/ia-local/bancada/tarefa.ts',
  'scripts/ia-local/bancada/bancada.ts',
  'scripts/ia-local/bancada/ollama.ts',
  'scripts/ia-local/ocr/segunda-leitura.ts',
  'scripts/ia-local/ocr/paddle-ocr.py',
  'scripts/ia-local/sem-rede.sb',
  'scripts/ia-local/ollama.sh',
] as const

export const GABARITOS = ['ia1', 'ia2', 'ia3', 'ia4'].map((c) => `docs/triagem/casos/${c}-gabarito.json`)

export const MODELOS = { A: 'qwen3.5:4b-q4_K_M', B: 'qwen3-vl:4b-instruct-q4_K_M' } as const

/** Configuração de inferência idêntica para os dois modelos. */
export const CONFIGURACAO = {
  temperatura: 0,
  semente: 7,
  maxTokens: 400,
  contexto: 8192,
  think: false,
  formato: 'esquema JSON (decodificação restrita)',
  imagemPaginaPx: 1100,
  segundaLeitura: 'paddle (PP-OCRv5 latino), 1700 px',
  maxPaginasPorDocumento: 6,
  paralelo: 1,
} as const

const sha = (arquivo: string) => createHash('sha256').update(readFileSync(path.join(RAIZ, arquivo))).digest('hex')

export interface Manifesto {
  versao: 'e11.4@1'
  verificador: Record<string, string>
  bancada: Record<string, string>
  gabaritos: Record<string, string>
  prompt: { tarefa: string; sha256: string; esquemaSha256: string }
  modelos: Record<'A' | 'B', { nome: string; manifestoSha256: string }>
  configuracao: typeof CONFIGURACAO
}

export function calcularManifesto(modelos: Record<'A' | 'B', string>): Manifesto {
  return {
    versao: 'e11.4@1',
    verificador: Object.fromEntries(ARQUIVOS_VERIFICADOR.map((a) => [a, sha(a)])),
    bancada: Object.fromEntries(ARQUIVOS_BANCADA.map((a) => [a, sha(a)])),
    gabaritos: Object.fromEntries(GABARITOS.map((a) => [a, sha(a)])),
    prompt: { tarefa: TAREFA_VERSAO, sha256: PROMPT_SHA256, esquemaSha256: createHash('sha256').update(JSON.stringify(ESQUEMA_JSON_SAIDA)).digest('hex') },
    modelos: { A: { nome: MODELOS.A, manifestoSha256: modelos.A }, B: { nome: MODELOS.B, manifestoSha256: modelos.B } },
    configuracao: CONFIGURACAO,
  }
}

/** Diferenças entre o manifesto gravado e o estado atual (vazio = congelado). */
export function divergencias(gravado: Manifesto, atual: Manifesto): string[] {
  const lista: string[] = []
  const comparar = (prefixo: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) lista.push(prefixo)
  }
  for (const grupo of ['verificador', 'bancada', 'gabaritos'] as const) {
    for (const arquivo of new Set([...Object.keys(gravado[grupo]), ...Object.keys(atual[grupo])])) comparar(`${grupo}: ${arquivo}`, gravado[grupo][arquivo], atual[grupo][arquivo])
  }
  comparar('prompt', gravado.prompt, atual.prompt)
  comparar('modelos', gravado.modelos, atual.modelos)
  comparar('configuração', gravado.configuracao, atual.configuracao)
  return lista
}

/** Código do servidor (motor, leitura, verificação) sem alteração local em relação ao commit. */
export function arvoreLimpa(): boolean {
  const saida = execFileSync('git', ['status', '--porcelain', '--', 'server', 'shared', 'scripts/ia-local', 'docs/triagem/casos'], { cwd: RAIZ, encoding: 'utf8' })
  return saida.trim() === ''
}

export const commitAtual = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim()
