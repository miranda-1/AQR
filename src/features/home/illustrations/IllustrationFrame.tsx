import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import './illustrations.css'

export interface IllustrationProps {
  /** false pausa a animação (ferramenta inativa ou área fora da tela). */
  running: boolean
  className?: string
}

/** SVG decorativo das ilustrações da página inicial (o texto ao lado já descreve a ferramenta). */
export function IllustrationFrame({ running, className, children }: IllustrationProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 360 220"
      aria-hidden
      focusable="false"
      data-animate={running ? 'on' : 'off'}
      className={cn('illus', className)}
    >
      {children}
    </svg>
  )
}
