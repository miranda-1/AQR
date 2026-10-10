import { CircleCheck, CircleOff, Shield, User } from 'lucide-react'
import type { AccountRole, AccountStatus } from '../model/types'

export const roleLabel: Record<AccountRole, string> = { administrador: 'Administrador', analista: 'Analista' }
export const statusLabel: Record<AccountStatus, string> = { ativa: 'Ativa', inativa: 'Desativada' }

/** Papel com ícone e rótulo (a cor nunca é o único indicador). */
export function RoleBadge({ role }: { role: AccountRole }) {
  const Icon = role === 'administrador' ? Shield : User
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink">
      <Icon aria-hidden className="size-4 text-brand" />
      {roleLabel[role]}
    </span>
  )
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  const active = status === 'ativa'
  const Icon = active ? CircleCheck : CircleOff
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ${
        active ? 'bg-addition-bg text-addition' : 'bg-surface-sunken text-muted-foreground'
      }`}
    >
      <Icon aria-hidden className="size-4" />
      {statusLabel[status]}
    </span>
  )
}
