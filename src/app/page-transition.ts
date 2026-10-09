import { isToolActive, toolItems } from '@/components/layout/navigation'
import { routes } from '@/config/routes'

/**
 * Posição de uma página na ordem da sub-barra (Início, Comparar PDFs, Triagem documental).
 * A transição "deslizar" anda no mesmo sentido do traço: para a direita, a página nova entra pela direita.
 * O resultado da comparação fica logo depois da seleção.
 */
export function pageOrder(pathname: string): number {
  if (pathname.startsWith(routes.comparisonWorkspace)) return 1.5
  const index = toolItems.findIndex((item) => isToolActive(item, pathname))
  return index === -1 ? 0 : index
}

/** Marca no <html> o sentido da próxima transição, lido pelo CSS (globals.css). */
export function setPageDirection(from: string, to: string) {
  document.documentElement.dataset.pageDirection = pageOrder(to) < pageOrder(from) ? 'back' : 'forward'
}
