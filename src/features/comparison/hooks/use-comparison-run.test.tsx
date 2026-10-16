import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { AuthSessionProvider } from '@/features/auth/auth-session'
import type { ComparisonInput, ComparisonService } from '../model/types'
import { ComparisonSessionProvider } from '../session/comparison-session'
import { useComparisonRun } from './use-comparison-run'

const input: ComparisonInput = { original: new File(['%PDF-'], 'a.pdf'), updated: new File(['%PDF-'], 'b.pdf') }

function Run({ service }: { service: ComparisonService }) {
  const { state } = useComparisonRun(service, input, 'teste')
  return <p>{state.phase}</p>
}

/** Mostra ou esconde a tela da comparação, como quem sai para outra página e volta. */
function Toggle({ service }: { service: ComparisonService }) {
  const [shown, setShown] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setShown((value) => !value)}>
        alternar
      </button>
      {shown && <Run service={service} />}
    </>
  )
}

function withSession(node: React.ReactNode) {
  return (
    <AuthSessionProvider initialAuthenticated>
      <ComparisonSessionProvider>{node}</ComparisonSessionProvider>
    </AuthSessionProvider>
  )
}

describe('useComparisonRun', () => {
  it('no StrictMode (montagem dupla), envia os PDFs uma vez só', async () => {
    const compare = vi.fn<ComparisonService['compare']>(() => Promise.resolve({ status: 'failed', error: { code: 'PROCESSING_FAILED' } }))
    render(<StrictMode>{withSession(<Run service={{ compare }} />)}</StrictMode>)
    expect(await screen.findByText('failed')).toBeInTheDocument()
    expect(compare).toHaveBeenCalledTimes(1)
  })

  it('sair da tela e voltar mantém o resultado, sem enviar de novo', async () => {
    const user = userEvent.setup()
    const compare = vi.fn<ComparisonService['compare']>(() => Promise.resolve({ status: 'failed', error: { code: 'INCOMPATIBLE_DOCUMENT' } }))
    const service = { compare }
    render(withSession(<Toggle service={service} />))
    expect(await screen.findByText('failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'alternar' }))
    expect(screen.queryByText('failed')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'alternar' }))
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(compare).toHaveBeenCalledTimes(1)
  })

  it('sair da tela durante o processamento não cancela a comparação', async () => {
    const user = userEvent.setup()
    let finish: (value: Awaited<ReturnType<ComparisonService['compare']>>) => void = () => undefined
    const signals: AbortSignal[] = []
    const compare = vi.fn<ComparisonService['compare']>((_, options) => {
      if (options?.signal) signals.push(options.signal)
      return new Promise((resolve) => (finish = resolve))
    })
    render(withSession(<Toggle service={{ compare }} />))
    await vi.waitFor(() => expect(compare).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'alternar' }))
    expect(signals[0]?.aborted).toBe(false)
    finish({ status: 'failed', error: { code: 'PROCESSING_FAILED' } })
    await user.click(screen.getByRole('button', { name: 'alternar' }))
    expect(await screen.findByText('failed')).toBeInTheDocument()
    expect(compare).toHaveBeenCalledTimes(1)
  })
})
