import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '@/app/routes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ComparisonSessionProvider } from '@/features/comparison/session/comparison-session'

/** Renderiza a aplicação completa em uma rota, com roteador em memória. */
export function renderApp(path = '/') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  const utils = render(
    <TooltipProvider>
      <ComparisonSessionProvider>
        <RouterProvider router={router} />
      </ComparisonSessionProvider>
    </TooltipProvider>,
  )
  return { ...utils, router }
}
