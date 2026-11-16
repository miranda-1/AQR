import { useCallback, useState } from 'react'

/**
 * Executa uma ação do servidor (confirmar, revisar, reprocessar) e guarda o resultado para a tela:
 * em andamento, sucesso (com mensagem) ou erro (o original, para orientar: 403, 409, rede…).
 */
export function useAcao() {
  const [executando, setExecutando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const executar = useCallback(async <T,>(acao: () => Promise<T>, mensagem: (resultado: T) => string): Promise<T | undefined> => {
    setExecutando(true)
    setErro(null)
    setSucesso(null)
    try {
      const resultado = await acao()
      setSucesso(mensagem(resultado))
      return resultado
    } catch (falha) {
      setErro(falha)
      return undefined
    } finally {
      setExecutando(false)
    }
  }, [])

  const limpar = useCallback(() => {
    setErro(null)
    setSucesso(null)
  }, [])

  return { executando, erro, sucesso, executar, limpar }
}
