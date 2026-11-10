import { z } from 'zod'
import {
  classeDocumentalSchema,
  condicaoIdSchema,
  etapaSchema,
  integridadePacoteSchema,
  integridadesArquivo,
  modalidadeSchema,
  motivosIsolamento,
  nomeCampoSchema,
  resultadoRegraSchema,
  tipoArquivoSchema,
  tiposAchado,
} from '../../../shared/contracts/triage.ts'

/**
 * Gabarito de cada pacote sintético. É escrito junto com a definição do pacote (o que o documento
 * É e o que um servidor esperaria ver), nunca calculado pelo motor de triagem. Para regras em que
 * mais de uma saída é aceitável (ex.: leitura difícil pode dar "sem achado" ou "não avaliável"),
 * o gabarito lista todas as aceitáveis; o que nunca é aceitável fica de fora.
 */

export const categoriasCorpus = [
  'completo',
  'incompleto',
  'documento-trocado',
  'campos-divergentes',
  'digitalizado',
  'ocr-dificil',
  'datas',
  'arquivo-corrompido',
  'extensao-falsa',
  'arquivo-suspeito',
  'limite-2ha',
  'formato',
  'representacao',
  'assinatura',
  'pacote-parcial',
] as const
export type CategoriaCorpus = (typeof categoriasCorpus)[number]

export const gabaritoAnexoSchema = z.strictObject({
  nome: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/u),
  bytes: z.number().int().min(0),
  tipoReal: tipoArquivoSchema,
  extensaoConfere: z.union([z.boolean(), z.literal('indeterminado')]),
  integridade: z.enum(integridadesArquivo),
  isolar: z.boolean(),
  motivosIsolamento: z.array(z.enum(motivosIsolamento)),
  /** O que o arquivo traz; `null` quando não traz documento legível (corrompido, vazio, executável, contêiner). */
  classe: classeDocumentalSchema.nullable(),
  leitura: z.enum(['camada-de-texto', 'ocr', 'nao-interpretado', 'nenhuma']),
  qualidade: z.enum(['boa', 'ruido', 'muito-degradada']).optional(),
  rotacao: z.union([z.literal(0), z.literal(90)]),
  /** Valores como estão impressos no documento. */
  campos: z.partialRecord(nomeCampoSchema, z.string()),
  observacao: z.string().optional(),
})
export type GabaritoAnexo = z.infer<typeof gabaritoAnexoSchema>

export const expectativaRegraSchema = z
  .strictObject({
    aceitaveis: z.array(resultadoRegraSchema).min(1),
    tipo: z.enum(tiposAchado).optional(),
    motivo: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.tipo && !value.aceitaveis.includes('achado')) ctx.addIssue({ code: 'custom', message: 'Tipo de achado sem "achado" aceitável.' })
    if (new Set(value.aceitaveis).size !== value.aceitaveis.length) ctx.addIssue({ code: 'custom', message: 'Resultado aceitável repetido.' })
  })
export type ExpectativaRegra = z.infer<typeof expectativaRegraSchema>

export const gabaritoPacoteSchema = z
  .strictObject({
    id: z.string().regex(/^DSD-\d{2}$/u),
    titulo: z.string().min(1),
    categorias: z.array(z.enum(categoriasCorpus)).min(1),
    /** Ensaios do dossiê ou dos casos complementares que o pacote reproduz. */
    ensaios: z.array(z.string().regex(/^T\d{2}$/u)),
    entrada: z.strictObject({
      modalidade: modalidadeSchema,
      etapa: etapaSchema,
      protocoladoEm: z.iso.datetime(),
      /** Como o servidor que abriu a triagem informou o pacote. */
      integridadeDoPacote: integridadePacoteSchema,
      /** Condições que o cenário simula como já confirmadas por servidor. */
      condicoesConfirmadas: z.array(z.strictObject({ id: condicaoIdSchema, valor: z.boolean() })),
    }),
    /** Dados fictícios do imóvel e das pessoas, como no requerimento. */
    imovel: z.record(z.string(), z.string()),
    anexos: z.array(gabaritoAnexoSchema),
    regras: z.record(z.string().regex(/^AQR-GCA-\d{3}$/u), expectativaRegraSchema),
  })
  .superRefine((value, ctx) => {
    const nomes = value.anexos.map((anexo) => anexo.nome)
    if (new Set(nomes).size !== nomes.length) ctx.addIssue({ code: 'custom', message: `${value.id}: nomes de anexo repetidos` })
    for (const anexo of value.anexos) {
      if (anexo.isolar !== anexo.motivosIsolamento.length > 0) ctx.addIssue({ code: 'custom', message: `${value.id}/${anexo.nome}: isolamento e motivos não conferem` })
      if (anexo.isolar && anexo.classe !== null) ctx.addIssue({ code: 'custom', message: `${value.id}/${anexo.nome}: arquivo isolado não tem classe` })
    }
  })
export type GabaritoPacote = z.infer<typeof gabaritoPacoteSchema>
