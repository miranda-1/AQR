import type { z } from 'zod'
import type {
  avaliacaoSaidaSchema,
  confirmacaoEntradaSchema,
  novaTriagemSchema,
  revisaoEntradaSchema,
  triagemResumoSchema,
} from '../../../../shared/contracts/triage-api'
import {
  anexosSaidaSchema,
  avaliacoesSaidaSchema,
  camposSaidaSchema,
  listaTriagensSchema,
  reprocessamentoSaidaSchema,
  triagemCriadaSchema,
  triagemDetalheSchema,
  triagemStatusSchema,
} from '../../../../shared/contracts/triage-api'
import type { CampoExtraido, Evidencia } from '../../../../shared/contracts/triage'

/**
 * Tipos da triagem no navegador. São os mesmos contratos zod do servidor
 * (`shared/contracts/triage-api.ts`): o que a API devolve é conferido antes de chegar à tela.
 */

export const schemas = {
  status: triagemStatusSchema,
  lista: listaTriagensSchema,
  criada: triagemCriadaSchema,
  detalhe: triagemDetalheSchema,
  anexos: anexosSaidaSchema,
  avaliacoes: avaliacoesSaidaSchema,
  campos: camposSaidaSchema,
  reprocessamento: reprocessamentoSaidaSchema,
} as const

export type TriagemStatus = z.infer<typeof triagemStatusSchema>
export type TriagemResumo = z.infer<typeof triagemResumoSchema>
export type ListaTriagens = z.infer<typeof listaTriagensSchema>
export type TriagemCriada = z.infer<typeof triagemCriadaSchema>
export type TriagemDetalhe = z.infer<typeof triagemDetalheSchema>
export type AnexosResposta = z.infer<typeof anexosSaidaSchema>
export type AnexoInfo = AnexosResposta['itens'][number]
export type AvaliacoesResposta = z.infer<typeof avaliacoesSaidaSchema>
export type Avaliacao = z.infer<typeof avaliacaoSaidaSchema>
export type CamposResposta = z.infer<typeof camposSaidaSchema>
export type Reprocessamento = z.infer<typeof reprocessamentoSaidaSchema>
export type NovaTriagem = z.input<typeof novaTriagemSchema>
export type ConfirmacaoEntrada = z.input<typeof confirmacaoEntradaSchema>
export type RevisaoEntrada = z.input<typeof revisaoEntradaSchema>
export type Campo = CampoExtraido
export type { Evidencia }

/** Erro da API com status, código estável e mensagem em português (vinda do servidor). */
export class TriagemServiceError extends Error {
  override name = 'TriagemServiceError'
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string> | undefined

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export interface RequestOptions {
  signal?: AbortSignal
}

/** O que a interface pede ao servidor. Nenhum método decide nem altera resultado de regra. */
export interface TriagemService {
  status(options?: RequestOptions): Promise<TriagemStatus>
  listar(options?: RequestOptions): Promise<ListaTriagens>
  criar(dados: NovaTriagem, arquivos: readonly File[], chaveIdempotencia: string): Promise<TriagemCriada>
  detalhe(id: string, options?: RequestOptions): Promise<TriagemDetalhe>
  anexos(id: string, analise?: number, options?: RequestOptions): Promise<AnexosResposta>
  avaliacoes(id: string, analise?: number, options?: RequestOptions): Promise<AvaliacoesResposta>
  campos(id: string, analise?: number, options?: RequestOptions): Promise<CamposResposta>
  /** Conteúdo sintético do anexo (autenticado). 404 quando não guardado ou expurgado. */
  conteudo(id: string, anexoId: string, options?: RequestOptions): Promise<Blob>
  confirmar(id: string, entrada: ConfirmacaoEntrada): Promise<{ triagem: TriagemResumo }>
  revisar(id: string, entrada: RevisaoEntrada): Promise<{ triagem: TriagemResumo; revisaoId: string }>
  reprocessar(id: string, versaoEsperada: number): Promise<Reprocessamento>
}
