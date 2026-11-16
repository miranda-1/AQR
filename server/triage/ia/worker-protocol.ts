import type { OpcoesSimulado } from './provedor.ts'
import type { PedidoSugestoes } from './provedor.ts'

/** Dados da thread da IA: qual provedor criar e o pedido. Nada de bytes de arquivo nesta etapa. */
export interface IaWorkerInput {
  provedor: { tipo: 'simulado'; opcoes: OpcoesSimulado }
  pedido: PedidoSugestoes
}

/** Mensagens da thread: a saída bruta (não confiável) ou só um código técnico de falha. */
export type IaWorkerMessage = { type: 'concluido'; saida: unknown; memoriaMb: number } | { type: 'falhou'; motivo: string }
