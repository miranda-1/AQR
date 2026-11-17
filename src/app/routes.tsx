import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { AppShell, type RouteHandle } from '@/components/layout/AppShell'
import { routes } from '@/config/routes'
import { ComparisonSetupPage } from '@/pages/ComparisonSetupPage'
import { HomePage } from '@/pages/HomePage'

/** Carrega a página sob demanda, mantendo o carregamento inicial leve. */
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(load)
  return (
    <Suspense fallback={<p className="sr-only" role="status">Carregando…</p>}>
      <Page />
    </Suspense>
  )
}

const workspaceHandle: RouteHandle = { fullHeight: true }

export const appRoutes: RouteObject[] = [
  // Versão pública: sem login (decisão do responsável, 17/11/2026). O endereço antigo do login
  // leva ao início, para links guardados não caírem na página de "não encontrado".
  { path: routes.login, element: <Navigate to={routes.home} replace /> },
  {
    element: <AppShell />,
    children: [
      { path: routes.home, element: <HomePage /> },
      { path: routes.comparison, element: <ComparisonSetupPage /> },
      {
        path: routes.comparisonWorkspace,
        element: lazyPage(() =>
          import('@/pages/ComparisonWorkspacePage').then((m) => ({ default: m.ComparisonWorkspacePage })),
        ),
        handle: workspaceHandle,
      },
      {
        path: '*',
        element: lazyPage(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))),
      },
    ],
  },
]
