import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { AvisoExperimental, Carregando, TriagemIndisponivel } from '@/features/triage/components/common'
import { NovaTriagemForm } from '@/features/triage/components/NovaTriagemForm'
import { useTriagemSession } from '@/features/triage/session/triage-session'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function TriageNewPage() {
  useDocumentTitle('Nova triagem sintética')
  const { disponibilidade, atualizar } = useTriagemSession()
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6">
      <Button asChild variant="link" className="px-0">
        <Link to={routes.triage} viewTransition><ArrowLeft aria-hidden />Todos os processos</Link>
      </Button>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Nova triagem sintética</h1>
      <p className="mt-2 text-muted-foreground">Desdobro, etapa de abertura. Só pacotes sintéticos.</p>
      {disponibilidade.estado === 'verificando' && <Carregando texto="Verificando a disponibilidade da triagem…" />}
      {disponibilidade.estado === 'indisponivel' && <TriagemIndisponivel motivo={disponibilidade.motivo} onTentar={atualizar} />}
      {disponibilidade.estado === 'disponivel' &&
        (disponibilidade.status.pessoa?.podeCriar ? (
          <>
            <AvisoExperimental className="mt-6" />
            <NovaTriagemForm limites={disponibilidade.status.limites} />
          </>
        ) : (
          <p role="alert" className="mt-6 rounded-lg bg-white p-4 text-[0.9375rem] text-ink shadow-surface">
            Sua conta não cria processos de triagem. A criação é feita por analistas; administradores acompanham.
          </p>
        ))}
    </div>
  )
}
