import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defined } from '@/test/files'
import { renderApp } from '@/test/render'

function toolsNav() {
  return screen.getByRole('navigation', { name: 'Ferramentas' })
}

async function openAccountMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Conta de servidor' }))
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
    const header = defined(toolsNav().closest('header'), 'cabeçalho')
    expect(within(header).getByRole('img', { name: 'Prefeitura de Campo Grande' })).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: /AQR, Análise e Qualificação de Requerimentos/ })).toHaveAttribute('href', '/')
  })

  it('mostra no rodapé as marcas SEMADES, o slogan e a PREFCG, nessa ordem', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1, name: 'Como podemos ajudar?' })
    const marks = within(screen.getByRole('list', { name: 'Marcas institucionais' })).getAllByRole('img')
    expect(marks.map((mark) => mark.getAttribute('alt'))).toEqual([
      expect.stringMatching(/^SEMADES — Secretaria Municipal de Meio Ambiente/),
      'É fazendo o certo que a gente traz resultado',
      'Prefeitura de Campo Grande',
    ])
  })
})

describe('Sub-barra de ferramentas', () => {
  it('lista as ferramentas e marca a da página atual', async () => {
    renderApp('/comparacao')
    await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })
    const links = within(toolsNav()).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Início', 'Comparar PDFs'])
    expect(within(toolsNav()).getByRole('link', { name: 'Comparar PDFs' })).toHaveAttribute('aria-current', 'page')
    expect(within(toolsNav()).getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  it('o início fica ativo só na página inicial', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1, name: 'Como podemos ajudar?' })
    expect(within(toolsNav()).getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  })

  it('mantém a comparação ativa na tela de resultado', async () => {
    renderApp('/comparacao/resultado')
    expect(await within(toolsNav()).findByRole('link', { name: 'Comparar PDFs' })).toHaveAttribute('aria-current', 'page')
  })

  it('navega ao escolher uma ferramenta', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/comparacao')
    await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })
    await user.click(within(toolsNav()).getByRole('link', { name: 'Início' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Como podemos ajudar?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(within(toolsNav()).getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  })

  it('pode ser usada pelo teclado', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')
    await screen.findByRole('heading', { level: 1, name: 'Como podemos ajudar?' })
    within(toolsNav()).getByRole('link', { name: 'Comparar PDFs' }).focus()
    await user.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe('/comparacao')
  })
})

describe('Conta', () => {
  it('mostra o nome do usuário e o "Sair"', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao')
    await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })
    const menu = await openAccountMenu(user)
    expect(menu).toHaveTextContent('servidor')
    expect(menu).toHaveTextContent('SEMADES')
    expect(within(menu).getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument()
  })

  it('fecha com Esc e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao')
    await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })
    await openAccountMenu(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conta de servidor' })).toHaveFocus()
  })

  it('"Sair" encerra a sessão e volta para o login', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/comparacao')
    await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })
    const menu = await openAccountMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entrar')
  })
})

describe('Outras rotas', () => {
  it('mostra página de não encontrado para rotas inexistentes', async () => {
    renderApp('/rota-inexistente')
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
  })
})
