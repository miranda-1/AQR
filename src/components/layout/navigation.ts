import { FileSearch, Files, type LucideIcon } from 'lucide-react'
import { routes } from '@/config/routes'

export interface ToolItem {
  label: string
  to: string
  icon: LucideIcon
  status?: 'in-development'
}

/** Ferramentas do AQR, listadas no menu "Ferramentas" da barra superior. */
export const toolItems: readonly ToolItem[] = [
  { label: 'Comparação de PDFs', to: routes.comparison, icon: Files },
  { label: 'Triagem documental', to: routes.triage, icon: FileSearch, status: 'in-development' },
]

/** Uma ferramenta fica ativa na própria rota e em suas sub-rotas (ex.: /comparacao/resultado). */
export function isToolActive(item: ToolItem, pathname: string): boolean {
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
