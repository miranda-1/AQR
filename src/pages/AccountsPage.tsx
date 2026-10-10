import { Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { AccountsList } from '@/features/admin/components/AccountsList'
import { useDocumentTitle } from '@/hooks/use-document-title'

/** Mensagem de sucesso deixada pelas telas de criar e editar (vem no estado da navegação). */
function noticeFrom(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('notice' in state)) return undefined
  return typeof state.notice === 'string' ? state.notice : undefined
}

export function AccountsPage() {
  useDocumentTitle('Contas')
  const notice = noticeFrom(useLocation().state)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Administração de contas</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Contas de quem usa o AQR. Contas desativadas não entram, mas continuam no histórico.
          </p>
        </div>
        <Button asChild className="min-h-11">
          <Link to={routes.adminAccountNew} viewTransition>
            <Plus aria-hidden />
            Nova conta
          </Link>
        </Button>
      </div>
      {notice && <p role="status" className="mt-4 rounded-lg bg-addition-bg p-4 font-semibold text-addition">{notice}</p>}
      <AccountsList />
    </div>
  )
}
