import { randomUUID } from 'node:crypto'
import type { MotivoVerificacao, PropostaModelo, RegiaoIa, SugestaoVerificada } from '../../../shared/contracts/triage-ia.ts'
import type { NomeCampo } from '../../../shared/contracts/triage.ts'
import { normalizarCampo } from '../extraction/extract.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { dobrar, mascararDocumentos, type LinhaLida, type PalavraLida } from '../reading/text.ts'
import { pareceInstrucao } from '../reading/instrucoes.ts'

/**
 * Verificação determinística de cada proposta do modelo, feita no processo principal (a saída do
 * modelo é entrada não confiável). Dois níveis de evidência, sem mistura:
 *
 * - **Nível A, textual verificável:** o valor (ou o título, para classe) está no texto lido DAQUELA
 *   página e DAQUELA região, com o trecho citado também lá. Diferenças controladas: maiúsculas,
 *   acentos e espaços; pontuação em identificadores e números (via normalização do motor); e, só em
 *   texto vindo de OCR, a troca de caracteres parecidos (O/0, l/1, S/5, B/8) e, em nomes (sem
 *   dígitos, 8+ caracteres), um caractere a mais, a menos ou trocado.
 * - **Nível B, só visual:** a região citada não tem texto lido que confirme nem contradiga (página
 *   digitalizada sem OCR útil, por exemplo). O valor fica como hipótese NÃO verificada, só para
 *   revisão humana futura, com a região de origem. Nunca alimenta regra.
 *
 * Correspondência em outra região, página ou anexo não verifica nada: é recusada com o motivo.
 * A confiança declarada pelo modelo é guardada, mas não entra em nenhuma decisão aqui.
 */

const MARGEM = 0.004
const AREA_MINIMA = 0.00002
const AREA_MAXIMA = 0.6
/**
 * Formatos que permitem achar OUTROS valores do mesmo campo no documento. Se o anexo traz mais de
 * um valor distinto nesse formato (duas áreas, duas datas de revisão), "o valor está impresso na
 * região" não prova que é o valor certo: a sugestão é recusada como ambígua, respeitando a abstenção
 * do motor (achado na primeira execução do benchmark IA-1, caso IA1-07).
 */
const FORMATOS: Partial<Record<NomeCampo, RegExp>> = {
  area: /\d{1,3}(?:\.\d{3})*,\d{2}\s?m(?:²|2)/gu,
  'data-emissao': /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gu,
  'data-revisao': /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gu,
  matricula: /\b\d{2,3}\.\d{3}\b/gu,
  inscricao: /\b\d{4}\.\d{4}\.\d{3}\b/gu,
  'escala-situacao': /\b1\s?:\s?\d{1,3}(?:\.\d{3})*\b/gu,
}

function ambiguoNoDocumento(anexo: AnexoTriado, campo: NomeCampo): boolean {
  const formato = FORMATOS[campo]
  if (!formato) return false
  const distintos = new Set<string>()
  for (const linha of anexo.lido.linhas) {
    for (const casou of linha.texto.matchAll(formato)) {
      const normalizado = normalizarCampo(campo, casou[0])
      distintos.add(normalizado?.situacao === 'normalizado' ? String(normalizado.valor) : compacto(casou[0]))
    }
  }
  return distintos.size > 1
}

const CAMPOS_COM_NORMALIZACAO = new Set<NomeCampo>(['area', 'data-emissao', 'data-revisao', 'escala-situacao', 'formato-folha', 'matricula', 'inscricao', 'lote', 'quadra'])

function regiaoValida(regiao: RegiaoIa): boolean {
  return regiao.x + regiao.width <= 1.0001 && regiao.y + regiao.height <= 1.0001 && regiao.width * regiao.height >= AREA_MINIMA
}

/** A palavra está dentro da região se o centro dela cai na região (com uma margem pequena). */
function dentro(palavra: PalavraLida, regioes: readonly RegiaoIa[]): boolean {
  const r = palavra.regiao
  if (!r) return false
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  return regioes.some((regiao) => cx >= regiao.x - MARGEM && cx <= regiao.x + regiao.width + MARGEM && cy >= regiao.y - MARGEM && cy <= regiao.y + regiao.height + MARGEM)
}

interface TextoRegiao {
  texto: string
  ocr: boolean
}

function textoDaRegiao(linhas: readonly LinhaLida[], pagina: number, regioes: readonly RegiaoIa[]): TextoRegiao {
  const partes: string[] = []
  let ocr = false
  for (const linha of linhas) {
    if (linha.pagina !== pagina) continue
    const palavras = linha.palavras.filter((palavra) => dentro(palavra, regioes))
    if (palavras.length === 0) continue
    if (palavras.some((palavra) => palavra.origem === 'ocr')) ocr = true
    partes.push(palavras.map((palavra) => palavra.texto).join(' '))
  }
  return { texto: partes.join('\n'), ocr }
}

const textoDaPagina = (linhas: readonly LinhaLida[], pagina: number) => linhas.filter((linha) => linha.pagina === pagina).map((linha) => linha.texto).join('\n')

/** Só letras e dígitos, sem acento, minúsculas: para comparar identificadores e números. */
const compacto = (texto: string) => dobrar(texto).replace(/[^\p{L}\p{N}]/gu, '')

const CONFUSOES: Record<string, string> = { o: '0', q: '0', d: '0', i: '1', l: '1', '|': '1', s: '5', b: '8', z: '2', g: '6' }
const semConfusoes = (texto: string) => [...compacto(texto)].map((caractere) => CONFUSOES[caractere] ?? caractere).join('')

/**
 * Distância de edição ≤ 1 entre `alvo` e alguma janela do texto. Só para valores SEM dígitos e com
 * 8+ caracteres (nomes): em número ou identificador, um caractere diferente é outro valor
 * ("101.203" não é "101.202"), e aí só valem as trocas típicas de OCR.
 */
function aproximadamente(texto: string, alvo: string): boolean {
  if (alvo.length < 8 || /\p{N}/u.test(alvo)) return false
  for (const tamanho of [alvo.length - 1, alvo.length, alvo.length + 1]) {
    for (let inicio = 0; inicio + tamanho <= texto.length; inicio += 1) {
      if (distanciaAteUm(texto.slice(inicio, inicio + tamanho), alvo)) return true
    }
  }
  return false
}

function distanciaAteUm(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edicoes = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    edicoes += 1
    if (edicoes > 1) return false
    if (a.length > b.length) i += 1
    else if (b.length > a.length) j += 1
    else {
      i += 1
      j += 1
    }
  }
  return edicoes + (a.length - i) + (b.length - j) <= 1
}

/** Termo inteiro dentro do texto (sem casar "7" dentro de "F7"). */
function contemTermo(texto: string, termo: string): boolean {
  const t = dobrar(termo)
  if (!t) return false
  const escapado = t.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapado}($|[^\\p{L}\\p{N}])`, 'u').test(dobrar(texto))
}

type Conferencia = Extract<MotivoVerificacao, 'texto-confere-na-regiao' | 'texto-confere-normalizado' | 'texto-confere-com-tolerancia-ocr'>

/** O valor está no texto da região? Devolve como conferiu, ou `null`. */
function conferir(regiao: TextoRegiao, valor: string): Conferencia | null {
  if (contemTermo(regiao.texto, valor)) return 'texto-confere-na-regiao'
  const alvo = compacto(valor)
  if (alvo.length >= 3 && compacto(regiao.texto).includes(alvo)) return 'texto-confere-normalizado'
  if (regiao.ocr) {
    const alvoOcr = semConfusoes(valor)
    const textoOcr = semConfusoes(regiao.texto)
    if (alvoOcr.length >= 3 && textoOcr.includes(alvoOcr)) return 'texto-confere-com-tolerancia-ocr'
    if (aproximadamente(compacto(regiao.texto), compacto(valor))) return 'texto-confere-com-tolerancia-ocr'
  }
  return null
}

/** O trecho citado está na região? Mesma tolerância do valor (o trecho é maior: compara compacto). */
function trechoConfere(regiao: TextoRegiao, trecho: string): boolean {
  const alvo = compacto(trecho)
  if (alvo.length === 0) return false
  if (compacto(regiao.texto).includes(alvo)) return true
  return regiao.ocr && semConfusoes(regiao.texto).includes(semConfusoes(trecho))
}

function base(proposta: PropostaModelo): Omit<SugestaoVerificada, 'nivel' | 'situacao' | 'motivo' | 'relacaoMotor'> {
  return {
    id: randomUUID(),
    tipo: proposta.tipo,
    anexoId: proposta.anexoId,
    anexoSha256: proposta.anexoSha256,
    pagina: proposta.pagina,
    regioes: proposta.regioes,
    classe: proposta.tipo === 'classe' ? proposta.classe : null,
    campo: proposta.tipo === 'campo' ? proposta.campo : null,
    valorBruto: proposta.tipo === 'campo' ? mascararDocumentos(proposta.valorBruto) : null,
    trecho: mascararDocumentos(proposta.trecho),
    fundamento: proposta.fundamento,
    metodo: 'modelo-local',
    confiancaDeclarada: proposta.confiancaDeclarada,
    efeito: 'nenhum',
  }
}

const recusada = (proposta: PropostaModelo, motivo: MotivoVerificacao): SugestaoVerificada => ({ ...base(proposta), nivel: null, situacao: 'recusada', motivo, relacaoMotor: null })

function relacaoCampo(anexo: AnexoTriado, campo: NomeCampo, valor: string): SugestaoVerificada['relacaoMotor'] {
  const doMotor = anexo.campos.find((item) => item.contrato.campo === campo)
  if (!doMotor || doMotor.contrato.estado !== 'encontrado' || !doMotor.contrato.valorBruto) return 'preencheria-lacuna'
  const igual = dobrar(doMotor.contrato.valorBruto) === dobrar(valor) || (compacto(valor).length >= 3 && compacto(doMotor.contrato.valorBruto) === compacto(valor))
  return igual ? 'confirma-motor' : 'diverge-do-motor'
}

/** Onde mais o valor aparece (para dizer por que a proposta não verifica na região citada). */
function ondeMais(anexos: readonly AnexoTriado[], anexo: AnexoTriado, pagina: number, valor: string): MotivoVerificacao {
  if (contemTermo(textoDaPagina(anexo.lido.linhas, pagina), valor)) return 'valor-em-outra-regiao'
  if (anexo.lido.linhas.some((linha) => linha.pagina !== pagina && contemTermo(linha.texto, valor))) return 'valor-em-outra-pagina'
  if (anexos.some((outro) => outro !== anexo && outro.lido.linhas.some((linha) => contemTermo(linha.texto, valor)))) return 'valor-em-outro-anexo'
  return 'valor-ausente-da-regiao'
}

export function verificarProposta(proposta: PropostaModelo, anexos: readonly AnexoTriado[]): SugestaoVerificada {
  const anexo = anexos.find((item) => item.lido.id === proposta.anexoId)
  if (!anexo) return recusada(proposta, 'anexo-desconhecido')
  if (anexo.lido.inspecao.sha256 !== proposta.anexoSha256) return recusada(proposta, 'hash-divergente')
  if (anexo.lido.legibilidade === 'isolado') return recusada(proposta, 'anexo-isolado')
  if (!anexo.lido.paginas.some((pagina) => pagina.pagina === proposta.pagina)) return recusada(proposta, 'pagina-inexistente')
  const area = proposta.regioes.reduce((soma, regiao) => soma + regiao.width * regiao.height, 0)
  if (!proposta.regioes.every(regiaoValida) || area > AREA_MAXIMA) return recusada(proposta, 'regiao-invalida')

  const regiao = textoDaRegiao(anexo.lido.linhas, proposta.pagina, proposta.regioes)
  // Texto com cara de ordem ao sistema, na região ou no trecho citado: nada tirado dali é aceito.
  if (pareceInstrucao(regiao.texto) || pareceInstrucao(proposta.trecho) || (proposta.tipo === 'campo' && pareceInstrucao(proposta.valorBruto))) {
    return recusada(proposta, 'regiao-com-instrucao')
  }

  if (proposta.tipo === 'campo') {
    const doMotor = anexo.campos.find((item) => item.contrato.campo === proposta.campo)
    if (doMotor?.contrato.metodo === 'servidor') return recusada(proposta, 'valor-confirmado-por-servidor')
    if (CAMPOS_COM_NORMALIZACAO.has(proposta.campo)) {
      const normalizacao = normalizarCampo(proposta.campo, proposta.valorBruto)
      if (!normalizacao || normalizacao.situacao !== 'normalizado') return recusada(proposta, 'valor-nao-normaliza')
    }
    if (regiao.texto.trim().length === 0) {
      if (proposta.fundamento === 'texto') return recusada(proposta, 'fundamento-textual-sem-texto')
      const outro = ondeMais(anexos, anexo, proposta.pagina, proposta.valorBruto)
      if (outro !== 'valor-ausente-da-regiao') return recusada(proposta, outro)
      return { ...base(proposta), nivel: 'B', situacao: 'hipotese-visual', motivo: 'sem-texto-na-regiao-hipotese-visual', relacaoMotor: relacaoCampo(anexo, proposta.campo, proposta.valorBruto) }
    }
    const conferencia = conferir(regiao, proposta.valorBruto)
    if (!conferencia) return recusada(proposta, ondeMais(anexos, anexo, proposta.pagina, proposta.valorBruto))
    const valorNoTrecho = compacto(proposta.trecho).includes(compacto(proposta.valorBruto)) || (regiao.ocr && semConfusoes(proposta.trecho).includes(semConfusoes(proposta.valorBruto)))
    if (!trechoConfere(regiao, proposta.trecho) || !valorNoTrecho) return recusada(proposta, 'trecho-nao-confere')
    if (ambiguoNoDocumento(anexo, proposta.campo)) return recusada(proposta, 'valor-ambiguo-no-documento')
    return { ...base(proposta), nivel: 'A', situacao: 'verificada', motivo: conferencia, relacaoMotor: relacaoCampo(anexo, proposta.campo, proposta.valorBruto) }
  }

  // Classe: o trecho que a fundamenta (título, cabeçalho) precisa estar na região citada.
  const atual = anexo.classificacao.contrato.classe
  const relacao: SugestaoVerificada['relacaoMotor'] = atual === 'indeterminada' ? 'preencheria-lacuna' : atual === proposta.classe ? 'confirma-motor' : 'diverge-do-motor'
  if (regiao.texto.trim().length === 0) {
    if (proposta.fundamento === 'texto') return recusada(proposta, 'fundamento-textual-sem-texto')
    return { ...base(proposta), nivel: 'B', situacao: 'hipotese-visual', motivo: 'sem-texto-na-regiao-hipotese-visual', relacaoMotor: relacao }
  }
  if (!trechoConfere(regiao, proposta.trecho)) return recusada(proposta, 'trecho-nao-confere')
  return { ...base(proposta), nivel: 'A', situacao: 'verificada', motivo: 'texto-confere-na-regiao', relacaoMotor: relacao }
}
