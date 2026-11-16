import { useEffect } from 'react'
import { useTriagemSession } from '../session/triage-session'
import { useCarregar } from './use-carregar'

/** Intervalo entre consultas enquanto a análise está em processamento. */
export const INTERVALO_PROCESSAMENTO_MS = 2000

/**
 * Processo e, para a análise escolhida (padrão: a atual), avaliações, anexos e campos. Enquanto
 * a situação for "processando", consulta o servidor de novo a cada 2 s (a API não envia eventos).
 */
export function useProcesso(id: string, analiseEscolhida: number | null, intervalo = INTERVALO_PROCESSAMENTO_MS) {
  const { service } = useTriagemSession()
  const detalhe = useCarregar((signal) => service.detalhe(id, { signal }), `detalhe#${id}`)
  const processando = detalhe.estado === 'pronto' && detalhe.dados.triagem.situacao === 'processando'
  const { recarregar } = detalhe

  useEffect(() => {
    if (!processando) return
    const timer = setTimeout(recarregar, intervalo)
    return () => clearTimeout(timer)
  }, [processando, recarregar, intervalo, detalhe])

  const triagem = detalhe.estado === 'pronto' ? detalhe.dados.triagem : null
  const numero = analiseEscolhida ?? triagem?.analiseAtual ?? null
  const chave = triagem && numero ? `${id}#${numero}#${triagem.versao}` : 'nenhuma'
  const carregarAnalise = <T,>(carregar: (signal: AbortSignal) => Promise<T>) => (signal: AbortSignal) =>
    numero ? carregar(signal) : new Promise<T>(() => undefined)
  const avaliacoes = useCarregar(carregarAnalise((signal) => service.avaliacoes(id, numero ?? undefined, { signal })), `avaliacoes#${chave}`)
  const anexos = useCarregar(carregarAnalise((signal) => service.anexos(id, numero ?? undefined, { signal })), `anexos#${chave}`)
  const campos = useCarregar(carregarAnalise((signal) => service.campos(id, numero ?? undefined, { signal })), `campos#${chave}`)
  return { detalhe, numero, avaliacoes, anexos, campos }
}
