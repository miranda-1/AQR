import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { AuditList } from '@/features/admin/components/AuditList'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function AuditPage() {
  useDocumentTitle('Auditoria')

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Auditoria de contas</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Todo o que muda nas contas fica registrado: quem fez, quando e o que mudou. Os registros não podem ser alterados nem apagados.
      </p>
      <div className="mt-6">
        <AuditList showFilter pageSize={15} />
      </div>
      <Button asChild variant="outline" className="mt-6">
        <Link to={routes.adminAccounts} viewTransition>Voltar à lista de contas</Link>
      </Button>
    </div>
  )
}
