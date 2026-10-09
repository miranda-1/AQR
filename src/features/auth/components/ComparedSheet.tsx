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

/**
 * Folha decorativa atrás do cartão de login: um dos dois documentos que o AQR compara, com
 * etiqueta e trechos destacados. O conteúdo encosta no lado que aparece (esquerda ou direita).
 */
export function ComparedSheet({ version, className }: { version: keyof typeof sheets; className?: string }) {
  const sheet = sheets[version]
  const alignEnd = version === 'updated'
  return (
    <div aria-hidden className={cn('login-sheet px-[22px] py-[26px]', className)}>
      <div className={cn('mb-3.5 flex', alignEnd && 'justify-end')}>
        <span className={cn('rounded-[5px] px-2 py-1 text-xs font-extrabold', sheet.tagClass)}>{sheet.label}</span>
      </div>
      <div className={cn('isolate flex flex-col gap-[11px]', alignEnd ? 'items-end' : 'items-start')}>
        {LINE_WIDTHS.map((width, index) => (
          <span
            key={index}
            className={cn('login-doc-line', index === 0 && 'is-title')}
            data-kind={sheet.marks[index]}
            style={{ width: `${index === 0 ? 55 : width}%` }}
          />
        ))}
      </div>
    </div>
  )
}
