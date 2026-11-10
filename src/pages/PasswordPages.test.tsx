import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'

const CODE = 'c'.repeat(43)

/** Servidor falso do login real, com as rotas de senha. Guarda o que o site enviou. */
function fakeServer({ linkValid = true, rejectFirst = false } = {}) {
  const sent: { url: string; body: unknown }[] = []
  let rejected = !rejectFirst
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : null
      if (url.endsWith('/api/auth/status')) return Response.json({ mode: 'keycloak' })
      if (url.endsWith('/api/auth/me')) return new Response(null, { status: 401 })
      sent.push({ url, body })
      if (url.endsWith('/api/auth/senha/esqueci')) return Response.json({ ok: true }, { status: 202 })
      if (url.endsWith('/api/auth/senha/verificar')) {
        return linkValid
          ? Response.json({ finalidade: 'convite', usuario: 'maria', nome: 'Maria' })
          : Response.json({ error: { code: 'LINK_INVALIDO', message: 'Este link não vale mais.' } }, { status: 410 })
      }
      if (url.endsWith('/api/auth/senha/definir')) {
        if (!rejected) {
          rejected = true
          return Response.json(
            { error: { code: 'SENHA_FRACA', message: 'Esta senha não atende às regras de segurança.', fields: { senha: 'Escolha uma senha mais forte.' } } },
            { status: 422 },
          )
        }
        return Response.json({ usuario: 'maria' })
      }
      return new Response(null, { status: 404 })
    }),
  )
  return sent
}

async function violations(container: Element) {
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return result.violations.map((violation) => violation.id)
}

afterEach(() => vi.unstubAllGlobals())

describe('Esqueci a senha', () => {
  it('pede o link pelo usuário ou e-mail e mostra a mesma resposta, exista a conta ou não', async () => {
    const user = userEvent.setup()
    const sent = fakeServer()
    const { container } = renderApp('/esqueci-senha', { serverAuth: true })
    await screen.findByRole('heading', { level: 1, name: 'Esqueci a senha' })
    expect(await violations(container)).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(screen.getByRole('textbox', { name: 'Usuário ou e-mail' })).toHaveAccessibleDescription('Informe seu usuário ou e-mail.')
    expect(await violations(container)).toEqual([])

    await user.type(screen.getByRole('textbox', { name: 'Usuário ou e-mail' }), 'maria')
    await user.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeInTheDocument()
    expect(sent).toEqual([{ url: '/api/auth/senha/esqueci', body: { usuario: 'maria' } }])
    expect(screen.getByRole('link', { name: 'Voltar para a entrada' })).toHaveAttribute('href', '/entrar')
  })

  it('a tela de login leva até aqui', async () => {
    const user = userEvent.setup()
    fakeServer()
    renderApp('/entrar', { serverAuth: true })
    await user.click(await screen.findByRole('link', { name: 'Receba um link por e-mail' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Esqueci a senha' })).toBeInTheDocument()
  })
})

describe('Definir senha pelo link do e-mail', () => {
  it('confere o link, valida a senha e só envia o código no corpo do pedido', async () => {
    const user = userEvent.setup()
    const sent = fakeServer({ rejectFirst: true })
    const { container, router } = renderApp(`/definir-senha#${CODE}`, { serverAuth: true })
    expect(await screen.findByRole('heading', { level: 1, name: 'Crie sua senha' })).toBeInTheDocument()
    expect(screen.getByText('Olá, Maria. Defina a senha para entrar no AQR.')).toBeInTheDocument()
    // O código sai da barra de endereço assim que a página abre.
    expect(router.state.location.hash).toBe('')
    expect(sent[0]).toEqual({ url: '/api/auth/senha/verificar', body: { codigo: CODE } })
    expect(await violations(container)).toEqual([])

    const password = screen.getByLabelText('Senha nova')
    const confirm = screen.getByLabelText('Repita a senha nova')
    await user.type(password, 'curta')
    await user.click(screen.getByRole('button', { name: 'Criar senha' }))
    expect(password).toHaveAccessibleDescription(/Use pelo menos 8 caracteres\./)

    await user.clear(password)
    await user.type(password, 'maria-e-a-lagoa')
    await user.click(screen.getByRole('button', { name: 'Criar senha' }))
    expect(password).toHaveAccessibleDescription(/não pode conter o seu usuário/)

    await user.clear(password)
    await user.type(password, 'Lagoa-azul-2026')
    await user.type(confirm, 'Lagoa-azul-2025')
    await user.click(screen.getByRole('button', { name: 'Criar senha' }))
    expect(confirm).toHaveAccessibleDescription('As duas senhas não são iguais.')
    expect(await violations(container)).toEqual([])

    await user.clear(confirm)
    await user.type(confirm, 'Lagoa-azul-2026')
    await user.click(screen.getByRole('button', { name: 'Criar senha' }))
    // A política do sistema de login recusou: o aviso aparece e a senha é marcada.
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta senha não atende às regras de segurança.')
    expect(password).toHaveAccessibleDescription(/Escolha uma senha mais forte\./)

    await user.click(screen.getByRole('button', { name: 'Criar senha' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Senha definida' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Seu usuário é maria.')
    expect(sent.filter((request) => request.url.endsWith('/definir'))).toEqual([
      { url: '/api/auth/senha/definir', body: { codigo: CODE, senha: 'Lagoa-azul-2026' } },
      { url: '/api/auth/senha/definir', body: { codigo: CODE, senha: 'Lagoa-azul-2026' } },
    ])
    expect(sent.every((request) => !request.url.includes(CODE))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Ir para a entrada' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
  })

  it('link usado, vencido ou incompleto explica o que houve e oferece um novo', async () => {
    fakeServer({ linkValid: false })
    const { container } = renderApp(`/definir-senha#${CODE}`, { serverAuth: true })
    expect(await screen.findByRole('heading', { level: 1, name: 'Link sem validade' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Este link não vale mais.')
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute('href', '/esqueci-senha')
    expect(await violations(container)).toEqual([])
  })

  it('sem código no endereço, nem consulta o servidor', async () => {
    const sent = fakeServer()
    renderApp('/definir-senha', { serverAuth: true })
    expect(await screen.findByRole('alert')).toHaveTextContent('O link está incompleto.')
    expect(sent).toEqual([])
  })
})
