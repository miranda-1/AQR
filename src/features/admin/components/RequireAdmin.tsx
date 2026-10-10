import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useAdminSession } from '../session/admin-session'

/** Só mostra a administração quando o servidor a disponibiliza; senão, explica o motivo. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { availability } = useAdminSession()
  useDocumentTitle('Administração de contas')

  if (availability === 'available') return <>{children}</>
  if (availability === 'checking') {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-14 lg:px-6">
        <p role="status" className="text-muted-foreground">Verificando a administração de contas…</p>
      </div>
    )
  }
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 lg:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Administração indisponível</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        A administração de contas está desligada neste servidor. Para usá-la em desenvolvimento, inicie a API com{' '}
        <code>ADMIN_API_MODE=dev</code> e entre com o usuário de um administrador.
      </p>
      <Button asChild className="mt-8">
        <Link to={routes.home} viewTransition>Voltar ao início</Link>
      </Button>
    </div>
  )
}
