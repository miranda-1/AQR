import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Sessão de acesso: só visual nesta etapa. Não há autenticação real. Qualquer usuário e senha
 * preenchidos entram. A sessão vale para a aba (sessionStorage) e termina ao fechá-la.
 */
const STORAGE_KEY = 'aqr.sessao'

interface AuthSessionValue {
  isAuthenticated: boolean
  signIn: () => void
  signOut: () => void
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null)

function readStoredSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'ativa'
  } catch {
    return false
  }
}

function writeStoredSession(active: boolean) {
  try {
    if (active) sessionStorage.setItem(STORAGE_KEY, 'ativa')
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem acesso ao armazenamento (ex.: navegação privada): a sessão vale só enquanto a página estiver aberta.
  }
}

interface AuthSessionProviderProps {
  children: ReactNode
  /** Estado inicial explícito (testes); por padrão, lê a sessão da aba. */
  initialAuthenticated?: boolean
}

export function AuthSessionProvider({ children, initialAuthenticated }: AuthSessionProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => initialAuthenticated ?? readStoredSession())

  const signIn = useCallback(() => {
    writeStoredSession(true)
    setIsAuthenticated(true)
  }, [])

  const signOut = useCallback(() => {
    writeStoredSession(false)
    setIsAuthenticated(false)
  }, [])

  const value = useMemo(() => ({ isAuthenticated, signIn, signOut }), [isAuthenticated, signIn, signOut])
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession(): AuthSessionValue {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error('useAuthSession precisa estar dentro de AuthSessionProvider')
  return context
}
