import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '@/app/routes'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { AccountService } from '@/features/admin/model/types'
import { AdminSessionProvider } from '@/features/admin/session/admin-session'
import { createInMemoryAccountService } from '@/features/admin/services/in-memory-account-service'
import { AuthSessionProvider } from '@/features/auth/auth-session'
import { EntryHandoffProvider } from '@/features/auth/entry/entry-handoff'
import { ComparisonSessionProvider } from '@/features/comparison/session/comparison-session'

interface RenderAppOptions {
  authenticated?: boolean
  /** Serviço de contas dos testes. Por padrão, a administração está desligada. */
  accountService?: AccountService
}

/**
 * Renderiza a aplicação completa em uma rota, com roteador em memória.
 * Por padrão já com sessão; use `{ authenticated: false }` para testar o login.
 */
export function renderApp(path = '/', { authenticated = true, accountService }: RenderAppOptions = {}) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  const utils = render(
    <TooltipProvider>
      <AuthSessionProvider initialAuthenticated={authenticated}>
        <EntryHandoffProvider>
          <AdminSessionProvider service={accountService ?? createInMemoryAccountService({ available: false })}>
            <ComparisonSessionProvider>
              <RouterProvider router={router} />
            </ComparisonSessionProvider>
          </AdminSessionProvider>
        </EntryHandoffProvider>
      </AuthSessionProvider>
    </TooltipProvider>,
  )
  return { ...utils, router }
}
