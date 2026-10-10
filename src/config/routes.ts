export const routes = {
  /** Início: seletor das ferramentas do AQR. */
  home: '/',
  /** Login (visual, sem autenticação real nesta etapa). */
  login: '/entrar',
  comparison: '/comparacao',
  comparisonWorkspace: '/comparacao/resultado',
  triage: '/triagem',
  /** Administração de contas (só quando o servidor a disponibiliza). */
  adminAccounts: '/administracao/contas',
  adminAudit: '/administracao/auditoria',
} as const
