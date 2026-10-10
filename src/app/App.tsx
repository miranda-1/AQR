import { createBrowserRouter, RouterProvider } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminSessionProvider } from '@/features/admin/session/admin-session'
import { AuthSessionProvider } from '@/features/auth/auth-session'
import { EntryHandoffProvider } from '@/features/auth/entry/entry-handoff'
import { ComparisonSessionProvider } from '@/features/comparison/session/comparison-session'
import { appRoutes } from './routes'

const router = createBrowserRouter(appRoutes)

export function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <AuthSessionProvider>
        <EntryHandoffProvider>
          <AdminSessionProvider>
            <ComparisonSessionProvider>
              <RouterProvider router={router} />
            </ComparisonSessionProvider>
          </AdminSessionProvider>
        </EntryHandoffProvider>
      </AuthSessionProvider>
    </TooltipProvider>
  )
}
