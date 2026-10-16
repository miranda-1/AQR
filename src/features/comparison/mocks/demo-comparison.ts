/**
 * DADOS DEMONSTRATIVOS — FICTÍCIOS.
 *
 * Não representam nenhum processo administrativo real e não resultam de
 * processamento de arquivos. Servem apenas para demonstrar a interface.
 */
import { COMPARISON_FORMAT_VERSION, summarize, type ComparisonAnalysis, type ComparisonResult, type Difference, type DocumentRole, type PageAnalysis } from '../model/types'
import type { DocumentSource } from '../viewer/document-source'
import type { SimulatedDocument } from '../viewer/simulated-document'

const header = (title: string) => [
  { type: 'title' as const, segments: [title] },
  {
    type: 'paragraph' as const,
    segments: ['Documento fictício elaborado exclusivamente para demonstração do AQR. Não possui validade.'],
  },
]

export const demoOriginalDocument: SimulatedDocument = {
  pages: [
    {
      pageNumber: 1,
      blocks: [
        ...header('Memorial descritivo — modelo de exemplo'),
        { type: 'heading', segments: ['1. Identificação'] },
        {
          type: 'paragraph',
          segments: [
            'Requerente: Empresa Exemplo Ltda., inscrita no CNPJ 00.000.000/0000-00, com sede na Rua Fictícia, n.º 100, Bairro Modelo.',
          ],
        },
        { type: 'heading', segments: ['2. Objeto'] },
        {
          type: 'paragraph',
          segments: [
            'O presente memorial descreve as atividades previstas para o imóvel indicado e as condições de funcionamento propostas pela requerente.',
          ],
        },
        {
          type: 'paragraph',
          segments: [
            'A requerente deverá apresentar a documentação complementar no ',
            { diffId: 'd1', kind: 'modification', text: 'prazo de 30 (trinta) dias' },
            ', contados da data de protocolo, ',
            { diffId: 'd3', kind: 'deletion', text: 'acompanhada de cópia autenticada dos atos constitutivos' },
            '. ',
            { diffId: 'd2', kind: 'addition', placeholder: true },
          ],
        },
        {
          type: 'paragraph',
          segments: [
            'O não atendimento ao prazo estabelecido implicará o arquivamento do requerimento, sem prejuízo de nova solicitação.',
          ],
        },
      ],
    },
    {
      pageNumber: 2,
      blocks: [
        { type: 'heading', segments: ['3. Caracterização do imóvel'] },
        {
          type: 'paragraph',
          segments: [
            'O imóvel possui ',
            { diffId: 'd4', kind: 'modification', text: 'área total de 1.200 m²' },
            ', dos quais 640 m² correspondem à área construída e o restante a áreas livres e de circulação.',
          ],
        },
        { type: 'heading', segments: ['4. Documentos apresentados'] },
        { type: 'item', segments: ['I – requerimento padrão devidamente preenchido;'] },
        { type: 'item', segments: ['II – documento de identificação do representante legal;'] },
        { type: 'item', segments: ['III – memorial descritivo das atividades;'] },
        { type: 'item', segments: [{ diffId: 'd5', kind: 'addition', placeholder: true }] },
        {
          type: 'paragraph',
          segments: [
            'Os documentos técnicos deverão ser assinados por ',
            { diffId: 'd6', kind: 'modification', text: 'responsável técnico habilitado' },
            '.',
          ],
        },
        {
          type: 'paragraph',
          segments: [
            {
              diffId: 'd7',
              kind: 'deletion',
              text: 'A vistoria será agendada pela equipe técnica após a conferência dos documentos, com aviso prévio à requerente.',
            },
          ],
        },
      ],
    },
    {
      pageNumber: 3,
      blocks: [
        { type: 'heading', segments: ['5. Disposições finais'] },
        {
          type: 'paragraph',
          segments: [
            'O descumprimento das condições descritas neste memorial sujeitará a requerente à ',
            { diffId: 'd10', kind: 'modification', text: 'multa de 5% (cinco por cento)' },
            ' sobre o valor de referência, conforme regulamento aplicável. ',
            { diffId: 'd9', kind: 'addition', placeholder: true },
          ],
        },
        {
          type: 'paragraph',
          segments: ['As informações prestadas são de inteira responsabilidade da requerente.'],
        },
        {
          type: 'signature',
          segments: [{ diffId: 'd8', kind: 'modification', text: 'Campo Grande/MS, 10 de março de 2025.' }],
        },
        { type: 'signature', segments: ['Representante legal — Empresa Exemplo Ltda.'] },
      ],
    },
  ],
}

export const demoUpdatedDocument: SimulatedDocument = {
  pages: [
    {
      pageNumber: 1,
      blocks: [
        ...header('Memorial descritivo — modelo de exemplo'),
        { type: 'heading', segments: ['1. Identificação'] },
        {
          type: 'paragraph',
          segments: [
            'Requerente: Empresa Exemplo Ltda., inscrita no CNPJ 00.000.000/0000-00, com sede na Rua Fictícia, n.º 100, Bairro Modelo.',
          ],
        },
        { type: 'heading', segments: ['2. Objeto'] },
        {
          type: 'paragraph',
          segments: [
            'O presente memorial descreve as atividades previstas para o imóvel indicado e as condições de funcionamento propostas pela requerente.',
          ],
        },
        {
          type: 'paragraph',
          segments: [
            'A requerente deverá apresentar a documentação complementar no ',
            { diffId: 'd1', kind: 'modification', text: 'prazo de 45 (quarenta e cinco) dias' },
            ', contados da data de protocolo',
            { diffId: 'd3', kind: 'deletion', placeholder: true },
            '. ',
            {
              diffId: 'd2',
              kind: 'addition',
              text: 'Os documentos poderão ser apresentados em formato digital, desde que legíveis.',
            },
          ],
        },
        {
          type: 'paragraph',
          segments: [
            'O não atendimento ao prazo estabelecido implicará o arquivamento do requerimento, sem prejuízo de nova solicitação.',
          ],
        },
      ],
    },
    {
      pageNumber: 2,
      blocks: [
        { type: 'heading', segments: ['3. Caracterização do imóvel'] },
        {
          type: 'paragraph',
          segments: [
            'O imóvel possui ',
            { diffId: 'd4', kind: 'modification', text: 'área total de 1.350 m²' },
            ', dos quais 640 m² correspondem à área construída e o restante a áreas livres e de circulação.',
          ],
        },
        { type: 'heading', segments: ['4. Documentos apresentados'] },
        { type: 'item', segments: ['I – requerimento padrão devidamente preenchido;'] },
        { type: 'item', segments: ['II – documento de identificação do representante legal;'] },
        { type: 'item', segments: ['III – memorial descritivo das atividades;'] },
        {
          type: 'item',
          segments: [{ diffId: 'd5', kind: 'addition', text: 'IV – planta de situação em escala adequada;' }],
        },
        {
          type: 'paragraph',
          segments: [
            'Os documentos técnicos deverão ser assinados por ',
            {
              diffId: 'd6',
              kind: 'modification',
              text: 'responsável técnico habilitado no conselho profissional competente',
            },
            '.',
          ],
        },
        { type: 'paragraph', segments: [{ diffId: 'd7', kind: 'deletion', placeholder: true }] },
      ],
    },
    {
      pageNumber: 3,
      blocks: [
        { type: 'heading', segments: ['5. Disposições finais'] },
        {
          type: 'paragraph',
          segments: [
            'O descumprimento das condições descritas neste memorial sujeitará a requerente à ',
            { diffId: 'd10', kind: 'modification', text: 'multa de 10% (dez por cento)' },
            ' sobre o valor de referência, conforme regulamento aplicável.',
          ],
        },
        {
          type: 'paragraph',
          segments: [
            { diffId: 'd9', kind: 'addition', text: 'Parágrafo único. A multa será aplicada uma única vez por ocorrência.' },
          ],
        },
        {
          type: 'paragraph',
          segments: ['As informações prestadas são de inteira responsabilidade da requerente.'],
        },
        {
          type: 'signature',
          segments: [{ diffId: 'd8', kind: 'modification', text: 'Campo Grande/MS, 2 de junho de 2025.' }],
        },
        { type: 'signature', segments: ['Representante legal — Empresa Exemplo Ltda.'] },
      ],
    },
  ],
}

type DemoDifference = Omit<Difference, 'category' | 'subtype' | 'methods' | 'evidence'> & Partial<Pick<Difference, 'subtype'>>

const rawDemoDifferences: DemoDifference[] = [
  {
    id: 'd1',
    kind: 'modification',
    context: '2. Objeto',
    original: { location: { pageNumber: 1 }, text: 'prazo de 30 (trinta) dias' },
    updated: { location: { pageNumber: 1 }, text: 'prazo de 45 (quarenta e cinco) dias' },
  },
  {
    id: 'd2',
    kind: 'addition',
    context: '2. Objeto',
    updated: {
      location: { pageNumber: 1 },
      text: 'Os documentos poderão ser apresentados em formato digital, desde que legíveis.',
    },
  },
  {
    id: 'd3',
    kind: 'deletion',
    context: '2. Objeto',
    original: { location: { pageNumber: 1 }, text: 'acompanhada de cópia autenticada dos atos constitutivos' },
  },
  {
    id: 'd4',
    kind: 'modification',
    context: '3. Caracterização do imóvel',
    original: { location: { pageNumber: 2 }, text: 'área total de 1.200 m²' },
    updated: { location: { pageNumber: 2 }, text: 'área total de 1.350 m²' },
  },
  {
    id: 'd5',
    kind: 'addition',
    context: '4. Documentos apresentados',
    updated: { location: { pageNumber: 2 }, text: 'IV – planta de situação em escala adequada;' },
  },
  {
    id: 'd6',
    kind: 'modification',
    context: '4. Documentos apresentados',
    original: { location: { pageNumber: 2 }, text: 'responsável técnico habilitado' },
    updated: {
      location: { pageNumber: 2 },
      text: 'responsável técnico habilitado no conselho profissional competente',
    },
  },
  {
    id: 'd7',
    kind: 'deletion',
    context: '4. Documentos apresentados',
    original: {
      location: { pageNumber: 2 },
      text: 'A vistoria será agendada pela equipe técnica após a conferência dos documentos, com aviso prévio à requerente.',
    },
  },
  {
    id: 'd10',
    kind: 'modification',
    context: '5. Disposições finais',
    original: { location: { pageNumber: 3 }, text: 'multa de 5% (cinco por cento)' },
    updated: { location: { pageNumber: 3 }, text: 'multa de 10% (dez por cento)' },
  },
  {
    id: 'd9',
    kind: 'addition',
    context: '5. Disposições finais',
    updated: {
      location: { pageNumber: 3 },
      text: 'Parágrafo único. A multa será aplicada uma única vez por ocorrência.',
    },
  },
  {
    id: 'd8',
    kind: 'modification',
    context: 'Data e assinatura',
    subtype: 'date',
    original: { location: { pageNumber: 3 }, text: 'Campo Grande/MS, 10 de março de 2025.' },
    updated: { location: { pageNumber: 3 }, text: 'Campo Grande/MS, 2 de junho de 2025.' },
  },
]

/** Todas as diferenças fictícias são de texto, lidas da camada de texto. */
const demoDifferences: Difference[] = rawDemoDifferences.map((difference) => ({
  ...difference,
  category: 'text',
  subtype: difference.subtype ?? 'words',
  methods: ['text-layer'],
  evidence: 'direct',
}))

const demoPage = (pageNumber: number): PageAnalysis => ({
  pageNumber,
  width: 595,
  height: 842,
  rotation: 0,
  content: 'text',
  textSource: 'text-layer',
  text: 'analyzed',
  visual: 'analyzed',
})

const demoAnalysis: ComparisonAnalysis = {
  status: 'complete',
  pages: { original: [1, 2, 3].map(demoPage), updated: [1, 2, 3].map(demoPage) },
  pageMatches: [1, 2, 3].map((page) => ({ original: page, updated: page, relation: 'matched' as const })),
  warnings: [],
  methods: { textLayer: true, visual: true, ocr: true },
}

export const demoComparisonResult: ComparisonResult = {
  formatVersion: COMPARISON_FORMAT_VERSION,
  id: 'demonstracao',
  isDemonstration: true,
  documents: {
    original: { role: 'original', fileName: 'memorial-exemplo-versao-1.pdf', sizeBytes: 248_310, pageCount: 3 },
    updated: { role: 'updated', fileName: 'memorial-exemplo-versao-2.pdf', sizeBytes: 251_904, pageCount: 3 },
  },
  summary: summarize(demoDifferences),
  differences: demoDifferences,
  analysis: demoAnalysis,
}

export const demoNoDifferencesResult: ComparisonResult = {
  ...demoComparisonResult,
  id: 'demonstracao-sem-diferencas',
  summary: summarize([]),
  differences: [],
}

export const demoDocuments = {
  original: demoOriginalDocument,
  updated: demoUpdatedDocument,
} as const

/** Os documentos fictícios como fonte do visualizador. */
export const demoDocumentSources: Record<DocumentRole, DocumentSource> = {
  original: { kind: 'simulated', document: demoOriginalDocument },
  updated: { kind: 'simulated', document: demoUpdatedDocument },
}
