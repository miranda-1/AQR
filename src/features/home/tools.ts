import { FileSearch, Files, type LucideIcon } from 'lucide-react'
import type { ToolItem } from '@/components/layout/navigation'
import { routes } from '@/config/routes'

export type HomeToolId = 'comparison' | 'triage'

/** Ilustração animada exibida na demonstração da ferramenta. */
export type ToolIllustrationKind = 'comparison' | 'triage'

export interface HomeTool {
  id: HomeToolId
  title: string
  /** Descrição curta, exibida na opção. */
  description: string
  /** Explicação exibida na área de demonstração. */
  explanation: string
  to: string
  icon: LucideIcon
  illustration: ToolIllustrationKind
  status?: ToolItem['status']
}

/** Ferramentas apresentadas na página inicial, na ordem de exibição. */
export const homeTools: readonly HomeTool[] = [
  {
    id: 'comparison',
    title: 'Comparar PDFs',
    description:
      'Compare duas versões de um documento e identifique rapidamente o que foi adicionado, removido ou alterado.',
    explanation:
      'Selecione a versão original e a atualizada. O AQR aponta cada trecho adicionado, excluído ou modificado e a página em que ele aparece.',
    to: routes.comparison,
    icon: Files,
    illustration: 'comparison',
  },
  {
    id: 'triage',
    title: 'Triagem documental',
    description:
      'Analise os documentos de um processo, identifique cada tipo e verifique se todos os itens obrigatórios foram apresentados.',
    explanation:
      'A triagem vai reconhecer cada documento do processo, classificá-lo por tipo e conferir a lista de itens obrigatórios.',
    to: routes.triage,
    icon: FileSearch,
    illustration: 'triage',
    status: 'in-development',
  },
]

export const defaultHomeToolId: HomeToolId = 'comparison'
