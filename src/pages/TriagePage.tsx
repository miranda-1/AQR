import { Construction } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function TriagePage() {
  useDocumentTitle('Triagem documental')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Triagem documental</h1>
        <StatusBadge variant="development">Em desenvolvimento</StatusBadge>
      </div>

      <div className="mt-6 flex items-start gap-4 rounded-lg bg-white p-5 shadow-surface">
        <Construction aria-hidden className="mt-0.5 size-6 shrink-0 text-brand" />
        <div className="space-y-3 text-[0.9375rem] text-ink">
          <p>Esta funcionalidade ainda não está disponível.</p>
          <p className="text-muted-foreground">
            A triagem vai analisar os documentos de um processo administrativo, identificar o tipo de cada documento e
            verificar se os documentos obrigatórios foram apresentados. O desenvolvimento começa depois que a comparação
            de PDFs estiver concluída e validada.
          </p>
        </div>
      </div>

      <Button asChild className="mt-8">
        <Link to={routes.comparison}>Ir para a comparação de PDFs</Link>
      </Button>
    </div>
  )
}
