import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuthSession } from '@/features/auth/auth-session'
import { createHttpTriagemService } from '../services/http-triage-service'
import type { TriagemService, TriagemStatus } from '../model/types'

/**
 * Disponibilidade da triagem, decidida pelo servidor (`GET /api/triagem/status`): desligada por
 * padrão e nunca ligada em produção. A interface não tem flag própria para ligá-la.
 */
export type TriagemDisponibilidade =
  | { estado: 'verificando' }
  | { estado: 'indisponivel'; motivo: 'desligada' | 'sem-conexao' }
  | { estado: 'disponivel'; status: Extract<TriagemStatus, { disponivel: true }> }

interface TriagemSessionValue {
  disponibilidade: TriagemDisponibilidade
  service: TriagemService
  /** Consulta o status de novo (ex.: depois de um erro de rede). */
  atualizar: () => void
}

const TriagemSessionContext = createContext<TriagemSessionValue | null>(null)

export function TriagemSessionProvider({ children, service: fornecido }: { children: ReactNode; service?: TriagemService }) {
  const { userName } = useAuthSession()
  const service = useMemo(() => fornecido ?? createHttpTriagemService({ getActor: () => userName }), [fornecido, userName])
  const [resultado, setResultado] = useState<{ chave: string; valor: TriagemDisponibilidade } | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const chave = `${userName ?? ''}#${tentativa}`

  useEffect(() => {
    const controller = new AbortController()
    service
      .status({ signal: controller.signal })
      .then((status) => setResultado({ chave, valor: status.disponivel ? { estado: 'disponivel', status } : { estado: 'indisponivel', motivo: 'desligada' } }))
      .catch(() => {
        if (!controller.signal.aborted) setResultado({ chave, valor: { estado: 'indisponivel', motivo: 'sem-conexao' } })
      })
    return () => controller.abort()
  }, [service, chave])

  const atualizar = useCallback(() => setTentativa((valor) => valor + 1), [])
  const value = useMemo(() => {
    const disponibilidade: TriagemDisponibilidade = resultado?.chave === chave ? resultado.valor : { estado: 'verificando' }
    return { disponibilidade, service, atualizar }
  }, [resultado, chave, service, atualizar])
  return <TriagemSessionContext.Provider value={value}>{children}</TriagemSessionContext.Provider>
}

export function useTriagemSession(): TriagemSessionValue {
  const value = useContext(TriagemSessionContext)
  if (!value) throw new Error('useTriagemSession precisa estar dentro de TriagemSessionProvider')
  return value
}
