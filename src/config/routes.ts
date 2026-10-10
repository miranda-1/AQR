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
  adminAccountNew: '/administracao/contas/nova',
  adminAccount: (id: string) => `/administracao/contas/${encodeURIComponent(id)}`,
  adminAudit: '/administracao/auditoria',
  /** Registros de acesso e uso da comparação (só com o login real). */
  adminRecords: '/administracao/registros',
} as const
