import { render, screen } from '@testing-library/react'
import { AuthSessionProvider, useAuthSession } from './auth-session'

function Probe() {
  const { mode, isAuthenticated } = useAuthSession()
  return <p>{`${mode}:${isAuthenticated ? 'dentro' : 'fora'}`}</p>
}

function respondWith(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(handler(String(input)))))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('AuthSessionProvider (consulta ao servidor)', () => {
  it('em produção, servidor fora do ar NÃO cai no login visual', async () => {
    vi.stubEnv('PROD', true)
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))))
    render(<AuthSessionProvider><Probe /></AuthSessionProvider>)
    expect(await screen.findByText('unavailable:fora')).toBeInTheDocument()
  })

  it('em produção, nem um servidor que anuncie o modo visual libera o login fictício', async () => {
    vi.stubEnv('PROD', true)
    respondWith(() => Response.json({ mode: 'visual' }))
    render(<AuthSessionProvider><Probe /></AuthSessionProvider>)
    expect(await screen.findByText('unavailable:fora')).toBeInTheDocument()
  })

  it('em desenvolvimento, o modo visual segue valendo', async () => {
    respondWith(() => Response.json({ mode: 'visual' }))
    render(<AuthSessionProvider><Probe /></AuthSessionProvider>)
    expect(await screen.findByText('visual:fora')).toBeInTheDocument()
  })

  it('no modo Keycloak, quem está conectado vem do servidor', async () => {
    respondWith((url) =>
      url.endsWith('/api/auth/status') ? Response.json({ mode: 'keycloak' }) : Response.json({ nome: 'Ana', usuario: 'ana', papel: 'analista' }),
    )
    render(<AuthSessionProvider><Probe /></AuthSessionProvider>)
    expect(await screen.findByText('keycloak:dentro')).toBeInTheDocument()
  })

  it('no modo Keycloak sem sessão (401), fica fora', async () => {
    respondWith((url) => (url.endsWith('/api/auth/status') ? Response.json({ mode: 'keycloak' }) : new Response(null, { status: 401 })))
    render(<AuthSessionProvider><Probe /></AuthSessionProvider>)
    expect(await screen.findByText('keycloak:fora')).toBeInTheDocument()
  })
})

describe('AuthSessionProvider (sessão por inatividade no login real)', () => {
  function Expired() {
    const { isAuthenticated, sessionExpired } = useAuthSession()
    return <p>{`${isAuthenticated ? 'dentro' : 'fora'}:${sessionExpired ? 'expirou' : 'valendo'}`}</p>
  }

  afterEach(() => vi.useRealTimers())

  it('a atividade da pessoa avisa o servidor no máximo a cada minuto; quando o relógio diz 401, a sessão termina', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let alive = true
    const calls: string[] = []
    respondWith((url) => {
      calls.push(url)
      if (url.endsWith('/api/auth/status')) return Response.json({ mode: 'keycloak' })
      if (!alive) return new Response(null, { status: 401 })
      if (url.endsWith('/api/auth/sessao')) return Response.json({ expiraEm: new Date().toISOString() })
      return Response.json({ nome: 'Ana', usuario: 'ana', papel: 'analista' })
    })
    render(<AuthSessionProvider><Expired /></AuthSessionProvider>)
    expect(await screen.findByText('dentro:valendo')).toBeInTheDocument()
    const meCalls = () => calls.filter((url) => url.endsWith('/api/auth/me')).length
    const before = meCalls()

    // Atividade logo depois de entrar não gera pedido; depois de um minuto, gera um só.
    window.dispatchEvent(new Event('keydown'))
    expect(meCalls()).toBe(before)
    await vi.advanceTimersByTimeAsync(61_000)
    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('keydown'))
    expect(meCalls()).toBe(before + 1)
    // A conferência periódica usa o relógio, que não conta como uso.
    expect(calls.some((url) => url.endsWith('/api/auth/sessao'))).toBe(true)

    alive = false
    await vi.advanceTimersByTimeAsync(61_000)
    expect(await screen.findByText('fora:expirou')).toBeInTheDocument()
  })
})
