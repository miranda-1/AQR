import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInMemoryAccountService } from '../services/in-memory-account-service'
import { sampleAccounts } from '../test-data'
import { renderApp } from '@/test/render'

const open = (path: string, service = createInMemoryAccountService({ accounts: sampleAccounts })) => {
  renderApp(path, { accountService: service })
  return service
}

describe('nova conta', () => {
  it('avisa os campos com problema antes de enviar e leva o foco ao primeiro', async () => {
    const user = userEvent.setup()
    open('/administracao/contas/nova')
    await user.click(await screen.findByRole('button', { name: 'Criar conta' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Revise os campos abaixo')
    expect(screen.getByText('Informe o usuário institucional.')).toBeInTheDocument()
    expect(screen.getByText('Informe o nome.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Usuário institucional' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Usuário institucional' })).toBeInvalid()
  })

  it('cria a conta e volta à lista com a confirmação', async () => {
    const user = userEvent.setup()
    open('/administracao/contas/nova')
    await user.type(await screen.findByRole('textbox', { name: 'Usuário institucional' }), 'Dora.Alves')
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Dora Alves')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Papel' }), 'administrador')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('Conta de Dora Alves criada.')).toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: 'Dora Alves' })).toBeInTheDocument()
  })

  it('mostra o erro de usuário repetido no campo', async () => {
    const user = userEvent.setup()
    open('/administracao/contas/nova')
    await user.type(await screen.findByRole('textbox', { name: 'Usuário institucional' }), 'ana.lima')
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'Outra Ana')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('Este usuário institucional já está em uso.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Usuário institucional' })).toBeInvalid()
  })
})

describe('editar conta', () => {
  it('mantém o usuário só para leitura e salva as alterações', async () => {
    const user = userEvent.setup()
    open('/administracao/contas/u2')
    const usuario = await screen.findByRole('textbox', { name: 'Usuário institucional' })
    expect(usuario).toHaveAttribute('readonly')
    const nome = screen.getByRole('textbox', { name: 'Nome' })
    await user.clear(nome)
    await user.type(nome, 'Bruno Reis Filho')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Conta de Bruno Reis Filho salva.')).toBeInTheDocument()
  })

  it('explica o conflito de versão e deixa recarregar', async () => {
    const user = userEvent.setup()
    const service = open('/administracao/contas/u2')
    await screen.findByRole('textbox', { name: 'Nome' })
    await service.updateAccount('u2', { nome: 'Alterada por outra pessoa', email: null, papel: 'analista', versao: 1 })
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText(/alterada por outra pessoa\. Recarregue/u)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Recarregar a conta' }))
    expect(await screen.findByDisplayValue('Alterada por outra pessoa')).toBeInTheDocument()
  })

  it('desativa com confirmação e reativa', async () => {
    const user = userEvent.setup()
    open('/administracao/contas/u2')
    await user.click(await screen.findByRole('button', { name: 'Desativar conta' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Desativar a conta de Bruno Reis?' })
    await user.type(screen.getByRole('textbox', { name: /Motivo/ }), 'Mudou de setor')
    await user.click(screen.getByRole('button', { name: 'Desativar' }))
    expect(await screen.findByText('Conta desativada.')).toBeInTheDocument()
    expect(dialog).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Reativar conta' }))
    await user.click(await screen.findByRole('button', { name: 'Reativar' }))
    expect(await screen.findByText('Conta reativada.')).toBeInTheDocument()
  })

  it('cancelar a confirmação não muda a conta; o último administrador não sai', async () => {
    const user = userEvent.setup()
    open('/administracao/contas/u1')
    await user.click(await screen.findByRole('button', { name: 'Desativar conta' }))
    await user.click(await screen.findByRole('button', { name: 'Desativar' }))
    expect(await screen.findByText('Mantenha pelo menos um administrador ativo.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Atual:')).toBeInTheDocument()
  })

  it('conta inexistente mostra o aviso', async () => {
    open('/administracao/contas/nao-existe')
    expect(await screen.findByRole('heading', { level: 1, name: 'Conta indisponível' })).toBeInTheDocument()
  })
})
