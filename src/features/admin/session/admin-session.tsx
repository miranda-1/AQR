import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuthSession } from '@/features/auth/auth-session'
import { createHttpAccountService } from '../services/http-account-service'
import type { AccountService, AdminStatus } from '../model/types'

/**
 * Disponibilidade da administração de contas. O servidor decide (`GET /api/admin/status`):
 * desligada por padrão, e ligada só no modo de desenvolvimento, na máquina local.
 */
export type AdminAvailability = 'checking' | 'available' | 'unavailable'

interface AdminSessionValue {
  availability: AdminAvailability
  /** Como o servidor autentica a administração; `real` provisiona o acesso no Keycloak. */
  mode: AdminStatus['mode'] | null
  service: AccountService
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null)

interface AdminSessionProviderProps {
  children: ReactNode
  /** Serviço explícito (testes). Sem ele, usa a API real, identificando a pessoa pelo nome do login. */
  service?: AccountService
}

export function AdminSessionProvider({ children, service: provided }: AdminSessionProviderProps) {
  const { userName } = useAuthSession()
  const service = useMemo(
    () => provided ?? createHttpAccountService({ getActor: () => userName }),
    [provided, userName],
  )
  const [availability, setAvailability] = useState<AdminAvailability>('checking')
  const [mode, setMode] = useState<AdminStatus['mode'] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    service
      .getStatus({ signal: controller.signal })
      .then((status) => {
        setMode(status.mode)
        setAvailability(status.available ? 'available' : 'unavailable')
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailability('unavailable')
      })
    return () => controller.abort()
  }, [service])

  const value = useMemo(() => ({ availability, mode, service }), [availability, mode, service])
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext)
  if (!value) throw new Error('useAdminSession precisa estar dentro de AdminSessionProvider')
  return value
}
