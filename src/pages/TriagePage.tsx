import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { AvisoExperimental, Carregando, TriagemIndisponivel } from '@/features/triage/components/common'
import { TriagemLista } from '@/features/triage/components/TriagemLista'
import { useTriagemSession } from '@/features/triage/session/triage-session'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function TriagePage() {
  useDocumentTitle('Triagem documental')
  const { disponibilidade, atualizar } = useTriagemSession()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">Triagem documental</h1>
            <StatusBadge variant="development">Experimental</StatusBadge>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Verificação assistida dos documentos de um processo de desdobro na abertura: o sistema classifica os anexos, extrai os campos, confronta os
            documentos e aponta o que conferir. A decisão é sempre do servidor.
          </p>
        </div>
        {disponibilidade.estado === 'disponivel' && disponibilidade.status.pessoa?.podeCriar && (
          <Button asChild className="min-h-11">
            <Link to={routes.triageNew} viewTransition>
              <Plus aria-hidden />
              Nova triagem sintética
            </Link>
          </Button>
        )}
      </div>

      {disponibilidade.estado === 'verificando' && <Carregando texto="Verificando a disponibilidade da triagem…" />}
      {disponibilidade.estado === 'indisponivel' && <TriagemIndisponivel motivo={disponibilidade.motivo} onTentar={atualizar} />}
      {disponibilidade.estado === 'disponivel' && (
        <div className="mt-6 space-y-4">
          <AvisoExperimental />
          {disponibilidade.status.pessoa === null ? (
            <p role="alert" className="rounded-lg bg-white p-4 text-[0.9375rem] text-ink shadow-surface">
              Não foi possível identificar sua conta no servidor da triagem. Entre de novo com uma conta ativa do AQR.
            </p>
          ) : (
            <>
              {disponibilidade.status.pessoa.papel === 'administrador' && (
                <p className="text-sm text-ink">Como administrador, você acompanha todos os processos. A criação e a revisão são feitas pelos analistas.</p>
              )}
              <TriagemLista podeCriar={disponibilidade.status.pessoa.podeCriar} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
