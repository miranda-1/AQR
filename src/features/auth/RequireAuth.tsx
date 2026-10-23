import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { routes } from '@/config/routes'
import { useAuthSession } from './auth-session'

/** Estado de navegação levado ao login, para voltar à página pedida depois de entrar. */
export interface LoginRedirectState {
  from: string
}

/** Sem sessão, qualquer página leva ao login; depois de entrar, a pessoa volta para onde ia. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthSession()
  const location = useLocation()

  if (!isAuthenticated) {
    const state: LoginRedirectState = { from: `${location.pathname}${location.search}` }
    return <Navigate to={routes.login} replace state={state} />
  }
  return children
}

/** Destino depois do login: a página pedida, se for um caminho interno válido; senão, o início. */
export function destinationAfterLogin(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith(routes.login)) {
      return from
    }
  }
  return routes.home
}
