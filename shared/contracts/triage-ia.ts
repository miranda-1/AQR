import { z } from 'zod'
import { classesDocumentais, nomesCampo } from './triage.ts'

/**
 * Contratos da IA documental (E11.0). O modelo só PROPÕE classe documental ou valor de campo, com
 * a página e a região de onde tirou a informação. A saída do modelo é entrada não confiável: passa
 * por estes esquemas estritos (tamanhos limitados, nada além do previsto) e depois pela verificação
 * determinística do servidor (`server/triage/ia/verificacao.ts`).
 *
 * Nesta etapa nenhuma sugestão tem efeito: não altera classe, campo, regra, decisão nem análise
 * (`efeito: 'nenhum'`, também garantido no banco). Sugestão não é evidência normativa.
 */

export const provedoresIa = ['desabilitado', 'simulado'] as const
export type ProvedorIa = (typeof provedoresIa)[number]

const regiaoSchema = z.strictObject({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1),
})
export type RegiaoIa = z.infer<typeof regiaoSchema>

const texto = (max: number) => z.string().min(1).max(max)

/**
 * Uma proposta como o modelo a devolve. `fundamento`: `texto` quando o modelo diz ter lido o valor
 * no texto da região; `visual` quando diz tê-lo visto na imagem (sem texto correspondente). A
 * `confiancaDeclarada` é a do modelo: nunca é prova de correção e não vira confiança do sistema.
 */
export const propostaModeloSchema = z.discriminatedUnion('tipo', [
  z.strictObject({
    tipo: z.literal('classe'),
    anexoId: texto(64),
    anexoSha256: z.string().regex(/^[0-9a-f]{64}$/u),
    classe: z.enum(classesDocumentais),
    pagina: z.number().int().min(1).max(10_000),
    regioes: z.array(regiaoSchema).min(1).max(8),
    trecho: texto(300),
    fundamento: z.enum(['texto', 'visual']),
    confiancaDeclarada: z.number().min(0).max(1),
  }),
  z.strictObject({
    tipo: z.literal('campo'),
    anexoId: texto(64),
    anexoSha256: z.string().regex(/^[0-9a-f]{64}$/u),
    campo: z.enum(nomesCampo),
    valorBruto: texto(200),
    pagina: z.number().int().min(1).max(10_000),
    regioes: z.array(regiaoSchema).min(1).max(8),
    trecho: texto(300),
    fundamento: z.enum(['texto', 'visual']),
    confiancaDeclarada: z.number().min(0).max(1),
  }),
])
export type PropostaModelo = z.infer<typeof propostaModeloSchema>

/** Saída bruta de uma execução. O limite de quantidade é aplicado antes da validação de cada item. */
export const saidaModeloSchema = z.strictObject({ propostas: z.array(z.unknown()) })

/** Identificação do que produziu as sugestões (registrada em cada execução). */
export const modeloRegistradoSchema = z.strictObject({
  provedor: z.enum(provedoresIa),
  id: texto(100),
  versao: texto(60),
  /** Hash dos pesos efetivamente carregados; `null` no provedor simulado (não há pesos). */
  pesosSha256: z.string().regex(/^[0-9a-f]{64}$/u).nullable(),
  /** Hash do texto do prompt e do esquema de saída; no simulado, das regras de simulação. */
  promptSha256: z.string().regex(/^[0-9a-f]{64}$/u),
  configuracaoVersao: texto(40),
})
export type ModeloRegistrado = z.infer<typeof modeloRegistradoSchema>

export const situacoesExecucaoIa = ['concluida', 'tempo-esgotado', 'memoria-ou-falha', 'saida-invalida', 'indisponivel'] as const

/** Motivo de cada desfecho da verificação, estável para relatório e auditoria. */
export const motivosVerificacao = [
  'texto-confere-na-regiao',
  'texto-confere-normalizado',
  'texto-confere-com-tolerancia-ocr',
  'sem-texto-na-regiao-hipotese-visual',
  'esquema-invalido',
  'anexo-desconhecido',
  'hash-divergente',
  'pagina-inexistente',
  'regiao-invalida',
  'valor-ausente-da-regiao',
  'valor-em-outra-regiao',
  'valor-em-outra-pagina',
  'valor-em-outro-anexo',
  'trecho-nao-confere',
  'fundamento-textual-sem-texto',
  'regiao-com-instrucao',
  'valor-nao-normaliza',
  'valor-ambiguo-no-documento',
  'valor-confirmado-por-servidor',
  'anexo-isolado',
  'acima-do-limite',
] as const
export type MotivoVerificacao = (typeof motivosVerificacao)[number]

/**
 * Nível A: valor confirmado no texto da página e da região citadas. Nível B: só visual, sem texto
 * que o confirme; fica como hipótese não verificada, só para revisão humana futura, e nunca
 * alimenta regra. Recusada: não confere, contradiz o texto ou desrespeita o contrato.
 */
export const sugestaoVerificadaSchema = z.strictObject({
  id: z.string(),
  tipo: z.enum(['classe', 'campo']),
  anexoId: z.string(),
  anexoSha256: z.string(),
  pagina: z.number().int().nullable(),
  regioes: z.array(regiaoSchema),
  classe: z.enum(classesDocumentais).nullable(),
  campo: z.enum(nomesCampo).nullable(),
  valorBruto: z.string().nullable(),
  trecho: z.string().nullable(),
  fundamento: z.enum(['texto', 'visual']).nullable(),
  metodo: z.literal('modelo-local'),
  confiancaDeclarada: z.number().nullable(),
  nivel: z.enum(['A', 'B']).nullable(),
  situacao: z.enum(['verificada', 'hipotese-visual', 'recusada']),
  motivo: z.enum(motivosVerificacao),
  /** Como a sugestão se relaciona com o que o motor determinístico já leu (só informativo). */
  relacaoMotor: z.enum(['preencheria-lacuna', 'confirma-motor', 'diverge-do-motor', 'sem-relacao']).nullable(),
  /** Nesta etapa, sempre `nenhum`: a sugestão não muda nada no processo. */
  efeito: z.literal('nenhum'),
})
export type SugestaoVerificada = z.infer<typeof sugestaoVerificadaSchema>

export const execucaoIaSaidaSchema = z.strictObject({
  id: z.string(),
  analise: z.number().int(),
  modelo: modeloRegistradoSchema,
  situacao: z.enum(situacoesExecucaoIa),
  iniciadaEm: z.string(),
  encerradaEm: z.string(),
  duracaoMs: z.number().int().min(0),
  propostasRecebidas: z.number().int().min(0),
  /** Fora do esquema (formato, tamanho, tipo inexistente como "decisão"): descartadas sem registro do conteúdo. */
  propostasInvalidas: z.number().int().min(0),
  propostasDescartadasPorLimite: z.number().int().min(0),
  /** Memória usada pela thread do provedor ao terminar, quando ela respondeu. */
  memoriaMb: z.number().int().min(0).nullable(),
})

export const sugestoesSaidaSchema = z.strictObject({
  analise: z.number().int(),
  natureza: z.literal('sugestao-experimental-sem-efeito'),
  execucao: execucaoIaSaidaSchema.nullable(),
  itens: z.array(sugestaoVerificadaSchema),
})
