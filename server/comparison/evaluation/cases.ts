import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { ComparisonAnalysis, NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { makePasswordProtectedPdf } from '../../test/make-pdf.ts'
import { unionRect } from '../geometry.ts'
import { A4, boxOf, buildPdf, wordsBox, type Block, type BuiltPdf, type PageSpec, type ScanBlock, type TextBlock } from './corpus-pdf.ts'
import type { CorpusCase, CorpusExpectation, ExpectedEvent } from './evaluate.ts'

/**
 * Corpus sintético com gabarito. Nenhum dado pessoal: textos inventados no formato de
 * requerimentos. O gabarito de cada caso é escrito à mão (o que foi mudado) e localizado pelas
 * posições que o próprio gerador desenhou — nunca pela saída do comparador.
 */

const TITLE = 'REQUERIMENTO DE LICENÇA AMBIENTAL'
const PARAGRAPHS = [
  'Art. 1º Fica autorizada a licença ambiental de operação para a atividade descrita neste requerimento.',
  'Art. 2º O requerente deverá apresentar a documentação complementar no prazo de 30 dias corridos.',
  'Art. 3º A taxa de análise corresponde ao valor de R$ 15.000,00 conforme a tabela vigente.',
  'Art. 4º A vistoria técnica será realizada em 10/03/2026 pela equipe da secretaria.',
  'Art. 5º O processo nº 4521/2026 tramitará na Diretoria de Licenciamento.',
  'Art. 6º A quantidade autorizada é de 12 unidades por mês, sem possibilidade de acréscimo.',
  'Art. 7º Os casos omissos serão resolvidos pela autoridade competente.',
]
const OTHER_PAGE = [
  'ANEXO I',
  'Relação de documentos exigidos para o pedido de renovação da licença.',
  'Comprovante de inscrição municipal atualizado e certidão negativa de débitos.',
  'Planta de situação do empreendimento com coordenadas geográficas.',
]
const THIRD_PAGE = [
  'ANEXO II',
  'Condicionantes técnicas aplicáveis durante a vigência da licença.',
  'Monitoramento semestral dos efluentes com laudo de laboratório acreditado.',
  'Plano de gerenciamento de resíduos sólidos revisado anualmente.',
]

interface PageOptions {
  x?: number
  font?: TextBlock['font']
  titleSize?: number
  colors?: Record<number, readonly [number, number, number]>
  fonts?: Record<number, TextBlock['font']>
  width?: number
}

function paragraphsPage(paragraphs: readonly string[], options: PageOptions = {}): PageSpec {
  const x = options.x ?? 72
  const width = options.width ?? 450
  const blocks: Block[] = paragraphs.map((text, index) => {
    const block: TextBlock = { kind: 'text', id: `p${index}`, x, text, width, font: options.fonts?.[index] ?? options.font, gap: 8 }
    const color = options.colors?.[index]
    if (color) block.color = color
    return block
  })
  return { blocks }
}

function documentPage(paragraphs: readonly string[] = PARAGRAPHS, options: PageOptions = {}): PageSpec {
  const page = paragraphsPage(paragraphs, options)
  return {
    blocks: [
      { kind: 'text', id: 'title', x: options.x ?? 72, y: 72, text: TITLE, size: options.titleSize ?? 14, font: options.font, gap: 14 },
      ...page.blocks,
    ],
  }
}

function replaceIn(paragraphs: readonly string[], index: number, from: string, to: string): string[] {
  return paragraphs.map((text, position) => (position === index ? text.replace(from, to) : text))
}

async function pair(original: readonly PageSpec[], updated: readonly PageSpec[], events: (a: BuiltPdf, b: BuiltPdf) => ExpectedEvent[]): Promise<CorpusExpectation> {
  const a = await buildPdf(original)
  const b = await buildPdf(updated)
  return { original: a.bytes, updated: b.bytes, expected: events(a, b) }
}

const FULL: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 }

/** Caixa (aproximada pelas métricas da Helvetica, igual à Liberation Sans) de palavras numa página digitalizada. */
async function scanWordBox(block: ScanBlock, lineIndex: number, sequence: string): Promise<NormalizedRect> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const size = block.size ?? 12
  const line = block.lines[lineIndex] ?? ''
  const start = line.indexOf(sequence)
  if (start < 0) throw new Error(`"${sequence}" ausente na linha ${lineIndex}`)
  const left = (block.left ?? 72) + font.widthOfTextAtSize(line.slice(0, start), size)
  const width = font.widthOfTextAtSize(sequence, size)
  const top = (block.top ?? 72) + lineIndex * size * (block.lineHeight ?? 1.6)
  return { x: left / A4[0], y: top / A4[1], width: width / A4[0], height: (size * 1.15) / A4[1] }
}

const SCAN_LINES = [
  'PREFEITURA MUNICIPAL - SECRETARIA DE MEIO AMBIENTE',
  'Processo nº 4521/2026',
  'Requerente: Empresa Exemplo Ltda.',
  'Valor da taxa: R$ 15.000,00',
  'Data da vistoria: 10/03/2026',
  'Parecer: favorável ao deferimento do pedido.',
]

function scanned(lines: readonly string[], extra: Partial<ScanBlock> = {}): ScanBlock {
  return { kind: 'scan', id: 'scan', lines: [...lines], left: 72, top: 90, size: 14, lineHeight: 1.8, ...extra }
}

const ocrPages = (role: 'original' | 'updated', pages: number[]) => (analysis: ComparisonAnalysis) => {
  for (const page of pages) {
    const info = analysis.pages[role][page - 1]
    if (!info || (info.textSource !== 'ocr' && info.textSource !== 'text-layer+ocr')) {
      return `página ${page} do ${role} deveria ter sido lida por OCR (textSource=${info?.textSource})`
    }
  }
  return undefined
}

function tableBlocks(rows: readonly (readonly string[])[], top = 140): Block[] {
  const columns = [72, 250, 370, 470]
  const rowHeight = 22
  const blocks: Block[] = [{ kind: 'text', id: 'table-title', x: 72, y: 100, text: 'DEMONSTRATIVO DE VALORES', size: 13 }]
  rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      blocks.push({ kind: 'text', id: `c${rowIndex}-${columnIndex}`, x: (columns[columnIndex] ?? 72) + 4, y: top + rowIndex * rowHeight + 5, text: cell, size: 10 })
    })
  })
  for (let line = 0; line <= rows.length; line += 1) {
    blocks.push({ kind: 'line', x: 72, y: top + line * rowHeight, width: 460, height: 0, lineWidth: 0.8 })
  }
  return blocks
}

const TABLE: string[][] = [
  ['Serviço', 'Quantidade', 'Unitário', 'Total'],
  ['Análise de projeto', '1', '1.250,00', '1.250,00'],
  ['Vistoria técnica', '2', '480,00', '960,00'],
  ['Emissão de parecer', '1', '320,00', '320,00'],
  ['Publicação oficial', '1', '95,00', '95,00'],
]

function columnLines(text: string, width: number, perLine: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  for (let index = 0; index < words.length; index += perLine) lines.push(words.slice(index, index + perLine).join(' '))
  void width
  return lines
}

/** Duas colunas desenhadas linha a linha atravessando a página (a ordem do PDF mistura as colunas). */
function twoColumns(left: string, right: string): PageSpec {
  const leftLines = columnLines(left, 220, 5)
  const rightLines = columnLines(right, 220, 5)
  const blocks: Block[] = [{ kind: 'text', id: 'title', x: 72, y: 72, text: 'BOLETIM INFORMATIVO', size: 14 }]
  const rows = Math.max(leftLines.length, rightLines.length)
  for (let row = 0; row < rows; row += 1) {
    const y = 110 + row * 16
    const l = leftLines[row]
    const r = rightLines[row]
    if (l) blocks.push({ kind: 'text', id: `l${row}`, x: 72, y, text: l, size: 10 })
    if (r) blocks.push({ kind: 'text', id: `r${row}`, x: 320, y, text: r, size: 10 })
  }
  return { blocks }
}

const LEFT_COLUMN =
  'A secretaria informa que o atendimento ao público ocorre de segunda a sexta-feira no período da manhã e que os pedidos devem ser protocolados com antecedência mínima de cinco dias úteis.'
const RIGHT_COLUMN =
  'Os documentos digitais serão aceitos somente em formato PDF e devem conter assinatura válida do responsável técnico pelo empreendimento licenciado na cidade.'

function longDocument(changes: Record<number, (lines: string[]) => string[]> = {}): PageSpec[] {
  return Array.from({ length: 60 }, (_, page) => {
    const lines = Array.from({ length: 12 }, (_, line) => `Item ${page + 1}.${line + 1} O requerente apresentará o comprovante número ${page * 100 + line} à secretaria.`)
    return paragraphsPage(changes[page]?.(lines) ?? lines, { width: 470 })
  })
}

function headerFooter(pages: readonly (readonly string[])[], total: number): PageSpec[] {
  return pages.map((paragraphs, index) => ({
    blocks: [
      { kind: 'text', id: 'header', x: 72, y: 30, text: 'SEMADES - Requerimento 4521/2026', size: 9 },
      ...paragraphsPage(paragraphs).blocks,
      { kind: 'text', id: 'footer', x: 260, y: 805, text: `Página ${index + 1} de ${total}`, size: 9 },
    ],
  }))
}

export const corpusCases: CorpusCase[] = [
  {
    id: '01-identicos',
    title: 'PDFs idênticos',
    group: 'negativo',
    build: () => pair([documentPage()], [documentPage()], () => []),
    checkAnalysis: (analysis) => (analysis.status === 'complete' ? undefined : `situação ${analysis.status}, esperava complete`),
  },
  {
    id: '02-palavra-modificada',
    title: 'Uma palavra modificada',
    group: 'texto',
    build: () =>
      pair([documentPage()], [documentPage(replaceIn(PARAGRAPHS, 6, 'omissos', 'excepcionais'))], (a, b) => [
        {
          label: 'omissos → excepcionais',
          category: 'text',
          kind: 'modification',
          subtype: 'words',
          original: { page: 1, region: wordsBox(a, 1, 'omissos') },
          updated: { page: 1, region: wordsBox(b, 1, 'excepcionais') },
        },
      ]),
  },
  {
    id: '03-palavra-adicionada',
    title: 'Uma palavra adicionada',
    group: 'texto',
    build: () =>
      pair([documentPage()], [documentPage(replaceIn(PARAGRAPHS, 0, 'licença ambiental', 'licença ambiental simplificada'))], (_, b) => [
        { label: '+ simplificada', category: 'text', kind: 'addition', updated: { page: 1, region: wordsBox(b, 1, 'simplificada') } },
      ]),
  },
  {
    id: '04-palavra-removida',
    title: 'Uma palavra removida',
    group: 'texto',
    build: () =>
      pair([documentPage()], [documentPage(replaceIn(PARAGRAPHS, 3, 'vistoria técnica', 'vistoria'))], (a) => [
        { label: '- técnica', category: 'text', kind: 'deletion', original: { page: 1, region: wordsBox(a, 1, 'técnica') } },
      ]),
  },
  {
    id: '05-paragrafo-inserido',
    title: 'Parágrafo inserido (o texto abaixo desce)',
    group: 'texto',
    build: () => {
      const inserted = 'Art. 2º-A O pedido poderá ser apresentado por meio eletrônico.'
      const updated = [...PARAGRAPHS.slice(0, 2), inserted, ...PARAGRAPHS.slice(2)]
      return pair([documentPage()], [documentPage(updated)], (_, b) => [
        { label: 'Art. 2º-A inserido', category: 'text', kind: 'addition', updated: { page: 1, region: wordsBox(b, 1, inserted) } },
      ])
    },
  },
  {
    id: '06-paragrafo-removido',
    title: 'Parágrafo removido',
    group: 'texto',
    build: () => {
      const removed = PARAGRAPHS[4] ?? ''
      return pair([documentPage()], [documentPage(PARAGRAPHS.filter((_, index) => index !== 4))], (a) => [
        { label: 'Art. 5º removido', category: 'text', kind: 'deletion', original: { page: 1, region: wordsBox(a, 1, removed) } },
      ])
    },
  },
  {
    id: '07-paragrafo-movido',
    title: 'Parágrafo movido',
    group: 'texto',
    build: () => {
      const moved = PARAGRAPHS[5] ?? ''
      const updated = [PARAGRAPHS[0] ?? '', moved, ...PARAGRAPHS.slice(1, 5), PARAGRAPHS[6] ?? '']
      return pair([documentPage()], [documentPage(updated)], (a, b) => [
        {
          label: 'Art. 6º movido para depois do Art. 1º',
          category: 'text',
          kind: 'move',
          original: { page: 1, region: wordsBox(a, 1, moved) },
          updated: { page: 1, region: wordsBox(b, 1, moved) },
        },
      ])
    },
  },
  {
    id: '08-numero-alterado',
    title: 'Número alterado',
    group: 'texto',
    build: () =>
      pair([documentPage()], [documentPage(replaceIn(PARAGRAPHS, 5, 'de 12 unidades', 'de 15 unidades'))], (a, b) => [
        {
          label: '12 → 15',
          category: 'text',
          kind: 'modification',
          subtype: 'number',
          original: { page: 1, region: wordsBox(a, 1, '12') },
          updated: { page: 1, region: wordsBox(b, 1, '15') },
        },
      ]),
  },
  {
    id: '09-data-alterada',
    title: 'Data alterada',
    group: 'texto',
    build: () =>
      pair([documentPage()], [documentPage(replaceIn(PARAGRAPHS, 3, '10/03/2026', '02/06/2026'))], (a, b) => [
        {
          label: '10/03/2026 → 02/06/2026',
          category: 'text',
          kind: 'modification',
          subtype: 'date',
          original: { page: 1, region: wordsBox(a, 1, '10/03/2026') },
          updated: { page: 1, region: wordsBox(b, 1, '02/06/2026') },
        },
      ]),
  },
  {
    id: '10-valor-monetario',
    title: 'Valor monetário alterado',
    group: 'texto',
    build: () =>
      pair([documentPage()], [documentPage(replaceIn(PARAGRAPHS, 2, 'R$ 15.000,00', 'R$ 18.000,00'))], (a, b) => [
        {
          label: 'R$ 15.000,00 → R$ 18.000,00',
          category: 'text',
          kind: 'modification',
          subtype: 'money',
          original: { page: 1, region: wordsBox(a, 1, '15.000,00') },
          updated: { page: 1, region: wordsBox(b, 1, '18.000,00') },
        },
      ]),
  },
  {
    id: '11-imagem-adicionada',
    title: 'Imagem adicionada',
    group: 'imagem',
    build: () => {
      const image: Block = { kind: 'image', id: 'img', x: 330, y: 560, width: 180, height: 120, picture: { kind: 'landscape' } }
      return pair([documentPage()], [{ blocks: [...documentPage().blocks, image] }], (_, b) => [
        { label: 'imagem incluída', category: 'image', kind: 'addition', updated: { page: 1, region: boxOf(b, 'img').region } },
      ])
    },
  },
  {
    id: '12-imagem-removida',
    title: 'Imagem removida',
    group: 'imagem',
    build: () => {
      const image: Block = { kind: 'image', id: 'img', x: 330, y: 560, width: 180, height: 120, picture: { kind: 'chart' } }
      return pair([{ blocks: [...documentPage().blocks, image] }], [documentPage()], (a) => [
        { label: 'imagem excluída', category: 'image', kind: 'deletion', original: { page: 1, region: boxOf(a, 'img').region } },
      ])
    },
  },
  {
    id: '13-imagem-substituida',
    title: 'Imagem substituída',
    group: 'imagem',
    build: () => {
      const before: Block = { kind: 'image', id: 'img', x: 330, y: 560, width: 180, height: 120, picture: { kind: 'landscape' } }
      const after: Block = { ...before, picture: { kind: 'chart', variant: 2 } }
      return pair([{ blocks: [...documentPage().blocks, before] }], [{ blocks: [...documentPage().blocks, after] }], (a, b) => [
        {
          label: 'imagem trocada',
          category: 'image',
          kind: 'modification',
          subtype: 'image-content',
          original: { page: 1, region: boxOf(a, 'img').region },
          updated: { page: 1, region: boxOf(b, 'img').region },
        },
      ])
    },
  },
  {
    id: '14-imagem-redimensionada',
    title: 'Imagem redimensionada',
    group: 'imagem',
    build: () => {
      const before: Block = { kind: 'image', id: 'img', x: 330, y: 560, width: 180, height: 120, picture: { kind: 'logo' } }
      const after: Block = { ...before, width: 120, height: 80 }
      return pair([{ blocks: [...documentPage().blocks, before] }], [{ blocks: [...documentPage().blocks, after] }], (a, b) => [
        {
          label: 'imagem menor',
          category: 'image',
          subtype: 'image-size',
          original: { page: 1, region: boxOf(a, 'img').region },
          updated: { page: 1, region: boxOf(b, 'img').region },
        },
      ])
    },
  },
  {
    id: '15-imagem-reposicionada',
    title: 'Imagem reposicionada',
    group: 'imagem',
    build: () => {
      const before: Block = { kind: 'image', id: 'img', x: 330, y: 560, width: 180, height: 120, picture: { kind: 'logo', variant: 1 } }
      const after: Block = { ...before, x: 90, y: 620 }
      return pair([{ blocks: [...documentPage().blocks, before] }], [{ blocks: [...documentPage().blocks, after] }], (a, b) => [
        {
          label: 'imagem em outra posição',
          category: 'image',
          kind: 'move',
          subtype: 'image-position',
          original: { page: 1, region: boxOf(a, 'img').region },
          updated: { page: 1, region: boxOf(b, 'img').region },
        },
      ])
    },
  },
  {
    id: '16-figura-vetorial',
    title: 'Figura vetorial adicionada',
    group: 'imagem',
    build: () => {
      const shape: Block = { kind: 'ellipse', id: 'shape', x: 380, y: 600, width: 120, height: 80, stroke: [0.1, 0.2, 0.6], lineWidth: 2 }
      return pair([documentPage()], [{ blocks: [...documentPage().blocks, shape] }], (_, b) => [
        { label: 'elipse incluída', category: 'visual', kind: 'addition', subtype: 'graphic', updated: { page: 1, region: boxOf(b, 'shape').region } },
      ])
    },
  },
  {
    id: '17-mudanca-de-fonte',
    title: 'Mudança de fonte num parágrafo',
    group: 'aparência',
    build: () =>
      pair([documentPage()], [documentPage(PARAGRAPHS, { fonts: { 6: 'times' } })], (a, b) => [
        {
          label: 'Art. 7º em Times',
          category: 'formatting',
          subtype: 'font',
          original: { page: 1, region: boxOf(a, 'p6').region },
          updated: { page: 1, region: boxOf(b, 'p6').region },
        },
      ]),
    tolerated: [{ category: 'formatting', subtype: ['text-position', 'layout'], reason: 'a fonte nova tem outras larguras: as palavras mudam de lugar' }],
  },
  {
    id: '18-mudanca-de-tamanho',
    title: 'Mudança do tamanho do título',
    group: 'aparência',
    build: () =>
      pair([documentPage()], [documentPage(PARAGRAPHS, { titleSize: 18 })], (a, b) => [
        {
          label: 'título 14 → 18 pt',
          category: 'formatting',
          subtype: 'font-size',
          original: { page: 1, region: boxOf(a, 'title').region },
          updated: { page: 1, region: boxOf(b, 'title').region },
        },
      ]),
    tolerated: [{ category: 'formatting', subtype: ['text-position', 'layout'], reason: 'o título maior empurra o texto abaixo' }],
  },
  {
    id: '19-mudanca-de-cor',
    title: 'Mudança de cor de um parágrafo',
    group: 'aparência',
    build: () =>
      pair([documentPage()], [documentPage(PARAGRAPHS, { colors: { 3: [0.8, 0, 0] } })], (a, b) => [
        {
          label: 'Art. 4º em vermelho',
          category: 'formatting',
          subtype: 'color',
          original: { page: 1, region: boxOf(a, 'p3').region },
          updated: { page: 1, region: boxOf(b, 'p3').region },
        },
      ]),
  },
  {
    id: '20-mudanca-de-margens',
    title: 'Mudança de margens (todo o texto deslocado)',
    group: 'aparência',
    build: () =>
      pair([documentPage()], [documentPage(PARAGRAPHS, { x: 108 })], (a) => [
        {
          label: 'texto deslocado 36 pt para a direita',
          category: 'formatting',
          subtype: ['text-position', 'layout'],
          original: { page: 1, region: unionRect([boxOf(a, 'title').region, ...PARAGRAPHS.map((_, index) => boxOf(a, `p${index}`).region)]) ?? FULL },
        },
      ]),
  },
  {
    id: '21-pagina-adicionada',
    title: 'Página adicionada no meio',
    group: 'estrutura',
    build: () =>
      pair([documentPage(), paragraphsPage(THIRD_PAGE)], [documentPage(), paragraphsPage(OTHER_PAGE), paragraphsPage(THIRD_PAGE)], () => [
        { label: 'página 2 incluída', category: 'structure', kind: 'addition', subtype: 'page', updated: { page: 2 } },
      ]),
  },
  {
    id: '22-pagina-removida',
    title: 'Página removida',
    group: 'estrutura',
    build: () =>
      pair([documentPage(), paragraphsPage(OTHER_PAGE), paragraphsPage(THIRD_PAGE)], [documentPage(), paragraphsPage(THIRD_PAGE)], () => [
        { label: 'página 2 excluída', category: 'structure', kind: 'deletion', subtype: 'page', original: { page: 2 } },
      ]),
  },
  {
    id: '23-paginas-reorganizadas',
    title: 'Páginas reorganizadas (2 e 3 trocadas)',
    group: 'estrutura',
    build: () =>
      pair(
        [documentPage(), paragraphsPage(OTHER_PAGE), paragraphsPage(THIRD_PAGE)],
        [documentPage(), paragraphsPage(THIRD_PAGE), paragraphsPage(OTHER_PAGE)],
        () => [{ label: 'página movida', category: 'structure', kind: 'move', subtype: 'page' }],
      ),
  },
  {
    id: '24-tabela',
    title: 'Tabela com uma célula alterada',
    group: 'texto',
    build: () => {
      const changed = TABLE.map((row) => [...row])
      const row = changed[2]
      if (row) row[2] = '520,00'
      return pair([{ blocks: tableBlocks(TABLE) }], [{ blocks: tableBlocks(changed) }], (a, b) => [
        {
          label: 'célula 480,00 → 520,00',
          category: 'text',
          kind: 'modification',
          subtype: 'money',
          original: { page: 1, region: boxOf(a, 'c2-2').region },
          updated: { page: 1, region: boxOf(b, 'c2-2').region },
        },
      ])
    },
  },
  {
    id: '25-multiplas-colunas',
    title: 'Duas colunas desenhadas linha a linha',
    group: 'texto',
    build: () =>
      pair(
        [twoColumns(LEFT_COLUMN, RIGHT_COLUMN)],
        [twoColumns(LEFT_COLUMN.replace('cinco dias', 'dez dias'), RIGHT_COLUMN.replace('formato PDF', 'formato PDF/A'))],
        (a, b) => [
          { label: 'coluna esquerda: cinco → dez', category: 'text', kind: 'modification', original: { page: 1, region: wordsBox(a, 1, 'cinco') }, updated: { page: 1, region: wordsBox(b, 1, 'dez') } },
          { label: 'coluna direita: PDF → PDF/A', category: 'text', original: { page: 1, region: wordsBox(a, 1, 'PDF') }, updated: { page: 1, region: wordsBox(b, 1, 'PDF/A') } },
        ],
      ),
    checkAnalysis: () => undefined,
  },
  {
    id: '26-digitalizado',
    title: 'PDF digitalizado com um número alterado',
    group: 'digitalizado',
    timeoutMs: 120_000,
    build: async () => {
      const before = scanned(SCAN_LINES)
      const after = scanned(SCAN_LINES.map((line) => line.replace('4521/2026', '4581/2026')))
      const a = await buildPdf([{ blocks: [before] }])
      const b = await buildPdf([{ blocks: [after] }])
      return {
        original: a.bytes,
        updated: b.bytes,
        expected: [
          {
            label: 'processo 4521 → 4581 (OCR)',
            category: ['text', 'visual'],
            original: { page: 1, region: await scanWordBox(before, 1, '4521/2026') },
            updated: { page: 1, region: await scanWordBox(after, 1, '4581/2026') },
          },
        ],
      }
    },
    checkAnalysis: ocrPages('updated', [1]),
  },
  {
    id: '27-misto',
    title: 'PDF misto: página de texto e página digitalizada',
    group: 'digitalizado',
    timeoutMs: 120_000,
    build: async () => {
      const before = scanned(SCAN_LINES)
      const after = scanned(SCAN_LINES.map((line) => line.replace('favorável', 'contrário')))
      const a = await buildPdf([documentPage(), { blocks: [before] }])
      const b = await buildPdf([documentPage(), { blocks: [after] }])
      return {
        original: a.bytes,
        updated: b.bytes,
        expected: [
          {
            label: 'favorável → contrário na página digitalizada',
            category: ['text', 'visual'],
            original: { page: 2, region: await scanWordBox(before, 5, 'favorável') },
            updated: { page: 2, region: await scanWordBox(after, 5, 'contrário') },
          },
        ],
      }
    },
    checkAnalysis: (analysis) => {
      const page = analysis.pages.original[1]
      if (page?.content !== 'scanned') return `página 2 deveria ser digitalizada (veio ${page?.content})`
      if (analysis.pages.original[0]?.content !== 'text') return 'página 1 deveria ser de texto'
      return ocrPages('original', [2])(analysis)
    },
  },
  {
    id: '28-pagina-rotacionada',
    title: 'Página rotacionada com uma palavra alterada',
    group: 'estrutura',
    build: () =>
      pair(
        [documentPage(), paragraphsPage(OTHER_PAGE)],
        [documentPage(), { ...paragraphsPage(OTHER_PAGE.map((line) => line.replace('coordenadas geográficas', 'coordenadas UTM'))), rotate: 90 }],
        (a, b) => [
          { label: 'rotação 0 → 90', category: 'structure', subtype: 'page-rotation', original: { page: 2 }, updated: { page: 2 } },
          {
            label: 'geográficas → UTM (coordenadas na página girada)',
            category: 'text',
            kind: 'modification',
            original: { page: 2, region: wordsBox(a, 2, 'geográficas.') },
            updated: { page: 2, region: wordsBox(b, 2, 'UTM.') },
          },
        ],
      ),
  },
  {
    id: '29-cabecalho-rodape',
    title: 'Cabeçalho e rodapé repetidos; página incluída muda a numeração',
    group: 'estrutura',
    build: () =>
      pair(headerFooter([PARAGRAPHS.slice(0, 3), OTHER_PAGE, THIRD_PAGE], 3), headerFooter([PARAGRAPHS.slice(0, 3), OTHER_PAGE, THIRD_PAGE, ['ANEXO III', 'Quadro de responsáveis técnicos e respectivos registros profissionais.']], 4), () => [
        { label: 'página 4 incluída', category: 'structure', kind: 'addition', subtype: 'page', updated: { page: 4 } },
      ]),
    tolerated: [{ category: 'text', subtype: 'page-number', reason: '"de 3" passa a "de 4" em cada rodapé (mudança real, de numeração)' }],
  },
  {
    id: '30-documento-extenso',
    title: 'Documento extenso (60 páginas, duas alterações)',
    group: 'texto',
    timeoutMs: 120_000,
    build: () =>
      pair(
        longDocument(),
        longDocument({
          16: (lines) => lines.map((line, index) => (index === 4 ? line.replace('apresentará', 'entregará') : line)),
          44: (lines) => lines.map((line, index) => (index === 9 ? line.replace('número 4409', 'número 4490') : line)),
        }),
        (a, b) => [
          {
            label: 'p. 17 apresentará → entregará',
            category: 'text',
            kind: 'modification',
            original: { page: 17, region: wordsBox(a, 17, 'apresentará o comprovante número 1604', 'apresentará') },
            updated: { page: 17, region: wordsBox(b, 17, 'entregará o comprovante número 1604', 'entregará') },
          },
          { label: 'p. 45 4409 → 4490', category: 'text', kind: 'modification', subtype: 'number', original: { page: 45, region: wordsBox(a, 45, '4409') }, updated: { page: 45, region: wordsBox(b, 45, '4490') } },
        ],
      ),
  },
  {
    id: '31-corrompido',
    title: 'PDF corrompido',
    group: 'entrada',
    build: async () => {
      const valid = await buildPdf([documentPage()])
      return { original: valid.bytes, updated: valid.bytes.slice(0, 400), expected: [] }
    },
    expectFailure: { code: 'INCOMPATIBLE_DOCUMENT', document: 'updated' },
  },
  {
    id: '32-protegido-por-senha',
    title: 'PDF protegido por senha',
    group: 'entrada',
    build: async () => ({ original: await makePasswordProtectedPdf(), updated: (await buildPdf([documentPage()])).bytes, expected: [] }),
    expectFailure: { code: 'INCOMPATIBLE_DOCUMENT', document: 'original' },
  },
  {
    id: '33-gerado-de-outra-forma',
    title: 'Visualmente iguais, gerados de formas diferentes',
    group: 'negativo',
    build: async () => {
      const a = await buildPdf([documentPage()])
      const perWord = documentPage()
      perWord.blocks = perWord.blocks.map((block) => (block.kind === 'text' ? { ...block, perWord: true } : block))
      const b = await buildPdf([perWord], { objectStreams: true })
      return { original: a.bytes, updated: b.bytes, expected: [] }
    },
  },
  {
    id: '34-texto-reposicionado',
    title: 'Mesmo texto em outra posição da página',
    group: 'aparência',
    build: () => {
      const page = (y: number): PageSpec => ({
        blocks: [
          ...documentPage(PARAGRAPHS.slice(0, 6)).blocks,
          { kind: 'text', id: 'last', x: 72, y, text: PARAGRAPHS[6] ?? '', width: 450 },
        ],
      })
      return pair([page(420)], [page(640)], (a, b) => [
        {
          label: 'Art. 7º descido',
          category: 'formatting',
          kind: 'move',
          subtype: ['text-position', 'layout'],
          original: { page: 1, region: boxOf(a, 'last').region },
          updated: { page: 1, region: boxOf(b, 'last').region },
        },
      ])
    },
  },
  {
    id: '35-quase-imperceptivel',
    title: 'Ponto trocado por vírgula; hífen trocado por travessão',
    group: 'texto',
    build: () => {
      const updated = replaceIn(replaceIn(PARAGRAPHS, 1, 'corridos.', 'corridos,'), 6, 'Art. 7º Os', 'Art. 7º – Os')
      const original = replaceIn(PARAGRAPHS, 6, 'Art. 7º Os', 'Art. 7º - Os')
      return pair([documentPage(original)], [documentPage(updated)], (a, b) => [
        {
          label: '. → ,',
          category: 'text',
          kind: 'modification',
          original: { page: 1, region: wordsBox(a, 1, 'corridos.') },
          updated: { page: 1, region: wordsBox(b, 1, 'corridos,') },
        },
      ])
    },
    tolerated: [{ category: 'visual', subtype: 'graphic', reason: 'hífen e travessão são o mesmo texto normalizado, mas têm desenho diferente' }],
  },
  {
    id: '36-fontes-incorporadas',
    title: 'Helvetica padrão × Liberation Sans incorporada (mesmas métricas)',
    group: 'negativo',
    build: () => pair([documentPage()], [documentPage(PARAGRAPHS, { font: 'liberation' })], () => []),
    tolerated: [
      { category: 'formatting', subtype: 'font', reason: 'a fonte de fato mudou (incorporada × padrão), ainda que pareça igual' },
      { category: 'visual', subtype: 'graphic', reason: 'diferenças de desenho dos glifos entre as duas fontes' },
    ],
  },
  {
    id: '37-compressao-de-imagem',
    title: 'Mesma imagem em PNG e em JPEG',
    group: 'negativo',
    build: () => {
      const png: Block = { kind: 'image', id: 'img', x: 330, y: 560, width: 180, height: 120, picture: { kind: 'landscape' }, format: 'png' }
      const jpeg: Block = { ...png, format: 'jpeg', quality: 85 }
      return pair([{ blocks: [...documentPage().blocks, png] }], [{ blocks: [...documentPage().blocks, jpeg] }], () => [])
    },
  },
  {
    id: '38-paginas-repetidas',
    title: 'Página repetida removida',
    group: 'estrutura',
    build: () =>
      pair(
        [documentPage(), paragraphsPage(OTHER_PAGE), paragraphsPage(OTHER_PAGE), paragraphsPage(THIRD_PAGE)],
        [documentPage(), paragraphsPage(OTHER_PAGE), paragraphsPage(THIRD_PAGE)],
        () => [{ label: 'uma das cópias excluída', category: 'structure', kind: 'deletion', subtype: 'page' }],
      ),
  },
  {
    id: '39-elementos-sobrepostos',
    title: 'Carimbo sobreposto ao texto',
    group: 'imagem',
    build: () => {
      const stamp: Block[] = [
        { kind: 'rect', id: 'stamp-box', x: 330, y: 150, width: 170, height: 40, stroke: [0.7, 0, 0], lineWidth: 2 },
        { kind: 'text', id: 'stamp', x: 340, y: 162, text: 'RECEBIDO 12/03/2026', size: 12, color: [0.7, 0, 0] },
      ]
      return pair([documentPage()], [{ blocks: [...documentPage().blocks, ...stamp] }], (_, b) => [
        { label: 'texto do carimbo incluído', category: 'text', kind: 'addition', updated: { page: 1, region: boxOf(b, 'stamp').region } },
      ])
    },
    tolerated: [{ category: 'visual', subtype: 'graphic', reason: 'a moldura do carimbo é um desenho novo' }],
  },
  {
    id: '40-tabela-financeira',
    title: 'Tabela financeira: dois valores alterados e uma linha incluída',
    group: 'texto',
    build: () => {
      const changed = TABLE.map((row) => [...row])
      const first = changed[1]
      const third = changed[3]
      if (first) first[3] = '1.350,00'
      if (third) third[2] = '340,00'
      changed.push(['Taxa de expediente', '1', '45,00', '45,00'])
      return pair([{ blocks: tableBlocks(TABLE) }], [{ blocks: tableBlocks(changed) }], (a, b) => [
        { label: 'total 1.250,00 → 1.350,00', category: 'text', kind: 'modification', subtype: 'money', original: { page: 1, region: boxOf(a, 'c1-3').region }, updated: { page: 1, region: boxOf(b, 'c1-3').region } },
        { label: 'unitário 320,00 → 340,00', category: 'text', kind: 'modification', subtype: 'money', original: { page: 1, region: boxOf(a, 'c3-2').region }, updated: { page: 1, region: boxOf(b, 'c3-2').region } },
        { label: 'linha incluída', category: 'text', kind: 'addition', updated: { page: 1, region: unionRect([boxOf(b, 'c5-0').region, boxOf(b, 'c5-3').region]) ?? FULL } },
      ])
    },
    tolerated: [{ category: 'visual', subtype: 'graphic', reason: 'a grade da tabela ganha uma linha' }],
  },
  {
    id: '41-digitalizado-com-ruido',
    title: 'Digitalização com ruído e um valor alterado',
    group: 'digitalizado',
    timeoutMs: 120_000,
    build: async () => {
      const before = scanned(SCAN_LINES, { noise: 0.004, seed: 11 })
      const after = scanned(SCAN_LINES.map((line) => line.replace('15.000,00', '18.000,00')), { noise: 0.004, seed: 12 })
      const a = await buildPdf([{ blocks: [before] }])
      const b = await buildPdf([{ blocks: [after] }])
      return {
        original: a.bytes,
        updated: b.bytes,
        expected: [
          {
            label: 'R$ 15.000,00 → R$ 18.000,00 com ruído',
            category: ['text', 'visual'],
            original: { page: 1, region: await scanWordBox(before, 3, '15.000,00') },
            updated: { page: 1, region: await scanWordBox(after, 3, '18.000,00') },
          },
        ],
      }
    },
    checkAnalysis: ocrPages('updated', [1]),
  },
  {
    id: '42-digitalizado-inclinado',
    title: 'Digitalização inclinada (1,5°) com uma data alterada',
    group: 'digitalizado',
    timeoutMs: 120_000,
    build: async () => {
      const before = scanned(SCAN_LINES, { skew: 1.5 })
      const after = scanned(SCAN_LINES.map((line) => line.replace('10/03/2026', '17/03/2026')), { skew: 1.5 })
      const a = await buildPdf([{ blocks: [before] }])
      const b = await buildPdf([{ blocks: [after] }])
      return {
        original: a.bytes,
        updated: b.bytes,
        expected: [{ label: 'data alterada (inclinada)', category: ['text', 'visual'], original: { page: 1 }, updated: { page: 1 } }],
      }
    },
    limitation: 'Com a inclinação, a posição esperada da palavra não é calculada; só a página é conferida.',
    checkAnalysis: ocrPages('updated', [1]),
  },
  {
    id: '43-digitalizado-texto-pequeno',
    title: 'Digitalização com texto pequeno (8 pt) e um número alterado',
    group: 'digitalizado',
    timeoutMs: 120_000,
    build: async () => {
      const before = scanned(SCAN_LINES, { size: 8, dpi: 200 })
      const after = scanned(SCAN_LINES.map((line) => line.replace('4521/2026', '4527/2026')), { size: 8, dpi: 200 })
      const a = await buildPdf([{ blocks: [before] }])
      const b = await buildPdf([{ blocks: [after] }])
      return {
        original: a.bytes,
        updated: b.bytes,
        expected: [
          {
            label: '4521 → 4527 em 8 pt',
            category: ['text', 'visual'],
            original: { page: 1, region: await scanWordBox(before, 1, '4521/2026') },
            updated: { page: 1, region: await scanWordBox(after, 1, '4527/2026') },
          },
        ],
      }
    },
    checkAnalysis: ocrPages('updated', [1]),
  },
  {
    id: '44-assinatura-alterada',
    title: 'Assinatura digitalizada diferente',
    group: 'digitalizado',
    timeoutMs: 120_000,
    build: async () => {
      const signature = { x: 300, y: 420, width: 180, height: 50, seed: 3 }
      const before = scanned(SCAN_LINES, { signature })
      const after = scanned(SCAN_LINES, { signature: { ...signature, seed: 9 } })
      const a = await buildPdf([{ blocks: [before] }])
      const b = await buildPdf([{ blocks: [after] }])
      return {
        original: a.bytes,
        updated: b.bytes,
        expected: [
          {
            label: 'assinatura diferente (elemento visual)',
            category: 'visual',
            original: { page: 1, region: boxOf(a, 'scan').region },
            updated: { page: 1, region: boxOf(b, 'scan').region },
          },
        ],
      }
    },
    limitation: 'Assinaturas são comparadas como imagem; a autenticidade não é verificada.',
  },
  {
    id: '45-ilegivel',
    title: 'Digitalização ilegível (desfocada e com muito ruído)',
    group: 'digitalizado',
    timeoutMs: 120_000,
    build: async () => {
      const block = scanned(SCAN_LINES, { blur: 3, noise: 0.08, size: 9, quality: 30, seed: 5 })
      const a = await buildPdf([{ blocks: [block] }])
      const b = await buildPdf([{ blocks: [{ ...block, seed: 6 }] }])
      return { original: a.bytes, updated: b.bytes, expected: [] }
    },
    tolerated: [
      { category: 'visual', subtype: 'graphic', reason: 'ruído diferente em cada cópia' },
      { category: 'text', reason: 'leitura do OCR instável em texto ilegível; deve vir marcada para conferência' },
    ],
    checkAnalysis: (analysis) =>
      analysis.status === 'complete' ? 'texto ilegível não pode resultar em análise completa' : undefined,
  },
  {
    id: '46-pagina-no-inicio',
    title: 'Página incluída no início',
    group: 'estrutura',
    build: () =>
      pair([documentPage(), paragraphsPage(THIRD_PAGE)], [paragraphsPage(OTHER_PAGE), documentPage(), paragraphsPage(THIRD_PAGE)], () => [
        { label: 'página 1 incluída', category: 'structure', kind: 'addition', subtype: 'page', updated: { page: 1 } },
      ]),
    checkAnalysis: (analysis) => {
      const match = analysis.pageMatches.find((item) => item.original === 1)
      return match?.updated === 2 ? undefined : `a página 1 do original deveria corresponder à 2 do atualizado (veio ${match?.updated})`
    },
  },
  {
    id: '47-paginas-em-branco',
    title: 'Página em branco incluída entre páginas em branco',
    group: 'estrutura',
    build: () =>
      pair([documentPage(), { blocks: [] }, paragraphsPage(THIRD_PAGE)], [documentPage(), { blocks: [] }, { blocks: [] }, paragraphsPage(THIRD_PAGE)], () => [
        { label: 'página em branco incluída', category: 'structure', kind: 'addition', subtype: 'page' },
      ]),
  },
]
