import { Link } from 'react-router'
import { appConfig } from '@/config/app'
import { routes } from '@/config/routes'
import { AccountMenu } from './AccountMenu'
import { AqrLogo } from './AqrLogo'
import { BrandMark } from './BrandMark'
import { ToolsNav } from './ToolsNav'

/**
 * Barra superior em duas faixas (decisão do responsável, 09/10/2026):
 * - em cima, branca: logo e nome do AQR à esquerda; PREFCG e conta à direita;
 * - embaixo, azul bem claro: as ferramentas, com o traço deslizante (ToolsNav).
 * As faixas se separam por tom; o conjunto, do conteúdo, por sombra suave. Sem linhas divisórias.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_3px_rgba(27,32,64,0.08),0_4px_12px_-6px_rgba(27,32,64,0.10)]">
      <div className="mx-auto flex h-[var(--header-height)] max-w-[1920px] items-center gap-3 px-3 sm:gap-4 lg:px-5">
        <Link
          to={routes.home}
          className="flex min-w-0 items-center gap-3 rounded-sm px-1 py-1"
          aria-label={`${appConfig.name}, ${appConfig.fullName} — início`}
        >
          {/* data-entry-target: destino da logo que voa até o cabeçalho depois do login (e origem dela ao sair). */}
          <span data-entry-target className="inline-flex">
            <AqrLogo size={22} />
          </span>
          <span className="hidden truncate text-sm text-muted-foreground lg:inline">{appConfig.fullName}</span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          {/* Marca PREFCG; a área de proteção (2X) é garantida pelo espaçamento. */}
          <BrandMark height={30} className="h-6 w-auto shrink-0 sm:h-[30px]" />
          <AccountMenu />
        </div>
      </div>
      <div className="bg-brand-50">
        <ToolsNav />
      </div>
    </header>
  )
}
