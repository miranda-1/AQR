import type { PropostaModelo, RegiaoIa, SugestaoVerificada } from '../../../shared/contracts/triage-ia.ts'
import type { ClasseDocumental } from '../../../shared/contracts/triage.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { dobrar, type LinhaLida } from '../reading/text.ts'
import { dirigidaAMaquina } from './dirigida-a-maquina.ts'
import { verificarProposta } from './verificacao.ts'

/**
 * Verificação de CLASSE das sugestões (E11.3.1), determinística e independente do que o modelo
 * declara (classe, confiança, justificativa). Roda depois da E11.0, que continua valendo e que só
 * conferia se o trecho citado existia na região citada: qualquer classe, com qualquer linha,
 * passava (no IA-3, dois cadastros imobiliários foram aceitos como certidão de matrícula porque o
 * modelo citou "Lote…, quadra…" e o corpo mencionava "Matrícula").
 *
 * A classe proposta só é aceita com evidência do próprio documento, nesta página:
 * 1. TÍTULO da classe na zona de título (primeiras linhas, no alto da folha) E pelo menos um
 *    elemento ESTRUTURAL típico dela no corpo (certidão: registro R-/AV-, livro, oficial, "certifico";
 *    cadastro: inscrição, contribuinte, IPTU, valor venal; memorial: confrontações, medidas…);
 *    título sozinho não basta;
 * 2. ou, sem título de nenhuma classe, estrutura da classe com margem clara (2 elementos a mais
 *    que qualquer outra classe).
 * Abstém-se quando: a zona de título traz título de OUTRA classe (título manipulado, página com
 * dois documentos); outra classe tem estrutura mais forte; a evidência é insuficiente. "Outro" só
 * com evidência positiva de documento fora do catálogo (boleto, comprovante…), nunca por
 * eliminação. "cad" não é verificável por texto. A linha que o modelo citou precisa conter
 * evidência da classe proposta. Linhas dirigidas à máquina não contam. Com uma leitura visual
 * independente da página (OCR da página desenhada), só conta o texto que de fato aparece na folha:
 * texto invisível ou escondido sob outro não serve de evidência.
 *
 * Vocabulário de tipos de documento, não de casos; nenhuma regra normativa.
 */

export const VERIFICACAO_CLASSE_VERSAO = 'verificacao-classe@1'

export const motivosClasse = [
  'titulo-e-estrutura-conferem',
  'estrutura-sem-titulo-confere',
  'titulo-de-outra-classe',
  'estrutura-de-outra-classe',
  'titulo-sem-estrutura',
  'evidencia-insuficiente',
  'citacao-sem-evidencia-da-classe',
  'classe-nao-verificavel-por-texto',
  'outro-sem-evidencia-positiva',
] as const
export type MotivoClasse = (typeof motivosClasse)[number]

export interface VerificacaoClasse {
  versao: typeof VERIFICACAO_CLASSE_VERSAO
  e110: SugestaoVerificada
  situacao: SugestaoVerificada['situacao']
  motivo: SugestaoVerificada['motivo'] | MotivoClasse
  /** Classes com título e quantidade de elementos estruturais achados na página (para auditoria). */
  evidencia: { titulos: ClasseDocumental[]; estrutura: Partial<Record<ClasseDocumental, number>> } | null
}

export interface OpcoesClasse {
  /** Segunda leitura das páginas digitalizadas (substitui o OCR do motor como evidência). */
  segundaLeitura?: ReadonlyMap<number, readonly LinhaLida[]>
  /** Leitura visual independente das páginas com camada de texto (o que aparece na folha). */
  leituraVisivel?: ReadonlyMap<number, readonly LinhaLida[]>
}

interface Perfil {
  titulo: readonly RegExp[]
  estrutura: readonly RegExp[]
}

const DRT: readonly RegExp[] = [/\bdeclaracao de responsabilidade tecnica\b/u, /\bdeclar[oa]\b/u, /\bresponsavel tecnic[oa]\b/u, /\b(crea|cau|cft)\b/u, /\bregistro profissional\b/u]

export const PERFIS: Record<ClasseDocumental, Perfil> = {
  requerimento: {
    titulo: [/\brequerimento\b/u, /^\W*pedido de\b/u, /^\W*solicitacao de\b/u],
    estrutura: [/\brequer\w*/u, /\bsolicit\w*/u, /\binteressad[oa]\b/u, /\bassunto\b/u, /\bnestes termos\b/u, /\bpede deferimento\b/u, /\bvem (respeitosamente )?(a presenca|requerer|solicitar)\b/u, /\b(ilustrissim\w*|senhora? secretari\w*)/u, /\brequerente\b/u],
  },
  'drt-01': { titulo: [/\bdrt\W{0,3}0?1\b/u], estrutura: DRT },
  'drt-02-projeto': { titulo: [/\bdrt\W{0,3}0?2\b.{0,40}\bprojeto\b/u], estrutura: DRT },
  'drt-02-implantacao': { titulo: [/\bdrt\W{0,3}0?2\b.{0,40}\bimplanta/u], estrutura: DRT },
  'drt-03': { titulo: [/\bdrt\W{0,3}0?3\b/u], estrutura: DRT },
  'matricula-transcricao': {
    titulo: [/\bcertidao\b.{0,30}\b(matricula|inteiro teor|onus|registro)\b/u, /\b(ficha|matricula)\b.{0,30}\bregistro de imoveis\b/u, /\btraslado\b/u, /\btranscricao\b/u, /\bregistro de imoveis\b/u, /\bficha de (registro|matricula)\b/u],
    estrutura: [/\b(r|av)[\s.-]?\d{1,3}\b/u, /\blivro\b/u, /\boficial (de|do) registro\b|\boficial registrador\b/u, /\bregistro de imoveis\b|\bservico registral\b|\bcartorio\b/u, /\bcertifico\b|\bdou fe\b/u, /\binteiro teor\b/u, /\btransmitente|adquirente\b/u, /\b(abertura|aberta) (da|em)\b|\bmatricula aberta\b/u, /\bexpedid[oa] em\b/u, /\bregistro geral\b/u, /\bonus reais\b/u],
  },
  'inscricao-imobiliaria': {
    titulo: [/\b(espelho|boletim|ficha|extrato)\b.{0,20}\bcadastr\w*/u, /\bcadastro (imobiliario|territorial|fiscal)\b/u, /\biptu\b/u, /\binscricao (imobiliaria|cadastral)\b/u],
    estrutura: [/\binscricao\b/u, /\bcadastr\w*/u, /\bcontribuinte\b/u, /\biptu\b/u, /\bvalor venal\b/u, /\barea (edificada|construida)\b/u, /\bexercicio\b/u, /\blancamento\b/u, /\bcodigo do imovel\b/u, /\btestada\b/u],
  },
  'art-rrt-similar': {
    titulo: [/\banotacao de responsabilidade tecnica\b/u, /\bregistro de responsabilidade tecnica\b/u, /\btermo de responsabilidade tecnica\b/u, /^\W*(art|rrt|trt)\b/u, /\b(art|rrt|trt)\s*(n|no|numero)\b/u],
    estrutura: [/\b(crea|cau|cft|confea)\b/u, /\bcontratante\b/u, /\bcontratad[oa]\b/u, /\batividade tecnica\b/u, /\b(art|rrt|trt)\s*(n|no|numero)\b/u, /\bprofissional\b/u, /\bhonorarios\b|\bvalor do contrato\b/u],
  },
  prancha: {
    titulo: [/\bprancha\b/u, /^\W*planta\b/u, /^\W*projeto (de|do|arquitetonico)\b/u, /\blevantamento planialtimetrico\b/u],
    estrutura: [/\bescala\s*1\s*:\s*\d/u, /\bquadro de areas\b/u, /\bfolha\s*\d+\s*\/\s*\d+|\bprancha\s*\d+/u, /\bsituacao\b|\blocacao\b/u, /\bcotas?\b/u, /\blegenda\b/u, /\bcarimbo\b/u, /\bdesenh\w*/u],
  },
  cad: { titulo: [], estrutura: [] },
  memorial: {
    titulo: [/\bmemorial\b/u],
    estrutura: [/\bconfront\w*/u, /\bfrente\b|\bfundos\b|\blateral (direita|esquerda)\b|\blado (direito|esquerdo)\b/u, /\bmede\b|\bmedindo\b|\bmedem\b/u, /\bdescricao\b|\bdescritiv\w*/u, /\bperimetr\w*/u, /\brumo\b|\bazimute\b|\bvertice\b/u, /\barea (do lote|do terreno|total)\b|\bsuperficie\b/u, /\bresponsavel tecnic[oa]\b/u],
  },
  'gdu-gdr': {
    titulo: [/\bguia de diretrizes\b/u, /\b(gdu|gdr)\b/u, /\bdiretrizes urbanisticas\b/u],
    estrutura: [/\bdiretriz\w*/u, /\bzona\b|\bzoneamento\b/u, /\buso do solo\b/u, /\brecuo\w*/u, /\btaxa de ocupacao\b/u, /\bcoeficiente de aproveitamento\b/u],
  },
  representacao: {
    titulo: [/\bprocuracao\b/u, /\bsubstabelecimento\b/u, /\bcarta de preposicao\b/u, /\btermo de representacao\b/u],
    estrutura: [/\boutorgante\b/u, /\boutorgad[oa]\b/u, /\bpoderes\b/u, /\brepresent\w*/u, /\bsubstabelec\w*/u, /\bconstitui\w*/u, /\bprocurador\w*/u],
  },
  outro: {
    titulo: [/\bboleto\b/u, /\bguia de (recolhimento|arrecadacao|pagamento)\b|\bdocumento de arrecadacao\b/u, /\bcomprovante\b/u, /\brecibo\b/u, /\bnota fiscal\b/u, /\bfatura\b/u, /\bcertidao negativa\b/u],
    estrutura: [/\bvencimento\b/u, /\bvalor (a pagar|total|cobrado|pago)\b|\br\$\s*\d/u, /\bcodigo de barras\b|\blinha digitavel\b/u, /\bpagador\b|\bsacado\b|\bbeneficiario\b/u, /\bautenticacao\b/u, /\bpagamento\b/u],
  },
}

const CLASSES = Object.keys(PERFIS) as ClasseDocumental[]

/** Classes que compartilham a mesma estrutura: só o título decide entre elas. */
const FAMILIA: Partial<Record<ClasseDocumental, string>> = { 'drt-01': 'drt', 'drt-02-projeto': 'drt', 'drt-02-implantacao': 'drt', 'drt-03': 'drt' }
const mesmaFamilia = (a: ClasseDocumental, b: ClasseDocumental) => FAMILIA[a] !== undefined && FAMILIA[a] === FAMILIA[b]

// ---------- leitura usada e visibilidade ----------

function sobrepoe(a: RegiaoIa, b: RegiaoIa, margem: number): boolean {
  return a.x < b.x + b.width + margem && a.x + a.width > b.x - margem && a.y < b.y + b.height + margem && a.y + a.height > b.y - margem
}

function regiaoDaLinha(linha: LinhaLida): RegiaoIa | null {
  const rs = linha.palavras.flatMap((p) => (p.regiao ? [p.regiao] : []))
  if (rs.length === 0) return null
  const x = Math.min(...rs.map((r) => r.x))
  const y = Math.min(...rs.map((r) => r.y))
  return { x, y, width: Math.max(...rs.map((r) => r.x + r.width)) - x, height: Math.max(...rs.map((r) => r.y + r.height)) - y }
}

const tokens = (texto: string) => new Set(dobrar(texto).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2))

/**
 * Linha da camada de texto que APARECE na folha: a leitura visual tem, no mesmo lugar, metade ou
 * mais das palavras dela. Texto branco, minúsculo, fora da folha ou coberto por outro não passa.
 */
export function linhaVisivel(linha: LinhaLida, visual: readonly LinhaLida[]): boolean {
  const regiao = regiaoDaLinha(linha)
  const esperadas = tokens(linha.texto)
  if (!regiao || esperadas.size === 0) return false
  const vistas = new Set<string>()
  for (const outra of visual) {
    const r = regiaoDaLinha(outra)
    if (r && sobrepoe(regiao, r, 0.01)) for (const t of tokens(outra.texto)) vistas.add(t)
  }
  let comuns = 0
  for (const t of esperadas) if (vistas.has(t)) comuns += 1
  return comuns / esperadas.size >= 0.5
}

/** Linhas da página usadas como evidência: segunda leitura (digitalizada) ou só as visíveis (texto). */
export function linhasDeEvidencia(anexo: AnexoTriado, pagina: number, opcoes: OpcoesClasse): LinhaLida[] {
  const metodo = anexo.lido.paginas.find((p) => p.pagina === pagina)?.metodo
  const segunda = metodo !== 'camada-de-texto' ? opcoes.segundaLeitura?.get(pagina) : undefined
  let linhas: LinhaLida[] = segunda ? [...segunda] : anexo.lido.linhas.filter((l) => l.pagina === pagina)
  const visual = metodo === 'camada-de-texto' ? opcoes.leituraVisivel?.get(pagina) : undefined
  if (visual) linhas = linhas.filter((l) => linhaVisivel(l, visual))
  return linhas.filter((l) => !dirigidaAMaquina(l.texto))
}

// ---------- evidência ----------

/**
 * Zona de título: até 4 linhas no alto da folha com cara de cabeçalho. Linha com número longo ou no
 * formato "rótulo: valor" é corpo, não título ("Inscrição cadastral 3030…" não é o título do documento).
 */
function zonaDeTitulo(linhas: readonly LinhaLida[]): LinhaLida[] {
  // Contígua: do alto da folha até a primeira linha de corpo (a quebra de uma frase do corpo, ou de
  // uma instrução, não volta a ser título depois).
  const zona: LinhaLida[] = []
  for (const l of linhas) {
    if (!/\p{L}{3,}/u.test(l.texto)) continue
    const r = regiaoDaLinha(l)
    const cabecalho = !/\d{3,}/u.test(l.texto) && !/:\s*\S/u.test(l.texto) && l.texto.length <= 90 && (r === null || r.y < 0.35)
    if (!cabecalho || zona.length >= 4) break
    zona.push(l)
  }
  return zona
}

/** O tipo do documento vem no começo da linha de título (nas 6 primeiras palavras), não no meio de uma frase. */
function tituloDaClasse(linha: string, padroes: readonly RegExp[]): boolean {
  const palavras = linha.split(' ')
  const limite = palavras.slice(0, 6).join(' ').length
  return padroes.some((p) => {
    const casou = p.exec(linha)
    return casou !== null && casou.index <= limite
  })
}

export function evidenciaDaPagina(linhas: readonly LinhaLida[]): { titulos: ClasseDocumental[]; estrutura: Partial<Record<ClasseDocumental, number>> } {
  const titulo = zonaDeTitulo(linhas).map((l) => dobrar(l.texto))
  const corpo = linhas.map((l) => dobrar(l.texto))
  const titulos: ClasseDocumental[] = []
  const estrutura: Partial<Record<ClasseDocumental, number>> = {}
  for (const classe of CLASSES) {
    const perfil = PERFIS[classe]
    if (titulo.some((t) => tituloDaClasse(t, perfil.titulo))) titulos.push(classe)
    const n = perfil.estrutura.filter((p) => corpo.some((t) => p.test(t))).length
    if (n > 0) estrutura[classe] = n
  }
  return { titulos, estrutura }
}

function resultado(e110: SugestaoVerificada, situacao: VerificacaoClasse['situacao'], motivo: VerificacaoClasse['motivo'], evidencia: VerificacaoClasse['evidencia']): VerificacaoClasse {
  return { versao: VERIFICACAO_CLASSE_VERSAO, e110, situacao, motivo, evidencia }
}

export function verificarClasseProposta(proposta: PropostaModelo, anexos: readonly AnexoTriado[], opcoes: OpcoesClasse = {}): VerificacaoClasse {
  const e110 = verificarProposta(proposta, anexos)
  if (proposta.tipo !== 'classe') return resultado(e110, e110.situacao, e110.motivo, null)
  const anexo = anexos.find((a) => a.lido.id === proposta.anexoId)
  // A E11.0 continua mandando: o que ela recusa ou deixa como hipótese não é promovido aqui, com uma
  // exceção: em página digitalizada COM segunda leitura, as recusas que dependem só do texto do OCR
  // do motor são decididas pela evidência da segunda leitura (com as mesmas exigências abaixo).
  const digitalizada = anexo?.lido.paginas.find((p) => p.pagina === proposta.pagina)?.metodo !== 'camada-de-texto'
  const sobreponivel = digitalizada && opcoes.segundaLeitura?.has(proposta.pagina) && ['trecho-nao-confere', 'fundamento-textual-sem-texto', 'sem-texto-na-regiao-hipotese-visual'].includes(e110.motivo)
  if (!anexo || (e110.situacao !== 'verificada' && !sobreponivel)) return resultado(e110, e110.situacao, e110.motivo, null)
  const classe = proposta.classe
  if (classe === 'cad') return resultado(e110, 'recusada', 'classe-nao-verificavel-por-texto', null)

  const linhas = linhasDeEvidencia(anexo, proposta.pagina, opcoes)
  const evidencia = evidenciaDaPagina(linhas)
  const propria = evidencia.estrutura[classe] ?? 0
  const outras = CLASSES.filter((k) => k !== classe && !mesmaFamilia(k, classe))
  const maiorOutra = Math.max(0, ...outras.map((k) => evidencia.estrutura[k] ?? 0))
  const titulosOutros = evidencia.titulos.filter((k) => k !== classe)
  const temTitulo = evidencia.titulos.includes(classe)

  if (titulosOutros.length > 0) return resultado(e110, 'recusada', 'titulo-de-outra-classe', evidencia)
  if (maiorOutra >= 2 && maiorOutra >= propria) return resultado(e110, 'recusada', 'estrutura-de-outra-classe', evidencia)

  // A linha citada pelo modelo precisa conter evidência da classe proposta.
  // A citação pode ter várias regiões (até 3 linhas): basta uma delas trazer evidência da classe.
  const perfil = PERFIS[classe]
  const linhaCitada = linhas.filter((l) => {
    const r = regiaoDaLinha(l)
    return r !== null && proposta.regioes.some((citada) => citada.width * citada.height >= 0.0001 && sobrepoe(r, citada, 0.004))
  })
  const citacaoBoa = linhaCitada.some((l) => [...perfil.titulo, ...perfil.estrutura].some((p) => p.test(dobrar(l.texto))))

  if (temTitulo) {
    if (propria < 1) return resultado(e110, 'recusada', classe === 'outro' ? 'outro-sem-evidencia-positiva' : 'titulo-sem-estrutura', evidencia)
    if (!citacaoBoa) return resultado(e110, 'recusada', 'citacao-sem-evidencia-da-classe', evidencia)
    return resultado(e110, 'verificada', 'titulo-e-estrutura-conferem', evidencia)
  }
  if (classe === 'outro') return resultado(e110, 'recusada', 'outro-sem-evidencia-positiva', evidencia)
  // Subtipo de uma família (DRT 01/02/03) sem título: a estrutura não diz qual é.
  if (FAMILIA[classe]) return resultado(e110, 'recusada', 'evidencia-insuficiente', evidencia)
  if (evidencia.titulos.length === 0 && propria >= 2 && propria >= maiorOutra + 2) {
    if (!citacaoBoa) return resultado(e110, 'recusada', 'citacao-sem-evidencia-da-classe', evidencia)
    return resultado(e110, 'verificada', 'estrutura-sem-titulo-confere', evidencia)
  }
  return resultado(e110, 'recusada', 'evidencia-insuficiente', evidencia)
}
