import { schemas, TriagemServiceError, type AnexosResposta, type AvaliacoesResposta, type CamposResposta, type TriagemDetalhe, type TriagemService, type TriagemStatus } from '../model/types'
import { respostasReais } from './respostas-reais'

/**
 * Serviço de triagem para os testes da interface, montado só com respostas reais da API
 * (`respostas-reais.ts`) conferidas pelos esquemas. Guarda as chamadas e permite injetar erros.
 */

function real<T>(schema: { parse: (value: unknown) => T }, chave: string): T {
  return schema.parse(respostasReais[chave])
}

export interface Cenario {
  detalhe: TriagemDetalhe
  anexos: Record<number, AnexosResposta>
  avaliacoes: Record<number, AvaliacoesResposta>
  campos: Record<number, CamposResposta>
}

/** DSD-16: achado de divergência na ART; depois da correção do lote e do reprocessamento, análise 2. */
export function cenarioDivergencia(): { antes: Cenario; depois: Cenario } {
  const antes: Cenario = {
    detalhe: real(schemas.detalhe, 'detalhe'),
    anexos: { 1: real(schemas.anexos, 'anexos') },
    avaliacoes: { 1: real(schemas.avaliacoes, 'avaliacoes') },
    campos: { 1: real(schemas.campos, 'campos') },
  }
  const depois: Cenario = {
    detalhe: real(schemas.detalhe, 'detalheDepois'),
    anexos: { 1: antes.anexos[1] as AnexosResposta, 2: real(schemas.anexos, 'anexosDepois') },
    avaliacoes: { 1: antes.avaliacoes[1] as AvaliacoesResposta, 2: real(schemas.avaliacoes, 'avaliacoesDepois') },
    campos: { 1: antes.campos[1] as CamposResposta, 2: real(schemas.campos, 'camposDepois') },
  }
  return { antes, depois }
}

/** DSD-15: memorial ausente; pacote ainda não confirmado como completo (verificação inconclusiva). */
export function cenarioIncompleto(): Cenario {
  return {
    detalhe: real(schemas.detalhe, 'incompletoDetalhe'),
    anexos: { 1: real(schemas.anexos, 'incompletoAnexos') },
    avaliacoes: { 1: real(schemas.avaliacoes, 'incompletoAvaliacoes') },
    campos: { 1: real(schemas.campos, 'incompletoCampos') },
  }
}

export const statusAnalista = (): TriagemStatus => real(schemas.status, 'statusAnalista')
export const statusAdmin = (): TriagemStatus => real(schemas.status, 'statusAdmin')
export const statusDesligado = (): TriagemStatus => ({ disponivel: false, modo: 'desativada' })

export interface FakeOptions {
  status?: TriagemStatus | (() => Promise<TriagemStatus>)
  cenarios?: Cenario[]
  /** Cenário que passa a valer depois de `reprocessar` (por id do processo). */
  depoisDeReprocessar?: Record<string, Cenario>
  /** Erros forçados por método. */
  erros?: Partial<Record<keyof TriagemService, TriagemServiceError>>
  /** Conteúdo devolvido por `conteudo` (padrão: PDF mínimo). */
  conteudo?: Blob
}

export type Chamada = { metodo: keyof TriagemService; argumentos: unknown[] }

export function criarFakeService(options: FakeOptions = {}): TriagemService & { chamadas: Chamada[] } {
  const cenarios = new Map((options.cenarios ?? []).map((cenario) => [cenario.detalhe.triagem.id, cenario]))
  const chamadas: Chamada[] = []
  const registrar = (metodo: keyof TriagemService, argumentos: unknown[]) => {
    chamadas.push({ metodo, argumentos })
    const erro = options.erros?.[metodo]
    if (erro) throw erro
  }
  const cenario = (id: string) => {
    const encontrado = cenarios.get(id)
    if (!encontrado) throw new TriagemServiceError(404, 'NAO_ENCONTRADA', 'Processo de triagem não encontrado.')
    return encontrado
  }
  const daAnalise = <T,>(mapa: Record<number, T>, numero: number | undefined, atual: number | null): T => {
    const valor = mapa[numero ?? atual ?? 0]
    if (!valor) throw new TriagemServiceError(409, 'SEM_ANALISE', 'Não há análise concluída com esse número.')
    return valor
  }
  return {
    chamadas,
    async status() {
      registrar('status', [])
      const status = options.status ?? statusAnalista()
      return typeof status === 'function' ? status() : status
    },
    async listar() {
      registrar('listar', [])
      const itens = [...cenarios.values()].map((item) => item.detalhe.triagem)
      return { itens, total: itens.length }
    },
    async criar(dados, arquivos, chave) {
      registrar('criar', [dados, arquivos, chave])
      const primeiro = [...cenarios.values()][0]
      if (!primeiro) throw new TriagemServiceError(500, 'SEM_CENARIO', 'sem cenário')
      return { triagem: { ...primeiro.detalhe.triagem, situacao: 'processando', analiseAtual: null }, anexos: [], nova: true }
    },
    async detalhe(id) {
      registrar('detalhe', [id])
      return cenario(id).detalhe
    },
    async anexos(id, numero) {
      registrar('anexos', [id, numero])
      const item = cenario(id)
      return daAnalise(item.anexos, numero, item.detalhe.triagem.analiseAtual)
    },
    async avaliacoes(id, numero) {
      registrar('avaliacoes', [id, numero])
      const item = cenario(id)
      return daAnalise(item.avaliacoes, numero, item.detalhe.triagem.analiseAtual)
    },
    async campos(id, numero) {
      registrar('campos', [id, numero])
      const item = cenario(id)
      return daAnalise(item.campos, numero, item.detalhe.triagem.analiseAtual)
    },
    async conteudo(id, anexoId) {
      registrar('conteudo', [id, anexoId])
      return options.conteudo ?? new Blob(['%PDF-1.7 ficticio'], { type: 'application/octet-stream' })
    },
    async confirmar(id, entrada) {
      registrar('confirmar', [id, entrada])
      return { triagem: { ...cenario(id).detalhe.triagem, versao: cenario(id).detalhe.triagem.versao + 1 } }
    },
    async revisar(id, entrada) {
      registrar('revisar', [id, entrada])
      return { triagem: { ...cenario(id).detalhe.triagem, versao: cenario(id).detalhe.triagem.versao + 1 }, revisaoId: 'revisao-teste' }
    },
    async reprocessar(id, versaoEsperada) {
      registrar('reprocessar', [id, versaoEsperada])
      const novo = options.depoisDeReprocessar?.[id]
      if (novo) cenarios.set(id, novo)
      const atual = cenario(id)
      return real(schemas.reprocessamento, 'reprocessar').analise === atual.detalhe.triagem.analiseAtual
        ? real(schemas.reprocessamento, 'reprocessar')
        : { triagem: atual.detalhe.triagem, analise: atual.detalhe.triagem.analiseAtual ?? 1, alteradas: [], recalculadas: [], reaproveitadas: [] }
    },
  }
}
