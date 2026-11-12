import { contemDocumentoPessoal, contemPalavraDeDecisao } from '../../../shared/contracts/triage.ts'
import type { ResultadoTriagem } from './engine.ts'

/**
 * Garantias AQR-GCA-040 (sem decisão automática) e AQR-GCA-041 (proteção de dados na evidência).
 * Não são regras sobre documentos: valem para todo resultado do motor.
 */

/** Ações administrativas que o sistema nunca executa nem prepara como ato. */
export const ACOES_ADMINISTRATIVAS = ['aprovar', 'deferir', 'indeferir', 'arquivar', 'anuir', 'notificar-requerente', 'enviar-comunicacao'] as const
export type AcaoAdministrativa = (typeof ACOES_ADMINISTRATIVAS)[number]

export class DecisaoAutomaticaBloqueada extends Error {
  override name = 'DecisaoAutomaticaBloqueada'
  readonly acao: string

  constructor(acao: string) {
    super(`Ação "${acao}" bloqueada (AQR-GCA-040): a triagem produz verificação técnica para revisão; a decisão e a comunicação são do servidor competente, fora do sistema de triagem.`)
    this.acao = acao
  }
}

/**
 * Único caminho de "resultado → ato" e ele sempre recusa. Existe para que nenhum código futuro
 * transforme o resultado em decisão sem passar por aqui e sem mudar esta garantia de propósito.
 */
export function converterEmDecisao(_resultado: ResultadoTriagem, acao: AcaoAdministrativa | string): never {
  throw new DecisaoAutomaticaBloqueada(acao)
}

/** Textos livres que o resultado expõe ao servidor. */
function textos(resultado: ResultadoTriagem): { onde: string; texto: string }[] {
  return [
    ...resultado.avaliacoes.flatMap((avaliacao) => [
      { onde: `${avaliacao.contrato.regraId}.rascunho`, texto: avaliacao.contrato.rascunho },
      { onde: `${avaliacao.contrato.regraId}.motivo`, texto: avaliacao.contrato.motivo ?? '' },
      ...avaliacao.limitacoes.map((texto) => ({ onde: `${avaliacao.contrato.regraId}.limitacao`, texto })),
      ...avaliacao.contrato.evidencias.map((evidencia) => ({ onde: `${avaliacao.contrato.regraId}.evidencia`, texto: evidencia.trecho ?? '' })),
    ]),
    ...resultado.avisos.map((texto) => ({ onde: 'aviso', texto })),
  ]
}

/** Confere as garantias num resultado; devolve os problemas (vazio quando tudo confere). */
export function verificarGarantias(resultado: ResultadoTriagem): string[] {
  const problemas: string[] = []
  if (resultado.decisaoAdministrativa !== null) problemas.push('O resultado carrega uma decisão administrativa.')
  if (resultado.comunicacaoAoRequerente !== 'bloqueada') problemas.push('A comunicação ao requerente não está bloqueada.')
  for (const { onde, texto } of textos(resultado)) {
    if (contemPalavraDeDecisao(texto)) problemas.push(`${onde}: palavra de decisão administrativa.`)
    if (contemDocumentoPessoal(texto)) problemas.push(`${onde}: CPF ou CNPJ sem máscara.`)
  }
  for (const avaliacao of resultado.avaliacoes) {
    // Rascunho genérico não leva valor de campo: os valores ficam no quadro, com a evidência.
    for (const conflito of avaliacao.valoresConflitantes) {
      for (const valor of conflito.valores) {
        if (valor.valorBruto.length >= 3 && avaliacao.contrato.rascunho.includes(valor.valorBruto)) {
          problemas.push(`${avaliacao.contrato.regraId}: o rascunho repete um valor de campo; deve citar só o campo e as peças.`)
        }
      }
    }
  }
  return problemas
}

/**
 * Resumo para log técnico: contagens e identificadores de regra, sem trecho, valor de campo, nome
 * de arquivo ou de pessoa (AQR-GCA-041).
 */
export function resumoParaLog(resultado: ResultadoTriagem): Record<string, unknown> {
  const porResultado: Record<string, number> = {}
  for (const avaliacao of resultado.avaliacoes) porResultado[avaliacao.contrato.resultado] = (porResultado[avaliacao.contrato.resultado] ?? 0) + 1
  return {
    processo: resultado.processo.id,
    catalogo: resultado.processo.catalogo.versao,
    anexos: resultado.processo.anexos.length,
    porResultado,
    achados: resultado.avaliacoes.filter((avaliacao) => avaliacao.contrato.resultado === 'achado').map((avaliacao) => avaliacao.contrato.regraId),
    naoExecutadas: resultado.naoExecutadas.map((item) => item.regraId),
  }
}
