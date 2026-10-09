import { LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Difference, DocumentRole } from '../../model/types'
import { loadPdf, type PdfDocumentHandle, type PdfPageSize } from './load-pdf'
import { marksByPage } from './page-marks'
import { PdfPageView } from './PdfPageView'

interface PdfPagesProps {
  file: File
  role: DocumentRole
  differences: readonly Difference[]
  numbers: ReadonlyMap<string, number>
  visibleIds: ReadonlySet<string>
  activeId: string | null
  onSelect: (id: string) => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; pdf: PdfDocumentHandle; sizes: PdfPageSize[] }
  | { status: 'failed' }

/** Abre o PDF escolhido (só na memória do navegador) e mostra todas as páginas com os destaques. */
export function PdfPages({ file, role, differences, numbers, visibleIds, activeId, onSelect }: PdfPagesProps) {
  // O estado vale para um arquivo; trocar de arquivo volta a "carregando" sem setState no efeito.
  const [loaded, setLoaded] = useState<{ file: File; state: LoadState }>()
  const state: LoadState = loaded?.file === file ? loaded.state : { status: 'loading' }

  useEffect(() => {
    let cancelled = false
    let opened: PdfDocumentHandle | undefined
    const setState = (next: LoadState) => setLoaded({ file, state: next })
    loadPdf(file)
      .then(async (pdf) => {
        opened = pdf
        // Os tamanhos de todas as páginas vêm antes do desenho, para a rolagem não "pular".
        const sizes = await Promise.all(
          Array.from({ length: pdf.pageCount }, (_, index) =>
            pdf.getPage(index + 1).then(({ width, height }) => ({ width, height })),
          ),
        )
        if (!cancelled) setState({ status: 'ready', pdf, sizes })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'failed' })
      })
    return () => {
      cancelled = true
      void opened?.destroy()
    }
  }, [file])

  const marks = useMemo(() => marksByPage(differences, role, numbers, visibleIds), [differences, role, numbers, visibleIds])

  if (state.status === 'loading') {
    return (
      <p role="status" className="flex items-center gap-2 py-10 text-[0.9375rem] text-muted-foreground">
        <LoaderCircle aria-hidden className="size-5 animate-spin text-brand" />
        Carregando as páginas…
      </p>
    )
  }
  if (state.status === 'failed') {
    return (
      <p role="status" className="max-w-md py-10 text-center text-[0.9375rem] text-ink">
        Não foi possível mostrar as páginas de {file.name} neste navegador. A lista de diferenças continua mostrando o
        texto de cada alteração.
      </p>
    )
  }
  return (
    <>
      {state.sizes.map((size, index) => (
        <PdfPageView
          key={index + 1}
          pdf={state.pdf}
          size={size}
          pageNumber={index + 1}
          pageCount={state.sizes.length}
          role={role}
          marks={marks.get(index + 1) ?? []}
          activeId={activeId}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}
