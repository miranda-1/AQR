import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SESSION_ENDED_EVENT } from './session-events'

/**
 * Sessão de acesso. Dois modos, escolhidos pelo servidor (`GET /api/auth/status`):
 * - "visual" (desenvolvimento): sem verificação; qualquer usuário e senha preenchidos entram e a
 *   sessão vale para a aba (sessionStorage).
 * - "keycloak": login real. A sessão é um cookie HttpOnly do servidor; o navegador nunca vê tokens.
 *   Aqui só perguntamos ao servidor quem está conectado (`GET /api/auth/me`).
 */
const STORAGE_KEY = 'aqr.sessao'

/** `unavailable`: não foi possível confirmar o login real (só em produção; nunca cai no login visual). */
export type AuthMode = 'loading' | 'visual' | 'keycloak' | 'unavailable'

interface AuthSessionValue {
  mode: AuthMode
  isAuthenticated: boolean
  /** A sessão do login real terminou sozinha (inatividade, limite de 8 h ou conta desativada). */
  sessionExpired: boolean
  /** Nome exibido no botão de conta: o digitado (visual) ou o do cadastro (keycloak). */
  userName: string | null
  /** Só no login real: página do Keycloak para receber por e-mail o link de nova senha. */
  recoverPasswordUrl: string | null
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
  mode: 'visual' | 'keycloak' | 'unavailable'
  userName: string | null
  recoverPasswordUrl?: string | null
}

/** Pergunta ao servidor como a autenticação funciona e, no modo real, quem está conectado. */
async function loadServerSession(signal: AbortSignal): Promise<ServerSession> {
  try {
    const status = await fetch('/api/auth/status', { signal, credentials: 'same-origin' })
    const body: unknown = status.ok ? await status.json() : null
    const mode = typeof body === 'object' && body !== null && 'mode' in body && body.mode === 'keycloak' ? 'keycloak' : 'visual'
    // Em produção o login visual nunca vale, nem que o servidor o anuncie.
    if (mode === 'visual') return { mode: import.meta.env.PROD ? 'unavailable' : 'visual', userName: null }
    const recoverPasswordUrl =
      typeof body === 'object' && body !== null && 'recuperarSenhaUrl' in body && typeof body.recuperarSenhaUrl === 'string' && /^https?:\/\//u.test(body.recuperarSenhaUrl)
        ? body.recuperarSenhaUrl
        : null
    const me = await fetch('/api/auth/me', { signal, credentials: 'same-origin' })
    if (!me.ok) return { mode, userName: null, recoverPasswordUrl }
    const user: unknown = await me.json()
    const name = typeof user === 'object' && user !== null && 'nome' in user && typeof user.nome === 'string' ? user.nome : null
    return { mode, userName: name, recoverPasswordUrl }
  } catch {
    // Servidor fora do ar: em desenvolvimento segue no modo visual; em produção falha fechado.
    return { mode: import.meta.env.PROD ? 'unavailable' : 'visual', userName: null }
  }
}

/** Atividade da pessoa que mantém a sessão aberta (o servidor só conta pedidos). */
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const
/** Com atividade, avisa o servidor no máximo a cada minuto. */
const ACTIVITY_PING_MS = 60_000
/** De quanto em quanto tempo confere se a sessão ainda vale (sem contar como uso). */
const CLOCK_CHECK_MS = 60_000

/**
 * No login real, a sessão cai depois de 30 min sem uso (e 8 h depois do login). Aqui a atividade da
 * pessoa na página (cliques, teclas, rolagem) conta como uso, e o relógio da sessão é conferido a cada
 * minuto: quando ela termina, `onExpired` leva de volta ao login.
 */
function useSessionKeepAlive(active: boolean, onExpired: () => void) {
  useEffect(() => {
    if (!active) return
    let lastPing = Date.now()
    let stopped = false
    const ask = (url: string) => {
      void fetch(url, { credentials: 'same-origin', cache: 'no-store' })
        .then((response) => {
          if (!stopped && response.status === 401) onExpired()
        })
        .catch(() => undefined) // Sem rede: tenta de novo na próxima conferência.
    }
    const onActivity = () => {
      if (Date.now() - lastPing < ACTIVITY_PING_MS) return
      lastPing = Date.now()
      ask('/api/auth/me')
    }
    const checkClock = () => ask('/api/auth/sessao')
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkClock()
    }
    // Qualquer pedido recusado com 401 (comparação, administração) encerra na hora.
    const onEnded = () => {
      if (!stopped) onExpired()
    }
    window.addEventListener(SESSION_ENDED_EVENT, onEnded)
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true })
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(checkClock, CLOCK_CHECK_MS)
    return () => {
      stopped = true
      window.removeEventListener(SESSION_ENDED_EVENT, onEnded)
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [active, onExpired])
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

  const [sessionExpired, setSessionExpired] = useState(false)
  const [recoverPasswordUrl, setRecoverPasswordUrl] = useState<string | null>(null)

  useEffect(() => {
    if (explicit) return
    const controller = new AbortController()
    void loadServerSession(controller.signal).then((session) => {
      if (controller.signal.aborted) return
      setMode(session.mode)
      setRecoverPasswordUrl(session.recoverPasswordUrl ?? null)
      setUserName(session.mode === 'visual' ? readStoredSession() : session.userName)
    })
    return () => controller.abort()
  }, [explicit])

  const expire = useCallback(() => {
    setSessionExpired(true)
    setUserName(null)
  }, [])
  useSessionKeepAlive(mode === 'keycloak' && userName !== null, expire)

  /**
   * Marca a pessoa como conectada. No login visual, guarda o nome na aba; no real, a sessão já foi
   * criada pelo servidor (cookie HttpOnly) e aqui só fica o nome do cadastro, para o botão de conta.
   */
  const signIn = useCallback(
    (name: string) => {
      const clean = name.trim()
      if (mode !== 'keycloak') writeStoredSession(clean)
      setSessionExpired(false)
      setUserName(clean)
    },
    [mode],
  )

  const signOut = useCallback(() => {
    writeStoredSession(null)
    setUserName(null)
    if (mode !== 'keycloak') return
    // O servidor apaga a sessão e encerra a do Keycloak, pelo backend. A volta ao login segue a mesma
    // animação do modo visual (a logo volta ao centro), sem recarregar a página.
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined)
  }, [mode])

  const value = useMemo(
    () => ({ mode, isAuthenticated: userName !== null, sessionExpired, userName, recoverPasswordUrl, signIn, signOut }),
    [mode, userName, sessionExpired, recoverPasswordUrl, signIn, signOut],
  )
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession(): AuthSessionValue {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error('useAuthSession precisa estar dentro de AuthSessionProvider')
  return context
}
