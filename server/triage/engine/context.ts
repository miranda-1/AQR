import type {
  AvaliacaoRegra,
  ClasseDocumental,
  Condicao,
  DefinicaoRegra,
  Etapa,
  Evidencia,
  Modalidade,
  NomeCampo,
} from '../../../shared/contracts/triage.ts'
import type { CampoDetalhado } from '../extraction/extract.ts'
import type { AnexoTriado } from '../pipeline.ts'

/**
 * O que uma regra recebe (dados estruturados do processo) e o que devolve. A regra nunca lê
 * arquivo nem texto solto: só anexos já classificados, campos já extraídos e o enquadramento.
 */

export type Origem = 'declarado' | 'proposto-sistema' | 'confirmado-servidor'

export interface Enquadramento<T> {
  valor: T | 'indeterminado'
  origem: Origem
  confirmadoPor?: string
  confirmadoEm?: string
}

export interface EntradaTriagem {
  processoId: string
  /** Protocolo pseudonimizado ou `null`. */
  referencia: string | null
  protocoladoEm: string
  modalidade: Enquadramento<Modalidade>
  etapa: Enquadramento<Etapa>
  /** Só `completo` confirmado por servidor permite apontar documento "não localizado". */
  integridadeDoPacote: Enquadramento<'completo' | 'parcial' | 'desconhecida'>
  condicoes: Condicao[]
  /** Quem abriu a triagem (id de usuário, nunca nome). */
  criadoPor: string
  criadoEm: string
}

export interface ContextoRegra {
  entrada: EntradaTriagem
  anexos: readonly AnexoTriado[]
  campos: readonly CampoDetalhado[]
  regra: DefinicaoRegra
  versaoRegra: string
}

export type Confianca = 'alta' | 'media' | 'baixa'

export interface ValorConflitante {
  campo: NomeCampo
  valores: { anexoId: string; classe: string; campoId: string; valorBruto: string; evidencias: Evidencia[] }[]
}

/** O que a regra produz; o motor completa id, versão, severidade e fundamentos. */
export interface ResultadoDaRegra {
  resultado: AvaliacaoRegra['resultado']
  tipo?: AvaliacaoRegra['tipo']
  rascunho: string
  motivo?: string
  camposUsados?: string[]
  condicoesPendentes?: string[]
  evidencias?: Evidencia[]
  procura?: AvaliacaoRegra['procura']
  confianca: Confianca
  limitacoes?: string[]
  valoresConflitantes?: ValorConflitante[]
  /** Anexos a que o resultado se refere. */
  anexos?: string[]
}

export type FuncaoRegra = (ctx: ContextoRegra) => ResultadoDaRegra

// ---------- consultas comuns ----------

export function anexosDaClasse(ctx: ContextoRegra, classe: ClasseDocumental): AnexoTriado[] {
  return ctx.anexos.filter((anexo) => anexo.classificacao.contrato.classe !== 'indeterminada' && anexo.classificacao.classesComEvidencia.includes(classe))
}

export function camposDe(ctx: ContextoRegra, anexoId: string, campo: NomeCampo): CampoDetalhado | undefined {
  return ctx.campos.find((item) => item.contrato.anexoId === anexoId && item.contrato.campo === campo)
}

export function evidenciaDoAnexo(anexo: AnexoTriado, trecho?: string): Evidencia {
  const primeira = anexo.classificacao.contrato.evidencias[0]
  if (primeira && !trecho) return primeira
  return { anexoId: anexo.lido.id, sha256: anexo.lido.inspecao.sha256, origem: 'metadado-arquivo', ...(trecho ? { trecho } : {}) }
}

/** O pacote recebido é o protocolo completo, segundo um servidor? */
export function pacoteCompletoConfirmado(entrada: EntradaTriagem): boolean {
  const { integridadeDoPacote } = entrada
  return integridadeDoPacote.valor === 'completo' && integridadeDoPacote.origem === 'confirmado-servidor'
}

export function integridadeParaProcura(entrada: EntradaTriagem): 'completo' | 'parcial' | 'desconhecida' {
  if (pacoteCompletoConfirmado(entrada)) return 'completo'
  return entrada.integridadeDoPacote.valor === 'parcial' ? 'parcial' : 'desconhecida'
}

/**
 * Anexos que podem ser o documento procurado sem que o sistema consiga dizer: isolados, ilegíveis,
 * lidos só em parte e sem classe, ou sem classe mas com a classe procurada entre as alternativas.
 */
export function anexosQuePodemSer(ctx: ContextoRegra, classes: readonly ClasseDocumental[]): AnexoTriado[] {
  return ctx.anexos.filter((anexo) => {
    if (anexo.classificacao.contrato.classe !== 'indeterminada') return false
    if (anexo.lido.legibilidade === 'isolado' || anexo.lido.legibilidade === 'ilegivel' || anexo.lido.legibilidade === 'parcial') return true
    return anexo.classificacao.contrato.alternativas.some((alternativa) => classes.includes(alternativa.classe))
  })
}

const DESCRICAO_LEGIBILIDADE: Record<string, string> = {
  isolado: 'isolado por suspeita, não aberto',
  ilegivel: 'não pôde ser lido',
  parcial: 'lido só em parte',
  legivel: 'sem classe definida',
  'nao-interpretado': 'conteúdo não interpretado',
}

/** Primeira letra minúscula, menos em sigla ("DRT 01", "GDU/GDR"). */
function noMeioDaFrase(nome: string): string {
  return /^\p{Lu}{2}/u.test(nome) ? nome : `${nome.charAt(0).toLowerCase()}${nome.slice(1)}`
}

export function descreverAnexo(anexo: AnexoTriado): string {
  return `${anexo.lido.id} (${DESCRICAO_LEGIBILIDADE[anexo.lido.legibilidade] ?? anexo.lido.legibilidade})`
}

/**
 * Presença de um documento nos anexos recebidos, com a integridade do pacote levada em conta:
 * - achou: `sem-achado`, com a evidência da classificação;
 * - não achou e o pacote não é completo confirmado: `nao-avaliavel` (pode estar no que não veio);
 * - não achou e há anexo que pode ser ele mas não foi lido/classificado: `nao-avaliavel`;
 * - não achou em pacote completo, com tudo classificado: `achado` "não localizado nos anexos recebidos".
 */
export function avaliarPresenca(
  ctx: ContextoRegra,
  opcoes: {
    classes: readonly ClasseDocumental[]
    nome: string
    /** Filtro adicional sobre os anexos da classe (ex.: só PDF). */
    aceita?: (anexo: AnexoTriado) => boolean
    complemento?: string
  },
): ResultadoDaRegra {
  const candidatos = opcoes.classes.flatMap((classe) => anexosDaClasse(ctx, classe))
  const aceitos = candidatos.filter((anexo) => opcoes.aceita?.(anexo) ?? true)
  if (aceitos.length > 0) {
    return {
      resultado: 'sem-achado',
      rascunho: `${opcoes.nome}: localizado entre os anexos recebidos (${aceitos.map((anexo) => anexo.lido.id).join(', ')}).`,
      evidencias: aceitos.map((anexo) => evidenciaDoAnexo(anexo)),
      anexos: aceitos.map((anexo) => anexo.lido.id),
      confianca: aceitos.every((anexo) => anexo.classificacao.contrato.confianca === 'alta') ? 'alta' : 'media',
      limitacoes: ['A presença é aparente: conteúdo, validade e assinatura do documento são conferência humana.'],
    }
  }
  const integridade = integridadeParaProcura(ctx.entrada)
  if (integridade !== 'completo') {
    return {
      resultado: 'nao-avaliavel',
      motivo: `Integridade do pacote ${integridade === 'parcial' ? 'parcial' : 'não confirmada'}: o documento pode estar entre os anexos não recebidos.`,
      rascunho: `${opcoes.nome}: não localizado entre os anexos recebidos, mas o pacote não foi confirmado como completo. Nada a apontar sem conferência do protocolo.`,
      confianca: 'baixa',
      limitacoes: ['Ausência nos anexos recebidos não comprova ausência no processo.'],
    }
  }
  const duvidosos = anexosQuePodemSer(ctx, opcoes.classes)
  if (duvidosos.length > 0) {
    return {
      resultado: 'nao-avaliavel',
      motivo: `Há anexo que não pôde ser classificado e pode ser o documento: ${duvidosos.map(descreverAnexo).join(', ')}.`.slice(0, 500),
      rascunho: `${opcoes.nome}: não localizado entre os anexos classificados, mas ${duvidosos.length === 1 ? 'um anexo não pôde ser lido ou classificado' : 'alguns anexos não puderam ser lidos ou classificados'}. Conferir ${duvidosos.map((anexo) => anexo.lido.id).join(', ')}.`,
      evidencias: duvidosos.map((anexo) => ({ anexoId: anexo.lido.id, sha256: anexo.lido.inspecao.sha256, origem: 'metadado-arquivo' as const })),
      anexos: duvidosos.map((anexo) => anexo.lido.id),
      confianca: 'baixa',
    }
  }
  const foraDoFormato = candidatos.length > 0 ? ` Há ${candidatos.length === 1 ? 'um anexo' : 'anexos'} dessa classe em formato não aceito por esta regra (${candidatos.map((anexo) => `${anexo.lido.id}: ${anexo.lido.inspecao.tipoReal.toUpperCase()}`).join(', ')}).` : ''
  return {
    resultado: 'achado',
    tipo: candidatos.length > 0 ? 'formato-incompativel' : 'nao-localizado',
    rascunho: `Possível pendência: ${noMeioDaFrase(opcoes.nome)} não localizado nos anexos recebidos.${foraDoFormato}${opcoes.complemento ? ` ${opcoes.complemento}` : ''} Servidor confere antes de qualquer comunicação.`,
    procura: { integridadeDoPacote: 'completo', anexosProcurados: ctx.anexos.map((anexo) => ({ anexoId: anexo.lido.id, classe: anexo.classificacao.contrato.classe })) },
    evidencias: candidatos.map((anexo) => evidenciaDoAnexo(anexo)),
    anexos: candidatos.map((anexo) => anexo.lido.id),
    confianca: 'media',
    limitacoes: ['A busca cobre só os anexos recebidos, classificados pelo conteúdo; um documento com cabeçalho fora do padrão pode não ter sido reconhecido.'],
  }
}
