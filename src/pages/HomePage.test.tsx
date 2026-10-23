import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/render'

async function renderHome() {
  const utils = renderApp('/')
  await screen.findByRole('heading', { level: 1, name: 'Como podemos ajudar?' })
  const nav = screen.getByRole('navigation', { name: 'Ferramentas disponíveis' })
  return { ...utils, nav }
}

/** Título da demonstração visível (a camada inativa fica oculta para tecnologias assistivas). */
function showcaseHeading() {
  return screen.getByRole('heading', { level: 2 })
}

describe('Página inicial', () => {
  it('apresenta a comparação de PDFs, ativa (a triagem não aparece nesta versão)', async () => {
    const { nav } = await renderHome()
    expect(screen.getByText('Ferramentas AQR')).toBeInTheDocument()
    expect(screen.getByText('Escolha uma ferramenta para analisar e organizar seus documentos.')).toBeInTheDocument()

    const compare = within(nav).getByRole('link', { name: 'Comparar PDFs' })
    expect(within(nav).getAllByRole('link')).toHaveLength(1)
    expect(compare).toHaveAttribute('href', '/comparacao')
    expect(compare).toHaveAccessibleDescription(/identifique rapidamente o que foi adicionado, removido ou alterado/)
    expect(compare).toHaveAttribute('data-active', 'true')
    expect(showcaseHeading()).toHaveTextContent('Comparar PDFs')
    expect(screen.queryByText(/Triagem/)).not.toBeInTheDocument()
  })

  it('abre a ferramenta com Enter', async () => {
    const user = userEvent.setup()
    const { nav, router } = await renderHome()
    within(nav).getByRole('link', { name: 'Comparar PDFs' }).focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/comparacao')
  })

  it('navega para a comparação ao clicar na opção', async () => {
    const user = userEvent.setup()
    const { nav, router } = await renderHome()
    await user.click(within(nav).getByRole('link', { name: 'Comparar PDFs' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/comparacao')
  })

  it('o painel de demonstração leva à ferramenta ativa sem criar parada extra de tabulação', async () => {
    const user = userEvent.setup()
    const { router } = await renderHome()
    const panel = screen.getByRole('link', { name: /Clique para acessar/ })
    expect(panel).toHaveAttribute('tabindex', '-1')
    expect(panel).toHaveAttribute('href', '/comparacao')
    await user.click(panel)
    expect(router.state.location.pathname).toBe('/comparacao')
  })
})
