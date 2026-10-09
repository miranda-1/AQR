import { ArrowLeftRight, ChevronRight, Info } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { appConfig } from '@/config/app'
import { comparisonConfig } from '@/config/comparison'
import { routes } from '@/config/routes'
import { FileSlot } from '@/features/comparison/components/FileSlot'
import { useComparisonSession } from '@/features/comparison/session/comparison-session'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatFileSize } from '@/lib/format'

function readinessMessage(hasOriginal: boolean, hasUpdated: boolean): string {
  if (hasOriginal && hasUpdated) return 'Os dois documentos estão prontos.'
  if (hasOriginal) return 'Selecione o documento atualizado para continuar.'
  if (hasUpdated) return 'Selecione o documento original para continuar.'
  return 'Selecione os dois documentos para continuar.'
}

/** Instruções complementares, recolhidas por padrão para não competir com a tarefa. */
function HowItWorks() {
  return (
    <details className="group rounded-md bg-white shadow-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-4 text-[0.9375rem] font-semibold text-ink hover:bg-secondary [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
        Como funciona
      </summary>
      <ul className="list-disc space-y-1.5 pt-1 pb-4 pr-4 pl-10 text-[0.9375rem] text-muted-foreground">
        <li>O documento original é a versão anterior; o atualizado é a nova versão. A ordem importa.</li>
        <li>O resultado indica os trechos adicionados, excluídos e modificados, com a página de cada alteração.</li>
        <li>
          Aceita arquivos PDF de até {formatFileSize(comparisonConfig.maxFileSizeBytes)}, com texto selecionável.
          Documentos digitalizados como imagem ainda não são suportados.
        </li>
        {appConfig.isPrototype ? (
          <li>
            Nesta versão de protótipo, os arquivos são verificados apenas no navegador e não são enviados. O resultado
            exibido usa documentos fictícios.
          </li>
        ) : (
          <li>
            Os arquivos são enviados ao servidor do AQR só para a comparação e não ficam guardados. O resultado fica
            disponível por 30 minutos.
          </li>
        )}
      </ul>
    </details>
  )
}

export function ComparisonSetupPage() {
  useDocumentTitle('Comparar documentos')
  const navigate = useNavigate()
  const { files, swapFiles } = useComparisonSession()
  const hasOriginal = files.original !== null
  const hasUpdated = files.updated !== null
  const ready = hasOriginal && hasUpdated

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Comparar documentos</h1>
          <p className="mt-1 text-[0.9375rem] text-muted-foreground">Selecione o documento original e a versão atualizada.</p>
        </div>
        {appConfig.isPrototype && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Info aria-hidden className="size-4 shrink-0 text-modification" />
            Protótipo: os arquivos não são enviados e o resultado usa dados fictícios.
          </p>
        )}
      </header>

      <form
        className="mt-5"
        aria-label="Selecionar documentos para comparação"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) navigate(routes.comparisonWorkspace, { viewTransition: true })
        }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <FileSlot documentRole="original" title="Documento original" description="Versão anterior, usada como referência." />
          <div className="flex items-center justify-center lg:pt-12">
            <Button
              type="button"
              variant="outline"
              onClick={swapFiles}
              disabled={!hasOriginal && !hasUpdated}
              className="lg:h-auto lg:flex-col lg:px-2 lg:py-3"
            >
              <ArrowLeftRight aria-hidden className="rotate-90 lg:rotate-0" />
              <span className="lg:text-xs">Inverter</span>
              <span className="sr-only"> original e atualizado</span>
            </Button>
          </div>
          <FileSlot documentRole="updated" title="Documento atualizado" description="Nova versão, comparada com a original." />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <p id="comparacao-prontidao" aria-live="polite" className="text-sm text-muted-foreground">
            {readinessMessage(hasOriginal, hasUpdated)}
          </p>
          <Button type="submit" size="lg" disabled={!ready} aria-describedby="comparacao-prontidao">
            Comparar documentos
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <HowItWorks />
      </div>
    </div>
  )
}
