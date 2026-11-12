/**
 * Normalização conservadora dos valores extraídos (E5). Cada função devolve o valor normalizado
 * e uma descrição do que foi feito, ou `null` quando o texto não tem a forma esperada. Nunca
 * completa, arredonda para "parecer certo" ou escolhe entre leituras possíveis: valor ambíguo volta
 * com as alternativas e sem normalizado.
 */

export type Normalizacao<T> =
  | { situacao: 'normalizado'; valor: T; descricao: string }
  | { situacao: 'ambiguo'; alternativas: T[]; descricao: string }

// ---------- números e áreas ----------

/**
 * Número no formato brasileiro: vírgula decimal, ponto de milhar em grupos de três ("20.100,00",
 * "1,99", "450"). Ponto sem grupos de três (ex.: "2.5") não é aceito: seria adivinhar o separador.
 */
export function numeroBrasileiro(texto: string): number | null {
  const limpo = texto.trim()
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^\d+(?:,\d+)?$/u.test(limpo)) return null
  return Number(limpo.replace(/\./gu, '').replace(',', '.'))
}

/** Área em m² a partir de "450,00 m²", "20.100,00 m2" ou "2,01 ha". Unidade original preservada. */
export function normalizarArea(bruto: string): Normalizacao<number> | null {
  const match = /^(?<numero>[\d.,]+)\s*(?<unidade>m²|m2|ha)\.?$/iu.exec(bruto.trim())
  const numero = match?.groups?.numero
  const unidade = match?.groups?.unidade?.toLowerCase()
  if (!numero || !unidade) return null
  const valor = numeroBrasileiro(numero)
  if (valor === null) return null
  if (unidade === 'ha') {
    // Arredonda só o erro de ponto flutuante (centésimos de m²); não muda a grandeza.
    const m2 = Math.round(valor * 10000 * 100) / 100
    return { situacao: 'normalizado', valor: m2, descricao: `${numero} ha convertido para m² (1 ha = 10.000 m²)` }
  }
  return { situacao: 'normalizado', valor, descricao: `${numero} m² com vírgula decimal e ponto de milhar` }
}

// ---------- datas ----------

const ISO = (ano: number, mes: number, dia: number) => `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

function dataValida(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return dia <= ultimo
}

/**
 * Data "dia/mês/ano" (barra, ponto ou hífen) para ISO. Ano com dois dígitos é ambíguo (século
 * desconhecido): volta com as duas leituras e sem valor. Data impossível volta `null`.
 */
export function normalizarData(bruto: string): Normalizacao<string> | null {
  const match = /^(?<dia>\d{1,2})(?<sep>[/.-])(?<mes>\d{1,2})\k<sep>(?<ano>\d{2}|\d{4})$/u.exec(bruto.trim())
  if (!match?.groups) return null
  const dia = Number(match.groups.dia)
  const mes = Number(match.groups.mes)
  const anoTexto = match.groups.ano ?? ''
  if (anoTexto.length === 2) {
    const curto = Number(anoTexto)
    const leituras = [2000 + curto, 1900 + curto].filter((ano) => dataValida(ano, mes, dia)).map((ano) => ISO(ano, mes, dia))
    if (leituras.length === 0) return null
    return { situacao: 'ambiguo', alternativas: leituras, descricao: 'ano com dois dígitos: o século não está no documento' }
  }
  const ano = Number(anoTexto)
  if (!dataValida(ano, mes, dia)) return null
  return { situacao: 'normalizado', valor: ISO(ano, mes, dia), descricao: 'data no formato dia/mês/ano' }
}

// ---------- escala, formato, identificadores ----------

/** "1:10.000", "1/10.000", "1:10000" → denominador 10000. */
export function normalizarEscala(bruto: string): Normalizacao<number> | null {
  const match = /^1\s*[:/]\s*(?<denominador>[\d.]+)$/u.exec(bruto.trim())
  const texto = match?.groups?.denominador
  if (!texto) return null
  const valor = numeroBrasileiro(texto)
  if (valor === null || !Number.isInteger(valor) || valor <= 0) return null
  return { situacao: 'normalizado', valor, descricao: 'denominador da escala, sem separador de milhar' }
}

export function normalizarFormato(bruto: string): Normalizacao<string> | null {
  const match = /^a([0-4])$/iu.exec(bruto.trim())
  return match ? { situacao: 'normalizado', valor: `A${match[1] ?? ''}`, descricao: 'formato de folha em maiúscula' } : null
}

/**
 * Identificador (matrícula, inscrição): tira pontos, hífens, barras e espaços, **mantém zeros à
 * esquerda** e letras. "90.417" e "90417" ficam iguais; "07" e "7", não.
 */
export function normalizarIdentificador(bruto: string): Normalizacao<string> | null {
  const valor = bruto.replace(/[.\-/\s]/gu, '').toUpperCase()
  if (!/^[0-9A-Z]+$/u.test(valor)) return null
  return { situacao: 'normalizado', valor, descricao: 'sem separadores; zeros à esquerda mantidos' }
}

/** Lote e quadra: só maiúsculas e sem espaço. Zeros à esquerda mantidos. */
export function normalizarCodigo(bruto: string): Normalizacao<string> | null {
  const valor = bruto.replace(/\s/gu, '').toUpperCase()
  if (!/^[0-9A-Z-]+$/u.test(valor)) return null
  return { situacao: 'normalizado', valor, descricao: 'maiúsculas, sem espaços; zeros à esquerda mantidos' }
}

/**
 * Chave de comparação de texto livre (nome, bairro, assunto): sem acento, sem diferença de caixa
 * nem de espaços. Não é guardada como valor normalizado: só serve para comparar.
 */
export function chaveDeTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/\s*[.,;:]+$/u, '')
}

/** Modalidades reconhecíveis no assunto, sem inventar nenhuma: só as do catálogo do parcelamento. */
const MODALIDADES_NO_ASSUNTO: { padrao: RegExp; modalidade: 'D' | 'R' | 'DM' | 'RET' }[] = [
  { padrao: /\bdesdobro\b/u, modalidade: 'D' },
  { padrao: /\bremembramento\b/u, modalidade: 'R' },
  { padrao: /\bdesmembramento\b/u, modalidade: 'DM' },
  { padrao: /\bretificacao\b/u, modalidade: 'RET' },
]

/**
 * Modalidade que o assunto nomeia. Mais de uma (ex.: "desdobro e remembramento") ou nenhuma:
 * `null` — não se escolhe por posição nem se adivinha o código combinado.
 */
export function modalidadeDoAssunto(assunto: string): 'D' | 'R' | 'DM' | 'RET' | null {
  const chave = chaveDeTexto(assunto)
  const encontradas = MODALIDADES_NO_ASSUNTO.filter((item) => item.padrao.test(chave))
  return encontradas.length === 1 ? (encontradas[0]?.modalidade ?? null) : null
}
