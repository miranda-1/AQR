import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInMemoryAccountService } from '../services/in-memory-account-service'
import { sampleAccessEvents, sampleAccounts, sampleComparisonUsage } from '../test-data'
import { renderApp } from '@/test/render'

const realService = () =>
  createInMemoryAccountService({ accounts: sampleAccounts, mode: 'real', accessEvents: sampleAccessEvents, comparisonUsage: sampleComparisonUsage })

describe('registros de uso e acesso', () => {
  it('a lista de contas leva aos registros só no login real', async () => {
    renderApp('/administracao/contas', { accountService: realService() })
    expect(await screen.findByRole('link', { name: 'Registros' })).toHaveAttribute('href', '/administracao/registros')
  })

  it('no modo de desenvolvimento não há botão de registros e a página explica por quê', async () => {
    const dev = createInMemoryAccountService({ accounts: sampleAccounts })
    const list = renderApp('/administracao/contas', { accountService: dev })
    await screen.findByRole('link', { name: 'Auditoria' })
    expect(screen.queryByRole('link', { name: 'Registros' })).not.toBeInTheDocument()
    list.unmount()
    renderApp('/administracao/registros', { accountService: dev })
    expect(await screen.findByText(/só existem com o login real/)).toBeInTheDocument()
  })

  it('mostra quantas comparações cada pessoa fez, sem nada do conteúdo', async () => {
    renderApp('/administracao/registros', { accountService: realService() })
    expect(await screen.findByText('2 pessoas usaram a comparação.')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Comparações por pessoa nos últimos 12 meses' })
    const bruno = within(table).getByRole('rowheader', { name: /Bruno Reis/ }).closest('tr')
    expect(bruno).not.toBeNull()
    expect(within(bruno as HTMLElement).getByText('12')).toBeInTheDocument()
    expect(within(bruno as HTMLElement).getByText('4')).toBeInTheDocument()
  })

  it('lista os acessos com rótulo e ícone, quem agiu e o detalhe, e filtra por tipo e usuário', async () => {
    const user = userEvent.setup()
    renderApp('/administracao/registros', { accountService: realService() })
    expect(await screen.findByText('3 registros encontrados.')).toBeInTheDocument()
    const timeline = () => within(screen.getAllByRole('list').find((list) => list.tagName === 'OL') as HTMLElement)
    expect(timeline().getByText('Login recusado: sem conta no AQR')).toBeInTheDocument()
    expect(screen.getByText(/Usuário bruno\.reis\. Por ana\.lima\./)).toBeInTheDocument()
    expect(screen.getByText('As sessões abertas da conta foram encerradas.')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de registro' }), 'login.ok')
    expect(await screen.findByText('1 registro encontrado.')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de registro' }), '')
    await user.type(screen.getByRole('searchbox', { name: 'Usuário' }), 'visitante')
    expect(await screen.findByText('1 registro encontrado.')).toBeInTheDocument()
    expect(timeline().getByText('Login recusado: sem conta no AQR')).toBeInTheDocument()
  })
})
