import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '@/app/routes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthSessionProvider } from '@/features/auth/auth-session'
import { EntryHandoffProvider } from '@/features/auth/entry/entry-handoff'
import { ComparisonSessionProvider } from '@/features/comparison/session/comparison-session'

/**
 * Renderiza a aplicação completa em uma rota, com roteador em memória.
 * Por padrão já com sessão; use `{ authenticated: false }` para testar o login.
 */
export function renderApp(path = '/', { authenticated = true }: { authenticated?: boolean } = {}) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  const utils = render(
    <TooltipProvider>
      <AuthSessionProvider initialAuthenticated={authenticated}>
        <EntryHandoffProvider>
          <ComparisonSessionProvider>
            <RouterProvider router={router} />
          </ComparisonSessionProvider>
        </EntryHandoffProvider>
      </AuthSessionProvider>
    </TooltipProvider>,
  )
  return { ...utils, router }
}
