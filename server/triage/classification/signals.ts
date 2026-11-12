import type { ClasseDocumental } from '../../../shared/contracts/triage.ts'

/**
 * Sinais léxicos de cada classe documental. Cada sinal é uma expressão verificável no texto
 * (comparada sem acento e em minúsculas) com um peso e o lugar onde vale:
 * - `titulo`: só nas primeiras linhas da página (o cabeçalho do documento) — sinal forte;
 * - `corpo`: em qualquer linha — sinal fraco, que sozinho não decide a classe.
 *
 * Um sinal `contra` tira pontos da classe (ex.: "DRT 03" não é DRT 01). Nada aqui olha o nome do
 * arquivo.
 *
 * Os sinais descrevem títulos e campos característicos citados no dossiê (seção 6) e no catálogo;
 * não reproduzem modelo oficial. Documento real com outro cabeçalho pode ficar "indeterminado":
 * é o resultado esperado, não um erro a esconder.
 */

export interface Sinal {
  id: string
  onde: 'titulo' | 'corpo'
  padrao: RegExp
  peso: number
  /** Descrição curta para a justificativa. */
  descricao: string
}

export interface SinaisDaClasse {
  classe: ClasseDocumental
  sinais: Sinal[]
}

const t = (id: string, padrao: RegExp, descricao: string, peso = 3): Sinal => ({ id, onde: 'titulo', padrao, peso, descricao })
const c = (id: string, padrao: RegExp, descricao: string, peso = 1): Sinal => ({ id, onde: 'corpo', padrao, peso, descricao })

/** Número da DRT logo depois da sigla ou do nome por extenso: "DRT 01", "DRT-3", "DRT nº 02". */
const DRT = String.raw`(?:\bdrt\b|declaracao de responsabilidade tecnica)\s*(?:[-–—:.]|n[ºo°]\.?|numero)?\s*`
const drt = (numero: string) => new RegExp(`${DRT}0?${numero}\\b`, 'u')

export const SINAIS: SinaisDaClasse[] = [
  {
    classe: 'requerimento',
    sinais: [
      t('titulo-requerimento', /\brequerimento\b/u, 'título "requerimento"'),
      c('assina-requerimento', /\bassina (?:este|o presente) requerimento\b|\bvem (?:respeitosamente )?requerer\b|\brequer(?:emos)?\b a\b/u, 'fórmula de requerimento'),
      c('assunto', /^assunto\s*:/u, 'campo "Assunto"'),
    ],
  },
  {
    classe: 'drt-01',
    sinais: [
      t('titulo-drt-01', drt('1'), 'título de DRT 01'),
      c('declaro-rt', /\bdeclaro\b.*\bresponsavel tecnico\b/u, 'declaração do responsável técnico'),
    ],
  },
  {
    classe: 'drt-02-projeto',
    sinais: [
      t('titulo-drt-02', drt('2'), 'título de DRT 02', 2),
      t('drt-02-projeto', new RegExp(`${DRT}0?2\\b.*\\bprojeto\\b|\\bprojeto\\b.*${DRT}0?2\\b`, 'u'), 'DRT 02 de projeto', 2),
      c('declaro-rt', /\bdeclaro\b.*\bresponsavel tecnico\b/u, 'declaração do responsável técnico'),
    ],
  },
  {
    classe: 'drt-02-implantacao',
    sinais: [
      t('titulo-drt-02', drt('2'), 'título de DRT 02', 2),
      t('drt-02-implantacao', new RegExp(`${DRT}0?2\\b.*\\bimplantacao\\b|\\bimplantacao\\b.*${DRT}0?2\\b`, 'u'), 'DRT 02 de implantação', 2),
      c('declaro-rt', /\bdeclaro\b.*\bresponsavel tecnico\b/u, 'declaração do responsável técnico'),
    ],
  },
  {
    classe: 'drt-03',
    sinais: [
      t('titulo-drt-03', drt('3'), 'título de DRT 03'),
      c('declaro-rt', /\bdeclaro\b.*\bresponsavel tecnico\b/u, 'declaração do responsável técnico'),
    ],
  },
  {
    classe: 'matricula-transcricao',
    sinais: [
      t('certidao-inteiro-teor', /\bcertidao de inteiro teor\b/u, 'título "certidão de inteiro teor"'),
      // Forma de título ("MATRÍCULA Nº 90417", "... - MATRÍCULA 012345"), não o rótulo de campo "Matrícula: 90417",
      // que aparece no topo de requerimentos e pranchas (defeito achado na validação, VAL-14).
      t('titulo-matricula', /(?:^|[-–—]\s*)matricula\s*(?:n[ºo°]\.?|numero)?\s*\d/u, 'título com número de matrícula'),
      t('titulo-transcricao', /(?:^|[-–—]\s*)transcricao\s*(?:n[ºo°]\.?|numero)?\s*\d/u, 'título com número de transcrição'),
      t('registro-imoveis', /\b(?:registro de imoveis|servico registral|oficial de registro|cartorio de registro)\b/u, 'serventia de registro de imóveis', 2),
      c('ato-registral', /\b(?:r|av)\s*[-.]\s*\d+\b.*\b(?:matricula|registr|averba)/u, 'ato registral (R-/AV-)'),
      c('certidao-emitida', /\bcertidao\b.*\bemitida\b|\bdou fe\b/u, 'fórmula de certidão'),
      c('contra-cadastro', /\b(?:ficha cadastral|cadastro imobiliario|\biptu\b)/u, 'menção a cadastro imobiliário', -1),
    ],
  },
  {
    classe: 'inscricao-imobiliaria',
    sinais: [
      t('ficha-cadastral', /\bficha cadastral\b/u, 'título "ficha cadastral"'),
      t('cadastro-imobiliario', /\b(?:cadastro imobiliario|extrato (?:do )?cadastr|espelho cadastral)\b/u, 'título de cadastro imobiliário'),
      t('iptu', /\b(?:iptu|carne do imposto predial)\b/u, 'título de IPTU', 2),
      c('campo-inscricao', /^inscricao imobiliaria\s*:/u, 'campo "Inscrição imobiliária" no início da linha'),
      c('contra-certidao', /\bcertidao de inteiro teor\b/u, 'fórmula de certidão registral', -2),
    ],
  },
  {
    classe: 'art-rrt-similar',
    sinais: [
      t('anotacao-rt', /\banotacao de responsabilidade tecnica\b/u, 'título "anotação de responsabilidade técnica"'),
      t('registro-rt', /\bregistro de responsabilidade tecnica\b/u, 'título "registro de responsabilidade técnica"'),
      t('termo-rt', /\btermo de responsabilidade tecnica\b/u, 'título "termo de responsabilidade técnica"'),
      t('sigla-art-rrt', /(?:^|[-–—\s])(?:art|rrt|trt)(?:$|[-–—\s])/u, 'sigla ART/RRT/TRT no título', 2),
      c('conselho', /\b(?:crea|cau|cft|confea)\b/u, 'conselho profissional'),
      c('contratante', /^contratante\s*:/u, 'campo "Contratante"'),
      c('atividade', /^atividade\s*:/u, 'campo "Atividade"'),
      c('contra-declaracao', /^declara(?:cao|mos|o)\b/u, 'texto de declaração, não de anotação', -2),
    ],
  },
  {
    classe: 'prancha',
    sinais: [
      t('titulo-prancha', /\bprancha\b/u, 'título "prancha"'),
      t('titulo-planta', /\bplanta (?:de situacao|de localizacao|baixa|do imovel|de desdobro)\b/u, 'título de planta', 2),
      c('planta-situacao', /\bplanta de situacao\b/u, 'planta de situação'),
      c('escala', /\b(?:escala|esc\.)\s*:?\s*1\s*[:/]\s*\d/u, 'escala declarada'),
      c('formato-folha', /\b(?:formato|folha)\s*:?\s*a-?[0-4]\b/u, 'formato de folha declarado'),
      c('situacao-atual-final', /\bsituacao (?:atual|final)\s*:/u, 'quadro de situação atual/final'),
    ],
  },
  {
    classe: 'memorial',
    sinais: [
      t('memorial-descritivo', /\bmemorial descritivo\b/u, 'título "memorial descritivo"'),
      t('titulo-memorial', /^memorial\b/u, 'título "memorial"', 2),
      c('confrontacoes', /\b(?:confronta|perimetro|rumo|azimute)\b/u, 'descrição de perímetro'),
      c('lotes-resultantes', /\blotes resultantes\b|\barea total\s*:/u, 'quadro de lotes resultantes'),
    ],
  },
  {
    classe: 'gdu-gdr',
    sinais: [
      t('guia-diretrizes', /\bguia de diretrizes\b/u, 'título "guia de diretrizes"'),
      t('sigla-gdu', /\b(?:gdu|gdr)\b/u, 'sigla GDU/GDR no título', 2),
      c('diretrizes', /\bdiretrizes\b/u, 'menção a diretrizes'),
    ],
  },
  {
    classe: 'representacao',
    sinais: [
      t('procuracao', /\b(?:procuracao|substabelecimento|instrumento (?:particular|publico) de mandato)\b/u, 'título de procuração ou mandato'),
      t('representacao-societaria', /\b(?:contrato social|ata de eleicao|termo de posse)\b/u, 'título de ato de representação', 2),
      c('outorgante', /^outorgante\s*:/u, 'campo "Outorgante"'),
      c('outorgado', /^outorgad[oa](?:\(a\))?\s*:/u, 'campo "Outorgado"'),
      c('poderes', /^poderes\s*:/u, 'campo "Poderes"'),
    ],
  },
]

/** Linhas do topo da página tratadas como cabeçalho. */
export const LINHAS_DE_TITULO = 4
