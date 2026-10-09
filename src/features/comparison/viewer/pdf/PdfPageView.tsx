import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { differenceKindMeta } from '../../model/difference-kinds'
import type { DocumentRole } from '../../model/types'
import type { PdfDocumentHandle, PdfPageSize, PdfRenderTask } from './load-pdf'
import type { PageMark } from './page-marks'
import './pdf-page.css'

interface PdfPageViewProps {
  pdf: PdfDocumentHandle
  size: PdfPageSize
  pageNumber: number
  pageCount: number
  role: DocumentRole
  marks: readonly PageMark[]
  activeId: string | null
  onSelect: (id: string) => void
}

/** Distância da área visível a partir da qual a página já é desenhada. */
const PRELOAD_MARGIN = '800px 0px'
/** Densidade máxima do canvas (acima disto, gasta memória sem ganho visível). */
const MAX_PIXEL_RATIO = 2

const anchorText: Record<DocumentRole, string> = {
  original: 'incluído na versão atualizada',
  updated: 'excluído desta versão',
}

/** A página está perto da área visível? Sem IntersectionObserver (jsdom), considera que sim. */
function useNearViewport(ref: RefObject<Element | null>): boolean {
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setNear(entry?.isIntersecting ?? true), {
      rootMargin: PRELOAD_MARGIN,
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return near
}

/** Largura da página na tela, em pixels CSS (muda com o zoom e com a janela). */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? element.clientWidth)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}

function percent(value: number | undefined): string {
  return `${((value ?? 0) * 100).toFixed(3)}%`
}

function Mark({ mark, role, active, onSelect }: { mark: PageMark; role: DocumentRole; active: boolean; onSelect: (id: string) => void }) {
  const meta = differenceKindMeta[mark.kind]
  const chip = (
    <>
      <meta.icon aria-hidden className="size-[1em]" strokeWidth={3} />
      <span aria-hidden>{mark.number}</span>
    </>
  )

  if (mark.type === 'anchor' || !mark.region) {
    return (
      <button
        type="button"
        data-diff-id={mark.diffId}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(mark.diffId)}
        className={cn(
          'pdf-diff-anchor inline-flex items-center gap-0.5 rounded-[3px] border border-dashed px-1 font-sans text-[0.6875rem] leading-[1.35] font-bold',
          meta.badgeClass,
        )}
        style={{ left: percent(mark.region?.x), top: percent(mark.region?.y) }}
      >
        {chip}
        <span className="sr-only">{`${meta.label} ${mark.number}: ${mark.type === 'anchor' ? anchorText[role] : mark.text}`}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      data-diff-id={mark.diffId}
      aria-current={active ? 'true' : undefined}
      onClick={() => onSelect(mark.diffId)}
      className={`pdf-diff-box pdf-diff-box--${mark.kind}`}
      style={{
        left: percent(mark.region.x),
        top: percent(mark.region.y),
        width: percent(mark.region.width),
        height: percent(mark.region.height),
      }}
    >
      <span
        aria-hidden
        className={cn(
          'pdf-diff-chip inline-flex items-center gap-px rounded-[3px] border px-1 font-sans text-[0.6875rem] leading-[1.35] font-bold',
          meta.badgeClass,
        )}
      >
        {chip}
      </span>
      <span className="sr-only">{`${meta.label} ${mark.number}: ${mark.text}`}</span>
    </button>
  )
}

/**
 * Uma página real do PDF: o desenho (canvas), a camada de texto do pdf.js (selecionável e lida
 * por leitores de tela) e, por cima, os destaques nas posições informadas pela comparação.
 * O desenho só acontece perto da área visível e é refeito quando a largura muda (zoom).
 */
export function PdfPageView({ pdf, size, pageNumber, pageCount, role, marks, activeId, onSelect }: PdfPageViewProps) {
  const articleRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const near = useNearViewport(articleRef)
  const width = useWidth(articleRef)
  const [failed, setFailed] = useState(false)
  const scale = width > 0 ? width / size.width : 0

  useEffect(() => {
    const canvas = canvasRef.current
    const text = textRef.current
    if (!near || scale <= 0 || !canvas || !text) return
    let cancelled = false
    const tasks: PdfRenderTask[] = []
    // Pequena espera: durante o arraste do zoom, desenha só o último tamanho.
    const timer = setTimeout(() => {
      pdf
        .getPage(pageNumber)
        .then((page) => {
          if (cancelled) return
          const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
          const drawing = page.render(canvas, scale * pixelRatio)
          const textLayer = page.renderText(text, scale)
          tasks.push(drawing, textLayer)
          return Promise.all([drawing.promise, textLayer.promise])
        })
        .then(() => {
          if (!cancelled) setFailed(false)
        })
        .catch((error: unknown) => {
          // Cancelamento por troca de zoom não é falha.
          if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) setFailed(true)
        })
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
      for (const task of tasks) task.cancel()
    }
  }, [pdf, pageNumber, near, scale])

  return (
    <article
      ref={articleRef}
      data-page-number={pageNumber}
      aria-label={`Página ${pageNumber} de ${pageCount}`}
      className="relative mx-auto w-[calc(min(100cqw-2rem,46rem)*var(--zoom))] min-w-[16rem] bg-white shadow-[0_1px_2px_rgba(27,32,64,0.12),0_0_0_1px_rgba(27,32,64,0.06)]"
      style={{ aspectRatio: `${size.width} / ${size.height}`, '--total-scale-factor': scale } as CSSProperties}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
      <div ref={textRef} className="pdf-text-layer" />
      {failed && (
        <p className="absolute inset-x-4 top-4 rounded-md bg-surface-sunken p-3 font-sans text-sm text-ink">
          Não foi possível desenhar esta página. Os destaques e a lista de diferenças continuam disponíveis.
        </p>
      )}
      {marks.map((mark) => (
        <Mark key={mark.diffId} mark={mark} role={role} active={activeId === mark.diffId} onSelect={onSelect} />
      ))}
    </article>
  )
}
