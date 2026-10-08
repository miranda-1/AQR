import prefcgMarkUrl from '@/assets/brand/prefcg-azul.svg'
import { cn } from '@/lib/utils'

/** Proporção original da marca extraída (largura / altura). Não alterar. */
const PREFCG_ASPECT_RATIO = 4.6365

interface BrandMarkProps {
  /** Altura de referência em pixels; a largura é derivada da proporção original. Pode ser ajustada por classe (com w-auto). */
  height: number
  className?: string
}

/**
 * Marca PREFCG — versão monocromática azul (#283587) para meios digitais.
 * Arquivo vetorial extraído sem alterações de desenho; ver src/assets/brand/README.md.
 */
export function BrandMark({ height, className }: BrandMarkProps) {
  return (
    <img
      src={prefcgMarkUrl}
      alt="Prefeitura de Campo Grande"
      width={Math.round(height * PREFCG_ASPECT_RATIO)}
      height={height}
      className={cn('block shrink-0 select-none', className)}
      style={{ aspectRatio: String(PREFCG_ASPECT_RATIO) }}
      draggable={false}
    />
  )
}
