import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthSessionProvider, useAuthSession } from './auth-session'
import { checkDemoCredentials } from './demo-login'

function Probe() {
  const { isAuthenticated, userName, signIn, signOut } = useAuthSession()
  return (
    <>
      <p>{isAuthenticated ? `dentro:${userName ?? ''}` : 'fora'}</p>
      <button type="button" onClick={() => signIn(' admin ')}>Entrar</button>
      <button type="button" onClick={signOut}>Sair</button>
    </>
  )
}

afterEach(() => sessionStorage.clear())

describe('AuthSessionProvider (login fictício, só no navegador)', () => {
  it('guarda a sessão na aba e a apaga ao sair', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<AuthSessionProvider><Probe /></AuthSessionProvider>)
    expect(screen.getByText('fora')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByText('dentro:admin')).toBeInTheDocument()

    // Recarregar a página na mesma aba mantém a sessão.
    unmount()
    render(<AuthSessionProvider><Probe /></AuthSessionProvider>)
    expect(screen.getByText('dentro:admin')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(screen.getByText('fora')).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})

describe('checkDemoCredentials', () => {
  it('aceita só admin/admin (o usuário sem diferenciar maiúsculas e espaços)', () => {
    expect(checkDemoCredentials('admin', 'admin')).toBe(true)
    expect(checkDemoCredentials(' Admin ', 'admin')).toBe(true)
    expect(checkDemoCredentials('admin', 'Admin')).toBe(false)
    expect(checkDemoCredentials('servidor', 'admin')).toBe(false)
    expect(checkDemoCredentials('admin', '')).toBe(false)
  })
})
