import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { routes } from '@/config/routes'
import { ComparisonWorkspace } from '@/features/comparison/components/ComparisonWorkspace'
import { ErrorPanel, NoDifferencesPanel, ProcessingPanel } from '@/features/comparison/components/StatePanels'
import { WorkspaceHeader } from '@/features/comparison/components/WorkspaceHeader'
import { useComparisonRun } from '@/features/comparison/hooks/use-comparison-run'
import { demoDocuments } from '@/features/comparison/mocks/demo-comparison'
import {
  createMockComparisonService,
  isDemoScenario,
  type DemoScenario,
} from '@/features/comparison/services/mock-comparison-service'
import { useComparisonSession } from '@/features/comparison/session/comparison-session'
import { useDocumentTitle } from '@/hooks/use-document-title'

const SCENARIO_PARAM = 'cenario'

export function ComparisonWorkspacePage() {
  useDocumentTitle('Resultado da comparação')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { files, reset } = useComparisonSession()

  const param = searchParams.get(SCENARIO_PARAM)
  const scenario: DemoScenario = isDemoScenario(param) ? param : 'concluida'

  // Ponto de troca futuro: substituir pelo serviço HTTP real.
  const service = useMemo(() => createMockComparisonService(scenario), [scenario])
  const input = useMemo(() => ({ original: files.original, updated: files.updated }), [files.original, files.updated])
  const { state, retry } = useComparisonRun(service, input)

  const selectedFileNames = [files.original?.name, files.updated?.name].filter((name): name is string => Boolean(name))
  // Concluída: documentos do resultado. Antes disso: os arquivos escolhidos, se houver.
  const documents =
    state.phase === 'completed'
      ? state.result.documents
      : files.original && files.updated
        ? { original: { fileName: files.original.name }, updated: { fileName: files.updated.name } }
        : undefined

  return (
    <>
      <WorkspaceHeader
        phase={state.phase}
        documents={documents}
        selectedFileNames={selectedFileNames}
        scenario={scenario}
        onScenarioChange={(next) => setSearchParams({ [SCENARIO_PARAM]: next }, { replace: true })}
        onNewComparison={() => {
          reset()
          navigate(routes.comparison, { viewTransition: true })
        }}
      />
      {(state.phase === 'preparing' || state.phase === 'processing') && <ProcessingPanel state={state} />}
      {state.phase === 'failed' && <ErrorPanel error={state.error} onRetry={retry} />}
      {state.phase === 'completed' &&
        (state.result.differences.length === 0 ? (
          <NoDifferencesPanel />
        ) : (
          <ComparisonWorkspace key={state.result.id} result={state.result} documents={demoDocuments} />
        ))}
    </>
  )
}
