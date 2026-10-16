import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { differenceKindMeta } from '../model/difference-kinds'
import type { DifferenceKind, DocumentRole } from '../model/types'

interface DiffMarkProps {
  diffId: string
  kind: DifferenceKind
  /** Posição da diferença na lista completa (1, 2, 3…), para referência cruzada. */
  number: number
  active: boolean
  onSelect: (id: string) => void
  children: ReactNode
}

function activateOnKey(event: KeyboardEvent, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}

function IndexChip({ kind, number }: { kind: DifferenceKind; number: number }) {
  const meta = differenceKindMeta[kind]
  return (
    <span
      aria-hidden
      className={cn(
        'diff-index-chip mr-1 inline-flex translate-y-[-0.1em] items-center gap-px rounded-[3px] border px-1 align-middle font-sans text-[0.6875em] leading-[1.35] font-bold',
        meta.badgeClass,
      )}
    >
      <meta.icon className="size-[1em]" strokeWidth={3} />
      {number}
    </span>
  )
}

/**
 * Trecho destacado no documento. É um elemento inline (e não <button>) para
 * que o destaque quebre linha junto com o texto.
 */
export function DiffMark({ diffId, kind, number, active, onSelect, children }: DiffMarkProps) {
  const meta = differenceKindMeta[kind]
  const select = () => onSelect(diffId)
  return (
    <span
      role="button"
      tabIndex={0}
      data-diff-id={diffId}
      aria-current={active ? 'true' : undefined}
      onClick={select}
      onKeyDown={(event) => activateOnKey(event, select)}
      className={meta.markClass}
    >
      <IndexChip kind={kind} number={number} />
      <span className="sr-only">{`${meta.label} ${number}: `}</span>
      {children}
    </span>
  )
}

const placeholderText: Record<DifferenceKind, Record<DocumentRole, string>> = {
  addition: { original: 'incluído na versão atualizada', updated: '' },
  deletion: { original: '', updated: 'excluído desta versão' },
  modification: { original: '', updated: '' },
  move: { original: '', updated: '' },
}

/** Indica a posição de um trecho que só existe no outro documento. */
export function DiffPlaceholder({
  diffId,
  kind,
  number,
  active,
  onSelect,
  role,
}: Omit<DiffMarkProps, 'children'> & { role: DocumentRole }) {
  const meta = differenceKindMeta[kind]
  const select = () => onSelect(diffId)
  return (
    <span
      role="button"
      tabIndex={0}
      data-diff-id={diffId}
      aria-current={active ? 'true' : undefined}
      onClick={select}
      onKeyDown={(event) => activateOnKey(event, select)}
      className={cn(
        'diff-mark mx-[0.2em] inline-flex items-center gap-1 rounded-[3px] border border-dashed px-1.5 align-baseline font-sans text-[0.75em] font-semibold no-underline',
        meta.badgeClass,
      )}
    >
      <meta.icon aria-hidden className="size-[1.1em]" strokeWidth={3} />
      <span className="sr-only">{`${meta.label} ${number}: `}</span>
      <span aria-hidden className="diff-number">{number}</span>
      <span>{placeholderText[kind][role]}</span>
    </span>
  )
}
