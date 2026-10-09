import type { ComparisonStage, Difference, DocumentRole, NormalizedRect } from '../../shared/contracts/comparison.ts'
import { defined } from '../test/defined.ts'
import { failureOf } from '../test/failure.ts'
import { intersectionOverUnion, unionOf } from '../test/geometry.ts'
import { makeImageOnlyPdf, makePasswordProtectedPdf, makePdf, type PdfLayout, type SyntheticPdf } from '../test/make-pdf.ts'
import { compareDocuments } from './compare-documents.ts'
import { REGION_PADDING } from './regions.ts'

/**
 * Suíte de precisão (critérios em docs/criterios-comparacao.md). Todos os casos usam PDFs
 * gerados de verdade e passam pela extração do pdf.js, como acontecerá com arquivos reais.
 */

type Pages = string[][]

const BASE: Pages = [
  [
    'CAPÍTULO I',
    'DISPOSIÇÕES GERAIS',
    'Art. 1º Fica instituído o procedimento de licença ambiental simplificada.',
    'Art. 2º O requerimento deve ser apresentado em até dez dias corridos.',
    '§ 1º O prazo conta da data de protocolo na secretaria.',
    'Art. 3º A taxa de análise corresponde a cem unidades fiscais.',
  ],
  [
    'CAPÍTULO II',
    'Art. 4º Compete à secretaria emitir o parecer técnico conclusivo.',
    'Art. 5º O parecer será publicado no diário oficial do município.',
    'Art. 6º O interessado poderá recorrer uma única vez.',
  ],
  [
    'CAPÍTULO III',
    'Art. 7º Os casos omissos serão resolvidos pela autoridade competente.',
    'Art. 8º Esta norma entra em vigor na data de sua publicação.',
  ],
]

function edit(pages: Pages, change: (pages: Pages) => void): Pages {
  const copy = pages.map((page) => [...page])
  change(copy)
  return copy
}

function replaceWord(pages: Pages, pageIndex: number, from: string, to: string): Pages {
  return edit(pages, (copy) => {
    copy[pageIndex] = defined(copy[pageIndex]).map((line) => line.replace(` ${from} `, ` ${to} `))
  })
}

async function compare(original: SyntheticPdf, updated: SyntheticPdf, onProgress?: (stage: ComparisonStage) => void) {
  return compareDocuments(
    { original: { fileName: 'original.pdf', bytes: original.bytes }, updated: { fileName: 'atualizado.pdf', bytes: updated.bytes } },
    { onProgress: (progress) => onProgress?.(progress.stage) },
  )
}

/** Retângulo esperado (gabarito do pdf-lib) para a sequência de palavras indicada, numa página. */
function expectedRegion(pdf: SyntheticPdf, pageNumber: number, words: readonly string[]): NormalizedRect {
  const onPage = pdf.words.filter((word) => word.pageNumber === pageNumber)
  const start = onPage.findIndex((_, index) => words.every((text, offset) => onPage[index + offset]?.text === text))
  if (start < 0) throw new Error(`Sequência "${words.join(' ')}" ausente na página ${pageNumber}`)
  return unionOf(
    onPage.slice(start, start + words.length).map((word) => word.region),
    REGION_PADDING,
  )
}

function expectLocated(difference: Difference, role: DocumentRole, pdf: SyntheticPdf, pageNumber: number, words: string[]) {
  const side = defined(difference[role], `lado ${role}`)
  expect(side.location.pageNumber).toBe(pageNumber)
  const region = defined(side.location.region, 'região')
  expect(intersectionOverUnion(region, expectedRegion(pdf, pageNumber, words))).toBeGreaterThanOrEqual(0.5)
}

describe('compareDocuments: precisão', () => {
  it('documentos idênticos: nenhuma diferença', async () => {
    const result = await compare(await makePdf(BASE), await makePdf(BASE))
    expect(result.differences).toEqual([])
    expect(result.summary).toEqual({ total: 0, additions: 0, deletions: 0, modifications: 0 })
    expect(result.isDemonstration).toBe(false)
    expect(result.documents.original).toMatchObject({ role: 'original', fileName: 'original.pdf', pageCount: 3 })
    expect(result.documents.updated).toMatchObject({ role: 'updated', fileName: 'atualizado.pdf', pageCount: 3 })
  })

  it('mesmo texto em outra diagramação (fonte, margem, quebras de linha): nenhuma diferença', async () => {
    const paragraphs: Pages = [BASE.flat()]
    const narrow: PdfLayout = { fontSize: 12, margin: 72, wrapWidth: 260 }
    const wide: PdfLayout = { fontSize: 10, margin: 50, wrapWidth: 480, lineHeight: 1.3 }
    const result = await compare(await makePdf(paragraphs, narrow), await makePdf(paragraphs, wide))
    expect(result.differences).toEqual([])
  })

  it('texto alterado: uma modificação, com os dois textos, contexto e posição', async () => {
    const original = await makePdf(BASE)
    const updated = await makePdf(replaceWord(BASE, 0, 'dez', 'quinze'))
    const result = await compare(original, updated)

    expect(result.differences).toHaveLength(1)
    const difference = defined(result.differences[0])
    expect(difference).toMatchObject({ id: 'd-001', kind: 'modification', context: 'Art. 2º' })
    expect(difference.original?.text).toBe('dez')
    expect(difference.updated?.text).toBe('quinze')
    expect(difference.anchors).toBeUndefined()
    expectLocated(difference, 'original', original, 1, ['dez'])
    expectLocated(difference, 'updated', updated, 1, ['quinze'])
  })

  it('inserção: uma adição, com âncora no original', async () => {
    const inserted = 'Art. 5º-A O parecer também será enviado ao interessado por meio eletrônico.'
    const original = await makePdf(BASE)
    const updated = await makePdf(edit(BASE, (copy) => defined(copy[1]).splice(3, 0, inserted)))
    const result = await compare(original, updated)

    expect(result.differences).toHaveLength(1)
    const difference = defined(result.differences[0])
    expect(difference).toMatchObject({ kind: 'addition', context: 'Art. 5º-A' })
    expect(difference.original).toBeUndefined()
    expect(difference.updated?.text).toBe(inserted)
    expectLocated(difference, 'updated', updated, 2, inserted.split(' '))
    expect(difference.anchors?.original?.pageNumber).toBe(2)
    expect(difference.anchors?.original?.region?.width).toBe(0)
  })

  it('remoção: uma exclusão, com âncora no atualizado', async () => {
    const removed = '§ 1º O prazo conta da data de protocolo na secretaria.'
    const original = await makePdf(BASE)
    const updated = await makePdf(edit(BASE, (copy) => defined(copy[0]).splice(4, 1)))
    const result = await compare(original, updated)

    expect(result.differences).toHaveLength(1)
    const difference = defined(result.differences[0])
    expect(difference).toMatchObject({ kind: 'deletion', context: 'Art. 2º, § 1º' })
    expect(difference.updated).toBeUndefined()
    expect(difference.original?.text).toBe(removed)
    expectLocated(difference, 'original', original, 1, removed.split(' '))
    expect(difference.anchors?.updated?.pageNumber).toBe(1)
  })

  it('várias páginas: cada alteração com o tipo, a página e o contexto certos', async () => {
    const original = await makePdf(BASE)
    const changed = edit(replaceWord(BASE, 0, 'cem', 'duzentas'), (copy) => {
      defined(copy[1]).splice(3, 1)
      defined(copy[2]).push('Art. 9º Revoga-se a norma anterior.')
    })
    const updated = await makePdf(changed)
    const result = await compare(original, updated)

    expect(result.differences.map((difference) => difference.kind)).toEqual(['modification', 'deletion', 'addition'])
    expect(result.differences.map((difference) => difference.context)).toEqual(['Art. 3º', 'Art. 6º', 'Art. 9º'])
    expect(result.differences.map((difference) => difference.id)).toEqual(['d-001', 'd-002', 'd-003'])
    expect(result.summary).toEqual({ total: 3, additions: 1, deletions: 1, modifications: 1 })

    const [modification, deletion, addition] = result.differences.map((difference) => defined(difference))
    expectLocated(defined(modification), 'original', original, 1, ['cem'])
    expectLocated(defined(modification), 'updated', updated, 1, ['duzentas'])
    expect(deletion?.original?.text).toBe('Art. 6º O interessado poderá recorrer uma única vez.')
    expectLocated(defined(deletion), 'original', original, 2, 'Art. 6º O interessado poderá recorrer uma única vez.'.split(' '))
    expect(addition?.updated?.text).toBe('Art. 9º Revoga-se a norma anterior.')
    expectLocated(defined(addition), 'updated', updated, 3, 'Art. 9º Revoga-se a norma anterior.'.split(' '))
  })

  it('relata as etapas do contrato, em ordem', async () => {
    const stages: ComparisonStage[] = []
    await compare(await makePdf(BASE), await makePdf(BASE), (stage) => stages.push(stage))
    expect(stages).toEqual(['validating', 'extracting', 'comparing', 'organizing'])
  })

  it('para quando o processamento é cancelado', async () => {
    const pdf = await makePdf(BASE)
    const controller = new AbortController()
    controller.abort()
    await expect(
      compareDocuments(
        { original: { fileName: 'a.pdf', bytes: pdf.bytes }, updated: { fileName: 'b.pdf', bytes: pdf.bytes } },
        { signal: controller.signal },
      ),
    ).rejects.toThrow()
  })
})

describe('compareDocuments: entradas problemáticas', () => {
  it('PDF inválido: documento incompatível, apontando qual', async () => {
    const valid = await makePdf(BASE)
    const invalid = { bytes: new TextEncoder().encode('%PDF-1.7\nisto não é um PDF de verdade'), words: [] }
    const failure = await failureOf(compare(valid, invalid))
    expect(failure.toComparisonError()).toEqual({ code: 'INCOMPATIBLE_DOCUMENT', document: 'updated' })
  })

  it('arquivo que não é PDF: recusado antes de abrir', async () => {
    const valid = await makePdf(BASE)
    const notPdf = { bytes: new TextEncoder().encode('planilha,valores\n1,2'), words: [] }
    const failure = await failureOf(compare(notPdf, valid))
    expect(failure.reason).toBe('assinatura-ausente')
    expect(failure.toComparisonError()).toEqual({ code: 'INCOMPATIBLE_DOCUMENT', document: 'original' })
  })

  it('PDF sem texto (digitalizado): erro próprio, sem OCR', async () => {
    const valid = await makePdf(BASE)
    const scanned = { bytes: await makeImageOnlyPdf(3), words: [] }
    const failure = await failureOf(compare(scanned, valid))
    expect(failure.toComparisonError()).toEqual({ code: 'NO_EXTRACTABLE_TEXT', document: 'original' })
  })

  it('PDF protegido por senha: documento incompatível', async () => {
    const valid = await makePdf(BASE)
    const locked = { bytes: await makePasswordProtectedPdf(), words: [] }
    const failure = await failureOf(compare(valid, locked))
    expect(failure.toComparisonError()).toEqual({ code: 'INCOMPATIBLE_DOCUMENT', document: 'updated' })
  })
})

describe('compareDocuments: desempenho', () => {
  it('compara dois documentos de 100 páginas em menos de 10 s', { timeout: 60_000 }, async () => {
    const pages: Pages = Array.from({ length: 100 }, (_, page) =>
      Array.from(
        { length: 40 },
        (_, line) => `Art. ${page * 40 + line + 1} O requerente apresentará o documento número ${page}-${line} à secretaria.`,
      ),
    )
    const changed = edit(pages, (copy) => {
      for (const index of [5, 40, 77, 99]) {
        const page = defined(copy[index])
        page[10] = `${page[10] ?? ''} Texto acrescentado.`
      }
    })
    const [original, updated] = await Promise.all([makePdf(pages, { fontSize: 9, lineHeight: 1.6 }), makePdf(changed, { fontSize: 9, lineHeight: 1.6 })])

    const started = performance.now()
    const result = await compare(original, updated)
    const elapsed = performance.now() - started

    expect(result.documents.original.pageCount).toBe(100)
    expect(result.summary).toMatchObject({ total: 4, additions: 4 })
    expect(elapsed).toBeLessThan(10_000)
  })
})
