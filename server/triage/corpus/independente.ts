import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { ClasseDocumental, NomeCampo, estadosCampo } from '../../../shared/contracts/triage.ts'
import { buildPdf } from '../../comparison/evaluation/corpus-pdf.ts'
import { dxfFicticio, IMOVEL_BASE, imagemAvulsa, paginaDeTexto, pdfDigitalizado, type Qualidade, type TextoDaPeca } from './documents.ts'
import { expectativaRegraSchema, type ExpectativaRegra } from './gabarito.ts'
import { PROTOCOLADO_EM } from './generate.ts'
import { gabaritoValidacaoAnexoSchema } from './validacao.ts'

/**
 * Conjunto INDEPENDENTE (IND-01 a 16), criado na estabilização de 11/11/2026, depois de o
 * desenvolvimento e a validação terem sido usados para corrigir o motor.
 *
 * Regras deste conjunto:
 * - modelos de formulário, terminologia e formatação que não aparecem nos outros conjuntos
 *   (título do TR 002 para o requerimento, "Nº da Matrícula", "Insc. Imobiliária", "Loteamento",
 *   "Lt."/"Qd.", "Requerente", "Revisão 01 - data", "ESC.", "Extrato de débitos", "Substabelecimento",
 *   prancha sem a palavra "prancha" no título, documentos compostos, digitalizações com ruído);
 * - gabarito escrito à mão a partir do que cada peça É e do que o catálogo pede, sem rodar o motor;
 * - **congelado** em `docs/triagem/casos/independente-gabarito.json`, com SHA-256 registrado, e
 *   commitado antes da primeira execução. Não pode ser alterado depois de ver resultados: o teste
 *   `independente.test.ts` falha se o gabarito gerado mudar.
 *
 * Limite assumido: o autor do conjunto é o mesmo do motor. O congelamento impede ajuste posterior,
 * mas não apaga o conhecimento prévio de quem escreveu.
 */

export const gabaritoIndependenteSchema = z.strictObject({
  id: z.string().regex(/^IND-\d{2}$/u),
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
export type GabaritoIndependente = z.infer<typeof gabaritoIndependenteSchema>

export interface PacoteIndependente {
  gabarito: GabaritoIndependente
  arquivos: { nome: string; bytes: Uint8Array }[]
}

// ---------- dados fictícios (diferentes dos outros conjuntos) ----------

const D = {
  titular: 'Helena Modelo Simulada',
  rtNome: 'Bruno Projetista Imaginario',
  rtRegistro: 'CREA-FIC 000777',
  lote: '15',
  quadra: '08',
  parcelamento: 'Residencial Hipotetico',
  bairro: 'Vila Teste',
  matricula: '55.120',
  cartorio: '2º Ofício de Registro de Imóveis Fictício',
  inscricao: '1234.5678.009',
  area: '360,00 m²',
  emissao: '28/10/2026',
  revisao: '30/10/2026',
}
type Dados = typeof D

/** Mesma área nas peças (25.000,00 m²) e em hectares na certidão (2,50 ha). */
const D_25000: Dados = { ...D, area: '25.000,00 m²' }

type Estado = (typeof estadosCampo)[number]

interface Peca {
  classe: ClasseDocumental
  texto: TextoDaPeca
  estados?: Partial<Record<NomeCampo, Estado>>
  normalizados?: Partial<Record<NomeCampo, string | number>>
}

// ---------- modelos ----------

function requerimentoTr(d: Dados, opcoes: { signatario?: string; qualidade?: string; matriculas?: string } = {}): Peca {
  const signatario = opcoes.signatario ?? d.titular
  return {
    classe: 'requerimento',
    texto: {
      titulo: 'REQUERIMENTO DE ABERTURA DE PROCESSOS CARTOGRÁFICOS',
      linhas: [
        'Assunto: Desdobro de lote',
        `Proprietária: ${d.titular}`,
        `Lote: ${d.lote}   Quadra: ${d.quadra}`,
        `Loteamento: ${d.parcelamento}   Bairro: ${d.bairro}`,
        `Nº da Matrícula: ${opcoes.matriculas ?? d.matricula}   Insc. Imobiliária: ${d.inscricao}`,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
        `Assina este requerimento: ${signatario}, na qualidade de ${opcoes.qualidade ?? 'proprietária'}.`,
      ],
      campos: {
        assunto: 'Desdobro de lote',
        titular: d.titular,
        lote: d.lote,
        quadra: d.quadra,
        parcelamento: d.parcelamento,
        bairro: d.bairro,
        ...(opcoes.matriculas ? {} : { matricula: d.matricula }),
        inscricao: d.inscricao,
        'rt-nome': d.rtNome,
        'rt-registro': d.rtRegistro,
        signatario,
      },
      assinaturas: ['Assinatura do(a) requerente', 'Assinatura do responsável técnico'],
    },
    ...(opcoes.matriculas ? { estados: { matricula: 'varios-valores' as const } } : {}),
  }
}

/** Requerimento curto, com abreviações e caixa misturada. */
function requerimentoAbreviado(d: Dados): Peca {
  return {
    classe: 'requerimento',
    texto: {
      titulo: 'Requerimento',
      linhas: [
        'ASSUNTO: DESDOBRO',
        `Requerente: ${d.titular} (proprietária)`,
        `Imóvel: Lt. ${d.lote}, Qd. ${d.quadra}, ${d.parcelamento}`,
        `Matrícula ${d.matricula.replace('.', '')}`,
        `RT: ${d.rtNome} (${d.rtRegistro})`,
        `Assina este requerimento: ${d.titular}.`,
      ],
      campos: { assunto: 'DESDOBRO', titular: d.titular, lote: d.lote, quadra: d.quadra, matricula: d.matricula.replace('.', ''), 'rt-nome': d.rtNome, signatario: d.titular },
      assinaturas: ['Assinatura do(a) requerente'],
    },
  }
}

function drt(d: Dados, numero: '01' | '03'): Peca {
  return {
    classe: numero === '01' ? 'drt-01' : 'drt-03',
    texto: {
      titulo: `DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA (DRT nº ${numero})`,
      linhas: [
        `Assunto: ${numero === '01' ? 'Desdobro' : 'Retificação de registro imobiliário'}`,
        `Eu, ${d.rtNome}, declaro ser responsável técnico pelas peças apresentadas.`,
        `Profissional: ${d.rtNome} - ${d.rtRegistro}`,
      ],
      campos: { assunto: numero === '01' ? 'Desdobro' : 'Retificação de registro imobiliário', 'rt-nome': d.rtNome, 'rt-registro': d.rtRegistro },
      assinaturas: ['Assinatura do responsável técnico'],
    },
  }
}

function certidaoMatricula(d: Dados, opcoes: { emissao?: string; area?: string } = {}): Peca {
  const emissao = opcoes.emissao ?? d.emissao
  const area = opcoes.area ?? d.area
  return {
    classe: 'matricula-transcricao',
    texto: {
      titulo: 'CERTIDÃO DE MATRÍCULA',
      linhas: [
        d.cartorio,
        `Matrícula nº ${d.matricula}`,
        `Lote ${d.lote} da Quadra ${d.quadra} do ${d.parcelamento}, área de ${area}.`,
        `Proprietária: ${d.titular}.`,
        `Data de emissão: ${emissao}`,
      ],
      campos: { cartorio: d.cartorio, matricula: d.matricula, lote: d.lote, quadra: d.quadra, parcelamento: d.parcelamento, area, titular: d.titular, 'data-emissao': emissao },
      assinaturas: [],
    },
    normalizados: { matricula: d.matricula.replace('.', '') },
  }
}

function extratoDebitos(d: Dados): Peca {
  return {
    classe: 'inscricao-imobiliaria',
    texto: {
      titulo: 'EXTRATO DE DÉBITOS - IPTU',
      linhas: [`Inscrição Imobiliária: ${d.inscricao}`, `Endereço: Lote ${d.lote}, Quadra ${d.quadra}`, `Bairro: ${d.bairro}`, 'Situação: sem débitos (fictício).'],
      campos: { inscricao: d.inscricao, lote: d.lote, quadra: d.quadra, bairro: d.bairro },
      assinaturas: [],
    },
  }
}

function art(d: Dados): Peca {
  return {
    classe: 'art-rrt-similar',
    texto: {
      titulo: 'ART - ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA',
      linhas: [`Profissional: ${d.rtNome} - ${d.rtRegistro}`, `Contratante: ${d.titular}`, 'Atividade: projeto de desdobro', `Endereço da obra: Lt. ${d.lote}, Qd. ${d.quadra}, ${d.bairro}`, 'Situação: quitada (fictícia).'],
      campos: { 'rt-nome': d.rtNome, 'rt-registro': d.rtRegistro, titular: d.titular, lote: d.lote, quadra: d.quadra },
      assinaturas: ['Assinatura do profissional'],
    },
  }
}

function prancha(d: Dados, opcoes: { titulo?: string; quadra?: string; escala?: string; folha?: 'A3' | 'A2' | 'A1' | 'A0' } = {}): Peca {
  const quadra = opcoes.quadra ?? d.quadra
  const escala = opcoes.escala ?? '1:10.000'
  const folha = opcoes.folha ?? 'A3'
  return {
    classe: 'prancha',
    texto: {
      titulo: opcoes.titulo ?? 'PLANTA DE SITUAÇÃO E LOCALIZAÇÃO - DESDOBRO',
      linhas: [
        `Lote: ${d.lote}   Quadra: ${quadra}   Matrícula: ${d.matricula}`,
        `Área do terreno: ${d.area}`,
        `PLANTA DE SITUAÇÃO — ESC. ${escala}`,
        `Formato: ${folha}`,
        `Revisão 01 - ${d.revisao}`,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
      ],
      campos: { lote: d.lote, quadra, matricula: d.matricula, area: d.area, 'escala-situacao': escala, 'formato-folha': folha, 'data-revisao': d.revisao, 'rt-nome': d.rtNome },
      assinaturas: ['Assinatura do responsável técnico'],
    },
    normalizados: { 'escala-situacao': Number(escala.split(':')[1]?.replace('.', '')) },
  }
}

function memorial(d: Dados): Peca {
  return {
    classe: 'memorial',
    texto: {
      titulo: 'MEMORIAL DESCRITIVO',
      linhas: [
        'Assunto: Desdobro',
        `Interessada: ${d.titular}`,
        `Lote ${d.lote} - Quadra ${d.quadra} - ${d.parcelamento}`,
        `Matrícula: ${d.matricula}`,
        `Área: ${d.area}`,
        'Perímetro: parte do marco M1 e segue em linha reta até o marco M2.',
        `Data: ${d.revisao}`,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
      ],
      campos: { assunto: 'Desdobro', lote: d.lote, quadra: d.quadra, matricula: d.matricula, area: d.area, 'data-revisao': d.revisao, 'rt-nome': d.rtNome },
      assinaturas: ['Assinatura do responsável técnico'],
    },
  }
}

function substabelecimento(d: Dados, outorgado: string): Peca {
  return {
    classe: 'representacao',
    texto: {
      titulo: 'SUBSTABELECIMENTO DE PROCURAÇÃO',
      linhas: [`Outorgante: ${d.titular}`, `Outorgado: ${outorgado}`, `Poderes: requerer o desdobro do lote ${d.lote}.`],
      campos: { titular: d.titular, signatario: outorgado },
      assinaturas: ['Assinatura do outorgante'],
    },
  }
}

function gdu(d: Dados): Peca {
  return {
    classe: 'gdu-gdr',
    texto: {
      titulo: 'GUIA DE DIRETRIZES URBANÍSTICAS (GDU) Nº FIC-0777/2026',
      linhas: [`Imóvel: lote ${d.lote}, quadra ${d.quadra}.`, 'Diretrizes fictícias para teste.'],
      campos: { lote: d.lote, quadra: d.quadra },
      assinaturas: [],
    },
  }
}

// ---------- montagem ----------

type Arquivo =
  | { nome: string; formato: 'pdf'; pecas: Peca[]; folha?: 'A3' | 'A2' | 'A1' | 'A0' }
  | { nome: string; formato: 'pdf-digitalizado' | 'jpeg'; pecas: [Peca]; qualidade: Qualidade }
  | { nome: string; formato: 'dxf' }

const R = (numero: string) => `AQR-GCA-${numero}`
const espera = (aceitaveis: ExpectativaRegra['aceitaveis'], motivo: string, tipo?: ExpectativaRegra['tipo']): ExpectativaRegra => ({ aceitaveis, motivo, ...(tipo ? { tipo } : {}) })

function completo(d: Dados = D): Arquivo[] {
  return [
    { nome: '01-requerimento.pdf', formato: 'pdf', pecas: [requerimentoTr(d)] },
    { nome: '02-drt.pdf', formato: 'pdf', pecas: [drt(d, '01')] },
    { nome: '03-certidao.pdf', formato: 'pdf', pecas: [certidaoMatricula(d)] },
    { nome: '04-extrato.pdf', formato: 'pdf', pecas: [extratoDebitos(d)] },
    { nome: '05-art.pdf', formato: 'pdf', pecas: [art(d)] },
    { nome: '06-planta.pdf', formato: 'pdf', pecas: [prancha(d)], folha: 'A3' },
    { nome: '07-planta.dxf', formato: 'dxf' },
    { nome: '08-memorial.pdf', formato: 'pdf', pecas: [memorial(d)] },
  ]
}

function trocar(arquivos: Arquivo[], nome: string, novo: Arquivo | null): Arquivo[] {
  if (!arquivos.some((arquivo) => arquivo.nome === nome)) throw new Error(`sem ${nome}`)
  return novo ? arquivos.map((arquivo) => (arquivo.nome === nome ? novo : arquivo)) : arquivos.filter((arquivo) => arquivo.nome !== nome)
}

/** Expectativas de um pacote completo, legível e coerente (o que um servidor esperaria). */
const BASE: Record<string, ExpectativaRegra> = {
  [R('001')]: espera(['sem-achado'], 'Assunto "Desdobro de lote" no requerimento.'),
  [R('002')]: espera(['sem-achado'], 'Requerimento presente.'),
  [R('003')]: espera(['sem-achado'], 'DRT 01 presente.'),
  [R('006')]: espera(['sem-achado'], 'Extrato de débitos do IPTU com a inscrição (TR 002, item III: "Extrato de Débito, ou similar").'),
  [R('008')]: espera(['sem-achado'], 'Certidão de matrícula presente.'),
  [R('009')]: espera(['achado'], 'Data de emissão legível: alerta para conferência de prazo pelo servidor (sem critério de contagem).', 'condicao-indeterminada'),
  [R('010')]: espera(['nao-aplicavel', 'sem-achado'], 'A proprietária assina.'),
  [R('011')]: espera(['sem-achado'], 'ART presente.'),
  [R('012')]: espera(['sem-achado'], 'Planta em PDF e DXF.'),
  [R('013')]: espera(['sem-achado'], 'Memorial em PDF.'),
  [R('016')]: espera(['sem-achado'], 'Planta e memorial assinados pelo RT.'),
  [R('018')]: espera(['sem-achado'], 'ART coerente com requerimento e matrícula.'),
  [R('019')]: espera(['sem-achado'], 'Desdobro em requerimento, DRT e memorial.'),
  [R('020')]: espera(['sem-achado'], 'Matrícula 55.120, lote 15, quadra 08 em todas as peças.'),
  [R('021')]: espera(['sem-achado'], 'Planta (revisão 01) e memorial com a mesma data, 30/10/2026.'),
  [R('022')]: espera(['sem-achado'], 'Situação em 1:10.000.'),
  [R('023')]: espera(['sem-achado'], 'Folha A3, permitida pelo TR 002.'),
  [R('028')]: espera(['condicao-pendente'], 'Sem confirmação de servidor sobre a área.'),
  [R('043')]: espera(['sem-achado'], 'Formatos aceitos.'),
}

function base(omitir: string[] = []): Record<string, ExpectativaRegra> {
  return Object.fromEntries(Object.entries(BASE).filter(([id]) => !omitir.map(R).includes(id)))
}

interface Definicao {
  id: string
  titulo: string
  integridadeDoPacote?: 'completo' | 'parcial' | 'desconhecida'
  condicoesConfirmadas?: { id: string; valor: boolean }[]
  arquivos: Arquivo[]
  regras: Record<string, ExpectativaRegra>
}

const lidoOuNao = (motivo: string) => espera(['sem-achado', 'nao-avaliavel'], motivo)

export const DEFINICOES_INDEPENDENTES: Definicao[] = [
  { id: 'IND-01', titulo: 'Pacote completo com a terminologia do TR 002', arquivos: completo(), regras: base() },
  {
    id: 'IND-02',
    titulo: 'Requerimento curto com abreviações (Lt., Qd., RT, Requerente)',
    arquivos: trocar(completo(), '01-requerimento.pdf', { nome: '01-requerimento.pdf', formato: 'pdf', pecas: [requerimentoAbreviado(D)] }),
    regras: { ...base(['010', '020']), [R('010')]: espera(['nao-aplicavel', 'sem-achado', 'nao-avaliavel'], 'A requerente se declara proprietária; o rótulo é "Requerente".'), [R('020')]: espera(['sem-achado'], 'Matrícula 55120 e 55.120 são o mesmo número; lote e quadra iguais.') },
  },
  {
    id: 'IND-03',
    titulo: 'Requerimento digitalizado com ruído e ART em JPG',
    arquivos: trocar(
      trocar(completo(), '01-requerimento.pdf', { nome: '01-requerimento.pdf', formato: 'pdf-digitalizado', pecas: [requerimentoTr(D)], qualidade: 'ruido' }),
      '05-art.pdf',
      { nome: '05-art.jpg', formato: 'jpeg', pecas: [art(D)], qualidade: 'boa' },
    ),
    regras: {
      ...base(['001', '002', '010', '011', '018', '019', '020']),
      [R('002')]: lidoOuNao('Requerimento presente, em imagem com ruído.'),
      [R('011')]: lidoOuNao('ART presente, em JPG.'),
    },
  },
  {
    id: 'IND-04',
    titulo: 'Certidão de matrícula e extrato de débitos no mesmo PDF',
    arquivos: trocar(trocar(completo(), '04-extrato.pdf', null), '03-certidao.pdf', { nome: '03-documentos-do-imovel.pdf', formato: 'pdf', pecas: [certidaoMatricula(D), extratoDebitos(D)] }),
    regras: { ...base(['006', '008', '020']), [R('006')]: lidoOuNao('Extrato na página 2 do arquivo composto.'), [R('008')]: lidoOuNao('Certidão na página 1 do arquivo composto.') },
  },
  {
    id: 'IND-05',
    titulo: 'Planta e memorial no mesmo PDF',
    arquivos: trocar(trocar(completo(), '08-memorial.pdf', null), '06-planta.pdf', { nome: '06-planta-e-memorial.pdf', formato: 'pdf', pecas: [prancha(D), memorial(D)], folha: 'A3' }),
    regras: {
      ...base(['012', '013', '016', '019', '020', '021']),
      [R('012')]: lidoOuNao('Planta em PDF (página 1 do composto) e DXF.'),
      [R('013')]: lidoOuNao('Memorial em PDF, na página 2 do arquivo composto.'),
    },
  },
  {
    id: 'IND-06',
    titulo: 'Sem ART, pacote completo',
    arquivos: trocar(completo(), '05-art.pdf', null),
    regras: { ...base(['011', '018']), [R('011')]: espera(['achado'], 'Nenhum documento de responsabilidade técnica entre os anexos.', 'nao-localizado'), [R('018')]: espera(['nao-avaliavel', 'nao-aplicavel'], 'Sem ART.') },
  },
  {
    id: 'IND-07',
    titulo: 'Sem DRT, pacote marcado como parcial',
    integridadeDoPacote: 'parcial',
    arquivos: trocar(completo(), '02-drt.pdf', null),
    regras: { ...base(['003', '019']), [R('003')]: espera(['nao-avaliavel'], 'Pacote parcial: a DRT pode estar no que não veio.') },
  },
  {
    id: 'IND-08',
    titulo: 'Quadra diferente na planta (09) e no resto (08)',
    arquivos: trocar(completo(), '06-planta.pdf', { nome: '06-planta.pdf', formato: 'pdf', pecas: [prancha(D, { quadra: '09' })], folha: 'A3' }),
    regras: { ...base(['020']), [R('020')]: espera(['achado'], 'Quadra 09 na planta, 08 nas demais peças.', 'divergencia') },
  },
  {
    id: 'IND-09',
    titulo: 'Planta em A2 com situação em 1:5.000',
    arquivos: trocar(completo(), '06-planta.pdf', { nome: '06-planta.pdf', formato: 'pdf', pecas: [prancha(D, { folha: 'A2', escala: '1:5.000' })], folha: 'A2' }),
    regras: {
      ...base(['022', '023']),
      [R('022')]: espera(['achado'], 'Situação declarada em 1:5.000; o TR 002 pede 1:10.000.', 'divergencia'),
      [R('023')]: espera(['sem-achado'], 'A2 é permitido pelo TR 002.'),
    },
  },
  {
    id: 'IND-10',
    titulo: 'Data de emissão da matrícula com ano de dois dígitos',
    arquivos: trocar(completo(), '03-certidao.pdf', { nome: '03-certidao.pdf', formato: 'pdf', pecas: [certidaoMatricula(D, { emissao: '28/10/26' })] }),
    regras: { ...base(['009']), [R('009')]: espera(['achado'], 'Data ambígua: mostrar e encaminhar ao servidor.', 'condicao-indeterminada') },
  },
  {
    id: 'IND-11',
    titulo: 'Requerimento com duas matrículas e uma só certidão',
    arquivos: trocar(completo(), '01-requerimento.pdf', { nome: '01-requerimento.pdf', formato: 'pdf', pecas: [requerimentoTr(D, { matriculas: '55.120 e Matrícula: 55.121' })] }),
    regras: {
      ...base(['006', '008', '018', '020']),
      [R('008')]: espera(['achado'], 'Dossiê, ensaio T03: alertar a possível falta do título do segundo imóvel.', 'nao-localizado'),
      [R('006')]: espera(['sem-achado', 'nao-avaliavel'], 'Um lote declarado e um extrato; com duas matrículas, a correspondência pode ficar para o servidor.'),
      [R('018')]: espera(['sem-achado', 'nao-avaliavel'], 'ART coerente com o lote declarado; com dois imóveis, a correspondência pode ficar para o servidor.'),
    },
  },
  {
    id: 'IND-12',
    titulo: 'Procurador assina, com substabelecimento anexado',
    arquivos: [
      ...trocar(completo(), '01-requerimento.pdf', { nome: '01-requerimento.pdf', formato: 'pdf', pecas: [requerimentoTr(D, { signatario: 'Otavio Representante Ficticio', qualidade: 'procurador' })] }),
      { nome: '09-substabelecimento.pdf', formato: 'pdf', pecas: [substabelecimento(D, 'Otavio Representante Ficticio')] },
    ],
    regras: { ...base(['010']), [R('010')]: espera(['sem-achado'], 'Há documento de representação; poderes não são julgados.') },
  },
  {
    id: 'IND-13',
    titulo: 'Área de 2,50 ha confirmada por servidor, com GDU',
    condicoesConfirmadas: [{ id: 'area-situacao-acima-2ha', valor: true }],
    arquivos: [
      ...trocar(completo(D_25000), '03-certidao.pdf', { nome: '03-certidao.pdf', formato: 'pdf', pecas: [certidaoMatricula(D_25000, { area: '2,50 ha' })] }),
      { nome: '10-gdu.pdf', formato: 'pdf', pecas: [gdu(D)] },
    ],
    regras: { ...base(['028']), [R('028')]: espera(['sem-achado'], 'Condição confirmada e GDU em PDF presente.') },
  },
  {
    id: 'IND-14',
    titulo: 'Planta com título "PROJETO DE DESDOBRO - FOLHA 01/01"',
    arquivos: trocar(completo(), '06-planta.pdf', { nome: '06-planta.pdf', formato: 'pdf', pecas: [prancha(D, { titulo: 'PROJETO DE DESDOBRO - FOLHA 01/01' })], folha: 'A3' }),
    regras: { ...base(), [R('012')]: espera(['sem-achado'], 'A peça é a planta do desdobro, em PDF, com DXF.') },
  },
  {
    id: 'IND-15',
    titulo: 'Memorial digitalizado muito degradado',
    arquivos: trocar(completo(), '08-memorial.pdf', { nome: '08-memorial.pdf', formato: 'pdf-digitalizado', pecas: [memorial(D)], qualidade: 'muito-degradada' }),
    regras: {
      ...base(['013', '016', '019', '020', '021']),
      [R('013')]: lidoOuNao('O memorial está lá; leitura ruim nunca é ausência.'),
    },
  },
  {
    id: 'IND-16',
    titulo: 'DRT nº 03 no lugar da DRT 01',
    arquivos: trocar(completo(), '02-drt.pdf', { nome: '02-drt.pdf', formato: 'pdf', pecas: [drt(D, '03')] }),
    regras: {
      ...base(['003', '019']),
      [R('003')]: espera(['achado'], 'Só DRT 03; não substitui a DRT 01.', 'nao-localizado'),
      [R('019')]: espera(['achado'], 'A DRT traz assunto de retificação.', 'divergencia'),
    },
  },
]

export async function gerarIndependente(): Promise<PacoteIndependente[]> {
  const pacotes: PacoteIndependente[] = []
  for (const [indicePacote, definicao] of DEFINICOES_INDEPENDENTES.entries()) {
    const arquivos: PacoteIndependente['arquivos'] = []
    const anexos: GabaritoIndependente['anexos'] = []
    for (const [indice, arquivo] of definicao.arquivos.entries()) {
      const seed = 7000 + indicePacote * 50 + indice
      let bytes: Uint8Array
      if (arquivo.formato === 'dxf') bytes = dxfFicticio({ ...IMOVEL_BASE, lote: D.lote, quadra: D.quadra, lotesFinais: `${D.lote}A e ${D.lote}B` })
      else if (arquivo.formato === 'pdf') {
        bytes = (await buildPdf(arquivo.pecas.map((peca) => paginaDeTexto(peca.texto, { seed, ...(peca.classe === 'prancha' ? { folha: arquivo.folha ?? 'A3' } : {}) })))).bytes
      } else if (arquivo.formato === 'pdf-digitalizado') bytes = await pdfDigitalizado(arquivo.pecas[0].texto, arquivo.qualidade, seed)
      else bytes = await imagemAvulsa(arquivo.pecas[0].texto, 'jpeg', arquivo.qualidade, seed)
      arquivos.push({ nome: arquivo.nome, bytes })
      const pecas = 'pecas' in arquivo ? arquivo.pecas : []
      const [primeira] = pecas
      anexos.push({
        nome: arquivo.nome,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        classe: arquivo.formato === 'dxf' ? 'cad' : (primeira?.classe ?? null),
        classesNoArquivo: arquivo.formato === 'dxf' ? ['cad'] : pecas.map((peca) => peca.classe),
        leitura: arquivo.formato === 'pdf' ? 'camada-de-texto' : arquivo.formato === 'dxf' ? 'nao-interpretado' : 'ocr',
        campos: arquivo.formato === 'dxf' ? { lote: D.lote, quadra: D.quadra } : (primeira?.texto.campos ?? {}),
        estados: primeira?.estados ?? {},
        normalizados: primeira?.normalizados ?? {},
      })
    }
    pacotes.push({
      gabarito: gabaritoIndependenteSchema.parse({
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
