import { useCallback, useRef, useState } from 'react'
import { validatePdfFile } from '../model/file-validation'
import type { DocumentRole } from '../model/types'
import { useComparisonSession } from '../session/comparison-session'

/**
 * Estado de um campo de documento (original ou atualizado): seleção,
 * validação local e mensagens de erro. Uma substituição inválida mantém o
 * arquivo anterior.
 */
export function useFileSlot(role: DocumentRole) {
  const { files, setFile } = useComparisonSession()
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const requestId = useRef(0)

  const select = useCallback(
    async (candidate: File) => {
      const id = ++requestId.current
      setIsValidating(true)
      setError(null)
      const result = await validatePdfFile(candidate)
      if (id !== requestId.current) return // outra seleção mais recente venceu
      setIsValidating(false)
      if (result.ok) setFile(role, candidate)
      else setError(`“${candidate.name}” não foi aceito. ${result.message}`)
    },
    [role, setFile],
  )

  const remove = useCallback(() => {
    requestId.current++
    setIsValidating(false)
    setError(null)
    setFile(role, null)
  }, [role, setFile])

  const reportError = useCallback((message: string) => setError(message), [])

  return { file: files[role], error, isValidating, select, remove, reportError }
}
