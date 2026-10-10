import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInMemoryAccountService } from '../services/in-memory-account-service'
import { renderApp } from '@/test/render'

describe('acesso à administração', () => {
  it('desligada: o menu não oferece a administração e a rota explica', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao')
    await user.click(await screen.findByRole('button', { name: 'Conta de servidor' }))
    expect(screen.queryByRole('menuitem', { name: 'Administração de contas' })).not.toBeInTheDocument()
  })

  it('desligada: abrir o endereço mostra o aviso', async () => {
    renderApp('/administracao/contas')
    expect(await screen.findByRole('heading', { level: 1, name: 'Administração indisponível' })).toBeInTheDocument()
  })

  it('ligada: o menu da conta leva à administração', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao', { accountService: createInMemoryAccountService() })
    await user.click(await screen.findByRole('button', { name: 'Conta de servidor' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Administração de contas' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Administração de contas' })).toBeInTheDocument()
  })
})
