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
  /** Só nas respostas de alteração: algo no Keycloak não foi concluído (a conta do AQR foi alterada). */
  aviso?: string
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

export const accessEventTypes = [
  'login.ok',
  'login.sem_conta',
  'login.conta_inativa',
  'login.falha',
  'login.vinculo_pendente',
  'login.vinculo_divergente',
  'logout',
  'identidade.criada',
  'identidade.convite_enviado',
  'identidade.senha_redefinicao_enviada',
  'identidade.bloqueada',
  'identidade.reativada',
  'identidade.sincronizada',
  'identidade.vinculada',
  'identidade.falha',
] as const

export type AccessEventType = (typeof accessEventTypes)[number]

/** Registro de acesso (login, logout, identidade no Keycloak). Só leitura, só administradores. */
export interface AccessEvent {
  id: string
  ocorridoEm: string
  evento: AccessEventType
  /** Usuário informado no login, ou o da conta. */
  usuario: string | null
  contaId: string | null
  /** Quem agiu, nos passos feitos por um administrador (`null` no próprio login). */
  ator: { id: string; usuario: string | null } | null
  ip: string | null
  detalhe: string | null
}

export type AccessEventPage = Page<AccessEvent>

export interface AccessEventQuery {
  evento?: AccessEventType
  usuario?: string
  page?: number
  pageSize?: number
}

/** Uso da comparação de PDFs por pessoa (nada do conteúdo nem os nomes dos arquivos). */
export interface ComparisonUsage {
  contaId: string | null
  usuario: string | null
  nome: string | null
  /** Comparações enviadas no período guardado (até 1 ano). */
  total: number
  ultimos30Dias: number
  concluidas: number
  falhas: number
  ultimaEm: string
}
