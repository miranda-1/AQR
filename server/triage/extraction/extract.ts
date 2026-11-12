import {
  campoExtraidoSchema,
  type CampoExtraido,
  type ClasseDocumental,
  type Evidencia,
  type NomeCampo,
} from '../../../shared/contracts/triage.ts'
import type { ClassificacaoDetalhada } from '../classification/classify.ts'
import type { AnexoLido } from '../reading/read.ts'
import { confiancaMinima, palavrasDoTrecho, regiaoDe, trechoDeEvidencia, type LinhaLida } from '../reading/text.ts'
import {
  chaveDeTexto,
  normalizarArea,
  normalizarCodigo,
  normalizarData,
  normalizarEscala,
  normalizarFormato,
  normalizarIdentificador,
  type Normalizacao,
} from './normalize.ts'

/**
 * Extração estruturada de campos (E5). Cada campo vem de um padrão verificável numa linha lida
 * (rótulo como "Matrícula:" ou expressão como "lote F7 da quadra 12"), com o valor como está no
 * documento, a normalização à parte e a evidência (anexo, hash, página, região, trecho).
 *
 * Regras que o código garante:
 * - nada vem do nome do arquivo;
 * - valores diferentes no mesmo anexo viram `varios-valores`, sem escolher;
 * - titular registral não é escolhido entre os nomes dos atos da matrícula (`varios-valores`);
 * - proprietário, outorgado (procurador) e responsável técnico são campos diferentes;
 * - leitura de OCR com confiança baixa vira `ilegivel`, com o valor lido só como registro;
 * - campo não achado num anexo lido é `nao-encontrado` NESTE anexo; num anexo mal lido, `ilegivel`.
 */

// ---------- padrões ----------

/** Comparação sem acento e sem caixa, preservando as posições (um caractere por caractere). */
function dobrarPreservando(texto: string): string {
  return [...texto]
    .map((char) => {
      const base = char.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
      if (base.length === char.length) return base
      const minuscula = char.toLowerCase()
      return minuscula.length === char.length ? minuscula : char
    })
    .join('')
}

type Corte = 'linha' | 'rotulo' | 'virgula'

interface Padrao {
  campo: NomeCampo
  /** Aplicado à linha dobrada; o grupo `v` é o valor. */
  re: RegExp
  /** Classes em que o padrão vale (sem lista: qualquer classe). */
  classes?: readonly ClasseDocumental[]
  /** Até onde vai o valor: fim da linha, próximo rótulo "Xxx:" ou vírgula. */
  corte?: Corte
  /** Confiança-base (texto nítido). Expressão em prosa vale menos que rótulo. */
  confianca: number
  /** Ato da matrícula (R-/AV-): nomes que não indicam o titular atual. */
  ato?: boolean
  /** O valor tem a forma certa, mas uma parte não pôde ser lida (ex.: unidade): fica `ilegivel`. */
  incerto?: boolean
}

const DATA = String.raw`\d{1,2}[/.-]\d{1,2}[/.-](?:\d{4}|\d{2})\b`
const CODIGO = String.raw`(?:(?=[a-z]{0,2}\d)[a-z0-9]{1,6}(?:-[a-z0-9]{1,3})?|[a-z])\b`
// Fim de unidade sem `\b`: "²" não é caractere de palavra e o `\b` não casaria depois dele.
const AREA = String.raw`\d[\d.]*(?:,\d+)?\s*(?:m²|m2|ha)(?![\p{L}\p{N}])`

const REQ: ClasseDocumental[] = ['requerimento']
const DRTS: ClasseDocumental[] = ['drt-01', 'drt-02-projeto', 'drt-02-implantacao', 'drt-03']
const PECAS: ClasseDocumental[] = ['prancha', 'memorial']

const PADROES: Padrao[] = [
  { campo: 'assunto', re: /\bassunto\s*:\s*(?<v>.+)$/du, classes: [...REQ, ...DRTS, ...PECAS], corte: 'rotulo', confianca: 0.95 },
  // Na DRT, o catálogo pede a "modalidade DRT" (regra 003): é o assunto da declaração.
  { campo: 'assunto', re: /^modalidade\s*:\s*(?<v>.+)$/du, classes: DRTS, corte: 'rotulo', confianca: 0.9 },

  { campo: 'titular', re: /\b(?:proprietari[oa](?:\(a\))?|titular)\s*:\s*(?<v>.+)$/du, classes: [...REQ, ...PECAS, 'matricula-transcricao', 'inscricao-imobiliaria'], corte: 'rotulo', confianca: 0.9 },
  { campo: 'titular', re: /^contratante\s*:\s*(?<v>.+)$/du, classes: ['art-rrt-similar'], corte: 'rotulo', confianca: 0.75 },
  { campo: 'titular', re: /^outorgante\s*:\s*(?<v>.+)$/du, classes: ['representacao'], corte: 'rotulo', confianca: 0.85 },
  // Nomes nos atos de transmissão da matrícula (R-1, R-2…). Nunca indicam sozinhos o titular atual:
  // com mais de um, o campo fica com vários valores, sem escolher por posição ou frequência.
  {
    campo: 'titular',
    re: /\b(?:transmitid[oa]|vendid[oa]|adquirid[oa]|doad[oa])\s+(?:a|ao|para|por)\s+(?<v>[a-z][a-z ]+?)(?=\s+por\b|[,.;]|$)/du,
    classes: ['matricula-transcricao'],
    confianca: 0.5,
    ato: true,
  },

  { campo: 'signatario', re: /\bassina (?:este|o presente) requerimento\s*:\s*(?<v>.+)$/du, classes: REQ, corte: 'virgula', confianca: 0.9 },
  { campo: 'signatario', re: /^outorgad[oa](?:\(a\))?\s*:\s*(?<v>.+)$/du, classes: ['representacao'], corte: 'rotulo', confianca: 0.85 },

  { campo: 'rt-nome', re: /\b(?:responsavel tecnico|profissional)\s*:\s*(?<v>.+)$/du, classes: [...REQ, ...DRTS, ...PECAS, 'art-rrt-similar'], corte: 'rotulo', confianca: 0.9 },
  { campo: 'rt-registro', re: /\b(?:responsavel tecnico|profissional)\s*:.*?(?<v>\b(?:crea|cau|cft)(?:[-\s][a-z]{2,4})?[-\s]+[a-z]?\d[\w./-]*)/du, classes: [...REQ, ...DRTS, ...PECAS, 'art-rrt-similar'], confianca: 0.9 },

  // "Área do lote: 600,00 m²" não é lote (defeito achado na validação): o rótulo não pode ser parte de
  // "área do/de" e o valor não pode continuar como número decimal.
  { campo: 'lote', re: new RegExp(String.raw`(?<!\barea (?:do|de) )\blote\b\s*(?:n[ºo°]\.?)?\s*:?\s*(?<v>${CODIGO})(?![,.]\d)`, 'du'), confianca: 0.9 },
  { campo: 'quadra', re: new RegExp(String.raw`(?<!\barea (?:da|de) )\bquadra\b\s*(?:n[ºo°]\.?)?\s*:?\s*(?<v>${CODIGO})(?![,.]\d)`, 'du'), confianca: 0.9 },
  { campo: 'parcelamento', re: /\bparcelamento\s*:\s*(?<v>.+)$/du, corte: 'rotulo', confianca: 0.9 },
  { campo: 'parcelamento', re: /\bquadra\s+\S+\s+(?:do|da)\s+(?<v>[^,.;]+)/du, classes: ['matricula-transcricao'], confianca: 0.7 },
  { campo: 'bairro', re: /\bbairro\s*:\s*(?<v>.+)$/du, corte: 'rotulo', confianca: 0.9 },
  { campo: 'matricula', re: /\bmatricula\b\s*(?:n[ºo°]\.?|numero)?\s*:?\s*(?<v>\d(?:[\d.]*\d)?)\b/du, confianca: 0.9 },
  { campo: 'cartorio', re: /^(?<v>.*\b(?:servico registral|registro de imoveis|oficio de registro|cartorio)\b.*)$/du, classes: ['matricula-transcricao'], confianca: 0.8 },
  { campo: 'inscricao', re: /\binscricao(?: imobiliaria)?\s*(?:n[ºo°]\.?)?\s*:\s*(?<v>\d[\d.\-/]*\d)/du, confianca: 0.9 },

  { campo: 'data-emissao', re: new RegExp(String.raw`\b(?:emitida em|expedida em|emissao\s*:|data de emissao\s*:)\s*(?<v>${DATA})`, 'du'), classes: ['matricula-transcricao'], confianca: 0.9 },
  // Em prancha e memorial, "Data:" é tratado como data da revisão da peça (é o que a regra 021 compara).
  { campo: 'data-revisao', re: new RegExp(String.raw`\b(?:revisao|data)\s*:\s*(?<v>${DATA})`, 'du'), classes: PECAS, confianca: 0.85 },

  {
    campo: 'area',
    re: new RegExp(String.raw`(?:\barea(?: total)?\s*(?::|de)\s*|\bsituacao atual\s*:[^-]*-\s*)(?<v>${AREA})`, 'du'),
    classes: ['matricula-transcricao', 'prancha', 'memorial', 'gdu-gdr', 'inscricao-imobiliaria'],
    confianca: 0.9,
  },
  {
    // Número de área com a unidade ilegível ("450,00 m?" no OCR): registrado como ilegível, nunca
    // completado para "m²".
    campo: 'area',
    re: /(?:\barea(?: total)?\s*(?::|de)\s*|\bsituacao atual\s*:[^-]*-\s*)(?<v>\d[\d.]*,\d+\s*m[^\s²2a-z]\S*)/du,
    classes: ['matricula-transcricao', 'prancha', 'memorial', 'gdu-gdr', 'inscricao-imobiliaria'],
    confianca: 0.3,
    incerto: true,
  },
  {
    campo: 'escala-situacao',
    re: /\bplanta de situacao\b.*?(?:\bescala\b|\besc\.)\s*(?<v>1\s*[:/]\s*\d[\d.]*)/du,
    classes: ['prancha'],
    confianca: 0.9,
  },
  { campo: 'formato-folha', re: /\b(?:formato|folha)\s*:?\s*(?<v>a[0-4])\b/du, classes: ['prancha'], confianca: 0.9 },
]

/** Campos esperados em cada classe: só nestes um campo ausente vira `nao-encontrado`. */
export const CAMPOS_DA_CLASSE: Partial<Record<ClasseDocumental, readonly NomeCampo[]>> = {
  requerimento: ['assunto', 'titular', 'signatario', 'rt-nome', 'lote', 'quadra', 'parcelamento', 'bairro', 'matricula', 'inscricao'],
  'drt-01': ['assunto', 'rt-nome', 'rt-registro'],
  'drt-02-projeto': ['assunto', 'rt-nome', 'rt-registro'],
  'drt-02-implantacao': ['assunto', 'rt-nome', 'rt-registro'],
  'drt-03': ['assunto', 'rt-nome', 'rt-registro'],
  'matricula-transcricao': ['matricula', 'cartorio', 'lote', 'quadra', 'area', 'titular', 'data-emissao'],
  'inscricao-imobiliaria': ['inscricao', 'lote', 'quadra', 'bairro'],
  'art-rrt-similar': ['rt-nome', 'rt-registro', 'titular', 'lote', 'quadra', 'bairro'],
  prancha: ['assunto', 'lote', 'quadra', 'matricula', 'area', 'escala-situacao', 'formato-folha', 'data-revisao', 'rt-nome'],
  memorial: ['assunto', 'lote', 'quadra', 'matricula', 'area', 'data-revisao', 'rt-nome'],
  'gdu-gdr': ['lote', 'quadra', 'matricula', 'area'],
  representacao: ['titular', 'signatario'],
}

/** Confiança de OCR (0–100) abaixo da qual o valor lido não é aceito como encontrado. */
export const OCR_MINIMO_CAMPO = 60

/**
 * Próximo rótulo na mesma linha ("Parcelamento: X   Bairro: Y"). Primeiro os rótulos conhecidos; sem
 * eles, uma palavra só antes de ":" (duas palavras engoliriam o fim do valor: "Ficticio Bairro:").
 */
const ROTULOS_CONHECIDOS = String.raw`(?:assunto|proprietari[oa](?:\(a\))?|titular|requerente|lote|quadra|parcelamento|bairro|matricula(?:\s+n[ºo°]\.?)?|inscricao(?: imobiliaria)?|responsavel tecnico|profissional|contratante|atividade|data(?: de emissao| da revisao)?|revisao|formato|folha|escala|area(?: total)?|situacao(?: atual| final)?|outorgante|outorgad[oa](?:\(a\))?|poderes)`
const PROXIMO_ROTULO = new RegExp(String.raw`\s+(?:${ROTULOS_CONHECIDOS}|[a-z][a-z()]*)\s*:`, 'u')

// ---------- ocorrências ----------

export interface Ocorrencia {
  campo: NomeCampo
  valorBruto: string
  linha: LinhaLida
  inicio: number
  fim: number
  confianca: number
  ocr: boolean
  /** Menor confiança de OCR das palavras do valor (100 sem OCR). */
  confiancaOcr: number
  ato: boolean
  incerto: boolean
}

function limpar(valor: string): string {
  return valor.replace(/\s+/gu, ' ').replace(/^[\s:–—-]+|[\s.,;:]+$/gu, '').trim()
}

function ocorrenciasDaLinha(linha: LinhaLida, classe: ClasseDocumental | 'indeterminada'): Ocorrencia[] {
  const original = linha.texto.normalize('NFC')
  const dobrada = dobrarPreservando(original)
  const encontradas: Ocorrencia[] = []
  for (const padrao of PADROES) {
    if (padrao.classes && (classe === 'indeterminada' || !padrao.classes.includes(classe))) continue
    const re = new RegExp(padrao.re.source, padrao.re.flags.includes('g') ? padrao.re.flags : `${padrao.re.flags}g`)
    for (const match of dobrada.matchAll(re)) {
      const grupo = match.indices?.groups?.v
      if (!grupo) continue
      let [inicio, fim] = grupo
      let trecho = dobrada.slice(inicio, fim)
      if (padrao.corte === 'rotulo') {
        const proximo = PROXIMO_ROTULO.exec(trecho)
        if (proximo) fim = inicio + proximo.index
      } else if (padrao.corte === 'virgula') {
        const virgula = trecho.indexOf(',')
        if (virgula >= 0) fim = inicio + virgula
      }
      if (padrao.campo === 'rt-nome') {
        // "Nome - CREA 000": o registro é outro campo.
        trecho = dobrada.slice(inicio, fim)
        const separador = /\s+[-–—]\s+|\s+(?=(?:crea|cau|cft)\b)/u.exec(trecho)
        if (separador) fim = inicio + separador.index
      }
      const bruto = limpar(original.slice(inicio, fim))
      if (!bruto) continue
      const ajuste = original.slice(inicio, fim).indexOf(bruto)
      inicio += Math.max(0, ajuste)
      fim = inicio + bruto.length
      const palavras = palavrasDoTrecho(linha, inicio, fim)
      const ocr = palavras.some((palavra) => palavra.origem === 'ocr')
      encontradas.push({
        campo: padrao.campo,
        valorBruto: bruto,
        linha,
        inicio,
        fim,
        confianca: padrao.confianca,
        ocr,
        confiancaOcr: confiancaMinima(palavras),
        ato: padrao.ato === true,
        incerto: padrao.incerto === true,
      })
    }
  }
  return encontradas
}

// ---------- normalização por campo ----------

export function normalizarCampo(campo: NomeCampo, bruto: string): Normalizacao<string | number> | null {
  switch (campo) {
    case 'area':
      return normalizarArea(bruto)
    case 'data-emissao':
    case 'data-revisao':
      return normalizarData(bruto)
    case 'escala-situacao':
      return normalizarEscala(bruto)
    case 'formato-folha':
      return normalizarFormato(bruto)
    case 'matricula':
    case 'inscricao':
      return normalizarIdentificador(bruto)
    case 'lote':
    case 'quadra':
      return normalizarCodigo(bruto)
    default:
      return null
  }
}

/** Chave usada para saber se duas leituras são o mesmo valor (não é guardada). */
export function chaveDoCampo(campo: NomeCampo, bruto: string): string {
  const normalizado = normalizarCampo(campo, bruto)
  if (normalizado?.situacao === 'normalizado') return String(normalizado.valor)
  if (normalizado?.situacao === 'ambiguo') return `ambiguo:${chaveDeTexto(bruto)}`
  return chaveDeTexto(bruto)
}

// ---------- campo extraído ----------

/** Detalhe que não cabe no contrato: o que foi normalizado e por quê, e as ocorrências. */
export interface CampoDetalhado {
  contrato: CampoExtraido
  classe: ClasseDocumental | 'indeterminada'
  normalizacao?: string
  ocorrencias: Ocorrencia[]
}

function evidenciaDe(anexo: AnexoLido, ocorrencia: Ocorrencia): Evidencia {
  const palavras = palavrasDoTrecho(ocorrencia.linha, ocorrencia.inicio, ocorrencia.fim)
  const regiao = regiaoDe(palavras)
  const desenhado = anexo.inspecao.tipoReal === 'pdf' || anexo.inspecao.tipoReal === 'jpeg' || anexo.inspecao.tipoReal === 'png'
  return {
    anexoId: anexo.id,
    sha256: anexo.inspecao.sha256,
    ...(desenhado ? { pagina: ocorrencia.linha.pagina } : {}),
    ...(desenhado && regiao ? { regioes: [regiao] } : {}),
    trecho: trechoDeEvidencia(ocorrencia.linha.texto),
    origem: ocorrencia.ocr ? 'ocr' : 'camada-de-texto',
  }
}

function montar(anexo: AnexoLido, classe: ClasseDocumental | 'indeterminada', campo: NomeCampo, todas: Ocorrencia[]): CampoDetalhado {
  // Leitura incerta só conta quando não há leitura nítida do mesmo campo.
  const nitidas = todas.filter((item) => !item.incerto)
  const ocorrencias = nitidas.length > 0 ? nitidas : todas
  const id = `${anexo.id}:${campo}`
  const metodo = ocorrencias.some((item) => item.ocr) ? ('ocr+padrao' as const) : ('padrao' as const)
  const evidencias = ocorrencias.slice(0, 4).map((item) => evidenciaDe(anexo, item))
  const confiancaOcr = Math.min(...ocorrencias.map((item) => item.confiancaOcr))
  const confiancaBase = Math.min(...ocorrencias.map((item) => item.confianca)) * (confiancaOcr < 100 ? confiancaOcr / 100 : 1)

  const porChave = new Map<string, Ocorrencia[]>()
  for (const ocorrencia of ocorrencias) {
    const chave = chaveDoCampo(campo, ocorrencia.valorBruto)
    porChave.set(chave, [...(porChave.get(chave) ?? []), ocorrencia])
  }
  const distintos = [...porChave.values()].map((grupo) => grupo[0]?.valorBruto ?? '')
  // Nomes tirados de atos da matrícula nunca indicam, sozinhos, o titular atual.
  const deAtos = campo === 'titular' && ocorrencias.some((item) => item.ato)

  if (distintos.length > 1 || (deAtos && ocorrencias.length > 1)) {
    const alternativas = distintos.length > 1 ? distintos : ocorrencias.map((item) => item.valorBruto)
    if (alternativas.length >= 2) {
      return {
        classe,
        ocorrencias,
        contrato: campoExtraidoSchema.parse({ id, anexoId: anexo.id, campo, estado: 'varios-valores', alternativas: alternativas.slice(0, 10), confianca: Math.min(confiancaBase, 0.5), metodo, evidencias }),
      }
    }
  }

  const [primeira] = ocorrencias
  if (!primeira) throw new Error('campo sem ocorrência')
  const normalizacao = normalizarCampo(campo, primeira.valorBruto)
  if (confiancaOcr < OCR_MINIMO_CAMPO || ocorrencias.every((item) => item.incerto)) {
    return {
      classe,
      ocorrencias,
      ...(normalizacao ? { normalizacao: normalizacao.descricao } : {}),
      contrato: campoExtraidoSchema.parse({ id, anexoId: anexo.id, campo, estado: 'ilegivel', valorBruto: primeira.valorBruto, confianca: Math.min(confiancaBase, 0.4), metodo, evidencias }),
    }
  }
  const base = {
    id,
    anexoId: anexo.id,
    campo,
    estado: 'encontrado' as const,
    valorBruto: primeira.valorBruto,
    metodo,
    evidencias,
    confianca: deAtos ? Math.min(confiancaBase, 0.5) : confiancaBase,
  }
  if (normalizacao?.situacao === 'normalizado') {
    return {
      classe,
      ocorrencias,
      normalizacao: normalizacao.descricao,
      contrato: campoExtraidoSchema.parse({ ...base, valorNormalizado: normalizacao.valor, ...(campo === 'area' ? { unidade: 'm2' } : {}) }),
    }
  }
  if (normalizacao?.situacao === 'ambiguo') {
    return {
      classe,
      ocorrencias,
      normalizacao: normalizacao.descricao,
      contrato: campoExtraidoSchema.parse({ ...base, alternativas: normalizacao.alternativas, confianca: Math.min(base.confianca, 0.5) }),
    }
  }
  return { classe, ocorrencias, contrato: campoExtraidoSchema.parse(base) }
}

/**
 * Campos de um anexo. Campo esperado na classe e não achado: `nao-encontrado` se o anexo foi bem
 * lido, `ilegivel` se a leitura foi parcial. Anexo sem classe ou sem texto não gera campo.
 */
export function extrairCampos(anexo: AnexoLido, classificacao: ClassificacaoDetalhada): CampoDetalhado[] {
  const classe = classificacao.contrato.classe
  if (anexo.linhas.length === 0 || anexo.legibilidade === 'isolado') return []
  // Em arquivo composto, cada campo vem só das páginas da classe principal.
  const paginasDaClasse = classificacao.composto
    ? new Set(classificacao.porPagina.filter((pagina) => pagina.classe === classe).map((pagina) => pagina.pagina))
    : null
  const linhas = paginasDaClasse ? anexo.linhas.filter((linha) => paginasDaClasse.has(linha.pagina)) : anexo.linhas
  const porCampo = new Map<NomeCampo, Ocorrencia[]>()
  for (const linha of linhas) {
    for (const ocorrencia of ocorrenciasDaLinha(linha, classe)) porCampo.set(ocorrencia.campo, [...(porCampo.get(ocorrencia.campo) ?? []), ocorrencia])
  }
  const campos: CampoDetalhado[] = []
  for (const [campo, ocorrencias] of porCampo) campos.push(montar(anexo, classe, campo, ocorrencias))
  if (classe === 'indeterminada' || classe === 'cad') return campos
  const lidoBem = anexo.legibilidade === 'legivel'
  for (const campo of CAMPOS_DA_CLASSE[classe] ?? []) {
    if (porCampo.has(campo)) continue
    campos.push({
      classe,
      ocorrencias: [],
      contrato: campoExtraidoSchema.parse({
        id: `${anexo.id}:${campo}`,
        anexoId: anexo.id,
        campo,
        estado: lidoBem ? 'nao-encontrado' : 'ilegivel',
        confianca: lidoBem ? 0.8 : 0.3,
        metodo: anexo.origemTexto === 'ocr' ? 'ocr+padrao' : 'padrao',
        evidencias: [],
      }),
    })
  }
  return campos
}
