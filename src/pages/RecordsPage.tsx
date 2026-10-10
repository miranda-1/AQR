import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { AccessEventList } from '@/features/admin/components/AccessEventList'
import { ComparisonUsageList } from '@/features/admin/components/ComparisonUsageList'
import { useAdminSession } from '@/features/admin/session/admin-session'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function RecordsPage() {
  useDocumentTitle('Registros de uso e acesso')
  const { mode } = useAdminSession()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Registros de uso e acesso</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Quem entrou no AQR, quem foi recusado e quantas comparações cada pessoa fez. Os registros não podem ser alterados;
        os de comparação são apagados sozinhos depois de 1 ano.
      </p>

      {mode === 'real' ? (
        <>
          <section aria-labelledby="uso-titulo" className="mt-8">
            <h2 id="uso-titulo" className="text-xl font-bold text-ink">Uso da comparação de PDFs</h2>
            <p className="mt-1 mb-4 max-w-2xl text-sm text-muted-foreground">
              Só a quantidade por pessoa. O AQR não guarda os documentos, os nomes dos arquivos nem o resultado das comparações.
            </p>
            <ComparisonUsageList />
          </section>

          <section aria-labelledby="acessos-titulo" className="mt-10">
            <h2 id="acessos-titulo" className="mb-4 text-xl font-bold text-ink">Acessos</h2>
            <AccessEventList />
          </section>
        </>
      ) : (
        <p role="status" className="mt-6 rounded-lg bg-white p-5 text-ink shadow-surface">
          Os registros só existem com o login real (Keycloak). No modo de desenvolvimento não há o que mostrar.
        </p>
      )}

      <Button asChild variant="outline" className="mt-8">
        <Link to={routes.adminAccounts} viewTransition>Voltar à lista de contas</Link>
      </Button>
    </div>
  )
}
