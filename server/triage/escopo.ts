import type { Etapa, Modalidade } from '../../shared/contracts/triage.ts'

/**
 * Escopo operacional da triagem (B1): fonte única dos enquadramentos (modalidade × etapa) em que o
 * servidor executa a triagem. Os enums do contrato (`modalidades`, `etapas`) continuam com todo o
 * catálogo, porque também descrevem dados históricos e modalidades futuras; este escopo é outra
 * coisa: é o que tem implementação validada (regras, corpus sintético, gabaritos e validação
 * independente).
 *
 * Só desdobro na abertura. O catálogo também mapeia R, R/D e D/R na abertura para quase as mesmas
 * regras, mas as funções do motor foram escritas e avaliadas só com pacotes de desdobro; por isso
 * ficam de fora até serem homologadas.
 *
 * Para ampliar: acrescentar o par aqui, depois de validá-lo (o teste `escopo.test.ts` exige que
 * toda regra habilitada do par tenha função no motor ou seja garantia).
 *
 * Distinto da autorização (quem pode agir) e da validação do contrato (valor existe no catálogo):
 * aqui se decide só se o servidor sabe triar esse enquadramento.
 */
export interface EscopoSuportado {
  modalidade: Modalidade
  etapa: Etapa
  /** Como o escopo aparece nas mensagens para a pessoa. */
  descricao: string
}

export const ESCOPOS_SUPORTADOS: readonly EscopoSuportado[] = Object.freeze([{ modalidade: 'D', etapa: 'abertura', descricao: 'desdobro na abertura' }])

/** Código estável do erro (HTTP 422) para enquadramento fora do escopo. */
export const CODIGO_ESCOPO_NAO_SUPORTADO = 'ESCOPO_NAO_SUPORTADO'

/** O par tem triagem implementada? `indeterminado` nunca tem. */
export function escopoSuportado(modalidade: Modalidade | 'indeterminado', etapa: Etapa | 'indeterminado'): boolean {
  return ESCOPOS_SUPORTADOS.some((escopo) => escopo.modalidade === modalidade && escopo.etapa === etapa)
}

/** Modalidades que aparecem em algum escopo suportado (para o status e para confirmações isoladas). */
export function modalidadesSuportadas(): Modalidade[] {
  return [...new Set(ESCOPOS_SUPORTADOS.map((escopo) => escopo.modalidade))]
}

/** Etapas que aparecem em algum escopo suportado (para o status e para confirmações isoladas). */
export function etapasSuportadas(): Etapa[] {
  return [...new Set(ESCOPOS_SUPORTADOS.map((escopo) => escopo.etapa))]
}

/** Mensagem estável para a pessoa: o que houve e o que fazer. */
export function mensagemEscopoNaoSuportado(): string {
  const atendidos = ESCOPOS_SUPORTADOS.map((escopo) => escopo.descricao).join('; ')
  return `A triagem ainda não atende esse enquadramento de modalidade e etapa. Hoje ela verifica só: ${atendidos}. Para outros enquadramentos, faça a conferência manual. Processos já registrados continuam disponíveis para consulta.`
}
