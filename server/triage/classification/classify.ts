import type { Classificacao, ClasseDocumental, Evidencia } from '../../../shared/contracts/triage.ts'
import type { AnexoLido } from '../reading/read.ts'
import { dobrar, regiaoDe, trechoDeEvidencia, type LinhaLida } from '../reading/text.ts'
import { LINHAS_DE_TITULO, SINAIS, type Sinal } from './signals.ts'

/**
 * Classificação documental (E4). Decide pela evidência do conteúdo e da estrutura (tipo real do
 * arquivo, tamanho da folha), nunca pelo nome do arquivo. Cada página é avaliada à parte, para
 * notar PDF com mais de um documento; o anexo não é dividido automaticamente: as outras classes
 * encontradas viram alternativas e o anexo fica marcado como composto.
 *
 * Sem evidência suficiente, a classe é `indeterminada`. Não há classe "por eliminação".
 */

export type ConfiancaClasse = 'alta' | 'media' | 'baixa'

export interface SinalEncontrado {
  classe: ClasseDocumental
  sinal: string
  descricao: string
  peso: number
  pagina: number
  linha: LinhaLida
}

export interface ClassePagina {
  pagina: number
  classe: ClasseDocumental | 'indeterminada'
  confianca: ConfiancaClasse
  pontos: number
}

export interface ClassificacaoDetalhada {
  /** O que vai para o contrato (`Anexo.classificacao`). */
  contrato: Classificacao
  justificativa: string
  porPagina: ClassePagina[]
  /** Indícios de mais de um documento no mesmo arquivo. */
  composto: boolean
  /** Classes com evidência forte em alguma página (a principal e as de páginas compostas). */
  classesComEvidencia: ClasseDocumental[]
  sinais: SinalEncontrado[]
}

/** Pontos mínimos para propor uma classe; precisam incluir um sinal de título. */
const MINIMO = 3
/** Diferença mínima para a segunda classe ficar só como alternativa. */
const MARGEM_ALTA = 3
const MARGEM_MEDIA = 1

/** Folha maior que A4 (em pontos, lado maior): estrutura típica de prancha. */
const LADO_A4 = 842 + 20

function evidenciaDaLinha(anexo: AnexoLido, linha: LinhaLida): Evidencia {
  const regiao = regiaoDe(linha.palavras)
  const ocr = linha.palavras.some((palavra) => palavra.origem === 'ocr')
  const temPagina = anexo.inspecao.tipoReal === 'pdf' || anexo.inspecao.tipoReal === 'jpeg' || anexo.inspecao.tipoReal === 'png'
  return {
    anexoId: anexo.id,
    sha256: anexo.inspecao.sha256,
    ...(temPagina ? { pagina: linha.pagina } : {}),
    ...(temPagina && regiao ? { regioes: [regiao] } : {}),
    trecho: trechoDeEvidencia(linha.texto),
    origem: ocr ? 'ocr' : 'camada-de-texto',
  }
}

function evidenciaDoArquivo(anexo: AnexoLido, trecho: string): Evidencia {
  return { anexoId: anexo.id, sha256: anexo.inspecao.sha256, trecho, origem: 'metadado-arquivo' }
}

function sinaisDaPagina(linhas: readonly LinhaLida[]): SinalEncontrado[] {
  const encontrados: SinalEncontrado[] = []
  const titulo = linhas.slice(0, LINHAS_DE_TITULO)
  const tituloJunto = dobrar(titulo.map((linha) => linha.texto).join(' '))
  for (const { classe, sinais } of SINAIS) {
    for (const sinal of sinais) {
      const achado = procurar(sinal, linhas, titulo, tituloJunto)
      if (achado) encontrados.push({ classe, sinal: sinal.id, descricao: sinal.descricao, peso: sinal.peso, pagina: achado.pagina, linha: achado })
    }
  }
  return encontrados
}

function procurar(sinal: Sinal, linhas: readonly LinhaLida[], titulo: readonly LinhaLida[], tituloJunto: string): LinhaLida | undefined {
  const onde = sinal.onde === 'titulo' ? titulo : linhas
  const linha = onde.find((item) => sinal.padrao.test(dobrar(item.texto)))
  if (linha) return linha
  // Título quebrado em duas linhas (ex.: "DRT 02" numa e "PROJETO" na outra).
  if (sinal.onde === 'titulo' && sinal.padrao.test(tituloJunto)) return titulo[0]
  return undefined
}

interface Placar {
  classe: ClasseDocumental
  pontos: number
  temTitulo: boolean
}

function placar(sinais: readonly SinalEncontrado[], extras: Partial<Record<ClasseDocumental, number>> = {}): Placar[] {
  const porClasse = new Map<ClasseDocumental, Placar>()
  for (const sinal of sinais) {
    const atual = porClasse.get(sinal.classe) ?? { classe: sinal.classe, pontos: 0, temTitulo: false }
    atual.pontos += sinal.peso
    const definicao = SINAIS.find((item) => item.classe === sinal.classe)?.sinais.find((item) => item.id === sinal.sinal)
    if (definicao?.onde === 'titulo' && sinal.peso > 0) atual.temTitulo = true
    porClasse.set(sinal.classe, atual)
  }
  for (const [classe, pontos] of Object.entries(extras) as [ClasseDocumental, number][]) {
    const atual = porClasse.get(classe) ?? { classe, pontos: 0, temTitulo: false }
    atual.pontos += pontos
    porClasse.set(classe, atual)
  }
  return [...porClasse.values()].sort((a, b) => b.pontos - a.pontos)
}

function decidir(ranking: readonly Placar[]): { classe: ClasseDocumental | 'indeterminada'; confianca: ConfiancaClasse; pontos: number } {
  const [primeira, segunda] = ranking
  if (!primeira || primeira.pontos < MINIMO || !primeira.temTitulo) return { classe: 'indeterminada', confianca: 'baixa', pontos: primeira?.pontos ?? 0 }
  const margem = primeira.pontos - (segunda && segunda.pontos > 0 ? segunda.pontos : 0)
  if (margem < MARGEM_MEDIA) return { classe: 'indeterminada', confianca: 'baixa', pontos: primeira.pontos }
  return { classe: primeira.classe, confianca: margem >= MARGEM_ALTA ? 'alta' : 'media', pontos: primeira.pontos }
}

const rebaixar = (confianca: ConfiancaClasse): ConfiancaClasse => (confianca === 'alta' ? 'media' : 'baixa')

function indeterminada(justificativa: string, evidencias: Evidencia[] = [], metodo: Classificacao['metodo'] = 'regra-lexica'): ClassificacaoDetalhada {
  return {
    contrato: { classe: 'indeterminada', confianca: 'baixa', metodo, evidencias, alternativas: [] },
    justificativa,
    porPagina: [],
    composto: false,
    classesComEvidencia: [],
    sinais: [],
  }
}

export function classificarAnexo(anexo: AnexoLido): ClassificacaoDetalhada {
  const { inspecao } = anexo
  if (anexo.legibilidade === 'isolado') return indeterminada('Arquivo isolado por suspeita; não foi aberto nem classificado.')
  if (inspecao.tipoReal === 'dwg' || inspecao.tipoReal === 'dxf') {
    const detalhe = inspecao.detalheTipo ?? inspecao.tipoReal.toUpperCase()
    return {
      contrato: {
        classe: 'cad',
        confianca: inspecao.confiancaTipo === 'alta' ? 'alta' : 'media',
        metodo: 'tipo-de-arquivo',
        evidencias: [evidenciaDoArquivo(anexo, `Conteúdo reconhecido como ${detalhe}`)],
        alternativas: [],
      },
      justificativa: `O conteúdo do arquivo tem a estrutura de desenho CAD (${detalhe}); a classe vem do tipo real, não do nome.`,
      porPagina: [],
      composto: false,
      classesComEvidencia: ['cad'],
      sinais: [],
    }
  }
  if (anexo.legibilidade === 'ilegivel' || anexo.legibilidade === 'nao-interpretado') {
    const motivo = anexo.falha ? ` (${anexo.falha})` : ''
    return indeterminada(`Não foi possível ler o conteúdo${motivo}; sem evidência para classificar.`)
  }
  if (anexo.origemTexto === 'texto-simples') {
    return indeterminada('Arquivo de texto simples, sem estrutura de documento reconhecível.', [evidenciaDoArquivo(anexo, 'Texto simples (sem formato de documento)')])
  }

  const paginas = [...new Set(anexo.linhas.map((linha) => linha.pagina))].sort((a, b) => a - b)
  const porPagina: ClassePagina[] = []
  const todosSinais: SinalEncontrado[] = []
  const grande = (numero: number) => {
    const pagina = anexo.paginas.find((item) => item.pagina === numero)
    return pagina?.larguraPt !== undefined && pagina.alturaPt !== undefined && Math.max(pagina.larguraPt, pagina.alturaPt) > LADO_A4
  }
  for (const numero of paginas) {
    const linhas = anexo.linhas.filter((linha) => linha.pagina === numero)
    const sinais = sinaisDaPagina(linhas)
    todosSinais.push(...sinais)
    const decisao = decidir(placar(sinais, grande(numero) ? { prancha: 1 } : {}))
    porPagina.push({ pagina: numero, ...decisao })
  }

  const decididas = porPagina.filter((item): item is ClassePagina & { classe: ClasseDocumental } => item.classe !== 'indeterminada')
  if (decididas.length === 0) {
    const ranking = placar(todosSinais)
    const candidatas = ranking.filter((item) => item.pontos >= 2).slice(0, 3)
    const justificativa =
      candidatas.length > 0
        ? `Sinais insuficientes ou empatados: ${candidatas.map((item) => `${item.classe} (${item.pontos})`).join(', ')}.`
        : 'Nenhum título ou campo característico de classe documental foi encontrado no texto lido.'
    const evidencias = todosSinais.slice(0, 4).map((sinal) => evidenciaDaLinha(anexo, sinal.linha))
    const detalhada = indeterminada(justificativa, evidencias)
    detalhada.contrato.alternativas = candidatas.map((item) => ({ classe: item.classe, confianca: 'baixa' as const }))
    detalhada.porPagina = porPagina
    detalhada.sinais = todosSinais
    return detalhada
  }

  // Classe do anexo: a da primeira página decidida. Outras classes fortes em outras páginas
  // indicam documento composto (não há divisão automática).
  const [principal] = decididas
  if (!principal) throw new Error('inalcançável')
  const outras = [...new Set(decididas.filter((item) => item.classe !== principal.classe && item.confianca === 'alta').map((item) => item.classe))]
  const composto = outras.length > 0

  const sinaisPrincipais = todosSinais.filter((sinal) => sinal.classe === principal.classe && sinal.peso > 0)
  const ranking = placar(todosSinais)
  const alternativas = ranking
    .filter((item) => item.classe !== principal.classe && item.pontos >= 2 && item.temTitulo)
    .map((item) => ({ classe: item.classe, confianca: outras.includes(item.classe) ? ('media' as const) : ('baixa' as const) }))
  for (const classe of outras) if (!alternativas.some((item) => item.classe === classe)) alternativas.push({ classe, confianca: 'media' })

  let confianca = principal.confianca
  const lidoPorOcr = anexo.origemTexto === 'ocr' || anexo.linhas.some((linha) => linha.palavras.some((palavra) => palavra.origem === 'ocr'))
  if (anexo.legibilidade === 'parcial') confianca = rebaixar(confianca)
  if (composto) confianca = rebaixar(confianca)

  const descricoes = [...new Set(sinaisPrincipais.map((sinal) => sinal.descricao))]
  const partes = [`${descricoes.join('; ')} (${principal.pontos} pontos, página ${principal.pagina})`]
  if (grande(principal.pagina) && principal.classe === 'prancha') partes.push('folha maior que A4')
  const descartadas = ranking.filter((item) => item.classe !== principal.classe && item.pontos > 0).slice(0, 2)
  if (descartadas.length > 0) partes.push(`alternativas com menos evidência: ${descartadas.map((item) => `${item.classe} (${item.pontos})`).join(', ')}`)
  if (composto) partes.push(`outras páginas parecem ser ${outras.join(', ')}: possível documento composto, sem divisão automática`)
  if (lidoPorOcr) partes.push(`texto lido por OCR${anexo.confiancaOcr !== undefined ? ` (confiança média ${anexo.confiancaOcr})` : ''}`)

  return {
    contrato: {
      classe: principal.classe,
      confianca,
      metodo: 'regra-lexica',
      evidencias: dedupe(sinaisPrincipais.map((sinal) => evidenciaDaLinha(anexo, sinal.linha))).slice(0, 5),
      alternativas,
    },
    justificativa: `${principal.classe}: ${partes.join('; ')}.`,
    porPagina,
    composto,
    classesComEvidencia: [principal.classe, ...outras],
    sinais: todosSinais,
  }
}

function dedupe(evidencias: Evidencia[]): Evidencia[] {
  const vistas = new Set<string>()
  return evidencias.filter((evidencia) => {
    const chave = `${evidencia.pagina ?? ''}|${evidencia.trecho ?? ''}`
    if (vistas.has(chave)) return false
    vistas.add(chave)
    return true
  })
}
