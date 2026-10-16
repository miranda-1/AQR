import { TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { categoryLabels } from '../../model/describe'
import { differenceKindMeta } from '../../model/difference-kinds'
import type { DocumentRole, NormalizedRect } from '../../model/types'
import type { PdfDocumentHandle, PdfPageSize, PdfRenderTask } from './load-pdf'
import type { PageInfo, PageMark } from './page-marks'
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
  info?: PageInfo
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

function boxStyle(region: NormalizedRect): CSSProperties {
  return { left: percent(region.x), top: percent(region.y), width: percent(region.width), height: percent(region.height) }
}

function Mark({ mark, role, active, onSelect }: { mark: PageMark; role: DocumentRole; active: boolean; onSelect: (id: string) => void }) {
  const meta = differenceKindMeta[mark.kind]
  const label = `${meta.label} ${mark.number}${mark.category !== 'text' ? ` (${categoryLabels[mark.category].label.toLowerCase()})` : ''}`
  const chip = (
    <>
      <meta.icon aria-hidden className="size-[1em]" strokeWidth={3} />
      <span aria-hidden className="diff-number">{mark.number}</span>
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
        style={{ left: percent(mark.region?.x), top: percent(Math.min(mark.region?.y ?? 0, 0.97)) }}
      >
        {chip}
        <span className="sr-only">{`${label}: ${mark.type === 'anchor' ? anchorText[role] : mark.text}`}</span>
      </button>
    )
  }

  const boxClass = cn('pdf-diff-box', `pdf-diff-box--${mark.kind}`, `pdf-diff-box--cat-${mark.category}`, active && 'pdf-diff-box--active')
  return (
    <>
      <button
        type="button"
        data-diff-id={mark.diffId}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(mark.diffId)}
        className={boxClass}
        style={boxStyle(mark.region)}
      >
        {!mark.continuation && (
          <span
            aria-hidden
            className={cn(
              'pdf-diff-chip inline-flex items-center gap-px rounded-[3px] border px-1 font-sans text-[0.6875rem] leading-[1.35] font-bold',
              meta.badgeClass,
            )}
          >
            {chip}
          </span>
        )}
        <span className="sr-only">{`${label}${mark.continuation ? ' (continuação)' : ''}: ${mark.text}`}</span>
      </button>
      {mark.parts.map((part, index) => (
        // Partes do mesmo trecho: só desenho; o botão (com número e rótulo) é o retângulo principal.
        <span key={index} aria-hidden className={cn(boxClass, 'pdf-diff-box--part')} style={boxStyle(part)} />
      ))}
    </>
  )
}

/**
 * Uma página real do PDF: o desenho (canvas), a camada de texto do pdf.js (selecionável e lida
 * por leitores de tela) e, por cima, os destaques nas posições informadas pela comparação.
 * O desenho só acontece perto da área visível, é refeito quando a largura muda (zoom) e é
 * liberado quando a página se afasta, para documentos longos não acumularem canvas na memória.
 */
export function PdfPageView({ pdf, size, pageNumber, pageCount, role, marks, activeId, onSelect, info }: PdfPageViewProps) {
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
    if (!canvas || !text) return
    if (!near || scale <= 0) {
      // Longe da tela: devolve a memória do desenho (o tamanho da página continua reservado).
      canvas.width = 0
      canvas.height = 0
      text.replaceChildren()
      return
    }
    let cancelled = false
    const tasks: PdfRenderTask[] = []
    let release: (() => void) | undefined
    // Pequena espera: durante o arraste do zoom, desenha só o último tamanho.
    const timer = setTimeout(() => {
      pdf
        .getPage(pageNumber)
        .then((page) => {
          if (cancelled) return
          release = page.release
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
      release?.()
    }
  }, [pdf, pageNumber, near, scale])

  const infoLines = [info?.relation, ...(info?.notes ?? [])].filter((line): line is string => Boolean(line))
  return (
    <article
      ref={articleRef}
      data-page-number={pageNumber}
      aria-label={`Página ${pageNumber} de ${pageCount}${info?.relation ? `. ${info.relation}` : ''}`}
      className={cn(
        'relative mx-auto w-[calc(min(100cqw-2rem,46rem)*var(--zoom))] min-w-[16rem] bg-white shadow-[0_1px_2px_rgba(27,32,64,0.12),0_0_0_1px_rgba(27,32,64,0.06)]',
        info?.unanalyzed && 'pdf-page--unanalyzed',
      )}
      style={{ aspectRatio: `${size.width} / ${size.height}`, '--total-scale-factor': scale } as CSSProperties}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
      <div ref={textRef} className="pdf-text-layer" />
      {infoLines.length > 0 && (
        <p className="pdf-page-info flex items-center gap-1 rounded-[3px] bg-white/95 px-1.5 py-0.5 font-sans text-xs font-semibold text-ink shadow-surface">
          {info?.unanalyzed && <TriangleAlert aria-hidden className="size-3.5 shrink-0 text-deletion" />}
          {infoLines.join(' · ')}
        </p>
      )}
      {failed && (
        <p className="absolute inset-x-4 top-8 rounded-md bg-surface-sunken p-3 font-sans text-sm text-ink">
          Não foi possível desenhar esta página. Os destaques e a lista de diferenças continuam disponíveis.
        </p>
      )}
      {marks.map((mark) => (
        <Mark key={`${mark.diffId}${mark.continuation ? '-c' : ''}`} mark={mark} role={role} active={activeId === mark.diffId} onSelect={onSelect} />
      ))}
    </article>
  )
}
