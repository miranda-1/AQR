import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ComparisonWorkspace } from '@/features/comparison/components/ComparisonWorkspace'
import { ErrorPanel, NoDifferencesPanel, ProcessingPanel } from '@/features/comparison/components/StatePanels'
import { demoComparisonResult, demoDocumentSources } from '@/features/comparison/mocks/demo-comparison'
import { createInMemoryAccountService } from '@/features/admin/services/in-memory-account-service'
import { sampleAccounts } from '@/features/admin/test-data'
import { renderApp } from './render'

/**
 * Auditoria automática com axe-core (regras WCAG 2.x A/AA).
 * Contraste de cor não é avaliável no jsdom; foi verificado à parte (ver docs/acessibilidade.md).
 */
async function violations(container: Element) {
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
}

describe('acessibilidade (axe)', () => {
  it.each([
    ['página inicial', '/', 'Como podemos ajudar?'],
    ['seleção de arquivos', '/comparacao', 'Comparar documentos'],
    ['triagem', '/triagem', 'Triagem documental'],
  ])('%s não tem violações', async (_, path, heading) => {
    const { container } = renderApp(path)
    await screen.findByRole('heading', { level: 1, name: heading })
    expect(await violations(container)).toEqual([])
  })

  it('login não tem violações', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/entrar', { authenticated: false })
    await screen.findByRole('heading', { level: 1, name: 'Entrar' })
    expect(await violations(container)).toEqual([])
    // Com os erros de preenchimento à mostra.
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await violations(container)).toEqual([])
  })

  it('menu da conta aberto e "Como funciona" expandido não têm violações', async () => {
    const user = userEvent.setup()
    renderApp('/comparacao')
    await screen.findByRole('heading', { level: 1, name: 'Comparar documentos' })
    await user.click(screen.getByText('Como funciona'))
    await user.click(screen.getByRole('button', { name: 'Conta de servidor' }))
    await screen.findByRole('menu')
    expect(await violations(document.body)).toEqual([])
  })

  it('workspace de comparação não tem violações', async () => {
    const { container } = render(
      <TooltipProvider>
        <ComparisonWorkspace result={demoComparisonResult} documents={demoDocumentSources} />
      </TooltipProvider>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('estados de processamento, erro e sem diferenças não têm violações', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProcessingPanel state={{ phase: 'processing', stage: 'comparing' }} isDemonstration={false} />
        <ErrorPanel error={{ code: 'INCOMPATIBLE_DOCUMENT', document: 'updated' }} onRetry={() => {}} />
        <NoDifferencesPanel />
      </MemoryRouter>,
    )
    expect(await violations(container)).toEqual([])
  })
})

describe('acessibilidade da administração (axe)', () => {
  it('lista de contas não tem violações', async () => {
    const { container } = renderApp('/administracao/contas', {
      accountService: createInMemoryAccountService({ accounts: sampleAccounts }),
    })
    await screen.findByRole('table', { name: 'Contas do AQR' })
    expect(await violations(container)).toEqual([])
  })
})
