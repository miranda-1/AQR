/**
 * Contratos da administração de contas, compartilhados pelo frontend e pelo servidor.
 * Só dados puros. As regras de validação dos campos ficam em `shared/validation/account.ts`.
 */

export type AccountRole = 'administrador' | 'analista'
export type AccountStatus = 'ativa' | 'inativa'

export const accountRoles: readonly AccountRole[] = ['administrador', 'analista']
export const accountStatuses: readonly AccountStatus[] = ['ativa', 'inativa']

export interface Account {
  id: string
  /** Login institucional: único, minúsculo e imutável. */
  usuario: string
  nome: string
  email: string | null
  papel: AccountRole
  situacao: AccountStatus
  criadaEm: string
  atualizadaEm: string
  desativadaEm: string | null
  /** Aumenta a cada alteração; enviada de volta para detectar edições simultâneas. */
  versao: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type AccountPage = Page<Account>

export interface AccountQuery {
  /** Busca por usuário, nome ou e-mail. */
  q?: string
  papel?: AccountRole
  situacao?: AccountStatus
  page?: number
  pageSize?: number
}

export interface CreateAccountInput {
  usuario: string
  nome: string
  email: string | null
  papel: AccountRole
}

export interface UpdateAccountInput {
  nome: string
  email: string | null
  papel: AccountRole
  versao: number
}

export interface StatusChangeInput {
  versao: number
  motivo?: string
}

export type AuditAction =
  | 'conta.criada'
  | 'conta.editada'
  | 'conta.papel_alterado'
  | 'conta.desativada'
  | 'conta.reativada'

export type ActorOrigin = 'dev' | 'real' | 'sistema'

export type AuditSnapshot = Partial<Pick<Account, 'usuario' | 'nome' | 'email' | 'papel' | 'situacao'>>

export interface AuditEvent {
  id: string
  ocorridoEm: string
  ator: { id: string | null; rotulo: string; origem: ActorOrigin }
  acao: AuditAction
  alvo: { tipo: 'conta'; id: string; rotulo: string }
  detalhes: { antes?: AuditSnapshot; depois?: AuditSnapshot; motivo?: string }
}

export type AuditPage = Page<AuditEvent>

export interface AuditQuery {
  contaId?: string
  acao?: AuditAction
  page?: number
  pageSize?: number
}

/**
 * Disponibilidade da administração. "disabled": desligada (padrão; sempre em produção até haver
 * autenticação real). "dev": só na máquina local, identificando a pessoa pelo cabeçalho
 * `X-AQR-Dev-Actor`.
 */
export interface AdminStatus {
  available: boolean
  mode: 'disabled' | 'dev' | 'real'
}

/** Quem está usando a administração, como o servidor a identificou. */
export interface CurrentAdmin {
  id: string
  usuario: string
  nome: string
  papel: AccountRole
  origem: 'dev' | 'real'
}

/** Cabeçalho que identifica a pessoa no modo de desenvolvimento (sem autenticação real). */
export const DEV_ACTOR_HEADER = 'x-aqr-dev-actor'
