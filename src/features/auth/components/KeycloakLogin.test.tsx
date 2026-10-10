import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { KeycloakLogin } from './KeycloakLogin'

function renderAt(search: string, returnTo = '/comparar') {
  render(
    <MemoryRouter initialEntries={[`/entrar${search}`]}>
      <KeycloakLogin returnTo={returnTo} />
    </MemoryRouter>,
  )
}

describe('KeycloakLogin', () => {
  it('leva ao servidor, que inicia o login, e lembra a página pedida', () => {
    renderAt('')
    const link = screen.getByRole('link', { name: /Entrar com a conta da PREFCG/ })
    expect(link).toHaveAttribute('href', '/api/auth/login?returnTo=%2Fcomparar')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()
  })

  it.each([
    ['sem_conta', /ainda não tem conta no AQR/],
    ['conta_inativa', /desativada/],
    ['vinculo_pendente', /ainda não foi vinculada/],
    ['vinculo_divergente', /não corresponde/],
    ['sessao_expirada', /sessão terminou: 30 minutos sem uso/],
    ['muitas_tentativas', /Aguarde um minuto/],
    ['falha', /Não foi possível confirmar/],
    ['qualquer-outro', /Não foi possível confirmar/],
  ])('explica o erro %s e o que fazer', (code, text) => {
    renderAt(`?erro=${code}`)
    expect(screen.getByRole('alert')).toHaveTextContent(text)
  })
})
