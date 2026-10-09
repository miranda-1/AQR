import { useLayoutEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router'
import { setPageDirection } from '@/app/page-transition'
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
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  // Roda dentro da View Transition (antes de o navegador animar), definindo o sentido do deslize.
  useLayoutEffect(() => {
    setPageDirection(previousPath.current, pathname)
    previousPath.current = pathname
  }, [pathname])

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
        // [view-transition-name:page]: só o conteúdo desliza na troca de página; a barra fica parada.
        className={cn('outline-none [view-transition-name:page]', fullHeight ? 'flex h-[calc(100dvh-var(--header-height)-var(--subbar-height))] min-h-0 flex-col' : 'flex-1')}
      >
        <Outlet />
      </main>
      {!fullHeight && <AppFooter />}
      <ScrollRestoration />
    </div>
  )
}
