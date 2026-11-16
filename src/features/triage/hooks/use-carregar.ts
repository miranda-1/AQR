import { useCallback, useEffect, useState } from 'react'

export type Carga<T> = { estado: 'carregando' } | { estado: 'erro'; erro: unknown } | { estado: 'pronto'; dados: T }

type Resolvido<T> = { token: string; valor: Exclude<Carga<T>, { estado: 'carregando' }> }

/**
 * Carrega dados e recarrega quando `chave` muda ou quando `recarregar` é chamado. Cancela a
 * consulta anterior e ignora respostas atrasadas. Guarda o erro original (status e código da API),
 * para a tela orientar a pessoa conforme a falha.
 */
export function useCarregar<T>(carregar: (signal: AbortSignal) => Promise<T>, chave: string): Carga<T> & { recarregar: () => void; ultimo: T | undefined } {
  const [resolvido, setResolvido] = useState<Resolvido<T> | null>(null)
  // Último dado bom, para a tela não piscar enquanto atualiza.
  const [ultimo, setUltimo] = useState<T | undefined>(undefined)
  const [tentativa, setTentativa] = useState(0)
  const token = `${chave}#${tentativa}`

  useEffect(() => {
    const controller = new AbortController()
    carregar(controller.signal).then(
      (dados) => {
        if (controller.signal.aborted) return
        setResolvido({ token, valor: { estado: 'pronto', dados } })
        setUltimo(dados)
      },
      (erro: unknown) => {
        if (!controller.signal.aborted) setResolvido({ token, valor: { estado: 'erro', erro } })
      },
    )
    return () => controller.abort()
    // `carregar` muda a cada renderização; a consulta só repete quando a chave muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const recarregar = useCallback(() => setTentativa((valor) => valor + 1), [])
  const atual: Carga<T> = resolvido?.token === token ? resolvido.valor : { estado: 'carregando' }
  return { ...atual, recarregar, ultimo }
}
