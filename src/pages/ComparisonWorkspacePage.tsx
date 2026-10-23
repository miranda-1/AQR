import { useMemo } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { routes } from '@/config/routes'
import { ComparisonWorkspace } from '@/features/comparison/components/ComparisonWorkspace'
import { ErrorPanel, NoDifferencesPanel, ProcessingPanel } from '@/features/comparison/components/StatePanels'
import { ResultActionsMenu, WorkspaceHeader } from '@/features/comparison/components/WorkspaceHeader'
import { useComparisonRun } from '@/features/comparison/hooks/use-comparison-run'
import { demoDocumentSources } from '@/features/comparison/mocks/demo-comparison'
import type { ComparisonService, DocumentRole } from '@/features/comparison/model/types'
import {
  createMockComparisonService,
  isDemoScenario,
  type DemoScenario,
} from '@/features/comparison/services/mock-comparison-service'
import { useComparisonSession } from '@/features/comparison/session/comparison-session'
import type { DocumentSource } from '@/features/comparison/viewer/document-source'
import { useDocumentTitle } from '@/hooks/use-document-title'

const SCENARIO_PARAM = 'cenario'

interface ComparisonWorkspacePageProps {
  /** Serviço a usar no lugar do configurado (testes). */
  service?: ComparisonService
}

export function ComparisonWorkspacePage({ service: injected }: ComparisonWorkspacePageProps = {}) {
  useDocumentTitle('Resultado da comparação')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { files, reset } = useComparisonSession()
  // Nesta branch (só frontend) a comparação é sempre a demonstrativa; os testes podem injetar outra.
  const isDemo = !injected

  const param = searchParams.get(SCENARIO_PARAM)
  const scenario: DemoScenario = isDemoScenario(param) ? param : 'concluida'

  const service = useMemo(() => injected ?? createMockComparisonService(scenario), [injected, scenario])
  const input = useMemo(() => ({ original: files.original, updated: files.updated }), [files.original, files.updated])
  const serviceKey = injected ? 'injetado' : `demo:${scenario}`
  const { state, retry, view, saveView } = useComparisonRun(service, input, serviceKey)

  // Sem os arquivos (ex.: página recarregada), a comparação real não tem o que enviar.
  if (!isDemo && (!files.original || !files.updated)) return <Navigate to={routes.comparison} replace />

  const selectedFileNames = [files.original?.name, files.updated?.name].filter((name): name is string => Boolean(name))
  // Concluída: documentos do resultado. Antes disso: os arquivos escolhidos, se houver.
  const documents =
    state.phase === 'completed'
      ? state.result.documents
      : files.original && files.updated
        ? { original: { fileName: files.original.name }, updated: { fileName: files.updated.name } }
        : undefined

  const sources: Record<DocumentRole, DocumentSource> | undefined =
    state.phase === 'completed' && state.result.isDemonstration
      ? demoDocumentSources
      : files.original && files.updated
        ? { original: { kind: 'pdf', file: files.original }, updated: { kind: 'pdf', file: files.updated } }
        : undefined

  const startNew = () => {
    reset()
    navigate(routes.comparison, { viewTransition: true })
  }
  // Com resultado e diferenças (fora do modo demonstrativo), a barra única do resultado substitui o
  // cabeçalho: título, exportar e nova comparação ficam nela, e os PDFs ganham a altura.
  const singleBar = !isDemo && state.phase === 'completed' && state.result.differences.length > 0 && sources !== undefined

  return (
    <>
      {!singleBar && <WorkspaceHeader
        phase={state.phase}
        documents={documents}
        result={state.phase === 'completed' ? state.result : undefined}
        demo={
          isDemo
            ? {
                scenario,
                selectedFileNames,
                onScenarioChange: (next) => setSearchParams({ [SCENARIO_PARAM]: next }, { replace: true }),
              }
            : undefined
        }
        onNewComparison={startNew}
      />}
      {(state.phase === 'preparing' || state.phase === 'processing') && (
        <ProcessingPanel state={state} isDemonstration={isDemo} />
      )}
      {state.phase === 'failed' && <ErrorPanel error={state.error} onRetry={retry} />}
      {state.phase === 'completed' &&
        (state.result.differences.length === 0 ? (
          <NoDifferencesPanel result={state.result} />
        ) : (
          sources && (
            <ComparisonWorkspace
              key={state.result.id}
              result={state.result}
              documents={sources}
              initialView={view}
              onViewChange={saveView}
              actions={
                singleBar ? <ResultActionsMenu result={state.result} onNewComparison={startNew} /> : undefined
              }
            />
          )
        ))}
    </>
  )
}
