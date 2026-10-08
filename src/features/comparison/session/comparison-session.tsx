import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { DocumentRole } from '../model/types'

type SelectedFiles = Record<DocumentRole, File | null>

interface ComparisonSessionValue {
  files: SelectedFiles
  setFile: (role: DocumentRole, file: File | null) => void
  swapFiles: () => void
  reset: () => void
}

const ComparisonSessionContext = createContext<ComparisonSessionValue | null>(null)

const emptyFiles: SelectedFiles = { original: null, updated: null }

/**
 * Mantém os arquivos escolhidos apenas em memória, no navegador.
 * Nada é persistido nem enviado; ao recarregar a página, a seleção é perdida.
 */
export function ComparisonSessionProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<SelectedFiles>(emptyFiles)

  const setFile = useCallback((role: DocumentRole, file: File | null) => {
    setFiles((current) => ({ ...current, [role]: file }))
  }, [])

  const swapFiles = useCallback(() => {
    setFiles((current) => ({ original: current.updated, updated: current.original }))
  }, [])

  const reset = useCallback(() => setFiles(emptyFiles), [])

  const value = useMemo(() => ({ files, setFile, swapFiles, reset }), [files, setFile, swapFiles, reset])

  return <ComparisonSessionContext.Provider value={value}>{children}</ComparisonSessionContext.Provider>
}

export function useComparisonSession(): ComparisonSessionValue {
  const context = useContext(ComparisonSessionContext)
  if (!context) throw new Error('useComparisonSession precisa estar dentro de ComparisonSessionProvider')
  return context
}
