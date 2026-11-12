import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { ClasseDocumental, NomeCampo, estadosCampo } from '../../../shared/contracts/triage.ts'
import { buildPdf } from '../../comparison/evaluation/corpus-pdf.ts'
import { dwgFicticio, imagemAvulsa, paginaDeTexto, pdfDigitalizado, type Qualidade, type TextoDaPeca } from './documents.ts'
import { expectativaRegraSchema, type ExpectativaRegra } from './gabarito.ts'
import { PROTOCOLADO_EM } from './generate.ts'
import { gabaritoValidacaoAnexoSchema } from './validacao.ts'

/**
 * Segundo conjunto independente (NOV-01 a 16), criado na E6.1 depois das correções feitas a partir
 * do conjunto IND. Mesmas regras do IND: gabarito escrito à mão, gravado em
 * `docs/triagem/casos/novo-gabarito.json` com SHA-256 e commitado antes da primeira execução do
 * motor; o teste `novo.test.ts` falha se mudar.
 *
 * Variações deste conjunto: rótulos com travessão em vez de dois-pontos, campos em linha separados
 * por barras, revisões em vários formatos ("Rev. 02 – data", "REVISÃO: 2 (data)", "Revisão nº 3 de
 * data"), certidão vintenária, espelho do cadastro, RRT do CAU, prancha em A2 sem "prancha/planta" no
 * título, vários imóveis com e sem lacuna, JPG girado, certidão digitalizada com ruído, DRT e RRT no
 * mesmo PDF. Mesmo limite do IND: o autor do conjunto é o mesmo do motor.
 */

export const gabaritoNovoSchema = z.strictObject({
  id: z.string().regex(/^NOV-\d{2}$/u),
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
export type GabaritoNovo = z.infer<typeof gabaritoNovoSchema>

export interface PacoteNovo {
  gabarito: GabaritoNovo
  arquivos: { nome: string; bytes: Uint8Array }[]
}

const D = {
  titular: 'Rosa Teste Ficcional',
  rtNome: 'Igor Engenheiro Simulado',
  rtRegistro: 'CREA-FIC 004321',
  lote: '22',
  quadra: '5',
  parcelamento: 'Parque Ilusorio',
  bairro: 'Jardim Demonstrativo',
  matricula: '101.202',
  cartorio: 'Cartório do 3º Registro de Imóveis Fictício',
  inscricao: '7777.0001.022',
  area: '420,00 m²',
  emissao: '01/11/2026',
  revisao: '03/11/2026',
}
type Dados = typeof D
/** Segundo imóvel (para os pacotes com dois imóveis). */
const D2: Dados = { ...D, lote: '23', matricula: '101.203', inscricao: '7777.0001.023' }

type Estado = (typeof estadosCampo)[number]

interface Peca {
  classe: ClasseDocumental
  texto: TextoDaPeca
  estados?: Partial<Record<NomeCampo, Estado>>
  normalizados?: Partial<Record<NomeCampo, string | number>>
}

// ---------- modelos ----------

/** Requerimento com rótulos padrão, e opção de dois imóveis. */
function requerimento(d: Dados, opcoes: { segundo?: Dados } = {}): Peca {
  const segundo = opcoes.segundo
  return {
    classe: 'requerimento',
    texto: {
      titulo: 'REQUERIMENTO - PROCESSO CARTOGRÁFICO DE DESDOBRO',
      linhas: [
        'Assunto: Desdobro',
        `Proprietária: ${d.titular}`,
        segundo ? `Lote: ${d.lote} e Lote: ${segundo.lote}   Quadra: ${d.quadra}` : `Lote: ${d.lote}   Quadra: ${d.quadra}`,
        `Parcelamento: ${d.parcelamento}   Bairro: ${d.bairro}`,
        segundo ? `Matrícula: ${d.matricula} e Matrícula: ${segundo.matricula}` : `Matrícula: ${d.matricula}`,
        `Inscrição imobiliária: ${d.inscricao}`,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
        `Assina este requerimento: ${d.titular}, na qualidade de proprietária.`,
      ],
      campos: {
        assunto: 'Desdobro',
        titular: d.titular,
        quadra: d.quadra,
        parcelamento: d.parcelamento,
        bairro: d.bairro,
        inscricao: d.inscricao,
        'rt-nome': d.rtNome,
        'rt-registro': d.rtRegistro,
        signatario: d.titular,
        ...(segundo ? {} : { lote: d.lote, matricula: d.matricula }),
      },
      assinaturas: ['Assinatura do(a) requerente'],
    },
    ...(segundo ? { estados: { lote: 'varios-valores' as const, matricula: 'varios-valores' as const } } : {}),
  }
}

/** Requerimento com rótulos em travessão e campos em linha separados por barras. */
function requerimentoTravessao(d: Dados): Peca {
  return {
    classe: 'requerimento',
    texto: {
      titulo: 'REQUERIMENTO',
      linhas: [
        'Assunto — Desdobro',
        `Proprietária — ${d.titular}`,
        `Lote ${d.lote} | Quadra ${d.quadra} | Matrícula ${d.matricula}`,
        `Bairro — ${d.bairro}`,
        `Responsável técnico — ${d.rtNome} (${d.rtRegistro})`,
        `Assina este requerimento: ${d.titular}.`,
      ],
      campos: { assunto: 'Desdobro', titular: d.titular, lote: d.lote, quadra: d.quadra, matricula: d.matricula, bairro: d.bairro, 'rt-nome': d.rtNome, signatario: d.titular },
      assinaturas: ['Assinatura do(a) requerente'],
    },
  }
}

function drt(d: Dados): Peca {
  return {
    classe: 'drt-01',
    texto: {
      titulo: 'DRT 01',
      linhas: ['Declaração de Responsabilidade Técnica para desdobro', 'Assunto: Desdobro', `Profissional: ${d.rtNome} - ${d.rtRegistro}`],
      campos: { assunto: 'Desdobro', 'rt-nome': d.rtNome, 'rt-registro': d.rtRegistro },
      assinaturas: ['Assinatura do responsável técnico'],
    },
  }
}

function certidaoVintenaria(d: Dados, opcoes: { emissao?: string } = {}): Peca {
  const emissao = opcoes.emissao ?? d.emissao
  return {
    classe: 'matricula-transcricao',
    texto: {
      titulo: `CERTIDÃO VINTENÁRIA - MATRÍCULA Nº ${d.matricula}`,
      linhas: [d.cartorio, `Imóvel: lote ${d.lote} da quadra ${d.quadra} do ${d.parcelamento}, com área de ${d.area}.`, `Proprietária: ${d.titular}.`, `Certidão emitida em ${emissao}.`],
      campos: { matricula: d.matricula, cartorio: d.cartorio, lote: d.lote, quadra: d.quadra, parcelamento: d.parcelamento, area: d.area, titular: d.titular, 'data-emissao': emissao },
      assinaturas: [],
    },
    normalizados: { matricula: d.matricula.replace('.', '') },
  }
}

function espelhoCadastral(d: Dados): Peca {
  return {
    classe: 'inscricao-imobiliaria',
    texto: {
      titulo: 'ESPELHO CADASTRAL DO IMÓVEL',
      linhas: [`Inscrição imobiliária: ${d.inscricao}`, `Lote: ${d.lote}   Quadra: ${d.quadra}`, `Bairro: ${d.bairro}`],
      campos: { inscricao: d.inscricao, lote: d.lote, quadra: d.quadra, bairro: d.bairro },
      assinaturas: [],
    },
  }
}

function rrt(d: Dados): Peca {
  return {
    classe: 'art-rrt-similar',
    texto: {
      titulo: 'RRT - REGISTRO DE RESPONSABILIDADE TÉCNICA',
      linhas: [`Profissional: ${d.rtNome} - ${d.rtRegistro}`, `Contratante: ${d.titular}`, 'Atividade: projeto de desdobro', `Lote: ${d.lote}   Quadra: ${d.quadra}`],
      campos: { 'rt-nome': d.rtNome, 'rt-registro': d.rtRegistro, titular: d.titular, lote: d.lote, quadra: d.quadra },
      assinaturas: ['Assinatura do profissional'],
    },
  }
}

function prancha(d: Dados, opcoes: { titulo?: string; revisao?: string; folha?: 'A3' | 'A2' } = {}): Peca {
  const revisao = opcoes.revisao ?? `Rev. 02 – ${d.revisao}`
  const folha = opcoes.folha ?? 'A3'
  const data = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/u.exec(revisao)?.[1] ?? d.revisao
  return {
    classe: 'prancha',
    texto: {
      titulo: opcoes.titulo ?? 'PRANCHA ÚNICA - DESDOBRO',
      linhas: [
        `Lote: ${d.lote}   Quadra: ${d.quadra}   Matrícula: ${d.matricula}`,
        `Situação atual: lote ${d.lote} - ${d.area}`,
        'Planta de situação - escala 1:10.000',
        `Folha ${folha}`,
        revisao,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
      ],
      campos: { lote: d.lote, quadra: d.quadra, matricula: d.matricula, area: d.area, 'escala-situacao': '1:10.000', 'formato-folha': folha, 'data-revisao': data, 'rt-nome': d.rtNome },
      assinaturas: ['Assinatura do responsável técnico'],
    },
  }
}

function memorial(d: Dados, opcoes: { revisao?: string } = {}): Peca {
  const revisao = opcoes.revisao ?? `REVISÃO: 2 (${d.revisao.replaceAll('/', '.')})`
  const data = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/u.exec(revisao)?.[1] ?? d.revisao
  return {
    classe: 'memorial',
    texto: {
      titulo: 'MEMORIAL DESCRITIVO',
      linhas: [
        'Assunto: Desdobro',
        `Imóvel: lote ${d.lote} da quadra ${d.quadra}, matrícula ${d.matricula}.`,
        'Perímetro: inicia no marco 1 e segue até o marco 2.',
        `Área total: ${d.area}`,
        revisao,
        `Responsável técnico: ${d.rtNome} - ${d.rtRegistro}`,
      ],
      campos: { assunto: 'Desdobro', lote: d.lote, quadra: d.quadra, matricula: d.matricula, area: d.area, 'data-revisao': data, 'rt-nome': d.rtNome },
      assinaturas: ['Assinatura do responsável técnico'],
    },
  }
}

// ---------- montagem ----------

type Arquivo =
  | { nome: string; formato: 'pdf'; pecas: Peca[]; folha?: 'A3' | 'A2' }
  | { nome: string; formato: 'pdf-digitalizado'; pecas: [Peca]; qualidade: Qualidade }
  | { nome: string; formato: 'jpeg'; pecas: [Peca]; qualidade: Qualidade; rotacao: 0 | 90 }
  | { nome: string; formato: 'dwg' }

const R = (numero: string) => `AQR-GCA-${numero}`
const espera = (aceitaveis: ExpectativaRegra['aceitaveis'], motivo: string, tipo?: ExpectativaRegra['tipo']): ExpectativaRegra => ({ aceitaveis, motivo, ...(tipo ? { tipo } : {}) })
const lidoOuNao = (motivo: string) => espera(['sem-achado', 'nao-avaliavel'], motivo)

function completo(d: Dados = D): Arquivo[] {
  return [
    { nome: 'a-requerimento.pdf', formato: 'pdf', pecas: [requerimento(d)] },
    { nome: 'b-drt.pdf', formato: 'pdf', pecas: [drt(d)] },
    { nome: 'c-certidao.pdf', formato: 'pdf', pecas: [certidaoVintenaria(d)] },
    { nome: 'd-espelho.pdf', formato: 'pdf', pecas: [espelhoCadastral(d)] },
    { nome: 'e-rrt.pdf', formato: 'pdf', pecas: [rrt(d)] },
    { nome: 'f-prancha.pdf', formato: 'pdf', pecas: [prancha(d)], folha: 'A3' },
    { nome: 'g-desenho.dwg', formato: 'dwg' },
    { nome: 'h-memorial.pdf', formato: 'pdf', pecas: [memorial(d)] },
  ]
}

function trocar(arquivos: Arquivo[], nome: string, novo: Arquivo | null): Arquivo[] {
  if (!arquivos.some((arquivo) => arquivo.nome === nome)) throw new Error(`sem ${nome}`)
  return novo ? arquivos.map((arquivo) => (arquivo.nome === nome ? novo : arquivo)) : arquivos.filter((arquivo) => arquivo.nome !== nome)
}

const BASE: Record<string, ExpectativaRegra> = {
  [R('001')]: espera(['sem-achado'], 'Assunto "Desdobro" no requerimento.'),
  [R('002')]: espera(['sem-achado'], 'Requerimento presente.'),
  [R('003')]: espera(['sem-achado'], 'DRT 01 presente.'),
  [R('006')]: espera(['sem-achado'], 'Espelho cadastral com a inscrição do lote.'),
  [R('008')]: espera(['sem-achado'], 'Certidão vintenária da matrícula presente.'),
  [R('009')]: espera(['achado'], 'Emissão legível: alerta de conferência de prazo, sem critério de contagem.', 'condicao-indeterminada'),
  [R('010')]: espera(['nao-aplicavel', 'sem-achado'], 'A proprietária assina.'),
  [R('011')]: espera(['sem-achado'], 'RRT presente.'),
  [R('012')]: espera(['sem-achado'], 'Prancha em PDF e DWG.'),
  [R('013')]: espera(['sem-achado'], 'Memorial em PDF.'),
  [R('016')]: espera(['sem-achado'], 'Prancha e memorial assinados.'),
  [R('018')]: espera(['sem-achado'], 'RRT coerente com requerimento e matrícula.'),
  [R('019')]: espera(['sem-achado'], 'Desdobro em todas as peças com assunto.'),
  [R('020')]: espera(['sem-achado'], 'Mesmos matrícula, lote, quadra, inscrição e bairro.'),
  [R('021')]: espera(['sem-achado'], 'Prancha "Rev. 02 – 03/11/2026" e memorial "REVISÃO: 2 (03.11.2026)": mesma data.'),
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
  arquivos: Arquivo[]
  regras: Record<string, ExpectativaRegra>
}

/** Pacote com dois imóveis declarados e, por padrão, os dois títulos e as duas inscrições. */
function doisImoveis(opcoes: { semSegundoTitulo?: boolean; semSegundaInscricao?: boolean } = {}): Arquivo[] {
  return [
    ...trocar(completo(), 'a-requerimento.pdf', { nome: 'a-requerimento.pdf', formato: 'pdf', pecas: [requerimento(D, { segundo: D2 })] }),
    ...(opcoes.semSegundoTitulo ? [] : [{ nome: 'c2-certidao.pdf', formato: 'pdf' as const, pecas: [certidaoVintenaria(D2)] }]),
    ...(opcoes.semSegundaInscricao ? [] : [{ nome: 'd2-espelho.pdf', formato: 'pdf' as const, pecas: [espelhoCadastral(D2)] }]),
  ]
}

export const DEFINICOES_NOVAS: Definicao[] = [
  { id: 'NOV-01', titulo: 'Pacote completo com revisões "Rev. 02 – data" e "REVISÃO: 2 (data)"', arquivos: completo(), regras: base() },
  {
    id: 'NOV-02',
    titulo: 'Revisões com datas diferentes na prancha e no memorial',
    arquivos: trocar(completo(), 'h-memorial.pdf', { nome: 'h-memorial.pdf', formato: 'pdf', pecas: [memorial(D, { revisao: 'Revisão nº 3 de 05/11/2026' })] }),
    regras: { ...base(['021']), [R('021')]: espera(['achado'], 'Prancha 03/11/2026, memorial 05/11/2026.', 'divergencia') },
  },
  {
    id: 'NOV-03',
    titulo: 'Revisão com ano de dois dígitos na prancha',
    arquivos: trocar(completo(), 'f-prancha.pdf', { nome: 'f-prancha.pdf', formato: 'pdf', pecas: [prancha(D, { revisao: 'Rev. 1 – 03/11/26' })], folha: 'A3' }),
    regras: { ...base(['021']), [R('021')]: espera(['nao-avaliavel'], 'Data ambígua na prancha: a comparação não pode concluir.') },
  },
  {
    id: 'NOV-04',
    titulo: 'Prancha em A2 sem "prancha" ou "planta" no título',
    arquivos: trocar(completo(), 'f-prancha.pdf', { nome: 'f-prancha.pdf', formato: 'pdf', pecas: [prancha(D, { titulo: 'DESDOBRO DO LOTE 22 - QUADRA 5', folha: 'A2' })], folha: 'A2' }),
    regras: { ...base(['023']), [R('012')]: espera(['sem-achado', 'nao-avaliavel'], 'A peça é a prancha; reconhecê-la sem título é desejável, abster-se é aceitável.'), [R('023')]: espera(['sem-achado', 'nao-avaliavel'], 'A2 é permitido; depende de a peça ser reconhecida.'), [R('021')]: espera(['sem-achado', 'nao-avaliavel'], 'Mesma data; depende de a peça ser reconhecida.'), [R('022')]: espera(['sem-achado', 'nao-avaliavel'], 'Escala 1:10.000; depende de a peça ser reconhecida.'), [R('016')]: espera(['sem-achado', 'nao-avaliavel'], 'Assinada; depende de a peça ser reconhecida.') },
  },
  {
    id: 'NOV-05',
    titulo: 'Dois imóveis declarados, com os dois títulos e as duas inscrições',
    arquivos: doisImoveis(),
    regras: { ...base(['020']), [R('008')]: espera(['sem-achado'], 'Cada matrícula declarada tem certidão.'), [R('006')]: espera(['sem-achado'], 'Cada lote declarado tem espelho cadastral.'), [R('020')]: espera(['sem-achado', 'nao-avaliavel'], 'Peças coerentes com os imóveis declarados.') },
  },
  {
    id: 'NOV-06',
    titulo: 'Dois imóveis declarados, só um título, pacote completo',
    arquivos: doisImoveis({ semSegundoTitulo: true }),
    regras: { ...base(['008', '020']), [R('008')]: espera(['achado'], 'Matrícula 101.203 declarada sem certidão (ensaio T03).', 'nao-localizado') },
  },
  {
    id: 'NOV-07',
    titulo: 'Dois lotes declarados, só uma inscrição, pacote completo',
    arquivos: doisImoveis({ semSegundaInscricao: true }),
    regras: { ...base(['006', '020']), [R('006')]: espera(['achado'], 'Lote 23 declarado sem documento de inscrição.', 'nao-localizado') },
  },
  {
    id: 'NOV-08',
    titulo: 'Dois imóveis declarados, só um título, pacote parcial',
    integridadeDoPacote: 'parcial',
    arquivos: doisImoveis({ semSegundoTitulo: true }),
    regras: { ...base(['008', '020']), [R('008')]: espera(['nao-avaliavel'], 'Pacote parcial: o segundo título pode estar no que não veio.') },
  },
  {
    id: 'NOV-09',
    titulo: 'Requerimento com rótulos em travessão e campos separados por barras',
    arquivos: trocar(completo(), 'a-requerimento.pdf', { nome: 'a-requerimento.pdf', formato: 'pdf', pecas: [requerimentoTravessao(D)] }),
    regras: {
      ...base(['001', '010', '019', '020']),
      [R('001')]: espera(['sem-achado', 'achado'], 'O assunto está lá; rótulo com travessão pode não ser lido (alerta de classificação humana é aceitável, não conclusão).'),
      [R('010')]: espera(['nao-aplicavel', 'sem-achado', 'nao-avaliavel'], 'A proprietária assina.'),
    },
  },
  {
    id: 'NOV-10',
    titulo: 'Certidão digitalizada com ruído',
    arquivos: trocar(completo(), 'c-certidao.pdf', { nome: 'c-certidao.pdf', formato: 'pdf-digitalizado', pecas: [certidaoVintenaria(D)], qualidade: 'ruido' }),
    regras: { ...base(['008', '009', '020']), [R('008')]: lidoOuNao('A certidão está lá; leitura difícil nunca é ausência.'), [R('009')]: espera(['achado', 'nao-avaliavel'], 'Depende da leitura da data.') },
  },
  {
    id: 'NOV-11',
    titulo: 'Requerimento em JPG girado 90°',
    arquivos: trocar(completo(), 'a-requerimento.pdf', { nome: 'a-requerimento.jpg', formato: 'jpeg', pecas: [requerimento(D)], qualidade: 'boa', rotacao: 90 }),
    regras: { ...base(['001', '010', '019', '020']), [R('002')]: lidoOuNao('Requerimento presente, em imagem girada.') },
  },
  {
    id: 'NOV-12',
    titulo: 'DRT e RRT no mesmo PDF',
    arquivos: trocar(trocar(completo(), 'e-rrt.pdf', null), 'b-drt.pdf', { nome: 'b-drt-e-rrt.pdf', formato: 'pdf', pecas: [drt(D), rrt(D)] }),
    regras: { ...base(['003', '011', '018']), [R('003')]: lidoOuNao('DRT na página 1 do composto.'), [R('011')]: lidoOuNao('RRT na página 2 do composto.') },
  },
  {
    id: 'NOV-13',
    titulo: 'Sem espelho cadastral, pacote completo',
    arquivos: trocar(completo(), 'd-espelho.pdf', null),
    regras: { ...base(['006', '020']), [R('006')]: espera(['achado'], 'Nenhum documento de inscrição entre os anexos.', 'nao-localizado') },
  },
  {
    id: 'NOV-14',
    titulo: 'Memorial com data em tabela de revisões (duas datas)',
    arquivos: trocar(completo(), 'h-memorial.pdf', { nome: 'h-memorial.pdf', formato: 'pdf', pecas: [{ ...memorial(D, { revisao: 'Revisão 00 - 01/10/2026   Revisão 01 - 03/11/2026' }), estados: { 'data-revisao': 'varios-valores' } }] }),
    regras: { ...base(['021']), [R('021')]: espera(['nao-avaliavel'], 'Duas datas de revisão no memorial: o sistema não escolhe a vigente.') },
  },
  {
    id: 'NOV-15',
    titulo: 'Requerimento cita matrícula diferente da certidão',
    arquivos: trocar(completo(), 'a-requerimento.pdf', { nome: 'a-requerimento.pdf', formato: 'pdf', pecas: [requerimento({ ...D, matricula: '101.220' })] }),
    regras: { ...base(['008', '020']), [R('020')]: espera(['achado'], 'Requerimento 101.220; certidão, prancha e memorial 101.202.', 'divergencia'), [R('008')]: espera(['sem-achado', 'achado', 'nao-avaliavel'], 'Há certidão; a correspondência do número é a regra 020.') },
  },
  {
    id: 'NOV-16',
    titulo: 'Sem DRT, integridade desconhecida',
    integridadeDoPacote: 'desconhecida',
    arquivos: trocar(completo(), 'b-drt.pdf', null),
    regras: { ...base(['003', '019']), [R('003')]: espera(['nao-avaliavel'], 'Integridade desconhecida.') },
  },
]

export async function gerarNovo(): Promise<PacoteNovo[]> {
  const pacotes: PacoteNovo[] = []
  for (const [indicePacote, definicao] of DEFINICOES_NOVAS.entries()) {
    const arquivos: PacoteNovo['arquivos'] = []
    const anexos: GabaritoNovo['anexos'] = []
    for (const [indice, arquivo] of definicao.arquivos.entries()) {
      const seed = 5000 + indicePacote * 50 + indice
      let bytes: Uint8Array
      if (arquivo.formato === 'dwg') bytes = dwgFicticio(seed)
      else if (arquivo.formato === 'pdf') bytes = (await buildPdf(arquivo.pecas.map((peca) => paginaDeTexto(peca.texto, { seed, ...(peca.classe === 'prancha' ? { folha: arquivo.folha ?? 'A3' } : {}) })))).bytes
      else if (arquivo.formato === 'pdf-digitalizado') bytes = await pdfDigitalizado(arquivo.pecas[0].texto, arquivo.qualidade, seed)
      else bytes = await imagemAvulsa(arquivo.pecas[0].texto, 'jpeg', arquivo.qualidade, seed, arquivo.rotacao)
      arquivos.push({ nome: arquivo.nome, bytes })
      const pecas = 'pecas' in arquivo ? arquivo.pecas : []
      const [primeira] = pecas
      anexos.push({
        nome: arquivo.nome,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        classe: arquivo.formato === 'dwg' ? 'cad' : (primeira?.classe ?? null),
        classesNoArquivo: arquivo.formato === 'dwg' ? ['cad'] : pecas.map((peca) => peca.classe),
        leitura: arquivo.formato === 'pdf' ? 'camada-de-texto' : arquivo.formato === 'dwg' ? 'nao-interpretado' : 'ocr',
        campos: primeira?.texto.campos ?? {},
        estados: primeira?.estados ?? {},
        normalizados: primeira?.normalizados ?? {},
      })
    }
    pacotes.push({
      gabarito: gabaritoNovoSchema.parse({
        id: definicao.id,
        titulo: definicao.titulo,
        entrada: { modalidade: 'D', etapa: 'abertura', protocoladoEm: PROTOCOLADO_EM, integridadeDoPacote: definicao.integridadeDoPacote ?? 'completo', condicoesConfirmadas: [] },
        anexos,
        regras: definicao.regras,
      }),
      arquivos,
    })
  }
  return pacotes
}
