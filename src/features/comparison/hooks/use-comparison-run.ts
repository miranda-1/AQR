import { useEffect } from 'react'
import { initialRunState } from '../model/comparison-run'
import type { ComparisonInput, ComparisonService } from '../model/types'
import { fileIdentity, useComparisonSession } from '../session/comparison-session'

/**
 * Identifica a comparação: o tipo de serviço (estável entre montagens, ex.: "api", "demo:erro") e
 * os dois arquivos escolhidos.
 */
export function comparisonKey(serviceKey: string, input: ComparisonInput): string {
  const id = (file: File | null) => (file ? fileIdentity(file) : 0)
  return `${serviceKey}:${id(input.original)}:${id(input.updated)}`
}

/**
 * Executa a comparação dos arquivos (ou reaproveita a que já está aberta na sessão) e expõe o
 * estado para a interface. A execução pertence à sessão: sair da tela não a cancela, e voltar
 * mostra o mesmo andamento ou o mesmo resultado.
 */
export function useComparisonRun(service: ComparisonService, input: ComparisonInput, serviceKey: string) {
  const { active, ensureComparison, retry, saveView } = useComparisonSession()
  const key = comparisonKey(serviceKey, input)
  const { original, updated } = input

  useEffect(() => {
    ensureComparison(key, service, { original, updated })
  }, [key, service, original, updated, ensureComparison])

  const current = active && active.key === key ? active : null
  return { state: current?.state ?? initialRunState, view: current?.view ?? {}, retry, saveView }
}
