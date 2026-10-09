import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 lg:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Página não encontrada</h1>
      <p className="mt-3 text-lg text-muted-foreground">O endereço acessado não existe no AQR. Verifique o link.</p>
      <Button asChild className="mt-8">
        <Link to={routes.comparison} viewTransition>Ir para a comparação de documentos</Link>
      </Button>
    </div>
  )
}
