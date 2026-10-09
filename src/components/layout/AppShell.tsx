import { Outlet, ScrollRestoration, useMatches } from 'react-router'
import { cn } from '@/lib/utils'
import { AppFooter } from './AppFooter'
import { AppHeader } from './AppHeader'

export interface RouteHandle {
  /** Páginas de trabalho em tela cheia (ex.: workspace) ocupam a altura toda, sem rodapé. */
  fullHeight?: boolean
}

function useIsFullHeight(): boolean {
  const matches = useMatches()
  return matches.some((match) => (match.handle as RouteHandle | undefined)?.fullHeight === true)
}

export function AppShell() {
  const fullHeight = useIsFullHeight()

  return (
    <div className="flex min-h-dvh flex-col bg-surface-sunken">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-brand px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <AppHeader />
      <main
        id="conteudo"
        // Recebe foco programático do link "Pular para o conteúdo"; o contorno aqui seria ruído.
        tabIndex={-1}
        className={cn('outline-none', fullHeight ? 'flex h-[calc(100dvh-var(--header-height)-var(--subbar-height))] min-h-0 flex-col' : 'flex-1')}
      >
        <Outlet />
      </main>
      {!fullHeight && <AppFooter />}
      <ScrollRestoration />
    </div>
  )
}
