import {
  avaliacaoRegraSchema,
  processoTriagemSchema,
  TRIAGE_FORMAT_VERSION,
  type AvaliacaoRegra,
  type DefinicaoRegra,
  type Evidencia,
  type ProcessoTriagem,
} from '../../../shared/contracts/triage.ts'
import { podeExecutar, regrasAplicaveis, type CatalogoNormativo } from '../catalog/catalog.ts'
import type { AnexoTriado } from '../pipeline.ts'
import type { Confianca, ContextoRegra, EntradaTriagem, ResultadoDaRegra, ValorConflitante } from './context.ts'
import { verificarGarantias } from './guard.ts'
import { GARANTIAS, REGRAS } from './rules.ts'

/**
 * Motor determinístico de triagem (E6). Para a modalidade e a etapa do processo, pega as regras do
 * catálogo versionado e, para cada uma: hipótese não roda; garantia vira invariante; condição só
 * vale confirmada por servidor; regra executável roda sobre os anexos classificados e os campos
 * extraídos. Cada avaliação leva a versão da regra, a evidência, o fundamento do catálogo, a
 * confiança, as limitações e a revisão humana exigida.
 *
 * O resultado é verificação técnica experimental (catálogo não homologado): não tem decisão, não
 * gera comunicação e fica separado da futura revisão humana (`revisoes` vazio).
 */

export interface AvaliacaoDetalhada {
  contrato: AvaliacaoRegra
  nomeRegra: string
  confianca: Confianca
  limitacoes: string[]
  /** Revisão humana exigida pelo catálogo. */
  revisaoHumana: string
  valoresConflitantes: ValorConflitante[]
  anexos: string[]
}

export interface ResultadoTriagem {
  natureza: 'verificacao-tecnica-experimental'
  /** O catálogo não é homologado pela GCA: nada aqui tem efeito administrativo. */
  catalogoHomologado: false
  decisaoAdministrativa: null
  comunicacaoAoRequerente: 'bloqueada'
  processo: ProcessoTriagem
  avaliacoes: AvaliacaoDetalhada[]
  naoExecutadas: { regraId: string; motivo: string }[]
  garantias: { regraId: string; como: string }[]
  avisos: string[]
}

export function versaoDaRegra(catalogo: CatalogoNormativo, regra: DefinicaoRegra): string {
  return `${regra.id}@${catalogo.versao}+${catalogo.sha256.slice(0, 12)}`
}

const LIMITE_EVIDENCIAS = 20

function dedupe(evidencias: readonly Evidencia[]): Evidencia[] {
  const vistas = new Set<string>()
  return evidencias.filter((evidencia) => {
    const chave = JSON.stringify([evidencia.anexoId, evidencia.pagina, evidencia.regioes, evidencia.trecho])
    if (vistas.has(chave)) return false
    vistas.add(chave)
    return true
  })
}

/** Aviso fixo no começo de todo rascunho. */
const PREFIXO = 'Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). '

function montarAvaliacao(processoId: string, catalogo: CatalogoNormativo, regra: DefinicaoRegra, resultado: ResultadoDaRegra): AvaliacaoDetalhada {
  const contrato = avaliacaoRegraSchema.parse({
    id: `${processoId}:${regra.id}`,
    regraId: regra.id,
    regraVersao: versaoDaRegra(catalogo, regra),
    resultado: resultado.resultado,
    ...(resultado.resultado === 'achado' && resultado.tipo ? { tipo: resultado.tipo } : {}),
    severidade: regra.severidade,
    rascunho: `${PREFIXO}${resultado.rascunho}`.slice(0, 2000),
    ...(resultado.motivo ? { motivo: resultado.motivo.slice(0, 500) } : {}),
    camposUsados: resultado.camposUsados ?? [],
    condicoesPendentes: resultado.condicoesPendentes ?? [],
    evidencias: dedupe(resultado.evidencias ?? []).slice(0, LIMITE_EVIDENCIAS),
    ...(resultado.procura ? { procura: resultado.procura } : {}),
    fundamentos: regra.fontes,
  })
  return {
    contrato,
    nomeRegra: regra.nome,
    confianca: resultado.confianca,
    limitacoes: resultado.limitacoes ?? [],
    revisaoHumana: regra.revisaoHumana,
    valoresConflitantes: resultado.valoresConflitantes ?? [],
    anexos: resultado.anexos ?? [],
  }
}

/** Área extraída acima de 2 ha: só informação para o servidor; nunca ativa a regra 028 sozinha. */
function informacaoDeArea(anexos: readonly AnexoTriado[]): string | undefined {
  const areas = anexos.flatMap((anexo) => anexo.campos).filter((campo) => campo.contrato.campo === 'area' && campo.contrato.estado === 'encontrado' && typeof campo.contrato.valorNormalizado === 'number')
  const acima = areas.filter((campo) => (campo.contrato.valorNormalizado as number) > 20_000)
  if (acima.length === 0) return undefined
  return `Informação: área acima de 20.000 m² extraída em ${[...new Set(acima.map((campo) => campo.contrato.anexoId))].join(', ')}. Isso não ativa a regra; o enquadramento depende de confirmação do servidor.`
}

export interface OpcoesMotor {
  catalogo: CatalogoNormativo
}

export function executarTriagem(entrada: EntradaTriagem, anexos: readonly AnexoTriado[], opcoes: OpcoesMotor): ResultadoTriagem {
  const { catalogo } = opcoes
  const campos = anexos.flatMap((anexo) => anexo.campos)
  const avaliacoes: AvaliacaoDetalhada[] = []
  const naoExecutadas: ResultadoTriagem['naoExecutadas'] = []
  const garantias: ResultadoTriagem['garantias'] = []
  const avisos = ['Catálogo de regras não homologado pela GCA: as avaliações são verificações técnicas experimentais, sem efeito administrativo.']

  const modalidade = entrada.modalidade.valor
  const etapa = entrada.etapa.valor
  if (modalidade === 'indeterminado' || etapa === 'indeterminado') {
    avisos.push('Modalidade ou etapa indeterminada: nenhuma regra foi executada. O enquadramento é do servidor.')
  } else {
    if (entrada.modalidade.origem !== 'confirmado-servidor') avisos.push(`Modalidade ${modalidade} ${entrada.modalidade.origem === 'declarado' ? 'declarada pelo requerente' : 'proposta pelo sistema'}, sem confirmação de servidor.`)
    for (const regra of regrasAplicaveis(catalogo, modalidade, etapa)) {
      const garantia = GARANTIAS[regra.id]
      if (garantia) {
        garantias.push({ regraId: regra.id, como: garantia })
        continue
      }
      const execucao = podeExecutar(regra, entrada.condicoes)
      if (execucao.situacao === 'bloqueada') {
        naoExecutadas.push({ regraId: regra.id, motivo: execucao.motivo === 'hipotese' ? 'Hipótese desativada: depende de ato ou instrução escrita da GCA.' : 'Regra desabilitada no catálogo.' })
        continue
      }
      let resultado: ResultadoDaRegra
      if (execucao.situacao === 'condicao-pendente') {
        const informacao = regra.id === 'AQR-GCA-028' ? informacaoDeArea(anexos) : undefined
        resultado = {
          resultado: 'condicao-pendente',
          condicoesPendentes: execucao.pendentes,
          rascunho: `Regra aguardando confirmação de servidor (${execucao.pendentes.join(', ')}). Pré-condição do catálogo: "${regra.preCondicao}".${informacao ? ` ${informacao}` : ''}`,
          confianca: 'baixa',
          limitacoes: ['Sem a confirmação, a regra não é executada.'],
        }
      } else if (execucao.situacao === 'nao-aplicavel') {
        resultado = { resultado: 'nao-aplicavel', motivo: `Servidor confirmou que a condição não se cumpre (${execucao.condicoesFalsas.join(', ')}).`, rascunho: 'Condição confirmada como não cumprida pelo servidor: regra não se aplica.', confianca: 'alta' }
      } else {
        const funcao = REGRAS[regra.id]
        const ctx: ContextoRegra = { entrada, anexos, campos, regra, versaoRegra: versaoDaRegra(catalogo, regra) }
        resultado = funcao
          ? funcao(ctx)
          : { resultado: 'nao-avaliavel', motivo: 'Regra sem implementação nesta fase.', rascunho: 'Regra do catálogo ainda não implementada no motor; conferência manual.', confianca: 'baixa' }
      }
      avaliacoes.push(montarAvaliacao(entrada.processoId, catalogo, regra, resultado))
    }
  }

  const processo = processoTriagemSchema.parse({
    formato: TRIAGE_FORMAT_VERSION,
    id: entrada.processoId,
    referencia: entrada.referencia,
    protocoladoEm: entrada.protocoladoEm,
    modalidade: entrada.modalidade,
    etapa: entrada.etapa,
    integridadeDoPacote: entrada.integridadeDoPacote,
    condicoes: entrada.condicoes,
    catalogo: { versao: catalogo.versao, sha256: catalogo.sha256 },
    situacao: 'aguardando-revisao',
    anexos: anexos.map((anexo) => anexo.contrato),
    campos: campos.map((campo) => campo.contrato),
    avaliacoes: avaliacoes.map((avaliacao) => avaliacao.contrato),
    revisoes: [],
    criadoPor: entrada.criadoPor,
    criadoEm: entrada.criadoEm,
  } satisfies ProcessoTriagem)

  const resultado: ResultadoTriagem = {
    natureza: 'verificacao-tecnica-experimental',
    catalogoHomologado: false,
    decisaoAdministrativa: null,
    comunicacaoAoRequerente: 'bloqueada',
    processo,
    avaliacoes,
    naoExecutadas,
    garantias,
    avisos,
  }
  const problemas = verificarGarantias(resultado)
  if (problemas.length > 0) throw new Error(`Resultado da triagem viola as garantias 040/041: ${problemas.join(' | ')}`)
  return resultado
}
