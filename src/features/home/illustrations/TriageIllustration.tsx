import type { ReactNode } from 'react'
import { IllustrationFrame, type IllustrationProps } from './IllustrationFrame'

const PAPER = { x: 95, y: 22, width: 130, height: 172 }
const FIELD_X = 109
const FIELD_WIDTH = 102

/** Campos do documento; a lente para sobre cada um, nesta ordem. */
const fields = [
  { box: 61, value: 58, highlight: 'illus-field-a', chip: 'illus-chip-1' },
  { box: 99, value: 70, highlight: 'illus-field-b', chip: 'illus-chip-2' },
  { box: 137, value: 46, highlight: 'illus-field-c', chip: 'illus-chip-3' },
] as const

/** Centro da lente em repouso (sobre o segundo campo). Igual ao transform-origin do CSS. */
const LENS = { cx: 155, cy: 107, r: 22 }

const CHIP_X = 246

function CheckIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={8} fill="var(--diff-addition-bg)" stroke="var(--diff-addition-line)" strokeWidth={1.5} />
      <path
        d={`M${cx - 3.5} ${cy} l2.5 2.5 l5 -5`}
        fill="none"
        stroke="var(--diff-addition-strong)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )
}

function TagIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={8} fill="var(--brand-blue-50)" stroke="var(--brand-blue)" strokeWidth={1.5} />
      <path d={`M${cx - 4} ${cy - 3.5} h4.5 l3.5 3.5 l-3.5 3.5 h-4.5 z`} fill="var(--brand-blue)" />
    </>
  )
}

function CardIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <rect x={cx - 7.5} y={cy - 5.5} width={15} height={11} rx={2} fill="var(--brand-blue-50)" stroke="var(--brand-blue)" strokeWidth={1.25} />
      <circle cx={cx - 3} cy={cy} r={1.9} fill="var(--brand-blue)" />
      <rect x={cx + 0.5} y={cy - 1.75} width={4.5} height={1.5} rx={0.75} fill="var(--brand-blue)" />
      <rect x={cx + 0.5} y={cy + 0.75} width={3} height={1.5} rx={0.75} fill="var(--brand-blue)" />
    </>
  )
}

const chipIcons = [CheckIcon, TagIcon, CardIcon] as const

/** Indicador de verificação/classificação ligado a um campo do documento. */
function Chip({ cy, className, icon }: { cy: number; className: string; icon: ReactNode }) {
  return (
    <g className={`illus-chip ${className}`}>
      <line
        className="illus-detail"
        x1={PAPER.x + PAPER.width + 2}
        y1={cy}
        x2={CHIP_X - 2}
        y2={cy}
        stroke="var(--line-strong)"
        strokeWidth={1.25}
        strokeDasharray="2 3"
      />
      <rect className="illus-paper" x={CHIP_X} y={cy - 14} width={92} height={28} rx={6} />
      {icon}
      <rect className="illus-title" x={CHIP_X + 30} y={cy - 6} width={46} height={5} rx={2.5} />
      <rect className="illus-text" x={CHIP_X + 30} y={cy + 2} width={30} height={4} rx={2} />
    </g>
  )
}

/** Pilha de documentos investigada por uma lupa, com indicadores de classificação surgindo ao lado. */
export function TriageIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      {/* Folhas de trás. Rotação por CSS, em torno do centro da folha (transform-box: fill-box). */}
      <g className="illus-detail">
        <rect className="illus-paper" {...PAPER} rx={6} style={{ transform: 'translate(-6px, 6px) rotate(-6deg)' }} />
        <rect className="illus-paper" {...PAPER} rx={6} style={{ transform: 'translate(4px, 4px) rotate(4deg)' }} />
      </g>

      <rect className="illus-paper" {...PAPER} rx={6} />
      <rect className="illus-title" x={FIELD_X} y={PAPER.y + 14} width={60} height={7} rx={3.5} />

      {fields.map((field) => (
        <g key={field.box}>
          <rect
            className={field.highlight}
            x={FIELD_X - 4}
            y={field.box - 4}
            width={FIELD_WIDTH + 8}
            height={24}
            rx={4}
            fill="var(--brand-blue-50)"
            stroke="var(--brand-blue)"
            strokeWidth={1.5}
          />
          <rect className="illus-text" x={FIELD_X} y={field.box - 7} width={34} height={4} rx={2} />
          <rect x={FIELD_X} y={field.box} width={FIELD_WIDTH} height={16} rx={3} fill="none" stroke="var(--line-default)" strokeWidth={1.5} />
          <rect className="illus-text" x={FIELD_X + 6} y={field.box + 6} width={field.value} height={4} rx={2} />
        </g>
      ))}

      <rect className="illus-text" x={FIELD_X} y={168} width={96} height={4} rx={2} />
      <rect className="illus-text" x={FIELD_X} y={178} width={64} height={4} rx={2} />

      {fields.map((field, index) => {
        const Icon = chipIcons[index] ?? CheckIcon
        const cy = field.box + 8
        return <Chip key={field.chip} cy={cy} className={field.chip} icon={<Icon cx={CHIP_X + 16} cy={cy} />} />
      })}

      {/* Lupa: o grupo externo percorre os campos; o interno amplia e reduz. */}
      <g className="illus-lens-path">
        <g className="illus-lens-zoom">
          <line
            x1={LENS.cx + 16}
            y1={LENS.cy + 16}
            x2={LENS.cx + 32}
            y2={LENS.cy + 32}
            stroke="var(--brand-blue)"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <circle cx={LENS.cx} cy={LENS.cy} r={LENS.r} fill="var(--brand-blue-50)" fillOpacity={0.45} stroke="var(--brand-blue)" strokeWidth={5} />
          <path
            d={`M${LENS.cx - 12} ${LENS.cy - 6} a13 13 0 0 1 8 -8`}
            fill="none"
            stroke="var(--brand-white)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
      </g>
    </IllustrationFrame>
  )
}
