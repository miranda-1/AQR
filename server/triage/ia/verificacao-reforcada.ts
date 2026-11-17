import type { PropostaModelo, RegiaoIa, SugestaoVerificada } from '../../../shared/contracts/triage-ia.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { dirigidaAMaquina } from './dirigida-a-maquina.ts'
import { linhaVisivel } from './verificacao-classe.ts'
import { dobrar, type LinhaLida } from '../reading/text.ts'
import { verificarProposta } from './verificacao.ts'

/**
 * Verificação reforçada das sugestões de campo (E11.3), DETERMINÍSTICA e independente do modelo.
 * Roda depois da verificação da E11.0 (`verificarProposta`), que continua valendo: hash, página,
 * região, instrução embutida, normalização e campo confirmado por servidor nunca são relaxados.
 *
 * O que muda é a pergunta "este valor é do campo?". A E11.0 recusava o valor sempre que o documento
 * trazia outro no mesmo formato (`valor-ambiguo-no-documento`), o que barrava também o valor certo
 * ao lado de uma área construída ou de uma matrícula anterior. Aqui, cada valor no formato do campo
 * recebe o RÓTULO que o identifica no documento:
 * 1. o texto antes dele na mesma linha, até um separador (`|`, ` - `, `;`) ou o valor anterior;
 * 2. em tabela, a primeira célula da linha (rótulo da linha) ou, se ela for só número, o cabeçalho
 *    da coluna (a linha de cima com o mesmo número de células);
 * 3. se o valor está sozinho na linha, a linha de cima, quando é um rótulo curto sem valor.
 * O rótulo é classificado (do campo, genérico, de outra grandeza ou nenhum) por vocabulário do
 * domínio, sem nenhum caso específico. A proposta só é aceita se o valor dela, na região citada,
 * tem rótulo do campo e é o ÚNICO valor distinto com rótulo do campo no anexo. Senão: recusa ou
 * abstenção, com o motivo.
 *
 * Linhas dirigidas à máquina (instruções, vocativos ao sistema/IA, JSON) não contam como evidência
 * nem como candidatas: um valor plantado não cria nem resolve ambiguidade.
 *
 * Páginas digitalizadas: com uma SEGUNDA LEITURA independente (outro mecanismo de OCR), a mesma
 * análise roda sobre ela; o valor precisa aparecer na segunda leitura, com rótulo do campo, perto
 * da região citada pelo modelo (quando ele citou uma), e a leitura do motor não pode trazer outro
 * valor com rótulo do campo. Concordância de texto sem o rótulo nunca basta.
 *
 * Só `area` e `matricula` têm vocabulário de rótulos; os outros campos ficam com o resultado da
 * E11.0. Classe também.
 */

export const VERIFICACAO_REFORCADA_VERSAO = 'verificacao@2'

export const motivosReforcados = [
  'rotulo-do-campo-confere',
  'segunda-leitura-confere',
  'rotulo-de-outra-grandeza',
  'sem-rotulo-do-campo',
  'varios-valores-com-rotulo-do-campo',
  'valor-fora-da-regiao-citada',
  'segunda-leitura-ausente',
  'segunda-leitura-nao-encontra-valor',
  'leituras-divergentes',
  'valor-nao-visivel',
] as const
export type MotivoReforcado = (typeof motivosReforcados)[number]

export interface VerificacaoReforcada {
  versao: typeof VERIFICACAO_REFORCADA_VERSAO
  /** Resultado da E11.0, sempre calculado e guardado para comparação. */
  e110: SugestaoVerificada
  situacao: SugestaoVerificada['situacao']
  motivo: SugestaoVerificada['motivo'] | MotivoReforcado
  /** De onde veio a evidência aceita. */
  fonte: 'leitura-do-motor' | 'segunda-leitura' | null
  /** Região da evidência aceita (da leitura usada), para mostrar ao revisor. */
  regiao: RegiaoIa | null
}

export interface OpcoesReforcada {
  /** Segunda leitura independente das páginas digitalizadas, por página. */
  segundaLeitura?: ReadonlyMap<number, readonly LinhaLida[]>
  /**
   * Leitura visual independente (OCR da página desenhada) das páginas com camada de texto (E11.3.1):
   * só conta o texto que aparece na folha. Valor em texto invisível ou coberto não é evidência.
   */
  leituraVisivel?: ReadonlyMap<number, readonly LinhaLida[]>
}

type Campo = 'area' | 'matricula'
type Categoria = 'campo' | 'generico' | 'outra' | 'nenhum'

// ---------- vocabulário do domínio (não de casos) ----------

const QUALIFICADORES_OUTRA: Record<Campo, RegExp> = {
  // Outras grandezas de área e partes de um lote dividido.
  area: /constru|edifica|permeav|projec|\butil\b|privativ|\bcomum\b|remanescen|desdobrad|desmembrad|ocupac|\bparcela\b|\bparte\b|\b\d+\s?-\s?[a-z]\b|\bfracao\b|\bvenda\b|\bvalor\b|\bvenal\b|r\$/u,
  // Outros números no mesmo formato: matrícula que não é a atual, processo, inscrição, cadastro.
  matricula: /anterior|origem|\bmae\b|encerrad|antig|cancelad|transcri|process|protocol|inscri|cadastr|\bcep\b|\bcpf\b|\bart\b|\brrt\b|\blivro\b|\bfolha\b|\bfls?\b/u,
}
const NUCLEO: Record<Campo, RegExp> = {
  area: /\b(area|superficie|medindo|mede|perfaz|perfazendo)\b/u,
  matricula: /\b(matr|matricula|matriculad[oa]|ficha|mat)\b/u,
}
const ESPECIFICO: Record<Campo, RegExp> = {
  area: /\b(lote|terreno|imovel|gleba)\b/u,
  matricula: /\b(matr|matricula|matriculad[oa]|ficha|mat)\b/u,
}

function categoria(campo: Campo, rotulo: string): Categoria {
  const texto = dobrar(rotulo)
  if (!texto) return 'nenhum'
  if (QUALIFICADORES_OUTRA[campo].test(texto)) return 'outra'
  if (!NUCLEO[campo].test(texto)) return 'nenhum'
  return ESPECIFICO[campo].test(texto) ? 'campo' : 'generico'
}

// Linha dirigida à máquina: ver `dirigida-a-maquina.ts` (E11.3.1, multilíngue e estrutural).
export { dirigidaAMaquina }

// ---------- candidatos: valor no formato do campo + rótulo ----------

const FORMATO_TOKEN: Record<Campo, RegExp> = {
  // Área: decimal com 2 casas (vírgula; OCR às vezes lê ponto ou ponto e vírgula), unidade opcional.
  area: /^\d{1,3}(?:\.\d{3})*[,;.]\d{2}$/u,
  matricula: /^(?:\d{1,3}(?:\.\d{3})+|\d{4,7})$/u,
}

interface Candidato {
  pagina: number
  linha: number
  digitos: string
  categoria: Categoria
  regiao: RegiaoIa | null
}

interface Peca {
  texto: string
  inicio: number
  palavra: number
}

function pecasDaLinha(linha: LinhaLida): Peca[] {
  // Tokens: trechos de dígitos e separadores, tirando pontuação que encosta (":", "(", ")", "m²").
  const pecas: Peca[] = []
  let deslocamento = 0
  linha.palavras.forEach((palavra, indice) => {
    for (const casou of palavra.texto.matchAll(/\d[\d.,;]*\d|\d/gu)) {
      pecas.push({ texto: casou[0].replace(/[.,;]+$/u, ''), inicio: deslocamento + (casou.index ?? 0), palavra: indice })
    }
    deslocamento += palavra.texto.length + 1
  })
  return pecas
}

const textoDaLinha = (linha: LinhaLida) => linha.palavras.map((palavra) => palavra.texto).join(' ')

function celulas(texto: string): string[] {
  return texto.split('|').map((celula) => celula.trim())
}

function rotuloDe(linhas: readonly LinhaLida[], indice: number, peca: Peca, anteriores: readonly Peca[]): string {
  const linha = linhas[indice]
  if (!linha) return ''
  const texto = textoDaLinha(linha)
  const antes = texto.slice(0, peca.inicio)
  // Tabela com "|": rótulo da linha (1ª célula) ou cabeçalho da coluna.
  if (antes.includes('|') || texto.includes('|')) {
    const coluna = antes.split('|').length - 1
    const naCelula = antes.split('|').at(-1)?.trim() ?? ''
    if (/\p{L}{3,}/u.test(naCelula)) return naCelula
    const primeira = celulas(texto)[0] ?? ''
    if (coluna > 0 && /\p{L}{3,}/u.test(primeira) && !/\d/u.test(primeira)) return primeira
    const total = celulas(texto).length
    for (let acima = indice - 1; acima >= Math.max(0, indice - 6); acima -= 1) {
      const outra = linhas[acima]
      if (!outra || outra.pagina !== linha.pagina) break
      const cabecalho = celulas(textoDaLinha(outra))
      if (cabecalho.length === total && !/\d/u.test(cabecalho[coluna] ?? '0')) return cabecalho[coluna] ?? ''
    }
    return ''
  }
  // Mesma linha: do último separador (ou valor anterior do mesmo campo) até o valor.
  const anterior = anteriores.filter((outra) => outra.inicio < peca.inicio).at(-1)
  const corte = Math.max(anterior ? anterior.inicio + anterior.texto.length : 0, antes.lastIndexOf(' - ') + 1, antes.lastIndexOf(';') + 1)
  const contexto = antes.slice(corte).slice(-70)
  if (/\p{L}{3,}/u.test(contexto)) return contexto
  // Valor sozinho: a linha de cima, se for um rótulo curto sem número.
  const acima = linhas[indice - 1]
  if (acima && acima.pagina === linha.pagina) {
    const rotulo = textoDaLinha(acima)
    if (rotulo.length <= 70 && !/\d/u.test(rotulo) && /\p{L}{3,}/u.test(rotulo)) return rotulo
  }
  return contexto
}

function regiaoDasPalavras(linha: LinhaLida, indices: readonly number[]): RegiaoIa | null {
  const regioes = indices.flatMap((i) => (linha.palavras[i]?.regiao ? [linha.palavras[i].regiao] : []))
  if (regioes.length === 0) return null
  const x = Math.min(...regioes.map((r) => r.x))
  const y = Math.min(...regioes.map((r) => r.y))
  return { x, y, width: Math.max(...regioes.map((r) => r.x + r.width)) - x, height: Math.max(...regioes.map((r) => r.y + r.height)) - y }
}

export function candidatos(campo: Campo, linhas: readonly LinhaLida[]): Candidato[] {
  const lista: Candidato[] = []
  linhas.forEach((linha, indice) => {
    if (dirigidaAMaquina(linha.texto) || dirigidaAMaquina(textoDaLinha(linha))) return
    const doCampo = pecasDaLinha(linha).filter((peca) => FORMATO_TOKEN[campo].test(peca.texto))
    for (const peca of doCampo) {
      lista.push({
        pagina: linha.pagina,
        linha: indice,
        digitos: peca.texto.replace(/\D/gu, ''),
        categoria: categoria(campo, rotuloDe(linhas, indice, peca, doCampo)),
        regiao: regiaoDasPalavras(linha, [peca.palavra]),
      })
    }
  })
  return lista
}

// ---------- decisão ----------

const SOBREPONIVEL_TEXTO = new Set<SugestaoVerificada['motivo']>(['valor-ambiguo-no-documento'])
const SOBREPONIVEL_OCR = new Set<SugestaoVerificada['motivo']>(['valor-ambiguo-no-documento', 'valor-ausente-da-regiao', 'valor-em-outra-regiao', 'trecho-nao-confere', 'fundamento-textual-sem-texto', 'sem-texto-na-regiao-hipotese-visual'])
const SEM_CITACAO = (regiao: RegiaoIa) => regiao.width * regiao.height < 0.0001

function perto(a: RegiaoIa, b: RegiaoIa, margem: number): boolean {
  return a.x < b.x + b.width + margem && a.x + a.width > b.x - margem && a.y < b.y + b.height + margem && a.y + a.height > b.y - margem
}

function resultado(e110: SugestaoVerificada, situacao: VerificacaoReforcada['situacao'], motivo: VerificacaoReforcada['motivo'], fonte: VerificacaoReforcada['fonte'] = null, regiao: RegiaoIa | null = null): VerificacaoReforcada {
  return { versao: VERIFICACAO_REFORCADA_VERSAO, e110, situacao, motivo, fonte, regiao }
}

export function verificarPropostaReforcada(proposta: PropostaModelo, anexos: readonly AnexoTriado[], opcoes: OpcoesReforcada = {}): VerificacaoReforcada {
  const e110 = verificarProposta(proposta, anexos)
  const manter = () => resultado(e110, e110.situacao, e110.motivo)
  if (proposta.tipo !== 'campo' || (proposta.campo !== 'area' && proposta.campo !== 'matricula')) return manter()
  const campo: Campo = proposta.campo
  const anexo = anexos.find((item) => item.lido.id === proposta.anexoId)
  const pagina = anexo?.lido.paginas.find((item) => item.pagina === proposta.pagina)
  if (!anexo || !pagina) return manter()

  const digitalizada = pagina.metodo !== 'camada-de-texto'
  const sobreponivel = digitalizada ? SOBREPONIVEL_OCR : SOBREPONIVEL_TEXTO
  if (e110.situacao === 'recusada' && !sobreponivel.has(e110.motivo)) return manter()

  const segunda = digitalizada ? opcoes.segundaLeitura?.get(proposta.pagina) : undefined
  if (digitalizada && !segunda) {
    // Sem segunda leitura, a página digitalizada fica como estava na E11.0 (no máximo hipótese).
    return e110.situacao === 'verificada' ? resultado(e110, 'recusada', 'segunda-leitura-ausente') : manter()
  }

  // Leitura usada: a do motor, com a página digitalizada trocada pela segunda leitura.
  // Página com camada de texto e leitura visual: só as linhas que aparecem na folha.
  const visual = !digitalizada ? opcoes.leituraVisivel?.get(proposta.pagina) : undefined
  const daPagina = segunda ?? anexo.lido.linhas.filter((linha) => linha.pagina === proposta.pagina)
  const visiveis = visual ? daPagina.filter((linha) => linhaVisivel(linha, visual)) : daPagina
  const leitura: LinhaLida[] = [...anexo.lido.linhas.filter((linha) => linha.pagina !== proposta.pagina), ...visiveis]
  const todos = candidatos(campo, leitura)
  const valor = proposta.valorBruto.replace(/\D/gu, '')
  const regiaoCitada = proposta.regioes[0]
  // Região citada (de texto ou visual) restringe onde o valor pode estar; sem citação, não há restrição de lugar,
  // mas a proposta continua precisando do rótulo do campo na leitura usada.
  const citou = regiaoCitada !== undefined && !SEM_CITACAO(regiaoCitada)
  const daProposta = todos.filter((c) => c.pagina === proposta.pagina && c.digitos === valor)
  const naRegiao = citou && regiaoCitada ? daProposta.filter((c) => c.regiao !== null && perto(c.regiao, regiaoCitada, digitalizada ? 0.03 : 0.004)) : daProposta

  if (daProposta.length === 0) {
    const escondido = visual && candidatos(campo, daPagina).some((c) => c.digitos === valor)
    return resultado(e110, 'recusada', escondido ? 'valor-nao-visivel' : digitalizada ? 'segunda-leitura-nao-encontra-valor' : 'valor-ausente-da-regiao')
  }
  if (naRegiao.length === 0) return resultado(e110, 'recusada', 'valor-fora-da-regiao-citada')
  if (naRegiao.every((c) => c.categoria === 'outra')) return resultado(e110, 'recusada', 'rotulo-de-outra-grandeza')

  const comRotulo = todos.filter((c) => c.categoria === 'campo')
  const genericos = todos.filter((c) => c.categoria === 'generico')
  // Aceita: valor com rótulo do campo ou, se nenhum valor tiver rótulo do campo, com rótulo genérico.
  const aceitaveis = comRotulo.length > 0 ? comRotulo : genericos
  const escolhida = naRegiao.find((c) => aceitaveis.includes(c))
  if (!escolhida) return resultado(e110, 'recusada', 'sem-rotulo-do-campo')
  // Conflito: qualquer outro valor com rótulo do campo OU genérico ("Área total", "Área") pode ser a
  // mesma grandeza; dois valores distintos → abstenção (ajuste da rodada de desenvolvimento no IA-1).
  if (new Set([...comRotulo, ...genericos].map((c) => c.digitos)).size > 1) return resultado(e110, 'recusada', 'varios-valores-com-rotulo-do-campo')

  if (digitalizada) {
    // A leitura do motor não pode trazer, na mesma página, outro valor com rótulo do campo.
    const doMotor = candidatos(campo, anexo.lido.linhas.filter((linha) => linha.pagina === proposta.pagina)).filter((c) => c.categoria === 'campo' || c.categoria === 'generico')
    if (doMotor.some((c) => c.digitos !== valor)) return resultado(e110, 'recusada', 'leituras-divergentes')
    return resultado(e110, 'verificada', 'segunda-leitura-confere', 'segunda-leitura', escolhida.regiao)
  }
  return resultado(e110, 'verificada', 'rotulo-do-campo-confere', 'leitura-do-motor', escolhida.regiao)
}

/** Só para testes: a classificação do rótulo. */
export const categoriaDoRotuloParaTeste = categoria
