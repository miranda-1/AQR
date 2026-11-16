import { useParams } from 'react-router'
import { Carregando, TriagemIndisponivel } from '@/features/triage/components/common'
import { ProcessoView } from '@/features/triage/components/ProcessoView'
import { useTriagemSession } from '@/features/triage/session/triage-session'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function TriageProcessPage() {
  useDocumentTitle('Processo de triagem')
  const { id = '' } = useParams()
  const { disponibilidade, atualizar } = useTriagemSession()
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
      {disponibilidade.estado === 'verificando' && <Carregando texto="Verificando a disponibilidade da triagem…" />}
      {disponibilidade.estado === 'indisponivel' && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Triagem documental</h1>
          <TriagemIndisponivel motivo={disponibilidade.motivo} onTentar={atualizar} />
        </>
      )}
      {disponibilidade.estado === 'disponivel' && <ProcessoView key={id} id={id} />}
    </div>
  )
}
