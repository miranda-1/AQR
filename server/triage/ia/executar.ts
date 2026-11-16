import { createHash } from 'node:crypto'
import { propostaModeloSchema, saidaModeloSchema, type ModeloRegistrado, type SugestaoVerificada } from '../../../shared/contracts/triage-ia.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { montarPedido } from './pedido.ts'
import { criarProvedorSimulado, type OpcoesSimulado } from './provedor.ts'
import { verificarProposta } from './verificacao.ts'
import type { IaWorkerPool } from './worker-pool.ts'

/**
 * Executa o provedor de IA sobre uma análise JÁ CONCLUÍDA pelo motor determinístico e verifica o
 * que voltar. Nunca lança erro: qualquer falha (fila cheia, tempo, memória, saída fora do esquema)
 * vira uma execução registrada com a situação, e a análise determinística segue intacta.
 */

export interface ExecucaoIa {
  modelo: ModeloRegistrado
  situacao: 'concluida' | 'tempo-esgotado' | 'memoria-ou-falha' | 'saida-invalida' | 'indisponivel'
  iniciadaEm: string
  encerradaEm: string
  duracaoMs: number
  propostasRecebidas: number
  propostasInvalidas: number
  propostasDescartadasPorLimite: number
  memoriaMb: number | null
  /** Hash da saída bruta; a saída em si não é guardada (pode conter texto de documento). */
  saidaSha256: string | null
}

export interface ResultadoIa {
  execucao: ExecucaoIa
  sugestoes: SugestaoVerificada[]
}

export interface OpcoesExecucaoIa {
  pool: IaWorkerPool
  provedor: { tipo: 'simulado'; opcoes: OpcoesSimulado }
  limites: { maxPaginas: number; maxPropostas: number }
  agora?: () => Date
  signal?: AbortSignal
}

export async function sugerirParaAnalise(anexos: readonly AnexoTriado[], opcoes: OpcoesExecucaoIa): Promise<ResultadoIa> {
  const agora = opcoes.agora ?? (() => new Date())
  const inicio = agora()
  const modelo = criarProvedorSimulado(opcoes.provedor.opcoes).modelo
  const encerrar = (situacao: ExecucaoIa['situacao'], extra: Partial<ExecucaoIa> = {}): ExecucaoIa => {
    const fim = agora()
    return {
      modelo,
      situacao,
      iniciadaEm: inicio.toISOString(),
      encerradaEm: fim.toISOString(),
      duracaoMs: Math.max(0, fim.getTime() - inicio.getTime()),
      propostasRecebidas: 0,
      propostasInvalidas: 0,
      propostasDescartadasPorLimite: 0,
      memoriaMb: null,
      saidaSha256: null,
      ...extra,
    }
  }

  const pedido = montarPedido(anexos, opcoes.limites)
  if (pedido.anexos.length === 0) return { execucao: encerrar('concluida'), sugestoes: [] }

  let resultado
  try {
    resultado = await opcoes.pool.run({ provedor: opcoes.provedor, pedido }, opcoes.signal)
  } catch {
    return { execucao: encerrar('indisponivel'), sugestoes: [] }
  }
  if (resultado.status === 'tempo-esgotado') return { execucao: encerrar('tempo-esgotado'), sugestoes: [] }
  if (resultado.status === 'memoria-ou-falha') return { execucao: encerrar('memoria-ou-falha'), sugestoes: [] }

  let serializada: string
  try {
    serializada = JSON.stringify(resultado.saida) ?? ''
  } catch {
    serializada = ''
  }
  const saidaSha256 = createHash('sha256').update(serializada).digest('hex')
  const saida = saidaModeloSchema.safeParse(resultado.saida)
  if (!saida.success) return { execucao: encerrar('saida-invalida', { memoriaMb: resultado.memoriaMb, saidaSha256 }), sugestoes: [] }

  const recebidas = saida.data.propostas
  const dentroDoLimite = recebidas.slice(0, opcoes.limites.maxPropostas)
  const sugestoes: SugestaoVerificada[] = []
  let invalidas = 0
  for (const bruta of dentroDoLimite) {
    const proposta = propostaModeloSchema.safeParse(bruta)
    if (!proposta.success) {
      invalidas += 1
      continue
    }
    sugestoes.push(verificarProposta(proposta.data, anexos))
  }
  return {
    execucao: encerrar('concluida', {
      propostasRecebidas: recebidas.length,
      propostasInvalidas: invalidas,
      propostasDescartadasPorLimite: recebidas.length - dentroDoLimite.length,
      memoriaMb: resultado.memoriaMb,
      saidaSha256,
    }),
    sugestoes,
  }
}
