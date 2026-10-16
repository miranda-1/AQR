import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuthSession } from '@/features/auth/auth-session'
import { comparisonRunReducer, initialRunState, type ComparisonRunAction, type ComparisonRunState } from '../model/comparison-run'
import type { ComparisonService, DocumentRole } from '../model/types'

type SelectedFiles = Record<DocumentRole, File | null>

/** Como a pessoa deixou a tela do resultado (para encontrá-la igual ao voltar). */
export interface WorkspaceViewState {
  mode?: 'complete' | 'content' | 'visual'
  filter?: string
  category?: string
  selectedId?: string | null
  viewMode?: 'side-by-side' | 'original' | 'updated'
  zoom?: number
  syncScroll?: boolean
  listCollapsed?: boolean
  /** Modo foco (tela cheia) ligado. */
  focus?: boolean
  /** Números das diferenças sempre visíveis (padrão: só ao passar o mouse). */
  numbersAlways?: boolean
}

/** A comparação em andamento ou concluída, guardada enquanto a pessoa navega pelo site. */
export interface ActiveComparison {
  /** Identifica a comparação: serviço usado e os dois arquivos. */
  key: string
  /** Arquivos comparados (vazios só no modo demonstrativo sem arquivos). */
  files: SelectedFiles
  state: ComparisonRunState
  view: WorkspaceViewState
}

interface ComparisonSessionValue {
  files: SelectedFiles
  setFile: (role: DocumentRole, file: File | null) => void
  swapFiles: () => void
  /** Apaga os arquivos e a comparação (nova comparação, saída da conta). */
  reset: () => void
  active: ActiveComparison | null
  /**
   * Garante uma comparação para estes arquivos com este serviço: reaproveita a que já existe (em
   * andamento ou pronta) ou começa uma nova, cancelando a anterior.
   */
  ensureComparison: (key: string, service: ComparisonService, files: SelectedFiles) => void
  retry: () => void
  saveView: (view: WorkspaceViewState) => void
}

const ComparisonSessionContext = createContext<ComparisonSessionValue | null>(null)

const emptyFiles: SelectedFiles = { original: null, updated: null }

/** Número estável por arquivo escolhido, para reconhecer a mesma comparação ao voltar. */
const fileIds = new WeakMap<File, number>()
let nextFileId = 1
export function fileIdentity(file: File): number {
  let id = fileIds.get(file)
  if (id === undefined) {
    id = nextFileId++
    fileIds.set(file, id)
  }
  return id
}

/**
 * Mantém os arquivos escolhidos e a comparação apenas em memória, no navegador. A comparação
 * continua (e o resultado fica) enquanto a pessoa visita outras páginas do site; nada é gravado e,
 * ao recarregar a página, sair da conta ou começar uma nova comparação, tudo é descartado.
 */
export function ComparisonSessionProvider({ children }: { children: ReactNode }) {
  const { userName } = useAuthSession()
  const [files, setFiles] = useState<SelectedFiles>(emptyFiles)
  const [active, setActive] = useState<ActiveComparison | null>(null)
  const controller = useRef<AbortController | null>(null)
  /** Chave da comparação atual, atualizada na hora (montagem dupla do StrictMode não envia duas vezes). */
  const activeKey = useRef<string | null>(null)
  const lastRun = useRef<{ service: ComparisonService; files: SelectedFiles } | null>(null)

  const dispatch = useCallback((key: string, action: ComparisonRunAction) => {
    setActive((current) => (current && current.key === key ? { ...current, state: comparisonRunReducer(current.state, action) } : current))
  }, [])

  const run = useCallback(
    (key: string, service: ComparisonService, selected: SelectedFiles) => {
      controller.current?.abort()
      const own = new AbortController()
      controller.current = own
      activeKey.current = key
      lastRun.current = { service, files: selected }
      setActive((current) => ({ key, files: selected, state: initialRunState, view: current?.key === key ? current.view : {} }))
      // O envio começa no próximo ciclo: uma troca imediata de página ou de arquivos cancela antes
      // de os PDFs saírem.
      setTimeout(() => {
        if (own.signal.aborted) return
        service
          .compare(selected, {
            signal: own.signal,
            onProgress: (progress) => dispatch(key, { type: 'progressed', stage: progress.stage }),
          })
          .then((outcome) => {
            if (!own.signal.aborted) dispatch(key, { type: 'finished', outcome })
          })
          .catch(() => {
            if (!own.signal.aborted) dispatch(key, { type: 'finished', outcome: { status: 'failed', error: { code: 'PROCESSING_FAILED' } } })
          })
      }, 0)
    },
    [dispatch],
  )

  const ensureComparison = useCallback(
    (key: string, service: ComparisonService, selected: SelectedFiles) => {
      if (activeKey.current === key) return
      run(key, service, selected)
    },
    [run],
  )

  const retry = useCallback(() => {
    const key = activeKey.current
    const last = lastRun.current
    if (key && last) run(key, last.service, last.files)
  }, [run])

  const saveView = useCallback((view: WorkspaceViewState) => {
    setActive((current) => (current ? { ...current, view: { ...current.view, ...view } } : current))
  }, [])

  const discard = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    activeKey.current = null
    lastRun.current = null
    setActive(null)
  }, [])

  const reset = useCallback(() => {
    discard()
    setFiles(emptyFiles)
  }, [discard])

  // Saiu da conta (ou entrou outra pessoa): nada da comparação anterior pode ficar na tela.
  const previousUser = useRef(userName)
  useEffect(() => {
    if (previousUser.current !== userName) reset()
    previousUser.current = userName
  }, [userName, reset])

  // Desmontar (fechar a aba, ou a montagem dupla do StrictMode) cancela a comparação em andamento;
  // sem a chave, uma nova montagem volta a pedi-la.
  useEffect(
    () => () => {
      controller.current?.abort()
      activeKey.current = null
    },
    [],
  )

  const setFile = useCallback((role: DocumentRole, file: File | null) => {
    setFiles((current) => ({ ...current, [role]: file }))
  }, [])

  const swapFiles = useCallback(() => {
    setFiles((current) => ({ original: current.updated, updated: current.original }))
  }, [])

  const value = useMemo(
    () => ({ files, setFile, swapFiles, reset, active, ensureComparison, retry, saveView }),
    [files, setFile, swapFiles, reset, active, ensureComparison, retry, saveView],
  )

  return <ComparisonSessionContext.Provider value={value}>{children}</ComparisonSessionContext.Provider>
}

export function useComparisonSession(): ComparisonSessionValue {
  const context = useContext(ComparisonSessionContext)
  if (!context) throw new Error('useComparisonSession precisa estar dentro de ComparisonSessionProvider')
  return context
}

/** A comparação dos arquivos escolhidos está aberta (em andamento ou com resultado)? */
export function hasOpenComparison(session: Pick<ComparisonSessionValue, 'active' | 'files'>): boolean {
  const { active, files } = session
  return active !== null && active.files.original === files.original && active.files.updated === files.updated
}
