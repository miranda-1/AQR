import { differenceKindMeta } from '@/features/comparison/model/difference-kinds'
import type { DifferenceKind } from '@/features/comparison/model/types'
import { cn } from '@/lib/utils'

/** Larguras (%) das linhas de texto; a primeira é o título. */
const LINE_WIDTHS = [60, 92, 84, 96, 70, 88, 80, 94, 64, 90, 78, 86, 58, 92, 74, 88, 66, 90, 80]

const sheets = {
  original: {
    label: 'Original',
    tagClass: 'bg-canvas text-ink',
    marks: { 3: 'deletion', 7: 'modification', 12: 'deletion' } as Partial<Record<number, DifferenceKind>>,
  },
  updated: {
    label: 'Atualizado',
    tagClass: 'bg-brand text-white',
    marks: { 4: 'addition', 7: 'modification', 10: 'addition' } as Partial<Record<number, DifferenceKind>>,
  },
}

/** Diferenças entre as duas folhas, na ordem das linhas (a modificação aparece nas duas, mas conta uma vez). */
export const sheetDifferences: readonly { row: number; kind: DifferenceKind }[] = Object.entries({ ...sheets.original.marks, ...sheets.updated.marks })
  .map(([row, kind]) => ({ row: Number(row), kind: kind as DifferenceKind }))
  .sort((a, b) => a.row - b.row)

/** Ícone da diferença; só aparece quando a varredura da entrada encontra a linha (ver login.css). */
function DifferenceBadge({ kind }: { kind: DifferenceKind }) {
  const Icon = differenceKindMeta[kind].icon
  return (
    <span className="login-doc-badge">
      <Icon className="size-[11px]" strokeWidth={3} />
    </span>
  )
}

/**
 * Folha decorativa atrás do cartão de login: um dos dois documentos que o AQR compara, com
 * etiqueta e trechos destacados. O conteúdo encosta no lado que aparece (esquerda ou direita).
 */
export function ComparedSheet({ version, className }: { version: keyof typeof sheets; className?: string }) {
  const sheet = sheets[version]
  const alignEnd = version === 'updated'
  return (
    <div aria-hidden data-version={version} className={cn('login-sheet px-[22px] py-[26px]', className)}>
      <div className={cn('mb-3.5 flex', alignEnd && 'justify-end')}>
        <span className={cn('rounded-[5px] px-2 py-1 text-xs font-extrabold', sheet.tagClass)}>{sheet.label}</span>
      </div>
      <div className={cn('isolate flex flex-col gap-[11px]', alignEnd ? 'items-end' : 'items-start')}>
        {LINE_WIDTHS.map((width, index) => {
          const kind = sheet.marks[index]
          return (
            <span
              key={index}
              className={cn('login-doc-line', index === 0 && 'is-title')}
              data-kind={kind}
              data-row={index}
              style={{ width: `${index === 0 ? 55 : width}%` }}
            >
              {kind && <DifferenceBadge kind={kind} />}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Etiqueta da lista de diferenças da entrada (mesmos ícones e nomes do visualizador). */
export function DifferenceChip({ row, kind }: { row: number; kind: DifferenceKind }) {
  const { icon: Icon, label } = differenceKindMeta[kind]
  return (
    <span className="login-chip" data-row={row}>
      <span className="login-chip-icon" data-kind={kind}>
        <Icon className="size-3" strokeWidth={3} />
      </span>
      {label}
    </span>
  )
}
