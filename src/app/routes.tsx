import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { AppShell, type RouteHandle } from '@/components/layout/AppShell'
import { routes } from '@/config/routes'
import { ComparisonSetupPage } from '@/pages/ComparisonSetupPage'

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
  {
    element: <AppShell />,
    children: [
      // A comparação é a tela inicial; "/" redireciona para manter um único endereço canônico.
      { path: routes.home, element: <Navigate to={routes.comparison} replace /> },
      { path: routes.comparison, element: <ComparisonSetupPage /> },
      {
        path: routes.comparisonWorkspace,
        element: lazyPage(() =>
          import('@/pages/ComparisonWorkspacePage').then((m) => ({ default: m.ComparisonWorkspacePage })),
        ),
        handle: workspaceHandle,
      },
      {
        path: routes.triage,
        element: lazyPage(() => import('@/pages/TriagePage').then((m) => ({ default: m.TriagePage }))),
      },
      {
        path: '*',
        element: lazyPage(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))),
      },
    ],
  },
]
