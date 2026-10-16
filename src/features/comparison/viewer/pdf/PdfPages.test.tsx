import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { makeFile } from '@/test/files'
import { ComparisonWorkspace } from '../../components/ComparisonWorkspace'
import { summarize, type ComparisonResult, type Difference, type PageAnalysis } from '../../model/types'
import type { PdfDocumentHandle } from './load-pdf'

// O jsdom não desenha canvas (nem mede larguras): o pdf.js é substituído por um documento de
// duas páginas A4; o desenho real é verificado no navegador (ver docs/criterios-comparacao.md).
const loadPdf = vi.fn(
  async (file: File): Promise<PdfDocumentHandle> => ({
    pageCount: file.size > 0 ? 2 : 0,
    destroy: async () => undefined,
    getPage: async () => ({
      width: 595,
      height: 842,
      render: () => ({ promise: Promise.resolve(), cancel: () => undefined }),
      renderText: () => ({ promise: Promise.resolve(), cancel: () => undefined }),
      release: () => undefined,
    }),
  }),
)
vi.mock('./load-pdf', () => ({ loadPdf: (file: File) => loadPdf(file) }))

const page = (pageNumber: number, overrides: Partial<PageAnalysis> = {}): PageAnalysis => ({
  pageNumber,
  width: 595,
  height: 842,
  rotation: 0,
  content: 'text',
  textSource: 'text-layer',
  text: 'analyzed',
  visual: 'analyzed',
  ...overrides,
})

const differences: Difference[] = [
  {
    id: 'd-001',
    kind: 'modification',
    category: 'text',
    subtype: 'words',
    methods: ['text-layer', 'visual'],
    evidence: 'corroborated',
    context: 'Art. 2º',
    original: { location: { pageNumber: 1, region: { x: 0.2, y: 0.3, width: 0.1, height: 0.02 } }, text: 'dez' },
    updated: { location: { pageNumber: 1, region: { x: 0.2, y: 0.3, width: 0.12, height: 0.02 } }, text: 'quinze' },
  },
  {
    id: 'd-002',
    kind: 'addition',
    category: 'text',
    subtype: 'words',
    methods: ['text-layer'],
    evidence: 'direct',
    context: 'Art. 9º',
    updated: {
      location: {
        pageNumber: 2,
        region: { x: 0.1, y: 0.5, width: 0.6, height: 0.05 },
        regions: [
          { x: 0.1, y: 0.5, width: 0.6, height: 0.02 },
          { x: 0.1, y: 0.53, width: 0.3, height: 0.02 },
        ],
      },
      text: 'Art. 9º Nova regra.',
    },
    anchors: { original: { pageNumber: 2, region: { x: 0.7, y: 0.48, width: 0, height: 0.02 } } },
  },
  {
    id: 'd-003',
    kind: 'addition',
    category: 'image',
    subtype: 'image',
    methods: ['objects', 'visual'],
    evidence: 'corroborated',
    context: 'Página 2',
    updated: { location: { pageNumber: 2, region: { x: 0.5, y: 0.7, width: 0.2, height: 0.1 } }, text: '', detail: '4,2 × 2,1 cm' },
    anchors: { original: { pageNumber: 2, region: { x: 0.5, y: 0.7, width: 0.2, height: 0.1 } } },
  },
]

const result: ComparisonResult = {
  formatVersion: 2,
  id: 'real',
  isDemonstration: false,
  documents: {
    original: { role: 'original', fileName: 'original.pdf', sizeBytes: 1000, pageCount: 2 },
    updated: { role: 'updated', fileName: 'atualizado.pdf', sizeBytes: 1000, pageCount: 2 },
  },
  summary: summarize(differences),
  differences,
  analysis: {
    status: 'partial',
    pages: { original: [page(1), page(2)], updated: [page(1), page(2, { content: 'scanned', textSource: 'none', text: 'not-analyzed' })] },
    pageMatches: [
      { original: 1, updated: 1, relation: 'matched' },
      { original: 2, updated: 2, relation: 'matched' },
    ],
    warnings: [
      {
        code: 'OCR_UNAVAILABLE',
        severity: 'limitation',
        document: 'updated',
        pages: [2],
        message: 'As páginas 2 do documento atualizado não têm texto extraível e o OCR não estava disponível: só a aparência foi comparada.',
      },
    ],
    methods: { textLayer: true, visual: true, ocr: false },
  },
}

function renderReal() {
  return render(
    <TooltipProvider>
      <ComparisonWorkspace
        result={result}
        documents={{
          original: { kind: 'pdf', file: makeFile('original.pdf') },
          updated: { kind: 'pdf', file: makeFile('atualizado.pdf') },
        }}
      />
    </TooltipProvider>,
  )
}

describe('visualizador de PDFs reais', () => {
  it('mostra as páginas reais com os destaques nas posições da comparação', async () => {
    renderReal()
    const original = screen.getByRole('region', { name: 'Páginas do documento original' })
    const updated = screen.getByRole('region', { name: 'Páginas do documento atualizado' })

    expect(await within(original).findAllByRole('article')).toHaveLength(2)
    expect(within(original).getByRole('article', { name: 'Página 1 de 2' })).toBeInTheDocument()

    const modification = within(updated).getByRole('button', { name: 'Modificação 1: quinze' })
    expect(modification).toHaveStyle({ left: '20.000%', top: '30.000%' })
    expect(within(original).getByRole('button', { name: 'Modificação 1: dez' })).toBeInTheDocument()
    expect(within(updated).getByRole('button', { name: 'Adição 2: Art. 9º Nova regra.' })).toBeInTheDocument()
    // No original, a adição aparece como marcador de posição.
    expect(within(original).getByRole('button', { name: 'Adição 2: incluído na versão atualizada' })).toBeInTheDocument()
  })

  it('selecionar um destaque marca a diferença nos dois documentos e na lista', async () => {
    const user = userEvent.setup()
    renderReal()
    const updated = screen.getByRole('region', { name: 'Páginas do documento atualizado' })
    await user.click(await within(updated).findByRole('button', { name: 'Adição 2: Art. 9º Nova regra.' }))
    expect(within(updated).getByRole('button', { name: 'Adição 2: Art. 9º Nova regra.' })).toHaveAttribute('aria-current', 'true')
    const original = screen.getByRole('region', { name: 'Páginas do documento original' })
    expect(within(original).getByRole('button', { name: 'Adição 2: incluído na versão atualizada' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('o filtro esconde os destaques dos tipos ocultos', async () => {
    const user = userEvent.setup()
    renderReal()
    const updated = screen.getByRole('region', { name: 'Páginas do documento atualizado' })
    await within(updated).findByRole('button', { name: 'Modificação 1: quinze' })
    const filters = screen.getByRole('radiogroup', { name: 'Filtrar diferenças por tipo' })
    await user.click(within(filters).getByRole('radio', { name: /Adições/ }))
    expect(within(updated).queryByRole('button', { name: 'Modificação 1: quinze' })).not.toBeInTheDocument()
    expect(within(updated).getByRole('button', { name: 'Adição 2: Art. 9º Nova regra.' })).toBeInTheDocument()
  })

  it('desenha cada parte de um trecho em várias linhas e distingue imagens pelo rótulo', async () => {
    renderReal()
    const updated = screen.getByRole('region', { name: 'Páginas do documento atualizado' })
    const addition = await within(updated).findByRole('button', { name: 'Adição 2: Art. 9º Nova regra.' })
    expect(addition).toHaveStyle({ top: '50.000%', height: '2.000%' })
    expect(updated.querySelectorAll('.pdf-diff-box--part')).toHaveLength(1)
    const image = within(updated).getByRole('button', { name: 'Adição 3 (imagem): 4,2 × 2,1 cm' })
    expect(image).toHaveClass('pdf-diff-box--cat-image')
  })

  it('avisa na página e no topo o que não foi analisado', async () => {
    renderReal()
    const updated = screen.getByRole('region', { name: 'Páginas do documento atualizado' })
    const pageTwo = await within(updated).findByRole('article', { name: 'Página 2 de 2' })
    expect(pageTwo).toHaveTextContent('Texto não lido')
    expect(pageTwo).toHaveClass('pdf-page--unanalyzed')
    const banner = screen.getByRole('region', { name: 'Situação da análise' })
    expect(banner).toHaveTextContent('A comparação foi parcial. Existem páginas ou elementos que não puderam ser analisados.')
    // Parcial: os detalhes já vêm abertos, com a limitação escrita.
    expect(banner).toHaveTextContent('o OCR não estava disponível')
  })

  it('o modo Conteúdo esconde só o que é aparência; o Visual esconde o texto', async () => {
    const user = userEvent.setup()
    renderReal()
    const updated = screen.getByRole('region', { name: 'Páginas do documento atualizado' })
    await within(updated).findByRole('button', { name: 'Modificação 1: quinze' })
    const modes = screen.getByRole('radiogroup', { name: 'Modo de comparação' })
    await user.click(within(modes).getByRole('radio', { name: /Visual/ }))
    expect(within(updated).queryByRole('button', { name: 'Modificação 1: quinze' })).not.toBeInTheDocument()
    expect(within(updated).getByRole('button', { name: 'Adição 3 (imagem): 4,2 × 2,1 cm' })).toBeInTheDocument()
    await user.click(within(modes).getByRole('radio', { name: /Conteúdo/ }))
    expect(within(updated).getByRole('button', { name: 'Modificação 1: quinze' })).toBeInTheDocument()
    expect(within(updated).getByRole('button', { name: 'Adição 3 (imagem): 4,2 × 2,1 cm' })).toBeInTheDocument()
  })

  it('filtra por categoria', async () => {
    const user = userEvent.setup()
    renderReal()
    const updated = screen.getByRole('region', { name: 'Páginas do documento atualizado' })
    await within(updated).findByRole('button', { name: 'Modificação 1: quinze' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoria' }), 'image')
    expect(within(updated).queryByRole('button', { name: 'Modificação 1: quinze' })).not.toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Diferenças encontradas' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('Imagem incluída.')).toBeInTheDocument()
  })

  it('explica quando o navegador não consegue abrir o PDF', async () => {
    loadPdf.mockRejectedValueOnce(new Error('corrompido'))
    renderReal()
    expect(await screen.findByText(/Não foi possível mostrar as páginas de original.pdf/)).toBeInTheDocument()
  })

  it('não tem violações de acessibilidade', async () => {
    const { container } = renderReal()
    await screen.findAllByRole('button', { name: /Modificação 1/ })
    const outcome = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(outcome.violations.map((violation) => violation.id)).toEqual([])
  })
})
