import { fireEvent, screen, within } from '@testing-library/react'
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
  it('apresenta as duas ferramentas, com "Comparar PDFs" ativa', async () => {
    const { nav } = await renderHome()
    expect(screen.getByText('Ferramentas AQR')).toBeInTheDocument()
    expect(screen.getByText('Escolha uma ferramenta para analisar e organizar seus documentos.')).toBeInTheDocument()

    const compare = within(nav).getByRole('link', { name: 'Comparar PDFs' })
    const triage = within(nav).getByRole('link', { name: 'Triagem documental Em desenvolvimento' })
    expect(compare).toHaveAttribute('href', '/comparacao')
    expect(compare).toHaveAccessibleDescription(/identifique rapidamente o que foi adicionado, removido ou alterado/)
    expect(triage).toHaveAttribute('href', '/triagem')
    expect(compare).toHaveAttribute('data-active', 'true')
    expect(triage).toHaveAttribute('data-active', 'false')
    expect(showcaseHeading()).toHaveTextContent('Comparar PDFs')
  })

  it('atualiza a demonstração no hover', async () => {
    const user = userEvent.setup()
    const { nav } = await renderHome()
    const triage = within(nav).getByRole('link', { name: /Triagem documental/ })
    await user.hover(triage)
    expect(triage).toHaveAttribute('data-active', 'true')
    expect(showcaseHeading()).toHaveTextContent('Triagem documental')
  })

  it('atualiza a demonstração quando a opção recebe foco pelo teclado', async () => {
    const { nav } = await renderHome()
    const triage = within(nav).getByRole('link', { name: /Triagem documental/ })
    fireEvent.focus(triage)
    expect(showcaseHeading()).toHaveTextContent('Triagem documental')
    fireEvent.focus(within(nav).getByRole('link', { name: 'Comparar PDFs' }))
    expect(showcaseHeading()).toHaveTextContent('Comparar PDFs')
  })

  it('percorre as opções com Tab e abre a ferramenta com Enter', async () => {
    const user = userEvent.setup()
    const { nav, router } = await renderHome()
    const compare = within(nav).getByRole('link', { name: 'Comparar PDFs' })
    compare.focus()
    await user.tab()
    expect(within(nav).getByRole('link', { name: /Triagem documental/ })).toHaveFocus()
    expect(showcaseHeading()).toHaveTextContent('Triagem documental')
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Triagem documental' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/triagem')
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
    const { nav, router } = await renderHome()
    const panel = screen.getByRole('link', { name: /Clique para acessar/ })
    expect(panel).toHaveAttribute('tabindex', '-1')
    await user.hover(within(nav).getByRole('link', { name: /Triagem documental/ }))
    expect(panel).toHaveAttribute('href', '/triagem')
    await user.click(panel)
    expect(router.state.location.pathname).toBe('/triagem')
  })
})
