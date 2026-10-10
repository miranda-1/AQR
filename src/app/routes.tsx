import { lazy, Suspense, type ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import { AppShell, type RouteHandle } from '@/components/layout/AppShell'
import { routes } from '@/config/routes'
import { RequireAdmin } from '@/features/admin/components/RequireAdmin'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { ComparisonSetupPage } from '@/pages/ComparisonSetupPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'

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
  // Login em tela cheia, fora do AppShell.
  { path: routes.login, element: <LoginPage /> },
  {
    // Todas as demais páginas exigem a sessão (visual nesta etapa).
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
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
        path: routes.triage,
        element: lazyPage(() => import('@/pages/TriagePage').then((m) => ({ default: m.TriagePage }))),
      },
      {
        path: routes.adminAccounts,
        element: <RequireAdmin>{lazyPage(() => import('@/pages/AccountsPage').then((m) => ({ default: m.AccountsPage })))}</RequireAdmin>,
      },
      {
        path: routes.adminAccountNew,
        element: <RequireAdmin>{lazyPage(() => import('@/pages/AccountCreatePage').then((m) => ({ default: m.AccountCreatePage })))}</RequireAdmin>,
      },
      {
        path: '/administracao/contas/:id',
        element: <RequireAdmin>{lazyPage(() => import('@/pages/AccountEditPage').then((m) => ({ default: m.AccountEditPage })))}</RequireAdmin>,
      },
      {
        path: '*',
        element: lazyPage(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))),
      },
    ],
  },
]
