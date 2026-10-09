import { ChevronDown, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { appConfig } from '@/config/app'
import { useAuthSession } from '@/features/auth/auth-session'
import { useEntryHandoff } from '@/features/auth/entry/entry-handoff'

/** Botão de conta (nome digitado no login) com o "Sair", que toca a animação "logo volta ao centro". */
export function AccountMenu() {
  const { userName } = useAuthSession()
  const { exit } = useEntryHandoff()
  const name = userName || 'Usuário'
  const initial = name.charAt(0).toUpperCase()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Conta de ${name}`}
          className="group h-10 gap-2 rounded-full pr-1 pl-1 hover:bg-secondary data-[state=open]:bg-secondary sm:pr-2.5"
        >
          <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-brand text-[0.8125rem] font-bold text-white">
            {initial}
          </span>
          <span className="hidden max-w-40 truncate text-sm font-semibold text-ink sm:inline">{name}</span>
          <ChevronDown aria-hidden className="hidden text-muted-foreground transition-transform group-data-[state=open]:rotate-180 sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-60 p-1">
        <DropdownMenuLabel className="px-3 pt-2 pb-1.5 font-normal">
          <span className="block truncate text-[0.9375rem] font-semibold text-ink">{name}</span>
          <span className="text-sm text-muted-foreground">{appConfig.organization.short}</span>
        </DropdownMenuLabel>
        {/* Separado por espaço, sem linha divisória. */}
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
