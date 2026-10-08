import { createBrowserRouter, RouterProvider } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ComparisonSessionProvider } from '@/features/comparison/session/comparison-session'
import { appRoutes } from './routes'

const router = createBrowserRouter(appRoutes)

export function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <ComparisonSessionProvider>
        <RouterProvider router={router} />
      </ComparisonSessionProvider>
    </TooltipProvider>
  )
}
