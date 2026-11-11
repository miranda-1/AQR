import { createHash } from 'node:crypto'
import { z } from 'zod'
import { classeDocumentalSchema, estadosCampo, nomeCampoSchema, type ClasseDocumental, type NomeCampo } from '../../../shared/contracts/triage.ts'
import { buildPdf } from '../../comparison/evaluation/corpus-pdf.ts'
import { dwgFicticio, imagemAvulsa, paginaDeTexto, pdfDigitalizado, type TextoDaPeca } from './documents.ts'
import { expectativaRegraSchema, type ExpectativaRegra } from './gabarito.ts'
import { PROTOCOLADO_EM } from './generate.ts'

/**
 * Conjunto de VALIDAÇÃO da triagem (E4–E6), separado do corpus de desenvolvimento (DSD-01 a 48).
 *
 * Escrito antes da extração e do motor de regras, com outros modelos de texto (rótulos, ordem,
 * caixa, siglas e unidades diferentes), outros dados fictícios e situações que o corpus de
 * desenvolvimento não tem: PDF com dois documentos, DRT 02 de projeto e de implantação, RRT,
 * extrato de IPTU que cita a matrícula, declaração técnica que não é ART, matrícula com vários
 * atos de transmissão, área em hectares, zeros à esquerda, datas com ponto, procuração em imagem.
 *
 * O gabarito diz o que cada arquivo É e o que um servidor esperaria de cada regra, sem consultar
 * o comportamento do motor. Não deve ser ajustado para acompanhar o motor; erro do motor aqui é
 * resultado a relatar.
 */

const ESTADOS = z.enum(estadosCampo)

export const gabaritoValidacaoAnexoSchema = z.strictObject({
  nome: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/u),
  /** Classe do arquivo; `null` quando não há documento legível. */
  classe: classeDocumentalSchema.nullable(),
  /** Todas as classes presentes no arquivo (documento composto). */
  classesNoArquivo: z.array(classeDocumentalSchema),
  leitura: z.enum(['camada-de-texto', 'ocr', 'nao-interpretado']),
  /** Valores como impressos. */
  campos: z.partialRecord(nomeCampoSchema, z.string()),
  /** Estado esperado quando não é simplesmente "encontrado" (ex.: titular com vários valores). */
  estados: z.partialRecord(nomeCampoSchema, ESTADOS),
  /** Valor normalizado esperado, quando o teste é a normalização. */
  normalizados: z.partialRecord(nomeCampoSchema, z.union([z.string(), z.number()])),
})
export type GabaritoValidacaoAnexo = z.infer<typeof gabaritoValidacaoAnexoSchema>

export const gabaritoValidacaoSchema = z.strictObject({
  id: z.string().regex(/^VAL-\d{2}$/u),
  titulo: z.string().min(1),
  entrada: z.strictObject({
    modalidade: z.literal('D'),
    etapa: z.literal('abertura'),
    protocoladoEm: z.iso.datetime(),
    integridadeDoPacote: z.enum(['completo', 'parcial', 'desconhecida']),
    condicoesConfirmadas: z.array(z.strictObject({ id: z.string(), valor: z.boolean() })),
  }),
  anexos: z.array(gabaritoValidacaoAnexoSchema),
  regras: z.record(z.string().regex(/^AQR-GCA-\d{3}$/u), expectativaRegraSchema),
})
export type GabaritoValidacao = z.infer<typeof gabaritoValidacaoSchema>

export interface PacoteValidacao {
  gabarito: GabaritoValidacao
  arquivos: { nome: string; bytes: Uint8Array }[]
}

// ---------- dados fictícios da validação (diferentes do corpus de desenvolvimento) ----------

const V = {
  titular: 'Marta Exemplar Inventada',
  rtNome: 'Lucas Arquiteto Ficticio',
  rtRegistro: 'CAU-FIC A000002-0',
  lote: '07',
  quadra: '03',
  parcelamento: 'Vila Imaginaria',
  bairro: 'Centro Ficticio',
  matricula: '012345',
  cartorio: 'Registro de Imóveis da 1ª Circunscrição Fictícia',
  inscricao: '0101.0202.0303',
  area: '600,00 m²',
  emissao: '15/10/2026',
  revisao: '12/05/2026',
}
type Dados = typeof V

// ---------- modelos de texto ----------

interface Peca {
  texto: TextoDaPeca
  classe: ClasseDocumental
  estados?: Partial<Record<NomeCampo, (typeof estadosCampo)[number]>>
  normalizados?: Partial<Record<NomeCampo, string | number>>
}

function requerimento(d: Dados, opcoes: { assunto?: string; rotuloAssunto?: string; signatario?: string; qualidade?: string } = {}): Peca {
  const assunto = opcoes.assunto ?? 'Desdobro'
  const signatario = opcoes.signatario ?? d.titular
  return {
    classe: 'requerimento',
    texto: {
      titulo: 'Requerimento',
      linhas: [
        `${opcoes.rotuloAssunto ?? 'ASSUNTO'}: ${assunto}`,
        `Proprietário: ${d.titular}`,
        `Imóvel: Lote: ${d.lote}   Quadra: ${d.quadra}   Bairro: ${d.bairro}`,
        `Parcelamento: ${d.parcelamento}`,
        `Matrícula nº ${d.matricula}   Inscrição imobiliária: ${d.inscricao}`,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
        `Assina este requerimento: ${signatario}, na qualidade de ${opcoes.qualidade ?? 'proprietária'}.`,
      ],
      campos: {
        assunto,
        titular: d.titular,
        lote: d.lote,
        quadra: d.quadra,
        bairro: d.bairro,
        parcelamento: d.parcelamento,
        matricula: d.matricula,
        inscricao: d.inscricao,
        'rt-nome': d.rtNome,
        'rt-registro': d.rtRegistro,
        signatario,
      },
      assinaturas: ['Assinatura do(a) requerente'],
    },
  }
}

function drt(d: Dados, numero: '01' | '02' | '03', tipo?: 'PROJETO' | 'IMPLANTAÇÃO'): Peca {
  const classe: ClasseDocumental = numero === '01' ? 'drt-01' : numero === '03' ? 'drt-03' : tipo === 'IMPLANTAÇÃO' ? 'drt-02-implantacao' : 'drt-02-projeto'
  return {
    classe,
    texto: {
      titulo: `DRT ${numero} - DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA`,
      linhas: [
        ...(tipo ? [tipo] : []),
        'Modalidade: Desdobro',
        `Declaro, como responsável técnico, a autoria das peças do processo.`,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
        `Lote ${d.lote}, Quadra ${d.quadra}.`,
      ],
      // "Modalidade" é o assunto da DRT.
      campos: { assunto: 'Desdobro', 'rt-nome': d.rtNome, 'rt-registro': d.rtRegistro },
      assinaturas: ['Assinatura do responsável técnico'],
    },
  }
}

function matriculaComAtos(d: Dados, area = d.area): Peca {
  return {
    classe: 'matricula-transcricao',
    estados: { titular: 'varios-valores' },
    normalizados: { area: areaEmM2(area) },
    texto: {
      titulo: d.cartorio.toUpperCase(),
      linhas: [
        `MATRÍCULA ${d.matricula}`,
        `Imóvel: Lote ${d.lote} da Quadra ${d.quadra}, ${d.parcelamento}, área de ${area}.`,
        'R-1: imóvel transmitido a Ana Antiga Ficticia por compra e venda.',
        `R-2: imóvel transmitido a ${d.titular} por compra e venda.`,
        `Emitida em ${d.emissao}.`,
      ],
      campos: { cartorio: d.cartorio.toUpperCase(), matricula: d.matricula, lote: d.lote, quadra: d.quadra, parcelamento: d.parcelamento, area, 'data-emissao': d.emissao },
      assinaturas: [],
    },
  }
}

function extratoIptu(d: Dados): Peca {
  return {
    classe: 'inscricao-imobiliaria',
    texto: {
      titulo: 'EXTRATO DO CADASTRO IMOBILIÁRIO - IPTU',
      linhas: [`Inscrição imobiliária: ${d.inscricao}`, `Matrícula informada pelo contribuinte: ${d.matricula}`, `Lote: ${d.lote}   Quadra: ${d.quadra}`, `Bairro: ${d.bairro}`],
      campos: { inscricao: d.inscricao, lote: d.lote, quadra: d.quadra, bairro: d.bairro },
      assinaturas: [],
    },
  }
}

function rrt(d: Dados): Peca {
  return {
    classe: 'art-rrt-similar',
    texto: {
      titulo: 'REGISTRO DE RESPONSABILIDADE TÉCNICA - RRT',
      linhas: [
        `Profissional: ${d.rtNome} - ${d.rtRegistro}`,
        `Contratante: ${d.titular}`,
        'Atividade: projeto de desdobro de lote',
        `Lote: ${d.lote}   Quadra: ${d.quadra}   Bairro: ${d.bairro}`,
      ],
      campos: { 'rt-nome': d.rtNome, 'rt-registro': d.rtRegistro, titular: d.titular, lote: d.lote, quadra: d.quadra, bairro: d.bairro },
      assinaturas: ['Assinatura do profissional'],
    },
  }
}

function declaracaoTecnica(d: Dados): Peca {
  return {
    classe: 'outro',
    texto: {
      titulo: 'DECLARAÇÃO',
      linhas: [
        `Declaro, para os devidos fins, que o levantamento do lote ${d.lote} foi feito por mim.`,
        'A anotação de responsabilidade será providenciada posteriormente.',
        `${d.rtNome}`,
      ],
      campos: {},
      assinaturas: ['Assinatura do declarante'],
    },
  }
}

function prancha(d: Dados, opcoes: { escala?: string; folha?: 'A3' | 'A1'; lote?: string; area?: string; revisao?: string } = {}): Peca {
  const escala = opcoes.escala ?? 'Esc. 1/10.000'
  const folha = opcoes.folha ?? 'A3'
  const area = opcoes.area ?? d.area
  const revisao = opcoes.revisao ?? d.revisao
  const lote = opcoes.lote ?? d.lote
  return {
    classe: 'prancha',
    normalizados: { 'escala-situacao': 10000, area: areaEmM2(area) },
    texto: {
      titulo: `PLANTA DE DESDOBRO - LOTE ${lote} QUADRA ${d.quadra}`,
      linhas: [
        'Assunto: Desdobro',
        `Lote: ${lote}   Quadra: ${d.quadra}   Matrícula: ${d.matricula}`,
        `Área do lote: ${area}`,
        `Planta de situação - ${escala}`,
        `Folha ${folha}   Revisão: ${revisao}`,
        `RT: ${d.rtNome} - ${d.rtRegistro}`,
      ],
      campos: { assunto: 'Desdobro', lote, quadra: d.quadra, matricula: d.matricula, area, 'escala-situacao': /1\s*[:/]\s*[\d.]+/u.exec(escala)?.[0] ?? escala, 'formato-folha': folha, 'data-revisao': revisao },
      assinaturas: ['Assinatura do responsável técnico'],
    },
  }
}

function memorial(d: Dados, opcoes: { lote?: string; revisao?: string } = {}): Peca {
  const lote = opcoes.lote ?? d.lote
  const revisao = opcoes.revisao ?? d.revisao
  return {
    classe: 'memorial',
    texto: {
      titulo: 'Memorial descritivo de desdobro',
      linhas: [
        'Assunto: Desdobro',
        `Imóvel: lote ${lote} da quadra ${d.quadra}, matrícula ${d.matricula}.`,
        'Perímetro: inicia no vértice V1 e segue pelos rumos indicados na planta.',
        `Área total: ${d.area}`,
        `Data da revisão: ${revisao}`,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
      ],
      campos: { assunto: 'Desdobro', lote, quadra: d.quadra, matricula: d.matricula, area: d.area, 'data-revisao': revisao, 'rt-nome': d.rtNome },
      assinaturas: ['Assinatura do responsável técnico'],
    },
  }
}

function procuracao(d: Dados, outorgado: string): Peca {
  return {
    classe: 'representacao',
    texto: {
      titulo: 'PROCURAÇÃO',
      linhas: [`Outorgante: ${d.titular}`, `Outorgado: ${outorgado}`, `Poderes: representar a outorgante no desdobro do lote ${d.lote}.`],
      campos: { titular: d.titular, signatario: outorgado },
      assinaturas: ['Assinatura da outorgante'],
    },
  }
}

function areaEmM2(texto: string): number {
  const ha = /([\d.]+,\d+)\s*ha\b/u.exec(texto)
  const m2 = /([\d.]+,\d+)\s*m²/u.exec(texto)
  const numero = (valor: string) => Number(valor.replace(/\./gu, '').replace(',', '.'))
  if (ha?.[1]) return Math.round(numero(ha[1]) * 10000 * 100) / 100
  if (m2?.[1]) return numero(m2[1])
  throw new Error(`área sem unidade: ${texto}`)
}

// ---------- montagem ----------

type Arquivo =
  | { nome: string; pecas: Peca[]; formato: 'pdf'; folha?: 'A3' | 'A1'; assinado?: boolean }
  | { nome: string; pecas: [Peca]; formato: 'pdf-digitalizado' | 'jpeg' }
  | { nome: string; formato: 'dwg' }

interface DefinicaoValidacao {
  id: string
  titulo: string
  integridadeDoPacote?: 'completo' | 'parcial' | 'desconhecida'
  condicoesConfirmadas?: { id: string; valor: boolean }[]
  arquivos: Arquivo[]
  regras: Record<string, ExpectativaRegra>
}

const R = (numero: string) => `AQR-GCA-${numero}`
const espera = (aceitaveis: ExpectativaRegra['aceitaveis'], motivo: string, tipo?: ExpectativaRegra['tipo']): ExpectativaRegra => ({ aceitaveis, motivo, ...(tipo ? { tipo } : {}) })

/** Pacote completo com os modelos da validação. */
function completo(d: Dados = V): Arquivo[] {
  return [
    { nome: 'req.pdf', formato: 'pdf', pecas: [requerimento(d)] },
    { nome: 'drt.pdf', formato: 'pdf', pecas: [drt(d, '01')] },
    { nome: 'certidao.pdf', formato: 'pdf', pecas: [matriculaComAtos(d)] },
    { nome: 'iptu.pdf', formato: 'pdf', pecas: [extratoIptu(d)] },
    { nome: 'rrt.pdf', formato: 'pdf', pecas: [rrt(d)] },
    { nome: 'planta.pdf', formato: 'pdf', folha: 'A3', pecas: [prancha(d)] },
    { nome: 'desenho.dwg', formato: 'dwg' },
    { nome: 'memorial.pdf', formato: 'pdf', pecas: [memorial(d)] },
  ]
}

function trocar(arquivos: Arquivo[], nome: string, novo: Arquivo | null): Arquivo[] {
  const indice = arquivos.findIndex((arquivo) => arquivo.nome === nome)
  if (indice < 0) throw new Error(`sem ${nome}`)
  return novo ? arquivos.map((arquivo, index) => (index === indice ? novo : arquivo)) : arquivos.filter((_, index) => index !== indice)
}

const PRESENCA_OK: Record<string, ExpectativaRegra> = {
  [R('002')]: espera(['sem-achado'], 'Requerimento presente.'),
  [R('003')]: espera(['sem-achado'], 'DRT 01 presente.'),
  [R('006')]: espera(['sem-achado'], 'Extrato do cadastro imobiliário presente.'),
  [R('008')]: espera(['sem-achado'], 'Certidão da matrícula presente.'),
  [R('011')]: espera(['sem-achado'], 'RRT presente (similar à ART).'),
  [R('012')]: espera(['sem-achado'], 'Planta em PDF e DWG presentes.'),
  [R('013')]: espera(['sem-achado'], 'Memorial em PDF presente.'),
  [R('028')]: espera(['condicao-pendente'], 'Sem confirmação de servidor sobre a área.'),
}

export const DEFINICOES_VALIDACAO: DefinicaoValidacao[] = [
  {
    id: 'VAL-01',
    titulo: 'Pacote completo com outros modelos (RRT, extrato de IPTU, matrícula com atos R-1/R-2)',
    arquivos: completo(),
    regras: {
      ...PRESENCA_OK,
      [R('001')]: espera(['sem-achado'], 'Assunto "Desdobro" no requerimento.'),
      [R('009')]: espera(['sem-achado', 'achado'], 'Emissão 15/10/2026, protocolo 05/11/2026: dentro de 30 dias por qualquer contagem; um alerta só de exibição também é aceitável.'),
      [R('010')]: espera(['nao-aplicavel', 'sem-achado'], 'A proprietária assina.'),
      [R('016')]: espera(['sem-achado'], 'Planta e memorial assinados.'),
      [R('019')]: espera(['sem-achado'], 'Desdobro em todas as peças.'),
      [R('020')]: espera(['sem-achado'], 'Mesmos lote, quadra, matrícula, inscrição e bairro.'),
      [R('021')]: espera(['sem-achado'], 'Mesma data de revisão.'),
      [R('022')]: espera(['sem-achado'], 'Situação em 1/10.000.'),
      [R('023')]: espera(['sem-achado'], 'Folha A3, como no exemplo positivo do catálogo.'),
      [R('043')]: espera(['sem-achado'], 'Formatos aceitos.'),
    },
  },
  {
    id: 'VAL-02',
    titulo: 'Requerimento e DRT 01 no mesmo PDF',
    arquivos: trocar(trocar(completo(), 'drt.pdf', null), 'req.pdf', { nome: 'documentos.pdf', formato: 'pdf', pecas: [requerimento(V), drt(V, '01')] }),
    regras: {
      ...PRESENCA_OK,
      [R('003')]: espera(['sem-achado', 'nao-avaliavel'], 'A DRT 01 está na página 2 do arquivo composto; não pode ser apontada como ausente.'),
    },
  },
  {
    id: 'VAL-03',
    titulo: 'DRT 02 de projeto no lugar da DRT 01',
    arquivos: trocar(completo(), 'drt.pdf', { nome: 'drt.pdf', formato: 'pdf', pecas: [drt(V, '02', 'PROJETO')] }),
    regras: { ...PRESENCA_OK, [R('003')]: espera(['achado'], 'Só DRT 02 de projeto; desdobro pede DRT 01.', 'nao-localizado') },
  },
  {
    id: 'VAL-04',
    titulo: 'DRT 01 e, a mais, uma DRT 02 de implantação',
    arquivos: [...completo(), { nome: 'drt-2.pdf', formato: 'pdf', pecas: [drt(V, '02', 'IMPLANTAÇÃO')] }],
    regras: { ...PRESENCA_OK },
  },
  {
    id: 'VAL-05',
    titulo: 'Declaração técnica simples no lugar da RRT',
    arquivos: trocar(completo(), 'rrt.pdf', { nome: 'rrt.pdf', formato: 'pdf', pecas: [declaracaoTecnica(V)] }),
    regras: {
      ...PRESENCA_OK,
      [R('011')]: espera(['achado'], 'Declaração não é ART/RRT; nenhum documento de responsabilidade técnica entre os anexos.', 'nao-localizado'),
      [R('018')]: espera(['nao-avaliavel', 'nao-aplicavel'], 'Sem ART/RRT, não há campos a comparar.'),
    },
  },
  {
    id: 'VAL-06',
    titulo: 'Lote com zero à esquerda no requerimento e sem zero no memorial',
    arquivos: trocar(completo(), 'memorial.pdf', { nome: 'memorial.pdf', formato: 'pdf', pecas: [memorial(V, { lote: '7' })] }),
    regras: { ...PRESENCA_OK, [R('020')]: espera(['achado'], 'Lote "07" e "7": diferença textual que o sistema não resolve sozinho.', 'divergencia') },
  },
  {
    id: 'VAL-07',
    titulo: 'Área de 2,01 ha na matrícula e 20.100,00 m² na planta, sem confirmação',
    arquivos: trocar(
      trocar(completo(), 'certidao.pdf', { nome: 'certidao.pdf', formato: 'pdf', pecas: [matriculaComAtos(V, '2,01 ha')] }),
      'planta.pdf',
      { nome: 'planta.pdf', formato: 'pdf', folha: 'A3', pecas: [prancha(V, { area: '20.100,00 m²' })] },
    ),
    regras: { ...PRESENCA_OK, [R('028')]: espera(['condicao-pendente'], 'Área acima de 2 ha só como informação: a regra espera servidor.') },
  },
  {
    id: 'VAL-08',
    titulo: 'Planta em folha A1 e escala "1:10000" sem ponto',
    arquivos: trocar(completo(), 'planta.pdf', { nome: 'planta.pdf', formato: 'pdf', folha: 'A1', pecas: [prancha(V, { folha: 'A1', escala: 'escala 1:10000' })] }),
    regras: {
      ...PRESENCA_OK,
      [R('022')]: espera(['sem-achado'], '1:10000 é a escala pedida.'),
      [R('023')]: espera(['sem-achado', 'nao-avaliavel'], 'A1 não aparece nos exemplos do catálogo; a lista de formatos do TR não está no repositório.'),
    },
  },
  {
    id: 'VAL-09',
    titulo: 'Data de revisão com pontos no memorial (12.05.2026) e barras na planta',
    arquivos: trocar(completo(), 'memorial.pdf', { nome: 'memorial.pdf', formato: 'pdf', pecas: [memorial(V, { revisao: '12.05.2026' })] }),
    regras: { ...PRESENCA_OK, [R('021')]: espera(['sem-achado', 'nao-avaliavel'], 'Mesma data, escrita de outro jeito; não é divergência.') },
  },
  {
    id: 'VAL-10',
    titulo: 'Datas de revisão diferentes (12/05/2026 e 13/05/2026)',
    arquivos: trocar(completo(), 'memorial.pdf', { nome: 'memorial.pdf', formato: 'pdf', pecas: [memorial(V, { revisao: '13/05/2026' })] }),
    regras: { ...PRESENCA_OK, [R('021')]: espera(['achado'], 'Exemplo negativo do catálogo: uma 12/05, outra 13/05.', 'divergencia') },
  },
  {
    id: 'VAL-11',
    titulo: 'Procurador assina; procuração em JPG',
    arquivos: [
      ...trocar(completo(), 'req.pdf', { nome: 'req.pdf', formato: 'pdf', pecas: [requerimento(V, { signatario: 'Rui Procurador Ficticio', qualidade: 'procurador' })] }),
      { nome: 'procuracao.jpg', formato: 'jpeg', pecas: [procuracao(V, 'Rui Procurador Ficticio')] },
    ],
    regras: { ...PRESENCA_OK, [R('010')]: espera(['sem-achado', 'nao-avaliavel'], 'Há instrumento de representação, em imagem.') },
  },
  {
    id: 'VAL-12',
    titulo: 'Terceiro assina sem instrumento de representação',
    arquivos: trocar(completo(), 'req.pdf', { nome: 'req.pdf', formato: 'pdf', pecas: [requerimento(V, { signatario: 'Rui Procurador Ficticio', qualidade: 'interessado' })] }),
    regras: { ...PRESENCA_OK, [R('010')]: espera(['achado'], 'Quem assina não é a proprietária e não há procuração.', 'nao-localizado') },
  },
  {
    id: 'VAL-13',
    titulo: 'Assunto com outro rótulo ("Objeto do pedido")',
    arquivos: trocar(completo(), 'req.pdf', { nome: 'req.pdf', formato: 'pdf', pecas: [requerimento(V, { rotuloAssunto: 'Objeto do pedido' })] }),
    regras: { ...PRESENCA_OK, [R('001')]: espera(['sem-achado'], 'O assunto está no requerimento, com outro rótulo.') },
  },
  {
    id: 'VAL-14',
    titulo: 'Planta digitalizada',
    arquivos: trocar(completo(), 'planta.pdf', { nome: 'planta.pdf', formato: 'pdf-digitalizado', pecas: [prancha(V)] }),
    regras: {
      ...PRESENCA_OK,
      [R('012')]: espera(['sem-achado', 'nao-avaliavel'], 'Planta presente, em imagem.'),
      [R('016')]: espera(['sem-achado', 'nao-avaliavel'], 'Assinatura em imagem não é verificada pelo sistema.'),
      [R('022')]: espera(['sem-achado', 'nao-avaliavel'], 'Escala depende do OCR.'),
    },
  },
  {
    id: 'VAL-15',
    titulo: 'Assunto de remembramento no requerimento de um desdobro',
    arquivos: trocar(completo(), 'req.pdf', { nome: 'req.pdf', formato: 'pdf', pecas: [requerimento(V, { assunto: 'Remembramento' })] }),
    regras: { ...PRESENCA_OK, [R('019')]: espera(['achado'], 'Requerimento diz remembramento; DRT, planta e memorial, desdobro.', 'divergencia') },
  },
  {
    id: 'VAL-16',
    titulo: 'Sem matrícula, pacote de integridade desconhecida',
    integridadeDoPacote: 'desconhecida',
    arquivos: trocar(completo(), 'certidao.pdf', null),
    regras: {
      [R('008')]: espera(['nao-avaliavel'], 'Integridade do pacote desconhecida: ausência não é concluída.'),
      [R('002')]: espera(['sem-achado'], 'Requerimento presente.'),
    },
  },
]

export async function gerarValidacao(): Promise<PacoteValidacao[]> {
  const pacotes: PacoteValidacao[] = []
  for (const [indicePacote, definicao] of DEFINICOES_VALIDACAO.entries()) {
    const arquivos: PacoteValidacao['arquivos'] = []
    const anexos: GabaritoValidacaoAnexo[] = []
    for (const [indice, arquivo] of definicao.arquivos.entries()) {
      const seed = 9000 + indicePacote * 50 + indice
      let bytes: Uint8Array
      if (arquivo.formato === 'dwg') bytes = dwgFicticio(seed)
      else if (arquivo.formato === 'pdf') {
        const paginas = arquivo.pecas.map((peca) => paginaDeTexto(peca.texto, { seed, assinado: arquivo.assinado ?? true, ...(peca.classe === 'prancha' ? { folha: arquivo.folha ?? 'A3' } : {}) }))
        bytes = (await buildPdf(paginas)).bytes
      } else if (arquivo.formato === 'pdf-digitalizado') bytes = await pdfDigitalizado(arquivo.pecas[0].texto, 'boa', seed)
      else bytes = await imagemAvulsa(arquivo.pecas[0].texto, 'jpeg', 'boa', seed)
      arquivos.push({ nome: arquivo.nome, bytes })
      const pecas = 'pecas' in arquivo ? arquivo.pecas : []
      const [primeira] = pecas
      anexos.push({
        nome: arquivo.nome,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        classe: arquivo.formato === 'dwg' ? 'cad' : (primeira?.classe ?? null),
        classesNoArquivo: arquivo.formato === 'dwg' ? ['cad'] : pecas.map((peca) => peca.classe),
        leitura: arquivo.formato === 'pdf' ? 'camada-de-texto' : arquivo.formato === 'dwg' ? 'nao-interpretado' : 'ocr',
        // Campos só do primeiro documento do arquivo (o composto tem o requerimento primeiro).
        campos: primeira?.texto.campos ?? {},
        estados: primeira?.estados ?? {},
        normalizados: primeira?.normalizados ?? {},
      })
    }
    pacotes.push({
      gabarito: gabaritoValidacaoSchema.parse({
        id: definicao.id,
        titulo: definicao.titulo,
        entrada: {
          modalidade: 'D',
          etapa: 'abertura',
          protocoladoEm: PROTOCOLADO_EM,
          integridadeDoPacote: definicao.integridadeDoPacote ?? 'completo',
          condicoesConfirmadas: definicao.condicoesConfirmadas ?? [],
        },
        anexos,
        regras: definicao.regras,
      }),
      arquivos,
    })
  }
  return pacotes
}

