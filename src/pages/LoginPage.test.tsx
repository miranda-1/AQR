import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'

async function renderLogin(path = '/') {
  const utils = renderApp(path, { authenticated: false })
  await screen.findByRole('heading', { level: 1, name: 'Entrar' })
  return utils
}

describe('Login', () => {
  it('aparece antes de qualquer página quando não há sessão', async () => {
    const { router } = await renderLogin('/comparacao')
    expect(router.state.location.pathname).toBe('/entrar')
    expect(screen.getByRole('img', { name: 'Prefeitura de Campo Grande' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'AQR' })).toBeInTheDocument()
    expect(screen.getByText('Esqueceu a senha? Procure o suporte da SEMADES.')).toBeInTheDocument()
    // Sem aviso de protótipo na tela de login (decisão do responsável).
    expect(screen.queryByText(/protótipo/i)).not.toBeInTheDocument()
  })

  it('pede usuário e senha antes de entrar', async () => {
    const user = userEvent.setup()
    const { router } = await renderLogin()
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    const username = screen.getByLabelText('Usuário')
    expect(username).toHaveAttribute('aria-invalid', 'true')
    expect(username).toHaveAccessibleDescription('Informe o usuário.')
    expect(username).toHaveFocus()

    await user.type(username, 'servidor')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(username).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Informe a senha.')
    expect(router.state.location.pathname).toBe('/entrar')
  })

  it('mostra e oculta a senha', async () => {
    const user = userEvent.setup()
    await renderLogin()
    const password = screen.getByLabelText('Senha')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ao entrar, leva à página que a pessoa tinha pedido', async () => {
    const user = userEvent.setup()
    const { router } = await renderLogin('/triagem')
    await user.type(screen.getByLabelText('Usuário'), 'servidor')
    await user.type(screen.getByLabelText('Senha'), 'qualquer')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Triagem documental' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/triagem')
  })

  it('sem página pedida, entra no início', async () => {
    const user = userEvent.setup()
    await renderLogin('/entrar')
    await user.type(screen.getByLabelText('Usuário'), 'maria.souza')
    await user.type(screen.getByLabelText('Senha'), 'qualquer')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Como podemos ajudar?' })).toBeInTheDocument()
    // O nome digitado aparece no botão de conta.
    expect(screen.getByRole('button', { name: 'Conta de maria.souza' })).toBeInTheDocument()
  })

  it('com sessão, o endereço do login leva ao início', async () => {
    const { router } = renderApp('/entrar')
    expect(await screen.findByRole('heading', { level: 1, name: 'Como podemos ajudar?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})
