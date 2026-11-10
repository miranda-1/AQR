import type { ResultadoRegra } from '../../../shared/contracts/triage.ts'
import type { Imovel, Peca, Qualidade } from './documents.ts'
import type { CategoriaCorpus, ExpectativaRegra } from './gabarito.ts'

/**
 * Pacotes fictícios de desdobro (D) na etapa de abertura, com o gabarito escrito à mão.
 *
 * As expectativas de regra seguem a lógica do catálogo (`docs/triagem/catalogo/regras_aqr_gca.json`)
 * e as leituras registradas na reconciliação (R6, R9). Regras sem expectativa num pacote ficam
 * sem afirmação: o pacote não foi feito para elas. Quando mais de uma saída é defensável, todas
 * as aceitáveis são listadas; "achado" de ausência nunca é aceitável quando o documento existe
 * e só não pôde ser lido.
 */

export type Formato = 'pdf' | 'pdf-digitalizado' | 'jpeg' | 'png' | 'dxf' | 'dwg' | 'docx'
export type Defeito = 'corrompido' | 'senha' | 'vazio' | 'executavel' | 'zip-comum' | 'zip-caminho-perigoso' | 'rar' | 'texto-simples'

export interface EspecAnexo {
  peca: Peca
  formato: Formato
  nome?: string
  /** Dados desta peça que diferem do imóvel do pacote (divergências). */
  imovel?: Partial<Imovel>
  qualidade?: Qualidade
  rotacao?: 0 | 90
  /** `false`: áreas de assinatura vazias. */
  assinado?: boolean
  /** Substitui o conteúdo pelo arquivo problemático. */
  defeito?: Defeito
  observacao?: string
}

export interface DefinicaoPacote {
  id: string
  titulo: string
  categorias: CategoriaCorpus[]
  ensaios?: string[]
  imovel?: Partial<Imovel>
  integridadeDoPacote?: 'completo' | 'parcial' | 'desconhecida'
  condicoesConfirmadas?: { id: string; valor: boolean }[]
  anexos: EspecAnexo[]
  regras: Record<string, ExpectativaRegra>
}

// ---------- peças ----------

type Chave = 'requerimento' | 'drt-01' | 'matricula' | 'ficha-cadastral' | 'art' | 'prancha' | 'cad' | 'memorial'

const COMPLETO: Record<Chave, EspecAnexo> = {
  requerimento: { peca: 'requerimento', formato: 'pdf' },
  'drt-01': { peca: 'drt-01', formato: 'pdf' },
  matricula: { peca: 'matricula', formato: 'pdf' },
  'ficha-cadastral': { peca: 'ficha-cadastral', formato: 'pdf' },
  art: { peca: 'art', formato: 'pdf' },
  prancha: { peca: 'prancha', formato: 'pdf' },
  cad: { peca: 'cad', formato: 'dxf' },
  memorial: { peca: 'memorial', formato: 'pdf' },
}

/** Pacote completo de desdobro, com trocas, remoções e acréscimos. */
function pecas(alteracoes: { trocar?: Partial<Record<Chave, EspecAnexo>>; remover?: Chave[]; acrescentar?: EspecAnexo[] } = {}): EspecAnexo[] {
  const keys = Object.keys(COMPLETO) as Chave[]
  return [
    ...keys.filter((key) => !alteracoes.remover?.includes(key)).map((key) => alteracoes.trocar?.[key] ?? COMPLETO[key]),
    ...(alteracoes.acrescentar ?? []),
  ]
}

// ---------- expectativas ----------

const R = (numero: string) => `AQR-GCA-${numero}`
const espera = (aceitaveis: ResultadoRegra[], motivo: string, tipo?: ExpectativaRegra['tipo']): ExpectativaRegra => ({ aceitaveis, motivo, ...(tipo ? { tipo } : {}) })
const semAchado = (motivo: string) => espera(['sem-achado'], motivo)
const achado = (motivo: string, tipo?: ExpectativaRegra['tipo']) => espera(['achado'], motivo, tipo)
const naoAvaliavel = (motivo: string) => espera(['nao-avaliavel'], motivo)
const lidoOuNaoAvaliavel = (motivo: string) => espera(['sem-achado', 'nao-avaliavel'], motivo)

/** Pacote completo, legível e coerente: nenhuma regra de documento acha nada; a 028 espera servidor. */
const BASE: Record<string, ExpectativaRegra> = {
  [R('001')]: semAchado('Assunto declarado e impresso no requerimento: DESDOBRO.'),
  [R('002')]: semAchado('Requerimento presente.'),
  [R('003')]: semAchado('DRT 01 presente.'),
  [R('006')]: semAchado('Ficha cadastral do lote presente.'),
  [R('008')]: semAchado('Matrícula do lote presente.'),
  [R('010')]: espera(['nao-aplicavel', 'sem-achado'], 'A própria proprietária assina: não há representação a comprovar.'),
  [R('011')]: semAchado('ART do projeto presente.'),
  [R('012')]: semAchado('Prancha em PDF e desenho CAD presentes.'),
  [R('013')]: semAchado('Memorial em PDF presente.'),
  [R('016')]: semAchado('Área de assinatura do RT preenchida na prancha e no memorial.'),
  [R('018')]: semAchado('ART coerente com requerimento e matrícula.'),
  [R('019')]: semAchado('Assunto DESDOBRO em todas as peças.'),
  [R('020')]: semAchado('Matrícula, lote, quadra, inscrição e bairro coincidem.'),
  [R('021')]: semAchado('Mesma data na prancha e no memorial.'),
  [R('022')]: semAchado('Planta de situação em 1:10.000.'),
  [R('023')]: semAchado('Prancha A3, formato aceito pelo TR 002.'),
  [R('028')]: espera(['condicao-pendente'], 'A regra só roda com a área acima de 2 ha confirmada por servidor; nenhuma confirmação no cenário.'),
  [R('043')]: semAchado('Todos os arquivos abrem e têm o formato que dizem ter.'),
}

/** A base sem as regras que o pacote afeta de forma não trivial. */
function base(omitir: string[] = []): Record<string, ExpectativaRegra> {
  return Object.fromEntries(Object.entries(BASE).filter(([id]) => !omitir.map(R).includes(id)))
}

const IMOVEL_2HA = (area: string): Partial<Imovel> => ({ area, lotesFinais: 'F7A e F7B (áreas no quadro)' })

// ---------- pacotes ----------

export const PACOTES: DefinicaoPacote[] = [
  {
    id: 'DSD-01',
    titulo: 'Pacote completo, PDFs com texto e desenho DXF',
    categorias: ['completo'],
    ensaios: ['T01'],
    anexos: pecas(),
    regras: base(),
  },
  {
    id: 'DSD-02',
    titulo: 'Pacote completo com desenho DWG no lugar do DXF',
    categorias: ['completo', 'formato'],
    anexos: pecas({ trocar: { cad: { peca: 'cad', formato: 'dwg' } } }),
    regras: base(),
  },
  {
    id: 'DSD-03',
    titulo: 'Pacote completo com a matrícula digitalizada (boa qualidade)',
    categorias: ['completo', 'digitalizado'],
    anexos: pecas({ trocar: { matricula: { peca: 'matricula', formato: 'pdf-digitalizado', qualidade: 'boa' } } }),
    regras: { ...base(['008', '020']), [R('008')]: lidoOuNaoAvaliavel('Matrícula presente, só como imagem.'), [R('020')]: lidoOuNaoAvaliavel('Dados da matrícula dependem do OCR.') },
  },
  {
    id: 'DSD-04',
    titulo: 'Pacote completo com a ficha cadastral em JPG',
    categorias: ['completo', 'formato', 'digitalizado'],
    anexos: pecas({ trocar: { 'ficha-cadastral': { peca: 'ficha-cadastral', formato: 'jpeg', qualidade: 'boa' } } }),
    regras: { ...base(['006', '020']), [R('006')]: lidoOuNaoAvaliavel('Ficha presente em JPG, formato aceito pelo TR 002.'), [R('020')]: lidoOuNaoAvaliavel('Inscrição depende do OCR.') },
  },
  {
    id: 'DSD-05',
    titulo: 'Pacote completo com requerimento em JPG e ficha cadastral em PNG',
    categorias: ['completo', 'formato', 'digitalizado'],
    anexos: pecas({
      trocar: {
        requerimento: { peca: 'requerimento', formato: 'jpeg', qualidade: 'boa' },
        'ficha-cadastral': { peca: 'ficha-cadastral', formato: 'png', qualidade: 'boa' },
      },
    }),
    regras: {
      ...base(['001', '002', '006', '010', '019', '020']),
      [R('002')]: lidoOuNaoAvaliavel('Requerimento presente em JPG.'),
      [R('006')]: lidoOuNaoAvaliavel('Ficha presente em PNG.'),
      [R('043')]: achado('Ficha em PNG; a regra 043 compara com JPG/PDF para documentos administrativos.', 'formato-incompativel'),
    },
  },
  {
    id: 'DSD-06',
    titulo: 'Sem requerimento',
    categorias: ['incompleto'],
    anexos: pecas({ remover: ['requerimento'] }),
    regras: {
      ...base(['001', '002', '010', '019', '020']),
      [R('002')]: achado('Nenhum anexo recebido é requerimento.', 'nao-localizado'),
      [R('010')]: espera(['nao-avaliavel', 'nao-aplicavel'], 'Sem requerimento não há signatário a comparar.'),
    },
  },
  {
    id: 'DSD-07',
    titulo: 'Sem DRT 01',
    categorias: ['incompleto'],
    anexos: pecas({ remover: ['drt-01'] }),
    regras: { ...base(['003', '019']), [R('003')]: achado('Nenhum anexo recebido é DRT 01.', 'nao-localizado') },
  },
  {
    id: 'DSD-08',
    titulo: 'DRT 03 (retificação) no lugar da DRT 01',
    categorias: ['documento-trocado'],
    ensaios: ['T04'],
    anexos: pecas({ trocar: { 'drt-01': { peca: 'drt-03', formato: 'pdf', nome: 'drt.pdf' } } }),
    regras: {
      ...base(['003', '019']),
      [R('003')]: achado('Só há DRT 03; o catálogo diz que ela não substitui a DRT 01.', 'nao-localizado'),
      [R('019')]: achado('A DRT traz assunto de retificação; as demais peças, desdobro.', 'divergencia'),
    },
  },
  {
    id: 'DSD-09',
    titulo: 'Sem matrícula',
    categorias: ['incompleto'],
    anexos: pecas({ remover: ['matricula'] }),
    regras: { ...base(['008', '020']), [R('008')]: achado('Nenhum anexo recebido é certidão de matrícula ou transcrição.', 'nao-localizado'), [R('009')]: naoAvaliavel('Sem título não há data de emissão.') },
  },
  {
    id: 'DSD-10',
    titulo: 'Sem documento de inscrição imobiliária',
    categorias: ['incompleto'],
    anexos: pecas({ remover: ['ficha-cadastral'] }),
    regras: { ...base(['006', '020']), [R('006')]: achado('Nenhum anexo recebido é ficha cadastral, IPTU ou extrato do lote.', 'nao-localizado') },
  },
  {
    id: 'DSD-11',
    titulo: 'Sem ART ou RRT',
    categorias: ['incompleto'],
    anexos: pecas({ remover: ['art'] }),
    regras: {
      ...base(['011', '018']),
      [R('011')]: achado('Nenhum anexo recebido é ART, RRT ou similar.', 'nao-localizado'),
      [R('018')]: espera(['nao-avaliavel', 'nao-aplicavel'], 'Sem ART não há campos a comparar.'),
    },
  },
  {
    id: 'DSD-12',
    titulo: 'Prancha em PDF sem desenho CAD',
    categorias: ['incompleto'],
    anexos: pecas({ remover: ['cad'] }),
    regras: { ...base(['012']), [R('012')]: achado('Há PDF da prancha, mas nenhum DWG ou DXF.', 'nao-localizado') },
  },
  {
    id: 'DSD-13',
    titulo: 'Desenho CAD sem prancha em PDF',
    categorias: ['incompleto'],
    anexos: pecas({ remover: ['prancha'] }),
    regras: {
      ...base(['012', '016', '019', '020', '021', '022', '023']),
      [R('012')]: achado('Há DXF, mas nenhum PDF da prancha.', 'nao-localizado'),
      [R('021')]: espera(['nao-avaliavel', 'nao-aplicavel'], 'Sem prancha não há data a comparar com o memorial.'),
      [R('022')]: espera(['nao-avaliavel', 'nao-aplicavel'], 'Sem prancha não há planta de situação.'),
      [R('023')]: espera(['nao-avaliavel', 'nao-aplicavel'], 'Sem prancha não há formato a conferir.'),
    },
  },
  {
    id: 'DSD-14',
    titulo: 'Memorial só em DOCX',
    categorias: ['incompleto', 'formato'],
    ensaios: ['T02'],
    anexos: pecas({ trocar: { memorial: { peca: 'memorial', formato: 'docx' } } }),
    regras: {
      ...base(['013', '016', '019', '020', '021', '043']),
      [R('013')]: achado('O memorial veio só em DOCX; o TR 002 pede PDF.'),
      [R('043')]: espera(['achado', 'sem-achado'], 'Memorial em DOCX também pode ser apontado como formato; a 013 já cobre.', 'formato-incompativel'),
      [R('021')]: espera(['nao-avaliavel', 'sem-achado'], 'O conteúdo do DOCX não é interpretado nesta fase.'),
    },
  },
  {
    id: 'DSD-15',
    titulo: 'Sem memorial',
    categorias: ['incompleto'],
    anexos: pecas({ remover: ['memorial'] }),
    regras: {
      ...base(['013', '016', '019', '020', '021']),
      [R('013')]: achado('Nenhum anexo recebido é memorial em PDF.', 'nao-localizado'),
      [R('021')]: espera(['nao-avaliavel', 'nao-aplicavel'], 'Sem memorial não há data a comparar.'),
    },
  },
  {
    id: 'DSD-16',
    titulo: 'ART com lote diferente do requerimento',
    categorias: ['campos-divergentes'],
    anexos: pecas({ trocar: { art: { peca: 'art', formato: 'pdf', imovel: { lote: 'C3' } } } }),
    regras: { ...base(['018']), [R('018')]: achado('ART lote C3; requerimento e matrícula, lote F7.', 'divergencia') },
  },
  {
    id: 'DSD-17',
    titulo: 'Número de matrícula diferente na prancha',
    categorias: ['campos-divergentes'],
    anexos: pecas({ trocar: { prancha: { peca: 'prancha', formato: 'pdf', imovel: { matricula: '90471' } } } }),
    regras: { ...base(['020']), [R('020')]: achado('Matrícula 90417 no requerimento e na certidão; 90471 na prancha.', 'divergencia') },
  },
  {
    id: 'DSD-18',
    titulo: 'Quadra diferente no memorial',
    categorias: ['campos-divergentes'],
    anexos: pecas({ trocar: { memorial: { peca: 'memorial', formato: 'pdf', imovel: { quadra: '21' } } } }),
    regras: { ...base(['020']), [R('020')]: achado('Quadra 12 nas demais peças; 21 no memorial.', 'divergencia') },
  },
  {
    id: 'DSD-19',
    titulo: 'Datas diferentes na prancha e no memorial',
    categorias: ['campos-divergentes', 'datas'],
    anexos: pecas({ trocar: { memorial: { peca: 'memorial', formato: 'pdf', imovel: { dataRevisao: '03/11/2026' } } } }),
    regras: { ...base(['021']), [R('021')]: achado('Prancha 01/11/2026; memorial 03/11/2026.', 'divergencia') },
  },
  {
    id: 'DSD-20',
    titulo: 'Memorial com assunto de retificação',
    categorias: ['campos-divergentes', 'documento-trocado'],
    anexos: pecas({ trocar: { memorial: { peca: 'memorial', formato: 'pdf', imovel: { assunto: 'RETIFICAÇÃO' } } } }),
    regras: { ...base(['019']), [R('019')]: achado('Memorial diz retificação; as demais peças, desdobro.', 'divergencia') },
  },
  {
    id: 'DSD-21',
    titulo: 'Planta de situação em 1:500',
    categorias: ['formato'],
    anexos: pecas({ trocar: { prancha: { peca: 'prancha', formato: 'pdf', imovel: { escalaSituacao: '1:500' } } } }),
    regras: { ...base(['022']), [R('022')]: achado('A situação declara 1:500; o TR 002 pede 1:10.000.', 'divergencia') },
  },
  {
    id: 'DSD-22',
    titulo: 'Prancha em A0',
    categorias: ['formato'],
    anexos: pecas({ trocar: { prancha: { peca: 'prancha', formato: 'pdf', imovel: { formatoFolha: 'A0' } } } }),
    regras: { ...base(['023']), [R('023')]: achado('Prancha A0; o TR 002 aceita A3, A2 ou A1.', 'formato-incompativel') },
  },
  {
    id: 'DSD-23',
    titulo: 'Campo de assinatura do RT vazio na prancha',
    categorias: ['assinatura'],
    anexos: pecas({ trocar: { prancha: { peca: 'prancha', formato: 'pdf', assinado: false } } }),
    regras: { ...base(['016']), [R('016')]: achado('Área de assinatura do RT nitidamente vazia na prancha.') },
  },
  {
    id: 'DSD-24',
    titulo: 'Terceiro assina o requerimento sem prova de representação',
    categorias: ['representacao'],
    imovel: { signatario: 'Pedro Terceiro Ficticio', qualidadeSignatario: 'interessado' },
    anexos: pecas(),
    regras: { ...base(['010']), [R('010')]: achado('Quem assina não é a titular e nenhum anexo é instrumento de representação.', 'nao-localizado') },
  },
  {
    id: 'DSD-25',
    titulo: 'Procuradora assina o requerimento, com procuração anexada',
    categorias: ['representacao'],
    imovel: { signatario: 'Paula Procuradora Ficticia', qualidadeSignatario: 'procuradora' },
    anexos: pecas({ acrescentar: [{ peca: 'procuracao', formato: 'pdf' }] }),
    regras: { ...base(['010']), [R('010')]: semAchado('Há instrumento de representação; os poderes não são julgados pelo sistema.') },
  },
  {
    id: 'DSD-26',
    titulo: 'Matrícula com data de emissão ambígua (03/04/26)',
    categorias: ['datas'],
    ensaios: ['T06'],
    anexos: pecas({ trocar: { matricula: { peca: 'matricula', formato: 'pdf', imovel: { dataEmissaoMatricula: '03/04/26' } } } }),
    regras: { ...base(), [R('009')]: achado('Data com ano de dois dígitos: mostrar a data e pedir conferência, sem calcular prazo.', 'condicao-indeterminada') },
  },
  {
    id: 'DSD-27',
    titulo: 'Matrícula emitida meses antes do protocolo',
    categorias: ['datas'],
    anexos: pecas({ trocar: { matricula: { peca: 'matricula', formato: 'pdf', imovel: { dataEmissaoMatricula: '10/08/2026' } } } }),
    regras: { ...base(), [R('009')]: achado('Emissão em 10/08/2026 e protocolo em 05/11/2026: intervalo aparente para conferência; o sistema não decide a contagem de 30 dias.') },
  },
  {
    id: 'DSD-28',
    titulo: 'Matrícula digitalizada com ruído e inclinação',
    categorias: ['ocr-dificil', 'digitalizado'],
    anexos: pecas({ trocar: { matricula: { peca: 'matricula', formato: 'pdf-digitalizado', qualidade: 'ruido' } } }),
    regras: {
      ...base(['008', '009', '020']),
      [R('008')]: lidoOuNaoAvaliavel('A matrícula está lá; se a leitura falhar, a regra não pode concluir ausência.'),
      [R('020')]: lidoOuNaoAvaliavel('Comparação suspensa se a leitura não for confiável.'),
    },
  },
  {
    id: 'DSD-29',
    titulo: 'Matrícula digitalizada muito degradada',
    categorias: ['ocr-dificil', 'digitalizado'],
    ensaios: ['T05', 'T22'],
    anexos: pecas({ trocar: { matricula: { peca: 'matricula', formato: 'pdf-digitalizado', qualidade: 'muito-degradada' } } }),
    regras: {
      ...base(['008', '009', '020']),
      [R('008')]: lidoOuNaoAvaliavel('Leitura insuficiente não é ausência de documento.'),
      [R('020')]: lidoOuNaoAvaliavel('Comparação suspensa se a leitura não for confiável.'),
    },
  },
  {
    id: 'DSD-30',
    titulo: 'Matrícula em JPG girado 90°',
    categorias: ['ocr-dificil', 'formato', 'digitalizado'],
    anexos: pecas({ trocar: { matricula: { peca: 'matricula', formato: 'jpeg', qualidade: 'boa', rotacao: 90 } } }),
    regras: {
      ...base(['008', '009', '020']),
      [R('008')]: lidoOuNaoAvaliavel('A matrícula está lá, girada.'),
      [R('020')]: lidoOuNaoAvaliavel('Comparação suspensa se a leitura não for confiável.'),
    },
  },
  {
    id: 'DSD-31',
    titulo: 'Memorial em PDF corrompido',
    categorias: ['arquivo-corrompido'],
    anexos: pecas({ trocar: { memorial: { peca: 'memorial', formato: 'pdf', defeito: 'corrompido' } } }),
    regras: {
      ...base(['013', '016', '019', '020', '021', '043']),
      [R('013')]: naoAvaliavel('Há um arquivo memorial.pdf que não abre: não dá para dizer que o memorial falta nem que está presente.'),
      [R('043')]: espera(['achado', 'nao-avaliavel'], 'memorial.pdf não abre; a regra 043 diz que corrupção vira ilegível.', 'ilegivel'),
    },
  },
  {
    id: 'DSD-32',
    titulo: 'Matrícula em PDF protegido por senha',
    categorias: ['arquivo-corrompido'],
    anexos: pecas({ trocar: { matricula: { peca: 'matricula', formato: 'pdf', defeito: 'senha' } } }),
    regras: {
      ...base(['008', '009', '020', '043']),
      [R('008')]: naoAvaliavel('O arquivo da matrícula está protegido por senha.'),
      [R('043')]: espera(['achado', 'nao-avaliavel'], 'matricula.pdf protegido por senha: ilegível para a triagem.', 'ilegivel'),
    },
  },
  {
    id: 'DSD-33',
    titulo: 'Ficha cadastral vazia (0 bytes)',
    categorias: ['arquivo-corrompido'],
    anexos: pecas({ trocar: { 'ficha-cadastral': { peca: 'ficha-cadastral', formato: 'pdf', defeito: 'vazio' } } }),
    regras: {
      ...base(['006', '020', '043']),
      [R('006')]: naoAvaliavel('Há um arquivo ficha-cadastral.pdf vazio.'),
      [R('043')]: espera(['achado', 'nao-avaliavel'], 'ficha-cadastral.pdf tem 0 bytes: ilegível.', 'ilegivel'),
    },
  },
  {
    id: 'DSD-34',
    titulo: 'Matrícula em JPG com extensão .pdf',
    categorias: ['extensao-falsa', 'digitalizado'],
    anexos: pecas({ trocar: { matricula: { peca: 'matricula', formato: 'jpeg', qualidade: 'boa', nome: 'matricula.pdf' } } }),
    regras: {
      ...base(['008', '009', '020', '043']),
      [R('008')]: lidoOuNaoAvaliavel('O conteúdo é a matrícula, em imagem.'),
      [R('043')]: espera(['achado', 'sem-achado'], 'matricula.pdf é uma imagem JPG: JPG é aceito para a matrícula, mas a extensão não confere com o conteúdo.', 'formato-incompativel'),
    },
  },
  {
    id: 'DSD-35',
    titulo: 'ZIP comum com extensão .docx, ao lado do memorial em PDF',
    categorias: ['extensao-falsa'],
    anexos: pecas({ acrescentar: [{ peca: 'memorial', formato: 'docx', defeito: 'zip-comum', nome: 'memorial-editavel.docx' }] }),
    regras: { ...base(['043']), [R('043')]: espera(['achado', 'nao-aplicavel'], 'memorial-editavel.docx é um ZIP sem documento Word; arquivo extra, fora dos requisitos.', 'formato-incompativel') },
  },
  {
    id: 'DSD-36',
    titulo: 'Texto simples com extensão .dwg e nenhum CAD verdadeiro',
    categorias: ['extensao-falsa', 'incompleto'],
    anexos: pecas({ trocar: { cad: { peca: 'cad', formato: 'dwg', defeito: 'texto-simples' } } }),
    regras: {
      ...base(['012', '043']),
      [R('012')]: achado('O único arquivo .dwg não é desenho CAD.', 'nao-localizado'),
      [R('043')]: espera(['achado', 'nao-aplicavel'], 'prancha.dwg é texto simples, não CAD.', 'formato-incompativel'),
    },
  },
  {
    id: 'DSD-37',
    titulo: 'Executável disfarçado de ART',
    categorias: ['arquivo-suspeito', 'extensao-falsa'],
    anexos: pecas({ trocar: { art: { peca: 'art', formato: 'pdf', defeito: 'executavel' } } }),
    regras: {
      ...base(['011', '018', '043']),
      [R('011')]: naoAvaliavel('O arquivo art.pdf foi isolado; não é lido.'),
      [R('043')]: achado('art.pdf tem conteúdo executável e foi isolado.', 'formato-incompativel'),
    },
  },
  {
    id: 'DSD-38',
    titulo: 'ZIP extra com caminho perigoso',
    categorias: ['arquivo-suspeito'],
    ensaios: ['T20'],
    anexos: pecas({ acrescentar: [{ peca: 'memorial', formato: 'docx', defeito: 'zip-caminho-perigoso', nome: 'anexos-extras.zip' }] }),
    regras: { ...base(['043']), [R('043')]: espera(['achado', 'nao-aplicavel'], 'anexos-extras.zip tem entrada que sairia da pasta; isolado sem extrair.', 'formato-incompativel') },
  },
  {
    id: 'DSD-39',
    titulo: 'Memorial declarado PDF, mas o arquivo é RAR',
    categorias: ['arquivo-suspeito', 'extensao-falsa'],
    ensaios: ['T33'],
    anexos: pecas({ trocar: { memorial: { peca: 'memorial', formato: 'pdf', defeito: 'rar' } } }),
    regras: {
      ...base(['013', '016', '019', '020', '021', '043']),
      [R('013')]: naoAvaliavel('memorial.pdf é um contêiner RAR isolado; o conteúdo não é aberto.'),
      [R('043')]: espera(['achado', 'nao-avaliavel'], 'memorial.pdf é um contêiner RAR, isolado.', 'formato-incompativel'),
    },
  },
  {
    id: 'DSD-40',
    titulo: 'Área de 1,99 ha (19.900 m²), sem GDU, sem confirmação',
    categorias: ['limite-2ha'],
    imovel: IMOVEL_2HA('19.900,00 m²'),
    anexos: pecas(),
    regras: base(),
  },
  {
    id: 'DSD-41',
    titulo: 'Área de exatamente 2,00 ha (20.000 m²), sem GDU, sem confirmação',
    categorias: ['limite-2ha'],
    imovel: IMOVEL_2HA('20.000,00 m²'),
    anexos: pecas(),
    regras: base(),
  },
  {
    id: 'DSD-42',
    titulo: 'Área de 2,01 ha (20.100 m²), sem GDU, sem confirmação',
    categorias: ['limite-2ha'],
    ensaios: ['T08'],
    imovel: IMOVEL_2HA('20.100,00 m²'),
    anexos: pecas(),
    regras: base(),
  },
  {
    id: 'DSD-43',
    titulo: 'Área de 2,01 ha, sem GDU, servidor confirmou área acima de 2 ha',
    categorias: ['limite-2ha', 'incompleto'],
    imovel: IMOVEL_2HA('20.100,00 m²'),
    condicoesConfirmadas: [{ id: 'area-situacao-acima-2ha', valor: true }],
    anexos: pecas(),
    regras: { ...base(['028']), [R('028')]: achado('Condição confirmada e nenhuma GDU entre os anexos recebidos: consulta GCA/PLANURB.', 'nao-localizado') },
  },
  {
    id: 'DSD-44',
    titulo: 'Área de 2,01 ha, com GDU, servidor confirmou área acima de 2 ha',
    categorias: ['limite-2ha', 'completo'],
    imovel: IMOVEL_2HA('20.100,00 m²'),
    condicoesConfirmadas: [{ id: 'area-situacao-acima-2ha', valor: true }],
    anexos: pecas({ acrescentar: [{ peca: 'gdu', formato: 'pdf' }] }),
    regras: { ...base(['028']), [R('028')]: semAchado('GDU presente; validade e conteúdo são conferência humana.') },
  },
  {
    id: 'DSD-45',
    titulo: 'Área de 1,99 ha, servidor confirmou que não passa de 2 ha',
    categorias: ['limite-2ha'],
    imovel: IMOVEL_2HA('19.900,00 m²'),
    condicoesConfirmadas: [{ id: 'area-situacao-acima-2ha', valor: false }],
    anexos: pecas(),
    regras: { ...base(['028']), [R('028')]: espera(['nao-aplicavel'], 'Servidor confirmou que a condição não se cumpre.') },
  },
  {
    id: 'DSD-46',
    titulo: 'Só um desenho DWG, sem confirmação de que o pacote está completo',
    categorias: ['pacote-parcial'],
    ensaios: ['T21'],
    integridadeDoPacote: 'desconhecida',
    anexos: [{ peca: 'cad', formato: 'dwg' }],
    regras: Object.fromEntries(
      ['002', '003', '006', '008', '011', '012', '013'].map((numero) => [
        R(numero),
        naoAvaliavel('Pacote de integridade desconhecida: o que não veio não pode ser apontado como faltante.'),
      ]),
    ),
  },
  {
    id: 'DSD-47',
    titulo: 'Pacote marcado como parcial, sem memorial',
    categorias: ['pacote-parcial', 'incompleto'],
    integridadeDoPacote: 'parcial',
    anexos: pecas({ remover: ['memorial'] }),
    regras: {
      ...base(['013', '016', '019', '020', '021']),
      [R('013')]: naoAvaliavel('Pacote parcial: memorial pode estar entre os anexos não recebidos.'),
    },
  },
  {
    id: 'DSD-48',
    titulo: 'Campo de assinatura do RT vazio no memorial',
    categorias: ['assinatura'],
    anexos: pecas({ trocar: { memorial: { peca: 'memorial', formato: 'pdf', assinado: false } } }),
    regras: { ...base(['016']), [R('016')]: achado('Área de assinatura do RT nitidamente vazia no memorial.') },
  },
]
