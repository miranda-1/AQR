import { z } from 'zod'
import {
  campoExtraidoSchema,
  classificacaoSchema,
  condicaoIdSchema,
  etapaSchema,
  evidenciaSchema,
  fonteRegraSchema,
  modalidadeSchema,
  resultadoRegraSchema,
  severidades,
  tiposAchado,
} from './triage.ts'

/**
 * Contratos da API de triagem documental experimental (E8). Entrada e saída validadas com zod no
 * servidor. Não há campo nem rota de decisão administrativa: a API registra verificações técnicas,
 * confirmações de servidor e revisões humanas, nada mais (AQR-GCA-040).
 */

const id = z.string().min(1).max(200)
const instante = z.iso.datetime()
const versao = z.number().int().min(1)

// ---------- entrada ----------

/** Campo `metadados` (JSON) do envio multipart. */
export const novaTriagemSchema = z.strictObject({
  referencia: z.string().trim().min(1).max(100).nullable().default(null),
  protocoladoEm: instante,
  modalidade: modalidadeSchema,
  etapa: etapaSchema,
})
export type NovaTriagemEntrada = z.infer<typeof novaTriagemSchema>

const justificativa = z.string().max(2000)

export const confirmacaoEntradaSchema = z.discriminatedUnion('tipo', [
  z.strictObject({ versaoEsperada: versao, tipo: z.literal('modalidade'), valor: modalidadeSchema, justificativa: justificativa.default('') }),
  z.strictObject({ versaoEsperada: versao, tipo: z.literal('etapa'), valor: etapaSchema, justificativa: justificativa.default('') }),
  z.strictObject({ versaoEsperada: versao, tipo: z.literal('integridade'), valor: z.enum(['completo', 'parcial', 'desconhecida']), justificativa: justificativa.min(5) }),
  z.strictObject({ versaoEsperada: versao, tipo: z.literal('condicao'), condicao: condicaoIdSchema, valor: z.boolean(), justificativa: justificativa.default('') }),
])
export type ConfirmacaoEntrada = z.infer<typeof confirmacaoEntradaSchema>

export const revisaoEntradaSchema = z.discriminatedUnion('decisao', [
  z.strictObject({ versaoEsperada: versao, decisao: z.literal('confirmado'), regraId: z.string().regex(/^AQR-GCA-\d{3}$/u), justificativa: justificativa.default('') }),
  z.strictObject({ versaoEsperada: versao, decisao: z.literal('encaminhado'), regraId: z.string().regex(/^AQR-GCA-\d{3}$/u), justificativa: justificativa.default('') }),
  z.strictObject({ versaoEsperada: versao, decisao: z.literal('descartado'), regraId: z.string().regex(/^AQR-GCA-\d{3}$/u), justificativa: justificativa.min(5) }),
  z.strictObject({ versaoEsperada: versao, decisao: z.literal('corrigido'), campoId: id, novoValor: z.string().trim().min(1).max(500), justificativa: justificativa.min(5) }),
])
export type RevisaoEntrada = z.infer<typeof revisaoEntradaSchema>

export const reprocessarEntradaSchema = z.strictObject({ versaoEsperada: versao })

export const listaTriagensQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
})

export const analiseQuerySchema = z.strictObject({ analise: z.coerce.number().int().min(1).optional() })

// ---------- saída ----------

export const situacoesTriagemApi = ['recebido', 'processando', 'aguardando-revisao', 'revisado', 'falhou'] as const

export const triagemResumoSchema = z.strictObject({
  id,
  referencia: z.string().nullable(),
  modo: z.literal('experimental-sintetico'),
  situacao: z.enum(situacoesTriagemApi),
  versao,
  analiseAtual: z.number().int().nullable(),
  protocoladoEm: instante,
  criadaEm: instante,
  atualizadaEm: instante,
  retencaoAte: instante,
  criadaPorMim: z.boolean(),
})
export type TriagemResumo = z.infer<typeof triagemResumoSchema>

export const listaTriagensSchema = z.strictObject({ itens: z.array(triagemResumoSchema), total: z.number().int().min(0) })

const enquadramentoSchema = <T extends z.ZodType>(valor: T) =>
  z.strictObject({ valor: z.union([valor, z.literal('indeterminado')]), origem: z.enum(['declarado', 'proposto-sistema', 'confirmado-servidor']), confirmadoPor: z.string().optional(), confirmadoEm: z.string().optional() })

export const analiseResumoSchema = z.strictObject({
  numero: z.number().int().min(1),
  motivo: z.enum(['inicial', 'reprocessamento', 'retomada']),
  situacao: z.enum(['processando', 'concluida', 'falhou', 'interrompida']),
  motorVersao: z.string(),
  catalogo: z.strictObject({ versao: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/u) }),
  anexosSha256: z.array(z.string().regex(/^[0-9a-f]{64}$/u)),
  baseAnalise: z.number().int().nullable(),
  iniciadaEm: instante,
  encerradaEm: instante.nullable(),
  falha: z.string().nullable(),
})

export const confirmacaoSaidaSchema = z.strictObject({
  id,
  tipo: z.enum(['modalidade', 'etapa', 'integridade', 'condicao']),
  chave: z.string(),
  valor: z.union([z.string(), z.boolean()]),
  justificativa: z.string(),
  autor: z.string(),
  em: instante,
})

export const revisaoSaidaSchema = z.strictObject({
  id,
  analise: z.number().int(),
  regraId: z.string().nullable(),
  campoId: z.string().nullable(),
  decisao: z.enum(['confirmado', 'descartado', 'corrigido', 'encaminhado']),
  justificativa: z.string(),
  correcao: z.strictObject({ anterior: z.string().nullable(), novo: z.string() }).nullable(),
  revisor: z.string(),
  em: instante,
})

export const triagemDetalheSchema = z.strictObject({
  triagem: triagemResumoSchema,
  natureza: z.literal('verificacao-tecnica-experimental'),
  aviso: z.string(),
  enquadramento: z.strictObject({
    modalidade: enquadramentoSchema(modalidadeSchema),
    etapa: enquadramentoSchema(etapaSchema),
    integridadeDoPacote: enquadramentoSchema(z.enum(['completo', 'parcial', 'desconhecida'])),
    condicoes: z.array(z.strictObject({ id: z.string(), valor: z.boolean(), confirmadoPor: z.string().optional(), confirmadoEm: z.string().optional() })),
  }),
  analises: z.array(analiseResumoSchema),
  confirmacoes: z.array(confirmacaoSaidaSchema),
  revisoes: z.array(revisaoSaidaSchema),
})

export const anexoSaidaSchema = z.strictObject({
  id,
  ordem: z.number().int().min(1),
  nome: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/u),
  bytes: z.number().int().min(0),
  conteudo: z.enum(['nao-armazenado', 'armazenado', 'expurgado']),
  tipoReal: z.string().nullable(),
  extensaoConfere: z.union([z.boolean(), z.literal('indeterminado')]).nullable(),
  integridade: z.string().nullable(),
  isolado: z.boolean().nullable(),
  motivosIsolamento: z.array(z.string()),
  classificacao: classificacaoSchema.nullable(),
  justificativa: z.string().nullable(),
})
export const anexosSaidaSchema = z.strictObject({ analise: z.number().int().nullable(), itens: z.array(anexoSaidaSchema) })

export const avaliacaoSaidaSchema = z.strictObject({
  regraId: z.string(),
  regraVersao: z.string(),
  nome: z.string(),
  resultado: resultadoRegraSchema,
  tipo: z.enum(tiposAchado).optional(),
  severidade: z.enum(severidades),
  confianca: z.enum(['alta', 'media', 'baixa']),
  rascunho: z.string(),
  motivo: z.string().optional(),
  evidencias: z.array(evidenciaSchema),
  valoresConflitantes: z.array(z.strictObject({ campo: z.string(), valores: z.array(z.strictObject({ anexoId: z.string(), classe: z.string(), valorBruto: z.string(), evidencias: z.array(evidenciaSchema) })) })),
  procura: z.unknown().optional(),
  fundamentos: z.array(fonteRegraSchema),
  limitacoes: z.array(z.string()),
  revisaoHumana: z.string(),
  condicoesPendentes: z.array(z.string()),
  recalculada: z.boolean(),
  origemAnalise: z.number().int().nullable(),
  revisoes: z.array(revisaoSaidaSchema),
})
export const avaliacoesSaidaSchema = z.strictObject({
  analise: z.number().int(),
  natureza: z.literal('verificacao-tecnica-experimental'),
  decisaoAdministrativa: z.null(),
  itens: z.array(avaliacaoSaidaSchema),
})

export const camposSaidaSchema = z.strictObject({ analise: z.number().int(), itens: z.array(campoExtraidoSchema) })

export const triagemCriadaSchema = z.strictObject({ triagem: triagemResumoSchema, anexos: z.array(anexoSaidaSchema), nova: z.boolean() })
