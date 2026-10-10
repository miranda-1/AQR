import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Sessão de acesso. Dois modos, escolhidos pelo servidor (`GET /api/auth/status`):
 * - "visual" (desenvolvimento): sem verificação; qualquer usuário e senha preenchidos entram e a
 *   sessão vale para a aba (sessionStorage).
 * - "keycloak": login real. A sessão é um cookie HttpOnly do servidor; o navegador nunca vê tokens.
 *   Aqui só perguntamos ao servidor quem está conectado (`GET /api/auth/me`).
 */
const STORAGE_KEY = 'aqr.sessao'

export type AuthMode = 'loading' | 'visual' | 'keycloak'

interface AuthSessionValue {
  mode: AuthMode
  isAuthenticated: boolean
  /** Nome exibido no botão de conta: o digitado (visual) ou o do cadastro (keycloak). */
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

interface ServerSession {
  mode: 'visual' | 'keycloak'
  userName: string | null
}

/** Pergunta ao servidor como a autenticação funciona e, no modo real, quem está conectado. */
async function loadServerSession(signal: AbortSignal): Promise<ServerSession> {
  try {
    const status = await fetch('/api/auth/status', { signal, credentials: 'same-origin' })
    const body: unknown = status.ok ? await status.json() : null
    const mode = typeof body === 'object' && body !== null && 'mode' in body && body.mode === 'keycloak' ? 'keycloak' : 'visual'
    if (mode === 'visual') return { mode, userName: null }
    const me = await fetch('/api/auth/me', { signal, credentials: 'same-origin' })
    if (!me.ok) return { mode, userName: null }
    const user: unknown = await me.json()
    const name = typeof user === 'object' && user !== null && 'nome' in user && typeof user.nome === 'string' ? user.nome : null
    return { mode, userName: name }
  } catch {
    // Servidor fora do ar (ou site aberto sem API): segue no modo visual, como antes.
    return { mode: 'visual', userName: null }
  }
}

interface AuthSessionProviderProps {
  children: ReactNode
  /** Estado inicial explícito (testes): modo visual, e com sessão o usuário é "servidor". Por padrão, consulta o servidor. */
  initialAuthenticated?: boolean
}

/** Nome usado quando a sessão é criada sem login (testes). */
const DEFAULT_TEST_USER = 'servidor'

export function AuthSessionProvider({ children, initialAuthenticated }: AuthSessionProviderProps) {
  const explicit = initialAuthenticated !== undefined
  const [mode, setMode] = useState<AuthMode>(explicit ? 'visual' : 'loading')
  const [userName, setUserName] = useState<string | null>(() => {
    if (!explicit) return null
    return initialAuthenticated ? DEFAULT_TEST_USER : null
  })

  useEffect(() => {
    if (explicit) return
    const controller = new AbortController()
    void loadServerSession(controller.signal).then((session) => {
      if (controller.signal.aborted) return
      setMode(session.mode)
      setUserName(session.mode === 'visual' ? readStoredSession() : session.userName)
    })
    return () => controller.abort()
  }, [explicit])

  const signIn = useCallback((name: string) => {
    const clean = name.trim()
    writeStoredSession(clean)
    setUserName(clean)
  }, [])

  const signOut = useCallback(() => {
    writeStoredSession(null)
    setUserName(null)
    if (mode !== 'keycloak') return
    // O servidor apaga a sessão e devolve o endereço que encerra a sessão também no Keycloak.
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .then(async (response) => {
        const body: unknown = response.ok ? await response.json() : null
        const url = typeof body === 'object' && body !== null && 'logoutUrl' in body && typeof body.logoutUrl === 'string' ? body.logoutUrl : null
        window.location.assign(url ?? '/entrar')
      })
      .catch(() => window.location.assign('/entrar'))
  }, [mode])

  const value = useMemo(
    () => ({ mode, isAuthenticated: userName !== null, userName, signIn, signOut }),
    [mode, userName, signIn, signOut],
  )
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession(): AuthSessionValue {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error('useAuthSession precisa estar dentro de AuthSessionProvider')
  return context
}
