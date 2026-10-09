import { FileSearch, Files, House, type LucideIcon } from 'lucide-react'
import { routes } from '@/config/routes'

export interface ToolItem {
  label: string
  to: string
  icon: LucideIcon
  status?: 'in-development'
  /** Ativa só na própria rota (ex.: o início não fica ativo em /comparacao). */
  exact?: boolean
}

/** Ferramentas do AQR, na sub-barra abaixo da barra superior. */
export const toolItems: readonly ToolItem[] = [
  { label: 'Início', to: routes.home, icon: House, exact: true },
  { label: 'Comparar PDFs', to: routes.comparison, icon: Files },
  { label: 'Triagem documental', to: routes.triage, icon: FileSearch, status: 'in-development' },
]

/** Uma ferramenta fica ativa na própria rota e em suas sub-rotas (ex.: /comparacao/resultado). */
export function isToolActive(item: ToolItem, pathname: string): boolean {
  if (item.exact) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
