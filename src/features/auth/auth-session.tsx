import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Sessão de acesso, só no navegador. O login é fictício (`demo-login.ts`): confere um usuário e uma
 * senha genéricos, sem servidor, e a sessão vale para a aba (sessionStorage) até ela ser fechada.
 * O login real (Keycloak) fica na branch `dev`.
 */
const STORAGE_KEY = 'aqr.sessao'

interface AuthSessionValue {
  isAuthenticated: boolean
  /** Nome exibido no botão de conta (o usuário digitado no login). */
  userName: string | null
  signIn: (userName: string) => void
  signOut: () => void
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null)

function readStoredSession(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

function writeStoredSession(userName: string | null) {
  try {
    if (userName) sessionStorage.setItem(STORAGE_KEY, userName)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem acesso ao armazenamento (ex.: navegação privada): a sessão vale só enquanto a página estiver aberta.
  }
}

interface AuthSessionProviderProps {
  children: ReactNode
  /** Estado inicial explícito (testes): com sessão, o usuário é "servidor". Por padrão, lê a sessão da aba. */
  initialAuthenticated?: boolean
}

/** Nome usado quando a sessão é criada sem login (testes). */
const DEFAULT_TEST_USER = 'servidor'

export function AuthSessionProvider({ children, initialAuthenticated }: AuthSessionProviderProps) {
  const [userName, setUserName] = useState<string | null>(() => {
    if (initialAuthenticated === undefined) return readStoredSession()
    return initialAuthenticated ? DEFAULT_TEST_USER : null
  })

  const signIn = useCallback((name: string) => {
    const clean = name.trim()
    writeStoredSession(clean)
    setUserName(clean)
  }, [])

  const signOut = useCallback(() => {
    writeStoredSession(null)
    setUserName(null)
  }, [])

  const value = useMemo(
    () => ({ isAuthenticated: userName !== null, userName, signIn, signOut }),
    [userName, signIn, signOut],
  )
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession(): AuthSessionValue {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error('useAuthSession precisa estar dentro de AuthSessionProvider')
  return context
}
