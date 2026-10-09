import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'

async function openToolsMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Ferramentas' }))
  return screen.findByRole('menu')
}

describe('Rota inicial', () => {
  it('mostra a página inicial em "/"', async () => {
    const { router } = renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Como podemos ajudar?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('apresenta a marca institucional e o nome do sistema, com link para o início', async () => {
    renderApp('/comparacao')
    await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })
    expect(screen.getByRole('img', { name: 'Prefeitura de Campo Grande' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /AQR, Análise e Qualificação de Requerimentos/ })).toHaveAttribute('href', '/')
  })
})

describe('Menu "Ferramentas"', () => {
  it('lista as ferramentas e destaca a ativa', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao')
    const menu = await openToolsMenu(user)
    const items = within(menu).getAllByRole('menuitem')
    expect(items).toHaveLength(2)
    expect(within(menu).getByRole('menuitem', { name: /Comparação de PDFs/ })).toHaveAttribute('aria-current', 'page')
    const triage = within(menu).getByRole('menuitem', { name: /Triagem documental/ })
    expect(triage).toHaveTextContent('Em desenvolvimento')
    expect(triage).not.toHaveAttribute('aria-current')
  })

  it('mantém a comparação ativa na tela de resultado', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao/resultado')
    const menu = await openToolsMenu(user)
    expect(within(menu).getByRole('menuitem', { name: /Comparação de PDFs/ })).toHaveAttribute('aria-current', 'page')
  })

  it('fecha com Esc e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao')
    await openToolsMenu(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ferramentas' })).toHaveFocus()
  })

  it('fecha ao clicar fora sem bloquear a página', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao')
    await openToolsMenu(user)
    await user.click(screen.getByRole('heading', { level: 1, name: 'Comparar documentos' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('navega ao escolher uma opção e fecha o menu', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/comparacao')
    const menu = await openToolsMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: /Triagem documental/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Triagem documental' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/triagem')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByText('Esta funcionalidade ainda não está disponível.')).toBeInTheDocument()
  })

  it('pode ser aberto e percorrido pelo teclado', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/triagem')
    await screen.findByRole('heading', { level: 1, name: 'Triagem documental' })
    screen.getByRole('button', { name: 'Ferramentas' }).focus()
    await user.keyboard('{Enter}')
    const menu = await screen.findByRole('menu')
    expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe('/comparacao')
  })
})

describe('Outras rotas', () => {
  it('mostra página de não encontrado para rotas inexistentes', async () => {
    renderApp('/rota-inexistente')
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
  })
})
