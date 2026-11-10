import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'

/** Servidor falso: login real, ninguém conectado; `entrar` responde conforme a senha. */
function fakeServer() {
  const sent: { url: string; body: unknown }[] = []
  let connected = false
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/auth/status')) return Response.json({ mode: 'keycloak' })
      if (url.endsWith('/api/auth/me')) return connected ? Response.json({ usuario: 'ana', nome: 'Ana Lima', papel: 'analista' }) : new Response(null, { status: 401 })
      if (url.endsWith('/api/auth/entrar')) {
        const body: unknown = JSON.parse(String(init?.body))
        sent.push({ url, body })
        const ok = typeof body === 'object' && body !== null && 'senha' in body && body.senha === 'certa'
        if (!ok) return Response.json({ error: { code: 'CREDENCIAIS_INVALIDAS', message: 'Usuário ou senha incorretos. Confira e tente de novo.' } }, { status: 401 })
        connected = true
        return Response.json({ usuario: 'ana', nome: 'Ana Lima', papel: 'analista' })
      }
      if (url.endsWith('/api/auth/logout')) {
        connected = false
        return Response.json({ keycloakEncerrado: true })
      }
      return Response.json({ mode: 'keycloak', expiraEm: new Date().toISOString() })
    }),
  )
  return sent
}

afterEach(() => vi.unstubAllGlobals())

describe('Login no modo real (Keycloak), na tela do AQR', () => {
  it('mantém os campos de usuário e senha da tela aprovada e o link de nova senha', async () => {
    fakeServer()
    renderApp('/comparacao', { serverAuth: true })
    await screen.findByRole('heading', { level: 1, name: 'Entrar' })
    expect(screen.getByLabelText('Usuário')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Receba um link por e-mail' })).toHaveAttribute('href', '/esqueci-senha')
    expect(screen.queryByRole('link', { name: /Entrar com a conta/ })).not.toBeInTheDocument()
  })

  it('senha errada: mostra o motivo, não entra, e o aviso some ao digitar de novo', async () => {
    const sent = fakeServer()
    const user = userEvent.setup()
    const { router } = renderApp('/comparacao', { serverAuth: true })
    await user.type(await screen.findByLabelText('Usuário'), 'ana')
    await user.type(screen.getByLabelText('Senha'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos')
    expect(router.state.location.pathname).toBe('/entrar')
    expect(sent).toEqual([{ url: '/api/auth/entrar', body: { usuario: 'ana', senha: 'errada' } }])
    await user.type(screen.getByLabelText('Senha'), 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('senha certa: entra com o nome do cadastro e volta à página pedida', async () => {
    fakeServer()
    const user = userEvent.setup()
    const { router } = renderApp('/triagem', { serverAuth: true })
    await user.type(await screen.findByLabelText('Usuário'), 'ana')
    await user.type(screen.getByLabelText('Senha'), 'certa')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Triagem documental' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/triagem')
    expect(screen.getByRole('button', { name: 'Conta de Ana Lima' })).toBeInTheDocument()
    // A senha não fica em lugar nenhum do navegador.
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('certa')
    expect(JSON.stringify({ ...localStorage })).not.toContain('certa')
  })

  it('voltando com a sessão terminada, explica o motivo acima dos campos', async () => {
    fakeServer()
    renderApp('/entrar?erro=sessao_expirada', { serverAuth: true })
    expect(await screen.findByRole('alert')).toHaveTextContent('Sua sessão terminou')
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })
})
