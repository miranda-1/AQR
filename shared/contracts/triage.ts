import { z } from 'zod'

/**
 * Contratos da triagem documental assistida (proposta da auditoria de 09/11/2026, seção 6).
 *
 * Princípios que os esquemas garantem, e não só documentam:
 * - O sistema só conhece os ANEXOS RECEBIDOS. "Não encontrado" quer dizer "não localizado neste
 *   anexo" ou "nos anexos recebidos", nunca "não existe no processo".
 * - Desconhecido fica desconhecido: modalidade, etapa e condições aceitam "indeterminado".
 * - Condição só vale confirmada por servidor (origem `confirmado-servidor`, com autor e data).
 * - Todo achado tem evidência e fundamento; o texto do alerta não usa palavras de decisão
 *   administrativa (regra AQR-GCA-040).
 * - Revisão humana é registro próprio, com justificativa ao descartar ou corrigir.
 *
 * Os campos com `modelo-local` já preveem uma IA local no futuro; nada aqui a chama.
 */

export const TRIAGE_FORMAT_VERSION = 1

const id = z.string().min(1).max(200)
const instante = z.iso.datetime()
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u, 'SHA-256 em hexadecimal minúsculo')

// ---------- enquadramento ----------

/** Códigos de modalidade do catálogo (`regras_aqr_gca.json`), sem acrescentar nenhum. */
export const modalidades = [
  'R', 'D', 'DM', 'R/D', 'D/R', 'RET',
  'L1', 'L2', 'L3', 'L4', 'L6', 'L7',
  'CERT-MED', 'CERT-LOG-NEW', 'CERT-NUM', 'REURB-E',
] as const
export const modalidadeSchema = z.enum(modalidades)
export type Modalidade = z.infer<typeof modalidadeSchema>

/**
 * Etapas. "Pós-análise" e "pós-decisão" ficam separadas porque o catálogo as nomeia de forma
 * diferente e o dossiê não diz que são a mesma (reconciliação, R3).
 */
export const etapas = ['abertura', 'analise', 'pos-analise', 'pos-decisao'] as const
export const etapaSchema = z.enum(etapas)
export type Etapa = z.infer<typeof etapaSchema>

export const origensEnquadramento = ['declarado', 'proposto-sistema', 'confirmado-servidor'] as const

/** Valor que pode ser declarado pelo requerente, proposto pelo sistema ou confirmado por servidor. */
export function enquadrado<T extends z.ZodType>(valor: T) {
  return z
    .object({
      valor: z.union([valor, z.literal('indeterminado')]),
      origem: z.enum(origensEnquadramento),
      confirmadoPor: id.optional(),
      confirmadoEm: instante.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.origem !== 'confirmado-servidor') {
        if (value.confirmadoPor !== undefined || value.confirmadoEm !== undefined) {
          ctx.addIssue({ code: 'custom', message: 'Só a confirmação de servidor tem autor e data de confirmação.' })
        }
        return
      }
      if (!value.confirmadoPor || !value.confirmadoEm) {
        ctx.addIssue({ code: 'custom', message: 'Confirmação de servidor exige quem confirmou e quando.' })
      }
      // Com `T` genérico, o TypeScript não resolve a chave `valor` do objeto inferido.
      if ((value as { valor?: unknown }).valor === 'indeterminado') {
        ctx.addIssue({ code: 'custom', message: 'Servidor confirma um valor; "indeterminado" não é confirmação.' })
      }
    })
}

/**
 * Integridade do pacote (dossiê, Anexo C.4): o conjunto de anexos recebidos é o protocolo
 * completo? Só `completo` permite apontar documento "não localizado nos anexos recebidos".
 */
export const integridadesPacote = ['completo', 'parcial', 'desconhecida'] as const
export const integridadePacoteSchema = z.enum(integridadesPacote)

// ---------- evidência ----------

export const normalizedRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
})

export const origensEvidencia = ['camada-de-texto', 'ocr', 'metadado-arquivo', 'servidor', 'modelo-local'] as const

export const evidenciaSchema = z
  .object({
    anexoId: id,
    sha256,
    pagina: z.number().int().min(1).optional(),
    regioes: z.array(normalizedRectSchema).optional(),
    /** Só o mínimo necessário, com CPF/CNPJ mascarados (regra AQR-GCA-041). */
    trecho: z.string().max(500).optional(),
    origem: z.enum(origensEvidencia),
  })
  .superRefine((value, ctx) => {
    if (value.regioes && value.pagina === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Região sem página não localiza a evidência.' })
    }
    if (value.trecho && contemDocumentoPessoal(value.trecho)) {
      ctx.addIssue({ code: 'custom', message: 'O trecho da evidência traz CPF ou CNPJ sem máscara (AQR-GCA-041).' })
    }
  })
export type Evidencia = z.infer<typeof evidenciaSchema>

/** Evidência de ausência: quais anexos foram procurados e como estavam classificados. */
export const procuraSchema = z.object({
  integridadeDoPacote: integridadePacoteSchema,
  anexosProcurados: z.array(z.object({ anexoId: id, classe: z.string() })),
})

/** Identificador de condição (ex.: `area-situacao-acima-2ha`), definido em `docs/triagem/catalogo/condicoes-humanas.json`. */
export const condicaoIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)

export const condicaoSchema = z.object({
  id: condicaoIdSchema,
  valor: enquadrado(z.boolean()),
  evidencias: z.array(evidenciaSchema),
})
export type Condicao = z.infer<typeof condicaoSchema>

/** A condição vale só quando um servidor a confirmou. */
export function condicaoConfirmada(condicao: Condicao): boolean | 'pendente' {
  if (condicao.valor.origem !== 'confirmado-servidor' || condicao.valor.valor === 'indeterminado') return 'pendente'
  return condicao.valor.valor
}

// ---------- anexo ----------

/** Tipo real do arquivo, detectado pelo conteúdo (não pelo nome). */
export const tiposArquivo = ['pdf', 'jpeg', 'png', 'dxf', 'dwg', 'docx', 'zip', 'rar', 'vazio', 'desconhecido'] as const
export const tipoArquivoSchema = z.enum(tiposArquivo)
export type TipoArquivo = z.infer<typeof tipoArquivoSchema>

export const integridadesArquivo = ['legivel', 'protegido-por-senha', 'corrompido', 'vazio', 'nao-suportado', 'nao-verificada'] as const

export const motivosIsolamento = [
  'conteudo-executavel',
  'conteiner-disfarcado',
  'zip-caminho-perigoso',
  'zip-compressao-suspeita',
  'zip-ilegivel',
  'imagem-grande-demais',
] as const

export const leituraPaginaSchema = z.object({
  pagina: z.number().int().min(1),
  conteudo: z.enum(['text', 'scanned', 'mixed', 'blank']),
  metodo: z.enum(['camada-de-texto', 'ocr', 'camada-e-ocr', 'nao-lida']),
  confiancaOcr: z.number().min(0).max(100).optional(),
  rotacao: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
})

export const classesDocumentais = [
  'requerimento',
  'drt-01',
  'drt-02-projeto',
  'drt-02-implantacao',
  'drt-03',
  'matricula-transcricao',
  'inscricao-imobiliaria',
  'art-rrt-similar',
  'prancha',
  'cad',
  'memorial',
  'gdu-gdr',
  'representacao',
  'outro',
] as const
export const classeDocumentalSchema = z.enum(classesDocumentais)
export type ClasseDocumental = z.infer<typeof classeDocumentalSchema>

export const classificacaoSchema = z
  .object({
    classe: z.union([classeDocumentalSchema, z.literal('indeterminada')]),
    confianca: z.enum(['alta', 'media', 'baixa']),
    metodo: z.enum(['regra-lexica', 'tipo-de-arquivo', 'modelo-local', 'servidor']),
    evidencias: z.array(evidenciaSchema),
    alternativas: z.array(z.object({ classe: classeDocumentalSchema, confianca: z.enum(['media', 'baixa']) })),
  })
  .superRefine((value, ctx) => {
    if (value.classe !== 'indeterminada' && value.metodo !== 'servidor' && value.evidencias.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Classe proposta pelo sistema precisa de evidência.' })
    }
  })
export type Classificacao = z.infer<typeof classificacaoSchema>

export const anexoSchema = z
  .object({
    id,
    nome: z.string().min(1).max(255),
    sha256,
    bytes: z.number().int().min(0),
    extensao: z.string().max(16),
    tipoReal: tipoArquivoSchema,
    /** A extensão do nome corresponde ao conteúdo? `indeterminado` para extensão desconhecida. */
    extensaoConfere: z.union([z.boolean(), z.literal('indeterminado')]),
    integridade: z.enum(integridadesArquivo),
    /** Arquivo suspeito fica isolado: não segue para leitura nem classificação. */
    isolamento: z.object({ isolado: z.boolean(), motivos: z.array(z.enum(motivosIsolamento)) }),
    paginas: z.array(leituraPaginaSchema),
    classificacao: classificacaoSchema,
  })
  .superRefine((value, ctx) => {
    if (value.isolamento.isolado !== value.isolamento.motivos.length > 0) {
      ctx.addIssue({ code: 'custom', message: 'Isolamento e motivos não conferem.' })
    }
    if (value.isolamento.isolado && (value.paginas.length > 0 || value.classificacao.classe !== 'indeterminada')) {
      ctx.addIssue({ code: 'custom', message: 'Arquivo isolado não é lido nem classificado.' })
    }
    if (value.tipoReal === 'vazio' && value.bytes !== 0) ctx.addIssue({ code: 'custom', message: 'Só arquivo de 0 bytes é vazio.' })
  })
export type Anexo = z.infer<typeof anexoSchema>

// ---------- campo extraído ----------

export const nomesCampo = [
  'assunto',
  'lote',
  'quadra',
  'parcelamento',
  'bairro',
  'matricula',
  'cartorio',
  'inscricao',
  'titular',
  'signatario',
  'rt-nome',
  'rt-registro',
  'data-emissao',
  'data-revisao',
  'area',
  'escala-situacao',
  'formato-folha',
] as const
export const nomeCampoSchema = z.enum(nomesCampo)
export type NomeCampo = z.infer<typeof nomeCampoSchema>

/** `nao-encontrado` = não localizado NESTE anexo; nunca significa que o dado não existe. */
export const estadosCampo = ['encontrado', 'nao-encontrado', 'ilegivel', 'varios-valores', 'nao-aplicavel'] as const

export const campoExtraidoSchema = z
  .object({
    id,
    anexoId: id,
    campo: nomeCampoSchema,
    estado: z.enum(estadosCampo),
    /** Como está no documento. */
    valorBruto: z.string().max(500).optional(),
    valorNormalizado: z.union([z.string().max(500), z.number()]).optional(),
    unidade: z.enum(['m2', 'ha']).optional(),
    /** Leituras possíveis quando o OCR é ambíguo ou o documento traz mais de um valor. */
    alternativas: z.array(z.string().max(500)).optional(),
    confianca: z.number().min(0).max(1),
    metodo: z.enum(['padrao', 'ocr+padrao', 'modelo-local', 'servidor']),
    evidencias: z.array(evidenciaSchema),
    /** Correção humana substitui o valor sem apagar o extraído. */
    corrigidoPor: id.optional(),
  })
  .superRefine((value, ctx) => {
    const temValor = value.valorBruto !== undefined || value.valorNormalizado !== undefined
    if (value.estado === 'encontrado' && (!temValor || value.evidencias.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'Campo encontrado precisa de valor e de evidência.' })
    }
    if ((value.estado === 'nao-encontrado' || value.estado === 'nao-aplicavel') && temValor) {
      ctx.addIssue({ code: 'custom', message: 'Campo não encontrado ou não aplicável não tem valor: desconhecido fica desconhecido.' })
    }
    if (value.estado === 'varios-valores' && (value.alternativas?.length ?? 0) < 2) {
      ctx.addIssue({ code: 'custom', message: 'Vários valores exigem ao menos duas alternativas.' })
    }
    if (value.unidade !== undefined && typeof value.valorNormalizado !== 'number') {
      ctx.addIssue({ code: 'custom', message: 'Unidade só acompanha valor numérico.' })
    }
  })
export type CampoExtraido = z.infer<typeof campoExtraidoSchema>

// ---------- regra ----------

export const severidades = ['critical', 'major', 'minor', 'review', 'none'] as const

export const fonteRegraSchema = z.object({
  fonte: z.string().min(1),
  url: z.url({ protocol: /^https?$/u }),
  local: z.string().min(1),
  membroDoPacote: z.string().nullable(),
})

/** Regra como o AQR a usa, normalizada a partir do catálogo. */
export const definicaoRegraSchema = z
  .object({
    id: z.string().regex(/^(AQR|HYP)-GCA-\d{3}$/u),
    nome: z.string().min(1),
    /** Origem da regra no catálogo. NÃO equivale a homologação. */
    status: z.enum(['official-confirmed', 'hypothesis']),
    habilitada: z.boolean(),
    /** Ato da GCA que homologa a regra (`docs/triagem/catalogo/homologacoes.json`). */
    homologacao: z.discriminatedUnion('situacao', [
      z.object({ situacao: z.literal('nao-homologada') }),
      z.object({ situacao: z.literal('homologada'), ato: z.string().min(1), data: z.iso.date(), responsavel: z.string().min(1) }),
    ]),
    modalidades: z.array(modalidadeSchema).min(1),
    etapaCatalogo: z.string().min(1),
    etapas: z.array(etapaSchema).min(1),
    preCondicao: z.string(),
    /** Condições que só valem confirmadas por servidor. */
    condicoes: z.array(condicaoIdSchema),
    insumos: z.array(z.string()),
    extracoes: z.array(z.string()),
    logica: z.string().min(1),
    resultado: z.string(),
    severidade: z.enum(severidades),
    confianca: z.enum(['high', 'medium', 'low']),
    evidenciaExigida: z.string(),
    revisaoHumana: z.string().min(1),
    exemplos: z.object({ positivo: z.string(), negativo: z.string() }),
    fontes: z.array(fonteRegraSchema),
  })
  .superRefine((value, ctx) => {
    const hipotese = value.id.startsWith('HYP-')
    if (hipotese !== (value.status === 'hypothesis')) {
      ctx.addIssue({ code: 'custom', message: `${value.id}: o prefixo não corresponde ao estado "${value.status}".` })
    }
    if (value.status === 'hypothesis' && value.habilitada) {
      ctx.addIssue({ code: 'custom', message: `${value.id}: hipótese nunca pode ficar habilitada.` })
    }
    if (value.habilitada && value.fontes.length === 0) {
      ctx.addIssue({ code: 'custom', message: `${value.id}: regra habilitada sem fundamento em fonte.` })
    }
  })
export type DefinicaoRegra = z.infer<typeof definicaoRegraSchema>

// ---------- avaliação de regra (alerta) ----------

export const resultadosRegra = ['sem-achado', 'achado', 'nao-avaliavel', 'condicao-pendente', 'nao-aplicavel'] as const
export const resultadoRegraSchema = z.enum(resultadosRegra)
export type ResultadoRegra = z.infer<typeof resultadoRegraSchema>

export const tiposAchado = ['nao-localizado', 'ilegivel', 'formato-incompativel', 'divergencia', 'condicao-indeterminada'] as const

/** Palavras de decisão administrativa que o sistema nunca escreve (AQR-GCA-040). */
const DECISAO = /\b(indeferi|deferi|aprova|reprova|irregular|ilegal|arquiva|anu[eê]ncia concedida|recusad)/iu

export function contemPalavraDeDecisao(texto: string): boolean {
  return DECISAO.test(texto)
}

/** CPF ou CNPJ completos (com ou sem pontuação). */
export function contemDocumentoPessoal(texto: string): boolean {
  return /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/u.test(texto)
}

export const avaliacaoRegraSchema = z
  .object({
    id,
    regraId: z.string(),
    regraVersao: z.string().min(1),
    resultado: resultadoRegraSchema,
    tipo: z.enum(tiposAchado).optional(),
    severidade: z.enum(severidades),
    /** Texto para o servidor, nunca para o requerente sem revisão. */
    rascunho: z.string().max(2000),
    motivo: z.string().max(500).optional(),
    camposUsados: z.array(id),
    condicoesPendentes: z.array(condicaoIdSchema),
    evidencias: z.array(evidenciaSchema),
    procura: procuraSchema.optional(),
    fundamentos: z.array(fonteRegraSchema),
  })
  .superRefine((value, ctx) => {
    if (contemPalavraDeDecisao(value.rascunho)) {
      ctx.addIssue({ code: 'custom', message: 'O alerta não pode usar palavras de decisão administrativa (AQR-GCA-040).' })
    }
    if (value.resultado === 'achado') {
      if (!value.tipo) ctx.addIssue({ code: 'custom', message: 'Achado precisa de tipo.' })
      if (value.evidencias.length === 0 && !value.procura) {
        ctx.addIssue({ code: 'custom', message: 'Achado precisa de evidência ou do registro dos anexos procurados.' })
      }
      if (value.fundamentos.length === 0) ctx.addIssue({ code: 'custom', message: 'Achado precisa de fundamento.' })
    } else if (value.tipo !== undefined) {
      ctx.addIssue({ code: 'custom', message: 'Só achado tem tipo.' })
    }
    if (value.tipo === 'nao-localizado' && value.procura?.integridadeDoPacote !== 'completo') {
      ctx.addIssue({
        code: 'custom',
        message: 'Documento "não localizado" só pode ser apontado em pacote confirmado como completo; senão, a regra não é avaliável.',
      })
    }
    if ((value.resultado === 'condicao-pendente') !== value.condicoesPendentes.length > 0) {
      ctx.addIssue({ code: 'custom', message: 'Condição pendente e lista de condições pendentes não conferem.' })
    }
    if ((value.resultado === 'nao-avaliavel' || value.resultado === 'nao-aplicavel') && !value.motivo) {
      ctx.addIssue({ code: 'custom', message: 'Regra não avaliável ou não aplicável precisa de motivo.' })
    }
  })
export type AvaliacaoRegra = z.infer<typeof avaliacaoRegraSchema>

// ---------- revisão humana ----------

export const revisaoSchema = z
  .object({
    id,
    avaliacaoId: id,
    revisorId: id,
    em: instante,
    decisao: z.enum(['confirmado', 'descartado', 'corrigido', 'encaminhado']),
    justificativa: z.string().max(2000),
    correcoes: z.array(z.object({ campoId: id, anterior: z.string(), novo: z.string() })).optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.decisao === 'descartado' || value.decisao === 'corrigido') && value.justificativa.trim().length < 5) {
      ctx.addIssue({ code: 'custom', message: 'Descartar ou corrigir exige justificativa.' })
    }
    if (value.decisao === 'corrigido' && !value.correcoes?.length) {
      ctx.addIssue({ code: 'custom', message: 'Correção sem campos corrigidos.' })
    }
  })
export type Revisao = z.infer<typeof revisaoSchema>

// ---------- processo ----------

export const situacoesProcesso = ['recebido', 'processando', 'aguardando-revisao', 'revisado', 'falhou'] as const

export const processoTriagemSchema = z
  .object({
    formato: z.literal(TRIAGE_FORMAT_VERSION),
    id,
    /** Protocolo ou SEI, pseudonimizado na trilha. */
    referencia: z.string().max(100).nullable(),
    /** Escolhe a versão do catálogo aplicável. */
    protocoladoEm: instante,
    modalidade: enquadrado(modalidadeSchema),
    etapa: enquadrado(etapaSchema),
    integridadeDoPacote: enquadrado(integridadePacoteSchema),
    condicoes: z.array(condicaoSchema),
    catalogo: z.object({ versao: z.string().min(1), sha256 }),
    situacao: z.enum(situacoesProcesso),
    /** Só os anexos recebidos; nunca "os documentos do processo". */
    anexos: z.array(anexoSchema),
    campos: z.array(campoExtraidoSchema),
    avaliacoes: z.array(avaliacaoRegraSchema),
    revisoes: z.array(revisaoSchema),
    criadoPor: id,
    criadoEm: instante,
  })
  .superRefine((value, ctx) => {
    const anexos = new Set(value.anexos.map((anexo) => anexo.id))
    if (anexos.size !== value.anexos.length) ctx.addIssue({ code: 'custom', message: 'Anexos com id repetido.' })
    for (const campo of value.campos) {
      if (!anexos.has(campo.anexoId)) ctx.addIssue({ code: 'custom', message: `Campo ${campo.id} cita anexo inexistente.` })
    }
    const avaliacoes = new Set(value.avaliacoes.map((avaliacao) => avaliacao.id))
    for (const revisao of value.revisoes) {
      if (!avaliacoes.has(revisao.avaliacaoId)) ctx.addIssue({ code: 'custom', message: `Revisão ${revisao.id} cita avaliação inexistente.` })
    }
    const condicoes = value.condicoes.map((condicao) => condicao.id)
    if (new Set(condicoes).size !== condicoes.length) ctx.addIssue({ code: 'custom', message: 'Condição repetida.' })
  })
export type ProcessoTriagem = z.infer<typeof processoTriagemSchema>
