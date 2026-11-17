import { createHash } from 'node:crypto'

/**
 * Cliente mínimo do servidor local do modelo (Ollama), usado só pela bancada da E11.1. Fora do
 * servidor do AQR: nenhuma rota nem serviço da triagem importa este arquivo.
 *
 * Garantias:
 * - só fala com `127.0.0.1` (qualquer outro endereço é recusado antes de abrir conexão);
 * - não envia ferramentas (`tools`), então o modelo não tem como agir: só devolve texto;
 * - tempo máximo por pedido, com cancelamento;
 * - mensagens de erro sem conteúdo do documento nem da resposta (só situação HTTP e tamanhos).
 */

export interface ConfiguracaoOllama {
  endereco: string
  modelo: string
  timeoutMs: number
}

export interface MensagemChat {
  role: 'system' | 'user'
  content: string
  /** Imagens em base64 (página selecionada e desenhada pelo AQR). */
  images?: string[]
}

export interface RespostaChat {
  conteudo: string
  /** Tempos informados pelo próprio runtime (ns convertidos para ms). */
  totalMs: number
  carregamentoMs: number
  avaliacaoPromptMs: number
  geracaoMs: number
  tokensPrompt: number
  tokensGerados: number
}

export interface ModeloLocalRegistrado {
  runtime: { nome: 'ollama'; versao: string }
  modelo: string
  /** Digest do manifesto no Ollama: fixa todos os arquivos de pesos carregados. */
  manifestoSha256: string
  familia: string | null
  parametros: string | null
  quantizacao: string | null
  formato: string | null
  licenca: string | null
  capacidades: string[]
}

export type SituacaoErroOllama = 'endereco-recusado' | 'tempo-esgotado' | 'indisponivel' | 'http' | 'resposta-invalida'

export class ErroOllama extends Error {
  readonly situacao: SituacaoErroOllama
  constructor(situacao: SituacaoErroOllama, detalhe: string) {
    super(`${situacao}: ${detalhe}`)
    this.name = 'ErroOllama'
    this.situacao = situacao
  }
}

/** Só loopback IPv4 explícito; nem "localhost" (que pode resolver para outro lugar). */
export function enderecoLocal(endereco: string): string {
  let url: URL
  try {
    url = new URL(endereco)
  } catch {
    throw new ErroOllama('endereco-recusado', 'endereço inválido')
  }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) {
    throw new ErroOllama('endereco-recusado', 'o servidor do modelo precisa estar em http://127.0.0.1')
  }
  return url.origin
}

const ms = (ns: unknown) => (typeof ns === 'number' ? Math.round(ns / 1e6) : 0)
const num = (valor: unknown) => (typeof valor === 'number' ? valor : 0)

export function criarClienteOllama(configuracao: ConfiguracaoOllama) {
  const origem = enderecoLocal(configuracao.endereco)

  async function pedir(caminho: string, corpo?: unknown, signal?: AbortSignal): Promise<unknown> {
    const tempo = AbortSignal.timeout(configuracao.timeoutMs)
    const sinal = signal ? AbortSignal.any([signal, tempo]) : tempo
    let resposta: Response
    try {
      resposta = await fetch(`${origem}${caminho}`, {
        method: corpo === undefined ? 'GET' : 'POST',
        headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
        body: corpo === undefined ? null : JSON.stringify(corpo),
        signal: sinal,
      })
    } catch {
      if (tempo.aborted) throw new ErroOllama('tempo-esgotado', `${caminho} passou de ${configuracao.timeoutMs} ms`)
      throw new ErroOllama('indisponivel', `${caminho} não respondeu`)
    }
    const texto = await resposta.text()
    if (!resposta.ok) throw new ErroOllama('http', `${caminho} respondeu ${resposta.status} (${texto.length} caracteres)`)
    try {
      return JSON.parse(texto) as unknown
    } catch {
      throw new ErroOllama('resposta-invalida', `${caminho} devolveu ${texto.length} caracteres fora de JSON`)
    }
  }

  return {
    origem,
    async registrar(): Promise<ModeloLocalRegistrado> {
      const versao = (await pedir('/api/version')) as { version?: unknown }
      const tags = (await pedir('/api/tags')) as { models?: { name?: unknown; digest?: unknown }[] }
      const show = (await pedir('/api/show', { model: configuracao.modelo })) as {
        details?: { family?: unknown; parameter_size?: unknown; quantization_level?: unknown; format?: unknown }
        license?: unknown
        capabilities?: unknown
      }
      const digest = tags.models?.find((item) => item.name === configuracao.modelo)?.digest
      if (typeof digest !== 'string' || !/^[0-9a-f]{64}$/u.test(digest)) throw new ErroOllama('resposta-invalida', 'modelo sem digest no runtime')
      const texto = (valor: unknown) => (typeof valor === 'string' && valor.length > 0 ? valor : null)
      const licenca = texto(show.license)
      return {
        runtime: { nome: 'ollama', versao: texto(versao.version) ?? 'desconhecida' },
        modelo: configuracao.modelo,
        manifestoSha256: digest,
        familia: texto(show.details?.family),
        parametros: texto(show.details?.parameter_size),
        quantizacao: texto(show.details?.quantization_level),
        formato: texto(show.details?.format),
        // Primeira linha do texto da licença (o identificador), mais o hash do texto inteiro.
        licenca: licenca ? `${licenca.split('\n').find((linha) => linha.trim())?.trim() ?? ''} (sha256 ${createHash('sha256').update(licenca).digest('hex').slice(0, 16)})` : null,
        capacidades: Array.isArray(show.capabilities) ? show.capabilities.filter((item): item is string => typeof item === 'string') : [],
      }
    },

    /**
     * Um pedido de chat com saída restrita pelo esquema JSON (`format`), temperatura 0, semente
     * fixa e sem raciocínio visível (`think: false`). Nunca passa `tools`.
     */
    async conversar(mensagens: MensagemChat[], esquema: object, opcoes: { semente: number; maxTokens: number; signal?: AbortSignal }): Promise<RespostaChat> {
      const corpo = {
        model: configuracao.modelo,
        stream: false,
        think: false,
        format: esquema,
        options: { temperature: 0, seed: opcoes.semente, num_predict: opcoes.maxTokens },
        messages: mensagens,
      }
      const dados = (await pedir('/api/chat', corpo, opcoes.signal)) as { message?: { content?: unknown }; total_duration?: unknown; load_duration?: unknown; prompt_eval_duration?: unknown; eval_duration?: unknown; prompt_eval_count?: unknown; eval_count?: unknown }
      if (typeof dados.message?.content !== 'string') throw new ErroOllama('resposta-invalida', 'resposta sem conteúdo')
      return {
        conteudo: dados.message.content,
        totalMs: ms(dados.total_duration),
        carregamentoMs: ms(dados.load_duration),
        avaliacaoPromptMs: ms(dados.prompt_eval_duration),
        geracaoMs: ms(dados.eval_duration),
        tokensPrompt: num(dados.prompt_eval_count),
        tokensGerados: num(dados.eval_count),
      }
    },

    /** Tira o modelo da memória (para medir o carregamento a frio na próxima chamada). */
    async descarregar(): Promise<void> {
      await pedir('/api/generate', { model: configuracao.modelo, keep_alive: 0 })
    },

    /** Memória do modelo carregado, como o runtime informa (total e parte na GPU). */
    async memoria(): Promise<{ totalBytes: number; gpuBytes: number } | null> {
      const ps = (await pedir('/api/ps')) as { models?: { name?: unknown; size?: unknown; size_vram?: unknown }[] }
      const atual = ps.models?.find((item) => item.name === configuracao.modelo)
      return atual ? { totalBytes: num(atual.size), gpuBytes: num(atual.size_vram) } : null
    },
  }
}

export type ClienteOllama = ReturnType<typeof criarClienteOllama>
