import { CircleCheck, CircleHelp, FileQuestion, ScanSearch, UserCheck, type LucideIcon } from 'lucide-react'
import type { Avaliacao, TriagemResumo } from './types'

/**
 * Como a interface apresenta os resultados. Sem pontuação, sem "aprovado", "irregular" ou
 * "reprovado": cada verificação cai numa de cinco categorias, sempre com ícone, rótulo e texto
 * (a cor nunca é o único indicador).
 */

export type Categoria = 'problema' | 'nao-localizado' | 'inconclusiva' | 'depende-humano' | 'sem-achado'

export interface CategoriaInfo {
  rotulo: string
  /** Frase curta que explica a categoria para quem não é de tecnologia. */
  explicacao: string
  icon: LucideIcon
  /** Classes de cor (tokens) do selo; sempre acompanhadas de ícone e rótulo. */
  classe: string
}

export const categorias: Record<Categoria, CategoriaInfo> = {
  problema: {
    rotulo: 'Possível problema identificado',
    explicacao: 'O sistema encontrou algo para conferir, como uma divergência entre documentos ou um formato fora do esperado.',
    icon: ScanSearch,
    classe: 'border-deletion-line bg-deletion-bg text-deletion',
  },
  'nao-localizado': {
    rotulo: 'Não localizado nos anexos examinados',
    explicacao: 'O documento ou a informação não foi encontrado entre os anexos recebidos. Isso só é apontado com o pacote confirmado como completo.',
    icon: FileQuestion,
    classe: 'border-modification-line bg-modification-bg text-modification',
  },
  inconclusiva: {
    rotulo: 'Verificação inconclusiva',
    explicacao: 'Não foi possível concluir: leitura incerta, documento ilegível ou pacote sem confirmação de completude.',
    icon: CircleHelp,
    classe: 'border-line-strong bg-surface-sunken text-ink',
  },
  'depende-humano': {
    rotulo: 'Depende de confirmação humana',
    explicacao: 'A verificação precisa de uma conferência ou confirmação do servidor (ex.: prazo, assinatura, enquadramento).',
    icon: UserCheck,
    classe: 'border-move-line bg-move-bg text-move',
  },
  'sem-achado': {
    rotulo: 'Verificada sem achado',
    explicacao: 'A verificação foi feita e não encontrou nada a apontar. Não significa aprovação.',
    icon: CircleCheck,
    classe: 'border-addition-line bg-addition-bg text-addition',
  },
}

export const ordemCategorias: readonly Categoria[] = ['problema', 'nao-localizado', 'depende-humano', 'inconclusiva', 'sem-achado']

export function categoriaDe(avaliacao: Pick<Avaliacao, 'resultado' | 'tipo'>): Categoria {
  switch (avaliacao.resultado) {
    case 'achado':
      if (avaliacao.tipo === 'nao-localizado') return 'nao-localizado'
      if (avaliacao.tipo === 'condicao-indeterminada') return 'depende-humano'
      return 'problema'
    case 'condicao-pendente':
      return 'depende-humano'
    case 'nao-avaliavel':
      return 'inconclusiva'
    case 'sem-achado':
    case 'nao-aplicavel':
      return 'sem-achado'
  }
}

/** Achado é o que pede revisão humana (confirmar, descartar ou encaminhar). */
export const pedeRevisao = (avaliacao: Pick<Avaliacao, 'resultado'>) => avaliacao.resultado === 'achado'

export const resultadoRotulo: Record<Avaliacao['resultado'], string> = {
  achado: 'Achado para revisão',
  'sem-achado': 'Sem achado',
  'nao-avaliavel': 'Não avaliável',
  'condicao-pendente': 'Aguardando confirmação do servidor',
  'nao-aplicavel': 'Não se aplica a este processo',
}

export const tipoRotulo: Record<NonNullable<Avaliacao['tipo']>, string> = {
  'nao-localizado': 'não localizado',
  ilegivel: 'ilegível',
  'formato-incompativel': 'formato incompatível',
  divergencia: 'divergência entre documentos',
  'condicao-indeterminada': 'conferência humana necessária',
}

export const confiancaRotulo: Record<'alta' | 'media' | 'baixa', string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

export const severidadeRotulo: Record<Avaliacao['severidade'], string> = {
  critical: 'crítica',
  major: 'alta',
  minor: 'baixa',
  review: 'revisão',
  none: 'nenhuma',
}

/** Situação do processo, com a última análise quando ela explica (interrompida, falhou). */
export function situacaoDe(resumo: Pick<TriagemResumo, 'situacao' | 'ultimaAnalise'>): { rotulo: string; tom: 'andamento' | 'atencao' | 'concluido' | 'neutro' } {
  if (resumo.situacao === 'processando') return { rotulo: 'Processando', tom: 'andamento' }
  if (resumo.situacao === 'recebido') return { rotulo: 'Recebido', tom: 'andamento' }
  if (resumo.situacao === 'aguardando-revisao') return { rotulo: 'Aguardando revisão', tom: 'atencao' }
  if (resumo.situacao === 'revisado') return { rotulo: 'Revisado', tom: 'concluido' }
  if (resumo.ultimaAnalise?.situacao === 'interrompida') return { rotulo: 'Interrompido', tom: 'atencao' }
  return { rotulo: 'Falhou', tom: 'atencao' }
}

export const modalidadeRotulo: Record<string, string> = {
  D: 'Desdobro',
  R: 'Remembramento',
  DM: 'Desmembramento',
  'R/D': 'Remembramento e desdobro',
  'D/R': 'Desdobro e remembramento',
  RET: 'Retificação',
  L1: 'Loteamento (L1)',
  L2: 'Loteamento (L2)',
  L3: 'Loteamento (L3)',
  L4: 'Loteamento (L4)',
  L6: 'Loteamento (L6)',
  L7: 'Loteamento (L7)',
  indeterminado: 'Indeterminada',
}

export const etapaRotulo: Record<string, string> = {
  abertura: 'Abertura',
  analise: 'Análise',
  'pos-analise': 'Pós-análise',
  'pos-decisao': 'Pós-decisão',
  indeterminado: 'Indeterminada',
}

export const classeRotulo: Record<string, string> = {
  requerimento: 'Requerimento',
  'drt-01': 'DRT 01',
  'drt-02-projeto': 'DRT 02 de projeto',
  'drt-02-implantacao': 'DRT 02 de implantação',
  'drt-03': 'DRT 03',
  'matricula-transcricao': 'Matrícula ou transcrição',
  'inscricao-imobiliaria': 'Inscrição imobiliária',
  'art-rrt-similar': 'ART, RRT ou similar',
  prancha: 'Prancha',
  cad: 'Desenho CAD',
  memorial: 'Memorial descritivo',
  'gdu-gdr': 'GDU/GDR',
  representacao: 'Documento de representação',
  outro: 'Outro documento',
  indeterminada: 'Classe indeterminada',
}

export const campoRotulo: Record<string, string> = {
  assunto: 'Assunto',
  lote: 'Lote',
  quadra: 'Quadra',
  parcelamento: 'Parcelamento',
  bairro: 'Bairro',
  matricula: 'Matrícula',
  cartorio: 'Cartório',
  inscricao: 'Inscrição imobiliária',
  titular: 'Titular',
  signatario: 'Signatário',
  'rt-nome': 'Responsável técnico',
  'rt-registro': 'Registro profissional',
  'data-emissao': 'Data de emissão',
  'data-revisao': 'Data de revisão',
  area: 'Área',
  'escala-situacao': 'Escala da planta de situação',
  'formato-folha': 'Formato da folha',
}

export const estadoCampoRotulo: Record<string, string> = {
  encontrado: 'Encontrado',
  'nao-encontrado': 'Não encontrado neste anexo',
  ilegivel: 'Leitura incerta',
  'varios-valores': 'Mais de um valor',
  'nao-aplicavel': 'Não se aplica',
}

export const decisaoRotulo: Record<string, string> = {
  confirmado: 'Achado confirmado',
  descartado: 'Achado descartado',
  encaminhado: 'Encaminhado',
  corrigido: 'Campo corrigido',
}

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

export const formatarDataHora = (iso: string | null | undefined) => (iso ? dataHora.format(new Date(iso)) : '—')
export const formatarData = (iso: string | null | undefined) => (iso ? data.format(new Date(iso)) : '—')

/** Identificador curto do processo para exibir (o id completo fica no endereço). */
export const idCurto = (id: string) => id.slice(0, 8).toUpperCase()
