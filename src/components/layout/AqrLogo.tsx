import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'color' | 'mono' | 'negative'

const tones: Record<Tone, { main: string; paper: string; accent: string | null; faint: string }> = {
  color: { main: 'var(--brand-blue)', paper: '#ffffff', accent: 'var(--brand-yellow)', faint: 'rgba(40,53,135,.35)' },
  mono: { main: 'var(--brand-blue)', paper: '#ffffff', accent: null, faint: 'rgba(40,53,135,.35)' },
  negative: { main: '#ffffff', paper: 'var(--brand-blue)', accent: 'var(--brand-yellow)', faint: 'rgba(255,255,255,.45)' },
}

interface SymbolProps {
  tone?: Tone
  /** Desenha o símbolo ao aparecer (classes animadas em src/features/auth/login.css). */
  animated?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Símbolo do AQR (Proposta 3, "Lente Q"): a lente de análise forma o Q e passa
 * sobre uma linha de texto destacada. Geometria idêntica a src/assets/aqr/aqr-simbolo.svg.
 */
export function AqrLensSymbol({ tone = 'color', animated = false, className, style }: SymbolProps) {
  const t = tones[tone]
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn(animated && 'aqr-animated', className)} style={style}>
      <path className="aqr-handle" d="M40.5 40.5 L55 55" stroke={t.main} strokeWidth="9" strokeLinecap="round" />
      <circle className="aqr-ring" cx="27" cy="27" r="19" fill={t.paper} stroke={t.main} strokeWidth="7" />
      {t.accent && <rect className="aqr-bar" x="14" y="19.5" width="26" height="8" rx="2" fill={t.accent} />}
      <rect className="aqr-inner" x="17" y="22" width="20" height="3.5" rx="1.75" fill={tone === 'negative' ? '#ffffff' : 'var(--brand-blue)'} />
      <rect className="aqr-inner aqr-inner-2" x="17" y="30.5" width="13" height="3.5" rx="1.75" fill={t.faint} />
    </svg>
  )
}

/** Deslocamento vertical da lente (em múltiplos do tamanho da letra), calibrado visualmente. */
const LENS_OFFSET = 0.12

interface LogoProps {
  /** Tamanho das letras em px; a lente acompanha a mesma proporção da proposta aprovada. */
  size?: number
  tone?: Tone
  /** Desenha a lente ao aparecer (usado no login). */
  animated?: boolean
  className?: string
}

/** Logo do AQR: "A" + lente (Q) + "R". Exposto a leitores de tela como "AQR". */
export function AqrLogo({ size = 22, tone = 'color', animated = false, className }: LogoProps) {
  const lens = size * 1.1
  return (
    <span
      role="img"
      aria-label="AQR"
      className={cn(
        'inline-flex items-center leading-none font-extrabold tracking-[-0.025em] select-none',
        tone === 'negative' ? 'text-white' : 'text-brand',
        className,
      )}
      style={{ fontSize: size }}
    >
      <span aria-hidden>A</span>
      <AqrLensSymbol
        tone={tone}
        animated={animated}
        className="shrink-0"
        // O anel (centro em y=27 de 64) fica alinhado ao meio das letras; a haste desce livremente.
        style={{
          width: lens,
          height: lens,
          marginLeft: size * 0.04,
          marginRight: size * 0.02,
          transform: `translateY(${LENS_OFFSET * size}px)`,
        }}
      />
      <span aria-hidden>R</span>
    </span>
  )
}
