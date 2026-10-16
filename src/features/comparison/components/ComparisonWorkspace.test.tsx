import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { defined } from '@/test/files'
import { demoComparisonResult, demoDocumentSources } from '../mocks/demo-comparison'
import { ComparisonWorkspace } from './ComparisonWorkspace'
import { ErrorPanel } from './StatePanels'

function renderWorkspace() {
  return render(
    <TooltipProvider>
      <ComparisonWorkspace result={demoComparisonResult} documents={demoDocumentSources} />
    </TooltipProvider>,
  )
}

const total = demoComparisonResult.differences.length

describe('ComparisonWorkspace', () => {
  it('exibe os indicadores do resultado', () => {
    renderWorkspace()
    const filters = screen.getByRole('radiogroup', { name: 'Filtrar diferenças por tipo' })
    expect(within(filters).getByText(String(total))).toBeInTheDocument()
    expect(within(filters).getByText('Adições')).toBeInTheDocument()
    expect(within(filters).getByText('Exclusões')).toBeInTheDocument()
    expect(within(filters).getByText('Modificações')).toBeInTheDocument()
  })

  it('navega entre diferenças com os botões e com o teclado', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    expect(screen.getAllByText(`1 de ${total}`)[0]).toBeInTheDocument()
    await user.click(defined(screen.getAllByRole('button', { name: /Próxima/ })[0]))
    expect(screen.getAllByText(`2 de ${total}`)[0]).toBeInTheDocument()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(screen.getAllByText(`3 de ${total}`)[0]).toBeInTheDocument()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(screen.getAllByText(`2 de ${total}`)[0]).toBeInTheDocument()
  })

  it('selecionar uma diferença na lista marca o trecho nos documentos', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    const list = screen.getByRole('list', { name: 'Diferenças encontradas' })
    const item = defined(within(list).getAllByRole('button')[3])
    await user.click(item)
    expect(item).toHaveAttribute('aria-current', 'true')

    const target = defined(demoComparisonResult.differences[3])
    const marks = document.querySelectorAll(`[data-diff-id="${target.id}"]`)
    expect(marks.length).toBe(2) // original e atualizado
    marks.forEach((mark) => expect(mark).toHaveAttribute('aria-current', 'true'))
  })

  it('permite selecionar um destaque no documento pelo teclado', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    const target = defined(demoComparisonResult.differences[4])
    const mark = defined(document.querySelector<HTMLElement>(`[data-diff-id="${target.id}"]`))
    mark.focus()
    await user.keyboard('{Enter}')
    expect(mark).toHaveAttribute('aria-current', 'true')
    expect(screen.getAllByText(`5 de ${total}`)[0]).toBeInTheDocument()
  })

  it('filtra a lista por tipo', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole('radio', { name: /Exclusões/ }))
    const list = screen.getByRole('list', { name: 'Diferenças encontradas' })
    const deletions = demoComparisonResult.differences.filter((d) => d.kind === 'deletion').length
    expect(within(list).getAllByRole('listitem')).toHaveLength(deletions)
  })

  it('alterna o modo de visualização pelo menu', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    expect(screen.getByRole('region', { name: 'Documento original' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Lado a lado/ }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Só o atualizado' }))
    expect(screen.queryByRole('region', { name: 'Documento original' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Documento atualizado' })).toBeInTheDocument()
  })

  it('modo foco: tela cheia, setas na faixa de diferenças e Esc para sair', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole('button', { name: /Focar/ }))
    const focusRegion = screen.getByRole('region', { name: /Modo foco/ })
    expect(within(focusRegion).getByRole('button', { name: /Sair do foco/ })).toHaveFocus()
    const strip = within(focusRegion).getByRole('list', { name: 'Diferenças encontradas' })
    expect(within(strip).getAllByRole('listitem')).toHaveLength(total)
    const [, next] = within(focusRegion).getAllByRole('button', { name: 'Próxima diferença' })
    await user.click(defined(next))
    expect(within(strip).getAllByRole('button')[1]).toHaveAttribute('aria-current', 'true')
    await user.click(defined(within(focusRegion).getAllByRole('button', { name: 'Diferença anterior' })[1]))
    expect(within(strip).getAllByRole('button')[0]).toHaveAttribute('aria-current', 'true')
    // Minimizar a faixa deixa só as setas e a posição.
    await user.click(within(focusRegion).getByRole('button', { name: 'Minimizar' }))
    expect(within(focusRegion).queryByRole('list', { name: 'Diferenças encontradas' })).not.toBeInTheDocument()
    expect(within(focusRegion).getAllByText(`1 de ${total}`, { selector: 'span[aria-live]' })).toHaveLength(2)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: /Modo foco/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Focar/ })).toHaveFocus()
  })

  it('a tecla F liga o modo foco', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.keyboard('f')
    expect(screen.getByRole('region', { name: /Modo foco/ })).toBeInTheDocument()
  })

  it('números das diferenças só ao passar o mouse, até ligar "Números sempre"', async () => {
    const user = userEvent.setup()
    const { container } = renderWorkspace()
    expect(container.querySelector('.diff-numbers-hover')).not.toBeNull()
    const toggle = screen.getByRole('switch', { name: /Números/ })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(container.querySelector('.diff-numbers-hover')).toBeNull()
  })
})

describe('ErrorPanel', () => {
  function renderError(code: 'NO_EXTRACTABLE_TEXT' | 'INCOMPATIBLE_DOCUMENT' | 'PROCESSING_FAILED', onRetry = () => {}) {
    return render(
      <MemoryRouter>
        <ErrorPanel error={{ code, document: 'original' }} onRetry={onRetry} />
      </MemoryRouter>,
    )
  }

  it('explica PDF digitalizado sem texto e indica o caminho', () => {
    renderError('NO_EXTRACTABLE_TEXT')
    expect(screen.getByRole('alert')).toHaveTextContent('PDF sem texto para comparar')
    expect(screen.getByRole('alert')).toHaveTextContent('O documento original parece ser uma digitalização')
    expect(screen.getByRole('link', { name: 'Escolher outros arquivos' })).toHaveAttribute('href', '/comparacao')
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('oferece nova tentativa em falha de processamento', async () => {
    const user = userEvent.setup()
    let retried = false
    renderError('PROCESSING_FAILED', () => {
      retried = true
    })
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(retried).toBe(true)
  })
})
