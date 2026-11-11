import type { ClasseDocumental } from '../../../shared/contracts/triage.ts'
import type { AnexoTriado } from '../pipeline.ts'
import type { AnexoEsperado, CasoAvaliacao, Conjunto } from './casos.ts'
import { matrizDeConfusao, metricasPorCategoria, porcentagem, tabelaMatriz, tabelaMetricas, type Par } from './metrics.ts'

/** Avaliação da classificação documental (E4) contra o gabarito. */

/** Rótulo do gabarito para arquivo sem documento legível. */
export const SEM_DOCUMENTO = 'sem-documento'
export const INDETERMINADA = 'indeterminada'

export interface ResultadoClassificacao {
  caso: string
  conjunto: Conjunto
  anexo: string
  esperado: ClasseDocumental | typeof SEM_DOCUMENTO
  obtido: ClasseDocumental | typeof INDETERMINADA
  confianca: string
  justificativa: string
  /** Arquivo com mais de um documento: o sistema notou? */
  composto?: { esperado: ClasseDocumental[]; notado: boolean; classesNotadas: ClasseDocumental[] }
  /** Origem do erro, quando houver. */
  origemErro?: 'leitura-ocr' | 'classificacao'
  leitura: string
}

export function avaliarClassificacao(caso: CasoAvaliacao, esperado: AnexoEsperado, triado: AnexoTriado): ResultadoClassificacao {
  const obtido = triado.classificacao.contrato.classe
  const certo = (esperado.classe ?? SEM_DOCUMENTO) === obtido || (esperado.classe === null && obtido === INDETERMINADA)
  const leituraFraca = triado.lido.legibilidade !== 'legivel' && triado.lido.legibilidade !== 'nao-interpretado'
  return {
    caso: caso.id,
    conjunto: caso.conjunto,
    anexo: esperado.nome,
    esperado: esperado.classe ?? SEM_DOCUMENTO,
    obtido,
    confianca: triado.classificacao.contrato.confianca,
    justificativa: triado.classificacao.justificativa,
    ...(esperado.classesNoArquivo.length > 1
      ? {
          composto: {
            esperado: esperado.classesNoArquivo,
            notado: triado.classificacao.composto,
            classesNotadas: triado.classificacao.classesComEvidencia,
          },
        }
      : {}),
    ...(certo ? {} : { origemErro: leituraFraca ? ('leitura-ocr' as const) : ('classificacao' as const) }),
    leitura: `${triado.lido.legibilidade}${triado.lido.confiancaOcr !== undefined ? ` (OCR ${triado.lido.confiancaOcr})` : ''}`,
  }
}

/** Para as métricas, "sem documento" respondido como indeterminada é acerto (abstenção correta). */
function par(resultado: ResultadoClassificacao): Par<string> {
  return { esperado: resultado.esperado === SEM_DOCUMENTO ? INDETERMINADA : resultado.esperado, obtido: resultado.obtido }
}

export function secaoClassificacao(resultados: readonly ResultadoClassificacao[]): string[] {
  const linhas: string[] = ['## E4: classificação documental', '']
  for (const conjunto of ['desenvolvimento', 'validacao'] as const) {
    const doConjunto = resultados.filter((item) => item.conjunto === conjunto)
    if (doConjunto.length === 0) continue
    const pares = doConjunto.map(par)
    const comDocumento = doConjunto.filter((item) => item.esperado !== SEM_DOCUMENTO)
    const certos = doConjunto.filter((item) => !item.origemErro).length
    const abstencoes = comDocumento.filter((item) => item.obtido === INDETERMINADA).length
    const errosDeClasse = comDocumento.filter((item) => item.obtido !== INDETERMINADA && item.obtido !== item.esperado).length
    const semDocumento = doConjunto.filter((item) => item.esperado === SEM_DOCUMENTO)
    linhas.push(
      `### Conjunto de ${conjunto === 'validacao' ? 'validação' : 'desenvolvimento'} (${doConjunto.length} anexos)`,
      '',
      `- Classe igual ao gabarito: **${certos} de ${doConjunto.length}** (${porcentagem(certos / doConjunto.length)}).`,
      `- Anexos com documento: ${comDocumento.length}; abstenções (indeterminada): **${abstencoes}** (${porcentagem(comDocumento.length ? abstencoes / comDocumento.length : null)}); classe errada proposta: **${errosDeClasse}**.`,
      `- Arquivos sem documento legível: ${semDocumento.length}; classificados como indeterminada: ${semDocumento.filter((item) => item.obtido === INDETERMINADA).length}.`,
      '',
      ...tabelaMetricas(metricasPorCategoria(pares, INDETERMINADA), 'Classe'),
      '',
      '<details><summary>Matriz de confusão</summary>',
      '',
      ...tabelaMatriz(matrizDeConfusao(pares), 'esperado'),
      '',
      '</details>',
      '',
    )
    const compostos = doConjunto.filter((item) => item.composto)
    if (compostos.length > 0) {
      linhas.push('Documentos compostos (mais de um documento no mesmo arquivo):', '')
      for (const item of compostos) {
        linhas.push(`- ${item.caso}/${item.anexo}: esperado ${item.composto?.esperado.join(' + ')}; ${item.composto?.notado ? `notado (${item.composto.classesNotadas.join(', ')})` : '**não notado**'}.`)
      }
      linhas.push('')
    }
    const erros = doConjunto.filter((item) => item.origemErro)
    linhas.push(erros.length === 0 ? 'Nenhuma divergência do gabarito.' : 'Divergências do gabarito:', '')
    for (const item of erros) {
      linhas.push(`- ${item.caso}/${item.anexo}: esperado **${item.esperado}**, obtido **${item.obtido}** (origem: ${item.origemErro}; leitura ${item.leitura}). ${item.justificativa}`)
    }
    linhas.push('')
  }
  return linhas
}
