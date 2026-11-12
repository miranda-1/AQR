import type { ClasseDocumental, Evidencia } from '../../../shared/contracts/triage.ts'
import type { CampoDetalhado } from '../extraction/extract.ts'
import { normalizarCodigo, normalizarIdentificador } from '../extraction/normalize.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { anexosDaClasse, type ContextoRegra } from './context.ts'

/**
 * Representação dos imóveis do pacote (E6.1): o que o requerimento declara (matrículas e lotes) e
 * como cada título registral e cada documento de inscrição se liga a essas declarações, só pela
 * igualdade do número normalizado (matrícula sem separadores, lote em maiúsculas, zeros à esquerda
 * mantidos). Não infere propriedade, cadeia dominial nem validade registral: diz apenas "há título
 * com este número" ou "não há".
 */

/** Um valor como impresso, com o normalizado e a evidência da própria ocorrência. */
export interface ValorDeclarado {
  bruto: string
  valor?: string
  evidencia?: Evidencia
}

export interface Declaracao {
  /** Valores normalizados, na ordem em que aparecem. */
  valores: string[]
  itens: ValorDeclarado[]
  /** Como estão no documento. */
  brutos: string[]
  evidencias: Evidencia[]
  campoIds: string[]
  /** O requerimento traz o campo, mas ilegível ou incerto. */
  incerta: boolean
}

export interface Vinculo {
  anexoId: string
  /** Número normalizado do documento, quando lido com segurança. */
  valor?: string
  /** O número como impresso no documento. */
  valorBruto?: string
  /** O documento traz mais de um número, ou leitura incerta. */
  incerto: boolean
  evidencias: Evidencia[]
}

/** Linhas do quadro de correspondência: cada valor declarado e cada documento, como impressos. */
export function linhasDoQuadro(declarados: Declaracao, documentos: readonly Vinculo[], classe: ClasseDocumental, campo: 'matricula' | 'lote') {
  return [
    ...declarados.itens.map((item) => ({ anexoId: item.evidencia?.anexoId ?? declarados.evidencias[0]?.anexoId ?? '', classe: 'requerimento', campoId: declarados.campoIds[0] ?? '', valorBruto: item.bruto, evidencias: item.evidencia ? [item.evidencia] : [] })),
    ...documentos.flatMap((documento) => (documento.valorBruto ? [{ anexoId: documento.anexoId, classe, campoId: `${documento.anexoId}:${campo}`, valorBruto: documento.valorBruto, evidencias: documento.evidencias }] : [])),
  ]
}

export interface MapaImoveis {
  matriculas: Declaracao
  lotes: Declaracao
  titulos: Vinculo[]
  inscricoes: Vinculo[]
  /** Mais de um imóvel declarado ou títulos com números diferentes. */
  varios: boolean
}

function normalizar(campo: 'matricula' | 'lote', bruto: string): string | undefined {
  const resultado = campo === 'matricula' ? normalizarIdentificador(bruto) : normalizarCodigo(bruto)
  return resultado?.situacao === 'normalizado' ? String(resultado.valor) : undefined
}

function declaracao(campos: readonly CampoDetalhado[], campo: 'matricula' | 'lote'): Declaracao {
  const itens: ValorDeclarado[] = []
  const evidencias: Evidencia[] = []
  const campoIds: string[] = []
  let incerta = false
  for (const item of campos.filter((detalhe) => detalhe.contrato.campo === campo)) {
    const { contrato } = item
    if (contrato.estado === 'ilegivel') {
      incerta = true
      continue
    }
    if (contrato.estado !== 'encontrado' && contrato.estado !== 'varios-valores') continue
    campoIds.push(contrato.id)
    evidencias.push(...contrato.evidencias.slice(0, 2))
    // No requerimento, vários números declarados são uma lista de imóveis, não ambiguidade. Cada
    // valor leva a evidência da sua ocorrência (as evidências seguem a ordem das ocorrências).
    const brutos = contrato.estado === 'encontrado' && contrato.valorBruto ? [contrato.valorBruto] : (contrato.alternativas ?? [])
    for (const bruto of brutos) {
      const indice = item.ocorrencias.findIndex((ocorrencia) => ocorrencia.valorBruto === bruto)
      const evidencia = indice >= 0 ? contrato.evidencias[indice] : undefined
      const valor = normalizar(campo, bruto)
      if (valor === undefined) incerta = true
      itens.push({ bruto, ...(valor ? { valor } : {}), ...(evidencia ? { evidencia } : {}) })
    }
  }
  const valores = [...new Set(itens.flatMap((item) => (item.valor ? [item.valor] : [])))]
  return { valores, itens, brutos: itens.map((item) => item.bruto), evidencias, campoIds, incerta }
}

function vinculo(ctx: ContextoRegra, anexo: AnexoTriado, campo: 'matricula' | 'lote'): Vinculo {
  const detalhe = ctx.campos.find((item) => item.contrato.anexoId === anexo.lido.id && item.contrato.campo === campo)?.contrato
  const valor = detalhe?.estado === 'encontrado' && detalhe.valorBruto && !detalhe.alternativas?.length ? normalizar(campo, detalhe.valorBruto) : undefined
  return {
    anexoId: anexo.lido.id,
    ...(valor && detalhe?.valorBruto ? { valor, valorBruto: detalhe.valorBruto } : {}),
    incerto: valor === undefined,
    evidencias: detalhe?.evidencias.slice(0, 1) ?? [],
  }
}

export function mapaDeImoveis(ctx: ContextoRegra): MapaImoveis {
  const doRequerimento = (classe: ClasseDocumental) => {
    const ids = new Set(anexosDaClasse(ctx, classe).map((anexo) => anexo.lido.id))
    return ctx.campos.filter((campo) => ids.has(campo.contrato.anexoId))
  }
  const requerimento = doRequerimento('requerimento')
  const matriculas = declaracao(requerimento, 'matricula')
  const lotes = declaracao(requerimento, 'lote')
  const titulos = anexosDaClasse(ctx, 'matricula-transcricao').map((anexo) => vinculo(ctx, anexo, 'matricula'))
  const inscricoes = anexosDaClasse(ctx, 'inscricao-imobiliaria').map((anexo) => vinculo(ctx, anexo, 'lote'))
  const numerosDosTitulos = new Set(titulos.flatMap((titulo) => (titulo.valor ? [titulo.valor] : [])))
  return { matriculas, lotes, titulos, inscricoes, varios: matriculas.valores.length > 1 || lotes.valores.length > 1 || numerosDosTitulos.size > 1 }
}

export interface Correspondencia {
  /** Declarados sem documento com o mesmo número. */
  semDocumento: string[]
  /** Documentos cujo número não está entre os declarados. */
  naoDeclarados: Vinculo[]
  /** Documentos sem número lido com segurança: impedem concluir lacuna. */
  incertos: Vinculo[]
}

/** Liga cada valor declarado aos documentos com o mesmo número. */
export function corresponder(declarados: Declaracao, documentos: readonly Vinculo[]): Correspondencia {
  const numeros = new Set(documentos.flatMap((documento) => (documento.valor ? [documento.valor] : [])))
  return {
    semDocumento: declarados.valores.filter((valor) => !numeros.has(valor)),
    naoDeclarados: documentos.filter((documento) => documento.valor !== undefined && !declarados.valores.includes(documento.valor)),
    incertos: documentos.filter((documento) => documento.incerto),
  }
}
