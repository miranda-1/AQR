import { useEffect, useState, type RefObject } from 'react'

/**
 * Indica se o elemento está visível na janela. Serve para pausar animações fora da tela.
 * Sem IntersectionObserver (ex.: jsdom), considera o elemento visível.
 */
export function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return inView
}
