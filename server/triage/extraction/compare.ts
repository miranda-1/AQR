import type { ClasseDocumental, Evidencia, NomeCampo } from '../../../shared/contracts/triage.ts'
import type { CampoDetalhado } from './extract.ts'
import { chaveDoCampo } from './extract.ts'
import { chaveDeTexto, modalidadeDoAssunto } from './normalize.ts'

/**
 * Comparação conservadora entre anexos (E5). Um valor só entra na comparação se foi encontrado
 * com confiança e sem ambiguidade; o resto fica registrado como inconclusivo. Divergência guarda
 * os dois valores, como estão nos documentos, com as evidências, e nunca diz qual está certo.
 * Campo não encontrado não é divergência: é ausência neste anexo.
 */

export interface ValorComparado {
  anexoId: string
  classe: ClasseDocumental | 'indeterminada'
  campoId: string
  valorBruto: string
  valorNormalizado?: string | number
  chave: string
  evidencias: Evidencia[]
}

export interface ValorInconclusivo {
  anexoId: string
  classe: ClasseDocumental | 'indeterminada'
  campoId: string
  estado: string
  motivo: string
}

export type ResultadoComparacao = 'coincide' | 'diverge' | 'inconclusivo' | 'insuficiente'

export interface Comparacao {
  campo: NomeCampo
  classes: readonly ClasseDocumental[]
  resultado: ResultadoComparacao
  /** Valores usados, agrupados pela chave de comparação. */
  grupos: ValorComparado[][]
  /** Pares de valores diferentes (um representante de cada grupo). */
  divergencias: [ValorComparado, ValorComparado][]
  inconclusivos: ValorInconclusivo[]
  /** Anexos das classes envolvidas em que o campo não foi encontrado. */
  ausentes: { anexoId: string; classe: ClasseDocumental | 'indeterminada' }[]
}

/** Confiança mínima do campo para entrar na comparação. */
export const CONFIANCA_MINIMA_COMPARACAO = 0.6

/** Chave de comparação: assunto compara pela modalidade nomeada quando há uma só; o resto, pela chave do campo. */
export function chaveDeComparacao(campo: NomeCampo, valorBruto: string): string {
  if (campo === 'assunto') {
    const modalidade = modalidadeDoAssunto(valorBruto)
    return modalidade ? `modalidade:${modalidade}` : `texto:${chaveDeTexto(valorBruto)}`
  }
  return chaveDoCampo(campo, valorBruto)
}

export function compararCampo(campos: readonly CampoDetalhado[], campo: NomeCampo, classes: readonly ClasseDocumental[]): Comparacao {
  const envolvidos = campos.filter((item) => item.contrato.campo === campo && item.classe !== 'indeterminada' && classes.includes(item.classe))
  const usados: ValorComparado[] = []
  const inconclusivos: ValorInconclusivo[] = []
  const ausentes: Comparacao['ausentes'] = []
  for (const item of envolvidos) {
    const { contrato } = item
    if (contrato.estado === 'nao-encontrado' || contrato.estado === 'nao-aplicavel') {
      ausentes.push({ anexoId: contrato.anexoId, classe: item.classe })
      continue
    }
    const base = { anexoId: contrato.anexoId, classe: item.classe, campoId: contrato.id, estado: contrato.estado }
    if (contrato.estado !== 'encontrado' || contrato.valorBruto === undefined) {
      inconclusivos.push({ ...base, motivo: contrato.estado === 'varios-valores' ? 'o anexo traz mais de um valor' : 'leitura incerta' })
      continue
    }
    if (contrato.alternativas && contrato.alternativas.length > 0) {
      inconclusivos.push({ ...base, motivo: 'valor com mais de uma leitura possível' })
      continue
    }
    if (contrato.confianca < CONFIANCA_MINIMA_COMPARACAO) {
      inconclusivos.push({ ...base, motivo: `confiança ${contrato.confianca.toFixed(2)} abaixo do mínimo` })
      continue
    }
    usados.push({
      anexoId: contrato.anexoId,
      classe: item.classe,
      campoId: contrato.id,
      valorBruto: contrato.valorBruto,
      ...(contrato.valorNormalizado !== undefined ? { valorNormalizado: contrato.valorNormalizado } : {}),
      chave: chaveDeComparacao(campo, contrato.valorBruto),
      evidencias: contrato.evidencias,
    })
  }
  const porChave = new Map<string, ValorComparado[]>()
  for (const valor of usados) porChave.set(valor.chave, [...(porChave.get(valor.chave) ?? []), valor])
  const grupos = [...porChave.values()]
  const divergencias: Comparacao['divergencias'] = []
  for (let i = 0; i < grupos.length; i += 1) {
    for (let j = i + 1; j < grupos.length; j += 1) {
      const a = grupos[i]?.[0]
      const b = grupos[j]?.[0]
      if (a && b) divergencias.push([a, b])
    }
  }
  const resultado: ResultadoComparacao =
    grupos.length > 1 ? 'diverge' : usados.length >= 2 ? 'coincide' : inconclusivos.length > 0 ? 'inconclusivo' : 'insuficiente'
  return { campo, classes, resultado, grupos, divergencias, inconclusivos, ausentes }
}

/** Comparações pedidas na E5 (e usadas pelas regras 018, 019, 020 e 021). */
export const COMPARACOES: { id: string; descricao: string; campo: NomeCampo; classes: ClasseDocumental[] }[] = [
  { id: 'matricula-req-memorial', descricao: 'Matrícula no requerimento × memorial', campo: 'matricula', classes: ['requerimento', 'memorial'] },
  { id: 'lote-prancha-memorial', descricao: 'Lote na prancha × memorial', campo: 'lote', classes: ['prancha', 'memorial'] },
  { id: 'rt-drt-art', descricao: 'Responsável técnico na DRT × ART/RRT', campo: 'rt-nome', classes: ['drt-01', 'drt-02-projeto', 'drt-02-implantacao', 'drt-03', 'art-rrt-similar'] },
  { id: 'assunto-req-drt', descricao: 'Assunto do requerimento × DRT', campo: 'assunto', classes: ['requerimento', 'drt-01', 'drt-02-projeto', 'drt-02-implantacao', 'drt-03'] },
  { id: 'datas-prancha-memorial', descricao: 'Data de revisão da prancha × memorial', campo: 'data-revisao', classes: ['prancha', 'memorial'] },
]
