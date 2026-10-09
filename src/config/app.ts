import { comparisonConfig } from './comparison'

/** Configurações gerais da aplicação. Valores institucionais não devem ser inventados aqui. */
export const appConfig = {
  name: 'AQR',
  fullName: 'Análise e Qualificação de Requerimentos',
  organization: {
    short: 'SEMADES',
    long: 'Secretaria Municipal de Meio Ambiente, Gestão Urbana e Desenvolvimento Econômico, Turístico e Sustentável',
    municipality: 'Prefeitura Municipal de Campo Grande',
  },
  /**
   * true só no modo demonstrativo (`VITE_COMPARISON_SERVICE=demo`): a interface exibe avisos de
   * protótipo e usa dados fictícios. Com a comparação real, os avisos somem.
   */
  isPrototype: comparisonConfig.serviceMode === 'demo',
} as const
