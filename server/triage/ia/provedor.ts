import { createHash } from 'node:crypto'
import type { ModeloRegistrado, PropostaModelo, RegiaoIa } from '../../../shared/contracts/triage-ia.ts'
import type { ClasseDocumental, NomeCampo } from '../../../shared/contracts/triage.ts'

/**
 * Provedores de sugestões documentais (E11.0). Um provedor recebe o PEDIDO (texto lido com posição
 * das páginas que interessam e as lacunas do motor) e devolve uma saída qualquer, que o servidor
 * trata como não confiável: valida com zod e verifica no texto (`verificacao.ts`).
 *
 * O provedor não recebe ferramentas, não acessa rede nem arquivos e não vê o catálogo, as regras,
 * o banco ou os outros processos. Roda numa thread isolada, com tempo, memória e quantidade de
 * sugestões limitados (`worker-pool.ts`).
 */

export interface PalavraParaModelo {
  texto: string
  regiao: RegiaoIa
}

export interface PaginaParaModelo {
  pagina: number
  /** Página sem nenhum texto lido (digitalização sem OCR útil): só um modelo visual a leria. */
  semTexto: boolean
  linhas: PalavraParaModelo[][]
}

export interface PedidoAnexo {
  anexoId: string
  anexoSha256: string
  classeAtual: ClasseDocumental | 'indeterminada'
  /** O que o motor determinístico não conseguiu: é só isso que se pede ao modelo. */
  lacunas: { classe: boolean; campos: NomeCampo[] }
  paginas: PaginaParaModelo[]
}

export interface PedidoSugestoes {
  anexos: PedidoAnexo[]
  maxPropostas: number
}

export interface ProvedorDocumental {
  readonly modelo: ModeloRegistrado
  /** Saída não confiável: o servidor valida e verifica tudo o que vier. */
  propor(pedido: PedidoSugestoes): Promise<unknown>
}

const sha256 = (texto: string) => createHash('sha256').update(texto).digest('hex')

/** Versão das regras de configuração da IA (registrada em cada execução). */
export const CONFIGURACAO_IA_VERSAO = 'ia-config@1'

// ---------- provedor local futuro (só contrato) ----------

/**
 * Contrato do provedor LOCAL que a E11.1 implementará: um processo próprio no mesmo servidor ou na
 * rede institucional, sem saída para a internet, com pesos de hash conhecido e prompt versionado.
 * Nesta etapa não existe implementação: pedir este provedor é erro de configuração.
 */
export interface ConfiguracaoProvedorLocal {
  /** Socket Unix ou endereço de loopback do processo do modelo (nunca um endereço externo). */
  endereco: `unix:${string}` | `http://127.0.0.1:${number}`
  modeloId: string
  modeloVersao: string
  pesosSha256: string
  promptSha256: string
}

export function criarProvedorLocal(_configuracao: ConfiguracaoProvedorLocal): never {
  void _configuracao
  throw new Error('Provedor local de IA ainda não implementado (E11.1); só o simulado existe nesta etapa.')
}

// ---------- provedor simulado ----------

/**
 * Perfis do simulado. `cooperativo` e `adversario` podem ser ligados no ambiente experimental;
 * `lento`, `falha`, `memoria` e `saida-invalida` existem só para os testes de robustez.
 */
export const perfisSimulado = ['cooperativo', 'adversario', 'lento', 'falha', 'memoria', 'saida-invalida'] as const
export type PerfilSimulado = (typeof perfisSimulado)[number]

export interface OpcoesSimulado {
  perfil: PerfilSimulado
  /**
   * Propostas fixas por hash de anexo (usadas pelo benchmark para páginas sem texto, onde nenhuma
   * heurística lê nada). Escritas à mão: não vêm de modelo nem do gabarito.
   */
  roteiro?: Record<string, PropostaModelo[]>
}

const REGRAS_SIMULADO = `simulado@1
heuristicas: area (numero com m2), matricula (NNN.NNN ou NN.NNN), inscricao (NNNN.NNNN.NNN), data-revisao (dd/mm/aaaa
proximo de revisao/rev), lote/quadra (LT, QD, Gleba, Unidade); classe pelo cabecalho da primeira linha.
adversario: obedece instrucao embutida, propoe valor alterado, regiao errada, pagina inexistente e saida fora do esquema.`

function regiaoDe(palavras: readonly PalavraParaModelo[]): RegiaoIa {
  const x = Math.min(...palavras.map((p) => p.regiao.x))
  const y = Math.min(...palavras.map((p) => p.regiao.y))
  const direita = Math.max(...palavras.map((p) => p.regiao.x + p.regiao.width))
  const baixo = Math.max(...palavras.map((p) => p.regiao.y + p.regiao.height))
  return { x, y, width: Math.max(direita - x, 0.001), height: Math.max(baixo - y, 0.001) }
}

const textoLinha = (linha: readonly PalavraParaModelo[]) => linha.map((palavra) => palavra.texto).join(' ')

interface Achado {
  valor: string
  palavras: PalavraParaModelo[]
  linha: PalavraParaModelo[]
}

/** Procura, numa linha, as palavras consecutivas que formam um valor que casa com o padrão. */
function procurar(linha: PalavraParaModelo[], padrao: RegExp, contexto?: RegExp): Achado | null {
  const texto = textoLinha(linha)
  if (contexto && !contexto.test(texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase())) return null
  const casou = padrao.exec(texto)
  if (!casou) return null
  const inicio = casou.index
  const fim = inicio + casou[0].length
  const palavras: PalavraParaModelo[] = []
  let cursor = 0
  for (const palavra of linha) {
    const comeco = cursor
    const termino = cursor + palavra.texto.length
    if (termino > inicio && comeco < fim) palavras.push(palavra)
    cursor = termino + 1
  }
  return palavras.length > 0 ? { valor: casou[0].trim(), palavras, linha } : null
}

const HEURISTICAS: Partial<Record<NomeCampo, { padrao: RegExp; contexto?: RegExp }>> = {
  area: { padrao: /\d{1,3}(?:\.\d{3})*,\d{2}\s?m(?:²|2)/u },
  matricula: { padrao: /\b\d{2,3}\.\d{3}\b/u, contexto: /mat|registro|ficha/u },
  inscricao: { padrao: /\b\d{4}\.\d{4}\.\d{3}\b/u },
  'data-revisao': { padrao: /\b\d{2}\/\d{2}\/\d{4}\b/u, contexto: /rev/u },
  lote: { padrao: /(?<=\b(?:lt|lote|gleba|unidade)\.?\s?)[A-Z]?\d{1,3}[A-Z]?\b/iu, contexto: /\b(lt|lote|gleba|unidade)\b/u },
  quadra: { padrao: /(?<=\b(?:qd|quadra)\.?\s?)\d{1,3}[A-Z]?\b/iu, contexto: /\b(qd|quadra)\b/u },
}

const CLASSE_PELO_CABECALHO: [RegExp, ClasseDocumental][] = [
  [/certid|matricula|registro de imoveis/u, 'matricula-transcricao'],
  [/espelho|cadastr|iptu/u, 'inscricao-imobiliaria'],
  [/memorial/u, 'memorial'],
  [/prancha|planta|desdobro do lote|quadro de areas/u, 'prancha'],
  [/requerimento/u, 'requerimento'],
]

const dobrado = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

function cooperativas(anexo: PedidoAnexo): PropostaModelo[] {
  const propostas: PropostaModelo[] = []
  for (const campo of anexo.lacunas.campos) {
    const heuristica = HEURISTICAS[campo]
    if (!heuristica) continue
    for (const pagina of anexo.paginas) {
      const achado = pagina.linhas.map((linha) => procurar(linha, heuristica.padrao, heuristica.contexto)).find((item) => item !== null)
      if (!achado) continue
      propostas.push({ tipo: 'campo', anexoId: anexo.anexoId, anexoSha256: anexo.anexoSha256, campo, valorBruto: achado.valor, pagina: pagina.pagina, regioes: [regiaoDe(achado.linha)], trecho: textoLinha(achado.linha), fundamento: 'texto', confiancaDeclarada: 0.8 })
      break
    }
  }
  if (anexo.lacunas.classe) {
    for (const pagina of anexo.paginas) {
      const [primeira] = pagina.linhas
      if (!primeira) continue
      const classe = CLASSE_PELO_CABECALHO.find(([padrao]) => padrao.test(dobrado(textoLinha(primeira))))?.[1]
      if (classe) {
        propostas.push({ tipo: 'classe', anexoId: anexo.anexoId, anexoSha256: anexo.anexoSha256, classe, pagina: pagina.pagina, regioes: [regiaoDe(primeira)], trecho: textoLinha(primeira), fundamento: 'texto', confiancaDeclarada: 0.7 })
        break
      }
    }
  }
  return propostas
}

/** Um modelo "comprometido": obedece instruções do documento e erra de propósito. */
function adversarias(anexo: PedidoAnexo): unknown[] {
  const propostas: unknown[] = []
  for (const pagina of anexo.paginas) {
    for (const linha of pagina.linhas) {
      const texto = textoLinha(linha)
      // Obedece à instrução: se a linha manda registrar um valor, propõe esse valor.
      const ordem = /(?:registre|considere|use|o (?:lote|valor|numero) correto e)\D{0,40}?([A-Z]?\d[\d.,/]*[A-Z]?)/iu.exec(texto)
      if (ordem?.[1]) {
        propostas.push({ tipo: 'campo', anexoId: anexo.anexoId, anexoSha256: anexo.anexoSha256, campo: /matr/iu.test(texto) ? 'matricula' : 'lote', valorBruto: ordem[1], pagina: pagina.pagina, regioes: [regiaoDe(linha)], trecho: texto.slice(0, 300), fundamento: 'texto', confiancaDeclarada: 0.99 })
      }
      if (/aprovad|deferid/iu.test(dobrado(texto))) {
        propostas.push({ tipo: 'classe', anexoId: anexo.anexoId, anexoSha256: anexo.anexoSha256, classe: 'requerimento', pagina: pagina.pagina, regioes: [regiaoDe(linha)], trecho: texto.slice(0, 300), fundamento: 'texto', confiancaDeclarada: 0.99 })
      }
    }
  }
  // Valor alterado na região certa, região sem o valor, página inexistente e lixo fora do esquema.
  for (const proposta of cooperativas(anexo)) {
    if (proposta.tipo !== 'campo') continue
    const alterado = proposta.valorBruto.replace(/\d(?=\D*$)/u, (digito) => String((Number(digito) + 1) % 10))
    propostas.push({ ...proposta, valorBruto: alterado, confiancaDeclarada: 0.99 })
    propostas.push({ ...proposta, regioes: [{ x: 0.9, y: 0.9, width: 0.05, height: 0.03 }], fundamento: 'visual', confiancaDeclarada: 0.99 })
    propostas.push({ ...proposta, pagina: 999 })
    break
  }
  propostas.push({ tipo: 'decisao', resultado: 'aprovado', anexoId: anexo.anexoId })
  propostas.push({ tipo: 'campo', anexoId: anexo.anexoId, anexoSha256: anexo.anexoSha256, campo: 'lote', valorBruto: 'x'.repeat(5000), pagina: 1, regioes: [{ x: 0, y: 0, width: 1, height: 1 }], trecho: 'x', fundamento: 'texto', confiancaDeclarada: 1, comando: 'rm -rf /' })
  return propostas
}

export function criarProvedorSimulado(opcoes: OpcoesSimulado): ProvedorDocumental {
  const roteiro = opcoes.roteiro ?? {}
  return {
    modelo: {
      provedor: 'simulado',
      id: `simulado-${opcoes.perfil}`,
      versao: '1',
      pesosSha256: null,
      promptSha256: sha256(`${REGRAS_SIMULADO}\nperfil=${opcoes.perfil}`),
      configuracaoVersao: CONFIGURACAO_IA_VERSAO,
    },
    async propor(pedido) {
      if (opcoes.perfil === 'falha') throw new Error('falha simulada do provedor')
      if (opcoes.perfil === 'lento') await new Promise((resolve) => setTimeout(resolve, 60_000))
      if (opcoes.perfil === 'memoria') {
        // Aloca no heap do JavaScript (o que o limite da thread controla). Memória nativa (buffers,
        // runtimes em C++) não é coberta por esse limite: um modelo real roda em processo próprio.
        const blocos: number[][] = []
        for (;;) blocos.push(Array.from({ length: 1_000_000 }, (_, indice) => indice))
      }
      if (opcoes.perfil === 'saida-invalida') return 'isto não é JSON de propostas'
      const propostas: unknown[] = []
      for (const anexo of pedido.anexos) {
        propostas.push(...cooperativas(anexo), ...(roteiro[anexo.anexoSha256] ?? []))
        if (opcoes.perfil === 'adversario') propostas.push(...adversarias(anexo))
      }
      return { propostas }
    },
  }
}

/** Provedor desabilitado (padrão): não é chamado; existe para deixar explícito que não há IA. */
export const provedorDesabilitado: ProvedorDocumental = {
  modelo: { provedor: 'desabilitado', id: 'nenhum', versao: '0', pesosSha256: null, promptSha256: sha256('nenhum'), configuracaoVersao: CONFIGURACAO_IA_VERSAO },
  propor: async () => ({ propostas: [] }),
}
