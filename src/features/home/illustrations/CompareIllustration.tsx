import type { DifferenceKind } from '@/features/comparison/model/types'
import { IllustrationFrame, type IllustrationProps } from './IllustrationFrame'

const DOC_Y = 28
const DOC_WIDTH = 120
const DOC_HEIGHT = 164
const FIRST_ROW_Y = 78
const ROW_GAP = 13

const rowY = (row: number) => FIRST_ROW_Y + row * ROW_GAP

/** Mesmas cores semânticas do visualizador (tokens.css). */
const kindColors: Record<DifferenceKind, { bg: string; line: string; strong: string }> = {
  addition: { bg: 'var(--diff-addition-bg)', line: 'var(--diff-addition-line)', strong: 'var(--diff-addition-strong)' },
  deletion: { bg: 'var(--diff-deletion-bg)', line: 'var(--diff-deletion-line)', strong: 'var(--diff-deletion-strong)' },
  modification: {
    bg: 'var(--diff-modification-bg)',
    line: 'var(--diff-modification-line)',
    strong: 'var(--diff-modification-strong)',
  },
}

interface HighlightProps {
  x: number
  row: number
  width: number
  kind: DifferenceKind
  className: string
}

/** Linha destacada: fundo, cor e tratamento (sublinhado, tachado ou tracejado), como no visualizador. */
function Highlight({ x, row, width, kind, className }: HighlightProps) {
  const y = rowY(row)
  const colors = kindColors[kind]
  return (
    <g className={className}>
      <rect x={x - 4} y={y - 4} width={width + 8} height={13} rx={2} fill={colors.bg} />
      <rect x={x} y={y} width={width} height={5} rx={2.5} fill={colors.line} />
      {kind === 'deletion' && <rect x={x} y={y + 1.75} width={width} height={1.5} fill={colors.strong} />}
      {kind === 'addition' && <rect x={x} y={y + 7} width={width} height={1.5} fill={colors.line} />}
      {kind === 'modification' && (
        <line x1={x} y1={y + 7.75} x2={x + width} y2={y + 7.75} stroke={colors.line} strokeWidth={1.5} strokeDasharray="3 2" />
      )}
    </g>
  )
}

interface PaperProps {
  x: number
  rows: readonly number[]
  tagFill: string
}

function Paper({ x, rows, tagFill }: PaperProps) {
  return (
    <>
      <rect className="illus-paper" x={x} y={DOC_Y} width={DOC_WIDTH} height={DOC_HEIGHT} rx={6} />
      <rect x={x + 12} y={DOC_Y + 12} width={40} height={10} rx={3} fill={tagFill} />
      <rect className="illus-title" x={x + 12} y={DOC_Y + 30} width={70} height={6} rx={3} />
      {rows.map((width, row) => (
        <rect key={row} className="illus-text" x={x + 12} y={rowY(row)} width={width} height={5} rx={2.5} />
      ))}
    </>
  )
}

const LEFT_X = 50
const RIGHT_X = 190
const leftRows = [92, 84, 96, 70, 90, 80, 94, 60] as const
const rightRows = [92, 84, 88, 70, 90, 86, 94, 72] as const

/** Dois documentos que entram, se aproximam e são percorridos por um feixe que revela as diferenças. */
export function CompareIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <g className="illus-compare-left">
        <Paper x={LEFT_X} rows={leftRows} tagFill="var(--surface-canvas)" />
        <Highlight x={LEFT_X + 12} row={2} width={leftRows[2]} kind="deletion" className="illus-reveal-1" />
        <Highlight x={LEFT_X + 12} row={5} width={leftRows[5]} kind="modification" className="illus-reveal-2" />
        <g className="illus-reveal-1 illus-detail">
          <circle cx={LEFT_X - 11} cy={rowY(2) + 2.5} r={7} fill={kindColors.deletion.bg} stroke={kindColors.deletion.line} strokeWidth={1.5} />
          <rect x={LEFT_X - 14.5} y={rowY(2) + 1.75} width={7} height={1.5} rx={0.75} fill={kindColors.deletion.strong} />
        </g>
      </g>

      <g className="illus-compare-right">
        <Paper x={RIGHT_X} rows={rightRows} tagFill="var(--brand-blue)" />
        <Highlight x={RIGHT_X + 12} row={2} width={rightRows[2]} kind="addition" className="illus-reveal-1" />
        <Highlight x={RIGHT_X + 12} row={5} width={rightRows[5]} kind="modification" className="illus-reveal-2" />
        <g className="illus-reveal-1 illus-detail">
          <circle
            cx={RIGHT_X + DOC_WIDTH + 11}
            cy={rowY(2) + 2.5}
            r={7}
            fill={kindColors.addition.bg}
            stroke={kindColors.addition.line}
            strokeWidth={1.5}
          />
          <rect x={RIGHT_X + DOC_WIDTH + 7.5} y={rowY(2) + 1.75} width={7} height={1.5} rx={0.75} fill={kindColors.addition.strong} />
          <rect x={RIGHT_X + DOC_WIDTH + 10.25} y={rowY(2) - 1} width={1.5} height={7} rx={0.75} fill={kindColors.addition.strong} />
        </g>
      </g>

      {/* Feixe de comparação, em repouso na altura y=110. */}
      <g className="illus-compare-beam">
        <rect x={36} y={103} width={288} height={14} rx={7} fill="var(--brand-blue)" opacity={0.06} />
        <rect x={36} y={109.25} width={288} height={1.5} rx={0.75} fill="var(--brand-blue)" opacity={0.5} />
        <circle cx={180} cy={110} r={5.5} fill="var(--brand-white)" stroke="var(--brand-blue)" strokeWidth={2} />
        <circle cx={180} cy={110} r={2} fill="var(--brand-yellow)" />
      </g>
    </IllustrationFrame>
  )
}
