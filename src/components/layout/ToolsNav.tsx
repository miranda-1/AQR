import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { isToolActive, toolItems } from './navigation'

/**
 * Sub-barra das ferramentas (decisão do responsável: "sublinhado"). Faixa azul bem clara abaixo
 * da barra superior, separada por tom, sem linha divisória. Um traço azul desliza até a ferramenta
 * ativa; o nome dela também fica em azul e em negrito, então a cor não é o único indicador.
 */
export function ToolsNav() {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    const indicator = indicatorRef.current
    if (!nav || !indicator) return
    const place = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]')
      indicator.style.opacity = active ? '1' : '0'
      if (!active) return
      indicator.style.width = `${active.offsetWidth}px`
      indicator.style.transform = `translateX(${active.offsetLeft}px)`
      active.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    }
    place()
    // Só anima depois do primeiro posicionamento, para o traço não "voar" ao carregar a página.
    const frame = requestAnimationFrame(() => (indicator.dataset.ready = 'true'))
    const observer = new ResizeObserver(place)
    observer.observe(nav)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [pathname])

  return (
    <nav
      ref={navRef}
      aria-label="Ferramentas"
      className="relative mx-auto flex h-[var(--subbar-height)] max-w-[1920px] items-stretch gap-1 overflow-x-auto px-2 [scrollbar-width:none] lg:px-4 [&::-webkit-scrollbar]:hidden"
    >
      {toolItems.map((item) => {
        const active = isToolActive(item, pathname)
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-ink focus-visible:outline-offset-[-3px]',
              active && 'font-bold text-brand hover:text-brand',
            )}
          >
            <item.icon aria-hidden className="size-[1.125rem]" />
            {item.label}
            {item.status === 'in-development' && (
              <span className="rounded-sm bg-white px-1.5 py-0.5 text-[0.6875rem] leading-none font-bold text-muted-foreground">
                Em breve
              </span>
            )}
          </Link>
        )
      })}
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-t-[3px] bg-brand opacity-0 data-[ready=true]:transition-[transform,width] data-[ready=true]:duration-300 data-[ready=true]:ease-out"
      />
    </nav>
  )
}
