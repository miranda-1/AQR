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
