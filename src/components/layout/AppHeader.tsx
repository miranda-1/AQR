import { Link } from 'react-router'
import { appConfig } from '@/config/app'
import { routes } from '@/config/routes'
import { AqrLogo } from './AqrLogo'
import { BrandMark } from './BrandMark'
import { ToolsMenu } from './ToolsMenu'

/**
 * Barra superior: ferramentas e nome do sistema à esquerda, marca PREFCG à direita.
 * Separada do conteúdo por sombra suave, sem linha divisória.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_3px_rgba(27,32,64,0.08),0_4px_12px_-6px_rgba(27,32,64,0.10)]">
      <div className="mx-auto flex h-[var(--header-height)] max-w-[1920px] items-center gap-2 px-3 sm:gap-4 lg:px-5">
        <nav aria-label="Ferramentas">
          <ToolsMenu />
        </nav>
        <Link
          to={routes.home}
          className="flex min-w-0 items-center gap-3 rounded-sm px-1 py-1"
          aria-label={`${appConfig.name}, ${appConfig.fullName} — início`}
        >
          <AqrLogo size={22} />
          <span className="hidden truncate text-sm text-muted-foreground lg:inline">{appConfig.fullName}</span>
        </Link>

        {/* Marca PREFCG à direita; a área de proteção (2X) é garantida pelo espaçamento lateral. */}
        <BrandMark height={30} className="ml-auto h-6 w-auto shrink-0 sm:h-[30px]" />
      </div>
    </header>
  )
}
