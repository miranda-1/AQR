import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInMemoryAccountService } from '../services/in-memory-account-service'
import { sampleAccounts } from '../test-data'
import { renderApp } from '@/test/render'

async function serviceWithHistory() {
  const service = createInMemoryAccountService({ accounts: sampleAccounts, actor: 'Ana Lima' })
  await service.updateAccount('u2', { nome: 'Bruno Reis Filho', email: null, papel: 'analista', versao: 1 })
  await service.updateAccount('u2', { nome: 'Bruno Reis Filho', email: null, papel: 'administrador', versao: 2 })
  await service.deactivateAccount('u2', { versao: 3, motivo: 'Mudou de setor' })
  return service
}

describe('auditoria', () => {
  it('lista os eventos do mais recente ao mais antigo, com quem fez e o que mudou', async () => {
    renderApp('/administracao/auditoria', { accountService: await serviceWithHistory() })
    await screen.findByText('3 eventos registrados.')
    const timeline = screen.getAllByRole('list').find((list) => list.tagName === 'OL')
    const events = Array.from(timeline?.children ?? [])
    expect(events).toHaveLength(3)
    expect(within(events[0] as HTMLElement).getByText('Conta desativada')).toBeInTheDocument()
    expect(within(events[0] as HTMLElement).getByText('Motivo: Mudou de setor')).toBeInTheDocument()
    expect(within(events[0] as HTMLElement).getByText(/Por Ana Lima/u)).toBeInTheDocument()
    expect(within(events[1] as HTMLElement).getByText('Papel: Analista → Administrador')).toBeInTheDocument()
    expect(within(events[2] as HTMLElement).getByText('Nome: Bruno Reis → Bruno Reis Filho')).toBeInTheDocument()
    expect(screen.getByText('3 eventos registrados.')).toBeInTheDocument()
  })

  it('filtra por tipo de evento', async () => {
    const user = userEvent.setup()
    renderApp('/administracao/auditoria', { accountService: await serviceWithHistory() })
    await screen.findByText('3 eventos registrados.')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de evento' }), 'conta.papel_alterado')
    expect(await screen.findByText('1 evento registrado.')).toBeInTheDocument()
  })

  it('mostra o histórico na página da conta e atualiza depois de uma alteração', async () => {
    const user = userEvent.setup()
    renderApp('/administracao/contas/u2', {
      accountService: createInMemoryAccountService({ accounts: sampleAccounts }),
    })
    const section = await screen.findByRole('region', { name: 'Histórico da conta' })
    expect(await within(section).findByText('Nenhum evento registrado ainda.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desativar conta' }))
    await user.click(await screen.findByRole('button', { name: 'Desativar' }))
    const updated = await screen.findByRole('region', { name: 'Histórico da conta' })
    expect(await within(updated).findByText('Conta desativada')).toBeInTheDocument()
  })

  it('a lista de contas leva à auditoria', async () => {
    const user = userEvent.setup()
    renderApp('/administracao/contas', { accountService: createInMemoryAccountService({ accounts: sampleAccounts }) })
    await user.click(await screen.findByRole('link', { name: 'Auditoria' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Auditoria de contas' })).toBeInTheDocument()
  })
})
