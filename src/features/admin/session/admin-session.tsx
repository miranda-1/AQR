import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuthSession } from '@/features/auth/auth-session'
import { createHttpAccountService } from '../services/http-account-service'
import type { AccountService } from '../model/types'

/**
 * Disponibilidade da administração de contas. O servidor decide (`GET /api/admin/status`):
 * desligada por padrão, e ligada só no modo de desenvolvimento, na máquina local.
 */
export type AdminAvailability = 'checking' | 'available' | 'unavailable'

interface AdminSessionValue {
  availability: AdminAvailability
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

  useEffect(() => {
    const controller = new AbortController()
    service
      .getStatus({ signal: controller.signal })
      .then((status) => setAvailability(status.available ? 'available' : 'unavailable'))
      .catch(() => {
        if (!controller.signal.aborted) setAvailability('unavailable')
      })
    return () => controller.abort()
  }, [service])

  const value = useMemo(() => ({ availability, service }), [availability, service])
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext)
  if (!value) throw new Error('useAdminSession precisa estar dentro de AdminSessionProvider')
  return value
}
