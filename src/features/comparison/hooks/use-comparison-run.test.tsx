import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import type { ComparisonInput, ComparisonService } from '../model/types'
import { useComparisonRun } from './use-comparison-run'

const input: ComparisonInput = { original: new File(['%PDF-'], 'a.pdf'), updated: new File(['%PDF-'], 'b.pdf') }

function Run({ service }: { service: ComparisonService }) {
  const { state } = useComparisonRun(service, input)
  return <p>{state.phase}</p>
}

describe('useComparisonRun', () => {
  it('no StrictMode (montagem dupla), envia os PDFs uma vez só', async () => {
    const compare = vi.fn<ComparisonService['compare']>(() => Promise.resolve({ status: 'failed', error: { code: 'PROCESSING_FAILED' } }))
    render(<StrictMode><Run service={{ compare }} /></StrictMode>)
    expect(await screen.findByText('failed')).toBeInTheDocument()
    expect(compare).toHaveBeenCalledTimes(1)
  })
})
