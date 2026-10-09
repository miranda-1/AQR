import { Check, ChevronDown, LayoutGrid, LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useEntryHandoff } from '@/features/auth/entry/entry-handoff'
import { cn } from '@/lib/utils'
import { isToolActive, toolItems } from './navigation'

/**
 * Menu "Ferramentas": desce da barra superior, sem sobrepor nem bloquear a página
 * (modal={false}). Fecha ao clicar fora, com Esc ou ao escolher uma opção.
 */
export function ToolsMenu({ className }: { className?: string }) {
  const { pathname } = useLocation()
  const { exit } = useEntryHandoff()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'group gap-1.5 px-3 text-ink hover:bg-secondary data-[state=open]:bg-secondary',
            className,
          )}
        >
          <LayoutGrid aria-hidden className="text-brand" />
          Ferramentas
          <ChevronDown aria-hidden className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-[min(23rem,calc(100vw-2rem))] p-1">
        {toolItems.map((item) => {
          const active = isToolActive(item, pathname)
          return (
            <DropdownMenuItem key={item.to} asChild>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative min-h-11 cursor-pointer gap-2.5 px-3 py-2 text-[0.9375rem] text-ink focus:bg-secondary focus:text-ink',
                  active && 'bg-brand-50 font-semibold text-brand focus:bg-brand-100 focus:text-brand',
                )}
              >
                {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand" />}
                <item.icon aria-hidden className={cn('size-[1.125rem]', active ? 'text-brand' : 'text-muted-foreground')} />
                <span className="flex-1 whitespace-nowrap">{item.label}</span>
                {item.status === 'in-development' && <StatusBadge variant="development">Em desenvolvimento</StatusBadge>}
                {active && <Check aria-hidden className="size-4 text-brand" />}
              </Link>
            </DropdownMenuItem>
          )
        })}
        {/* Sai com a animação "logo volta ao centro" e encerra a sessão (separado por espaço, sem linha divisória). */}
        <DropdownMenuItem
          onSelect={exit}
          className="mt-1 min-h-11 cursor-pointer gap-2.5 px-3 py-2 text-[0.9375rem] text-muted-foreground focus:bg-secondary focus:text-ink"
        >
          <LogOut aria-hidden className="size-[1.125rem]" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
