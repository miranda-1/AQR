import semadesMarkUrl from '@/assets/brand/semades-azul.svg'
import sloganMarkUrl from '@/assets/brand/slogan-azul.svg'
import { appConfig } from '@/config/app'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'

interface FooterMarkProps {
  src: string
  alt: string
  /** Proporção original do arquivo extraído (largura / altura). Não alterar. */
  aspectRatio: number
  height: number
  className?: string
}

/** Peça do kit SEMADES 2026 em versão azul; a largura sai da proporção original. */
function FooterMark({ src, alt, aspectRatio, height, className }: FooterMarkProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={Math.round(height * aspectRatio)}
      height={height}
      className={cn('block w-auto shrink-0 select-none', className)}
      style={{ aspectRatio: String(aspectRatio) }}
      draggable={false}
    />
  )
}

/**
 * Rodapé com as marcas na versão azul sobre branco, na ordem do kit SEMADES 2026:
 * SEMADES, slogan e PREFCG. Procedência em src/assets/brand/README.md.
 */
export function AppFooter() {
  return (
    <footer className="bg-white shadow-[0_-1px_3px_rgba(27,32,64,0.06)]">
      <ul
        aria-label="Marcas institucionais"
        className="mx-auto flex max-w-[1920px] items-center justify-center gap-5 px-4 py-3 sm:gap-9 sm:py-3.5"
      >
        <li>
          <FooterMark
            src={semadesMarkUrl}
            alt={`${appConfig.organization.short} — ${appConfig.organization.long}`}
            aspectRatio={6.7535}
            height={19}
            className="h-3.5 sm:h-[19px]"
          />
        </li>
        <li>
          <FooterMark
            src={sloganMarkUrl}
            alt="É fazendo o certo que a gente traz resultado"
            aspectRatio={2.6224}
            height={30}
            className="h-[22px] sm:h-[30px]"
          />
        </li>
        <li>
          <BrandMark height={30} className="h-[22px] w-auto sm:h-[30px]" />
        </li>
      </ul>
    </footer>
  )
}
