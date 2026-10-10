import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInMemoryAccountService } from '../services/in-memory-account-service'
import { makeAccount, sampleAccounts } from '../test-data'
import { renderApp } from '@/test/render'

const open = (accounts = sampleAccounts) =>
  renderApp('/administracao/contas', { accountService: createInMemoryAccountService({ accounts }) })

describe('lista de contas', () => {
  it('mostra a tabela com colunas e linhas identificadas', async () => {
    open()
    const table = await screen.findByRole('table', { name: 'Contas do AQR' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Nome', 'Usuário', 'E-mail', 'Papel', 'Situação', 'Atualizada em', 'Ações',
    ])
    expect(within(table).getByRole('rowheader', { name: 'Ana Lima' })).toBeInTheDocument()
    expect(within(table).getByText('Desativada')).toBeInTheDocument()
    expect(await screen.findByText('3 contas encontradas.')).toBeInTheDocument()
  })

  it('busca por nome, usuário ou e-mail depois de uma pausa na digitação', async () => {
    const user = userEvent.setup()
    open()
    await screen.findByRole('table')
    await user.type(screen.getByRole('searchbox', { name: /Buscar por usuário/ }), 'campogrande')
    expect(await screen.findByText('1 conta encontrada.')).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Ana Lima' })).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: 'Bruno Reis' })).not.toBeInTheDocument()
  })

  it('filtra por papel e situação e avisa quando nada corresponde', async () => {
    const user = userEvent.setup()
    open()
    await screen.findByRole('table')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'inativa')
    expect(await screen.findByText('1 conta encontrada.')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Papel' }), 'administrador')
    expect(await screen.findByText('Nenhuma conta corresponde à busca.')).toBeInTheDocument()
  })

  it('pagina quando há mais contas que o tamanho da página', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 12 }, (_, i) => makeAccount({ id: `m${i}`, usuario: `pessoa${i + 10}`, nome: `Pessoa ${String(i + 10)}` }))
    open(many)
    await screen.findByRole('table')
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('mostra o erro e permite tentar de novo', async () => {
    const user = userEvent.setup()
    const base = createInMemoryAccountService({ accounts: sampleAccounts })
    let fail = true
    renderApp('/administracao/contas', {
      accountService: {
        ...base,
        listAccounts: (query, options) => (fail ? Promise.reject(new Error('x')) : base.listAccounts(query, options)),
      },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as contas.')
    fail = false
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
})
