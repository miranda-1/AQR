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
   * Nesta branch (`master`, só frontend) a comparação é sempre demonstrativa: a interface exibe os
   * avisos de protótipo e usa dados fictícios. A comparação real fica na branch `dev`.
   */
  isPrototype: true,
} as const
