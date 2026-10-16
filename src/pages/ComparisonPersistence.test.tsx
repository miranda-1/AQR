import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defined } from '@/test/files'
import { renderApp } from '@/test/render'

/** Quem sai da comparação por outro item do menu e volta encontra a mesma comparação, como deixou. */
describe('comparação aberta ao navegar pelo site', () => {
  it('"Comparar PDFs" volta ao resultado, com a diferença e o modo que estavam escolhidos', { timeout: 20_000 }, async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/comparacao/resultado')
    const list = await screen.findByRole('list', { name: 'Diferenças encontradas' }, { timeout: 10_000 })
    const third = defined(within(list).getAllByRole('button')[2])
    await user.click(third)
    await user.click(screen.getByRole('radio', { name: /Conteúdo/ }))

    const tools = screen.getByRole('navigation', { name: 'Ferramentas' })
    await user.click(within(tools).getByRole('link', { name: /Início/ }))
    expect(router.state.location.pathname).toBe('/')

    const compareLink = within(screen.getByRole('navigation', { name: 'Ferramentas' })).getByRole('link', { name: /Comparar PDFs/ })
    expect(compareLink).toHaveAttribute('href', '/comparacao/resultado')
    await user.click(compareLink)
    expect(router.state.location.pathname).toBe('/comparacao/resultado')
    // O resultado já está lá (sem nova comparação) e a seleção e o modo foram preservados.
    const again = await screen.findByRole('list', { name: 'Diferenças encontradas' })
    expect(defined(within(again).getAllByRole('button')[2])).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('radio', { name: /Conteúdo/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('"Nova comparação" fecha a comparação e o menu volta à tela de envio', { timeout: 20_000 }, async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/comparacao/resultado')
    await screen.findByRole('list', { name: 'Diferenças encontradas' }, { timeout: 10_000 })
    await user.click(defined(screen.getAllByRole('button', { name: /Nova comparação/ })[0]))
    expect(router.state.location.pathname).toBe('/comparacao')
    const tools = screen.getByRole('navigation', { name: 'Ferramentas' })
    expect(within(tools).getByRole('link', { name: /Comparar PDFs/ })).toHaveAttribute('href', '/comparacao')
  })
})
