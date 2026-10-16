import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/** Anéis pontilhados do login "Névoa": [raio, espessura do ponto, espaço entre pontos], num viewBox de 1400. */
const RINGS = [
  [170, 4, 14],
  [250, 3, 18],
  [330, 5, 22],
  [420, 3, 16],
  [520, 4, 26],
  [630, 3, 20],
] as const

/** O terceiro anel é amarelo (decorativo). */
const YELLOW_RING = 2
/** No fundo claro, os pontos são azuis; o amarelo fica mais forte para não sumir. */
const BASE_OPACITY = [0.2, 0.16, 0.14, 0.12, 0.1, 0.08] as const

/** Raios dos anéis em px (o SVG é desenhado em escala 1:1), usados como origem dos pontos da entrada. */
export const ringRadii: readonly number[] = RINGS.map(([radius]) => radius)

function Rings({ className, glow }: { className: string; glow: boolean }) {
  return (
    <svg className={className} viewBox="0 0 1400 1400">
      {RINGS.map(([radius, dot, gap], index) => {
        const yellow = index === YELLOW_RING
        return (
          <circle
            key={radius}
            cx="700"
            cy="700"
            r={radius}
            stroke={yellow ? 'var(--brand-yellow)' : 'var(--brand-blue)'}
            strokeOpacity={glow ? (yellow ? 1 : 0.55) : yellow ? 0.75 : BASE_OPACITY[index]}
            strokeWidth={dot}
            strokeDasharray={`0 ${gap}`}
          />
        )
      })}
    </svg>
  )
}

interface DottedRingsProps {
  /** Recuo durante a entrada, para os pontos e a logo ganharem destaque. */
  dimmed?: boolean
  /** Brilho que percorre os anéis; desligado nas camadas de passagem, para não haver salto de posição. */
  glow?: boolean
  /** Muda a cada tecla digitada; cada mudança faz os anéis pulsarem de leve. */
  pulseKey?: number
}

/** Anéis pontilhados parados e centralizados, com um brilho que os percorre. Decorativo. */
export function DottedRings({ dimmed = false, glow = true, pulseKey = 0 }: DottedRingsProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!pulseKey || !element) return
    element.classList.remove('is-pulsing')
    // Força o reinício da animação de pulso.
    void element.offsetWidth
    element.classList.add('is-pulsing')
  }, [pulseKey])

  return (
    <div ref={ref} aria-hidden className={cn('login-rings', dimmed && 'is-dimmed')}>
      <Rings className="login-rings-base" glow={false} />
      {glow && <Rings className="login-rings-glow" glow />}
    </div>
  )
}
