import type {
  AccessEventPage,
  AccessEventQuery,
  ComparisonUsage,
  Account,
  AccountPage,
  AccountQuery,
  AdminStatus,
  AuditPage,
  AuditQuery,
  CreateAccountInput,
  StatusChangeInput,
  UpdateAccountInput,
} from '../../../../shared/contracts/admin'

export type {
  AccessEvent,
  AccessEventPage,
  AccessEventQuery,
  AccessEventType,
  ComparisonUsage,
  Account,
  AccountPage,
  AccountQuery,
  AccountRole,
  AccountStatus,
  AdminStatus,
  AuditAction,
  AuditEvent,
  AuditPage,
  AuditQuery,
  CreateAccountInput,
  StatusChangeInput,
  UpdateAccountInput,
} from '../../../../shared/contracts/admin'

/** Erro de uma operação de contas, com mensagem pronta para a interface (pt-BR). */
export class AccountServiceError extends Error {
  override name = 'AccountServiceError'
  readonly status: number
  readonly code: string
  /** Mensagem por campo (usuário, nome, e-mail…), quando o servidor aponta onde está o problema. */
  readonly fields: Record<string, string> | undefined

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export interface RequestOptions {
  signal?: AbortSignal
}

/**
 * Contrato da administração de contas no frontend (mesmo padrão de `ComparisonService`).
 * Implementado por `createHttpAccountService` e, nos testes, por `createInMemoryAccountService`.
 * As operações rejeitam com `AccountServiceError`.
 */
export interface AccountService {
  getStatus: (options?: RequestOptions) => Promise<AdminStatus>
  listAccounts: (query?: AccountQuery, options?: RequestOptions) => Promise<AccountPage>
  getAccount: (id: string, options?: RequestOptions) => Promise<Account>
  createAccount: (input: CreateAccountInput) => Promise<Account>
  updateAccount: (id: string, input: UpdateAccountInput) => Promise<Account>
  deactivateAccount: (id: string, input: StatusChangeInput) => Promise<Account>
  reactivateAccount: (id: string, input: StatusChangeInput) => Promise<Account>
  /** Envia à pessoa, por e-mail (pelo AQR), o link para a página do AQR onde ela define a senha. */
  sendPasswordLink: (id: string) => Promise<void>
  /** Alinha o sistema de login (Keycloak) com a conta (cria o acesso de contas antigas, corrige bloqueio e dados). */
  syncIdentity: (id: string) => Promise<Account>
  listAudit: (query?: AuditQuery, options?: RequestOptions) => Promise<AuditPage>
  /** Registros de acesso (login real). */
  listAccessEvents: (query?: AccessEventQuery, options?: RequestOptions) => Promise<AccessEventPage>
  /** Quantas comparações cada pessoa fez (login real; sem conteúdo nem nomes de arquivo). */
  listComparisonUsage: (options?: RequestOptions) => Promise<ComparisonUsage[]>
}
