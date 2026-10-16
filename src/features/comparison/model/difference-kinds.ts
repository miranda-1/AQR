import { ArrowRightLeft, EqualNot, Minus, Plus, type LucideIcon } from 'lucide-react'
import type { DifferenceKind } from './types'

interface DifferenceKindMeta {
  label: string
  pluralLabel: string
  icon: LucideIcon
  /** Classes de texto/borda/fundo — cor nunca é o único indicador. */
  textClass: string
  badgeClass: string
  markClass: string
}

export const differenceKindMeta: Record<DifferenceKind, DifferenceKindMeta> = {
  addition: {
    label: 'Adição',
    pluralLabel: 'Adições',
    icon: Plus,
    textClass: 'text-addition',
    badgeClass: 'bg-addition-bg text-addition border-addition-line',
    markClass: 'diff-mark diff-mark--addition',
  },
  deletion: {
    label: 'Exclusão',
    pluralLabel: 'Exclusões',
    icon: Minus,
    textClass: 'text-deletion',
    badgeClass: 'bg-deletion-bg text-deletion border-deletion-line',
    markClass: 'diff-mark diff-mark--deletion',
  },
  modification: {
    label: 'Modificação',
    pluralLabel: 'Modificações',
    icon: EqualNot,
    textClass: 'text-modification',
    badgeClass: 'bg-modification-bg text-modification border-modification-line',
    markClass: 'diff-mark diff-mark--modification',
  },
  move: {
    label: 'Movimentação',
    pluralLabel: 'Movimentações',
    icon: ArrowRightLeft,
    textClass: 'text-move',
    badgeClass: 'bg-move-bg text-move border-move-line',
    markClass: 'diff-mark diff-mark--move',
  },
}

export const differenceKinds: readonly DifferenceKind[] = ['addition', 'deletion', 'modification', 'move']
