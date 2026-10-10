import { ArrowRight } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'

/** O que dizer a cada motivo de falha que o servidor devolve em `?erro=` depois do login. */
const errorMessages: Record<string, string> = {
  sem_conta: 'Seu usuário entrou no sistema de login, mas ainda não tem conta no AQR. Peça a um administrador do AQR para cadastrá-lo.',
  conta_inativa: 'Sua conta do AQR está desativada. Fale com um administrador do AQR para reativá-la.',
  negado: 'O login foi cancelado. Escolha "Entrar" para tentar de novo.',
  expirado: 'O login demorou demais e foi interrompido. Escolha "Entrar" para começar de novo.',
  falha: 'Não foi possível confirmar seu login. Tente de novo; se continuar, fale com o suporte da SEMADES.',
  indisponivel: 'O sistema de login está indisponível agora. Tente de novo em alguns minutos.',
}

interface KeycloakLoginProps {
  /** Página para onde voltar depois do login. */
  returnTo: string
}

/**
 * Entrada pelo login real: as credenciais são digitadas só na página do Keycloak, nunca no AQR.
 * É um link comum para o servidor, que inicia o fluxo e leva a pessoa ao Keycloak.
 */
export function KeycloakLogin({ returnTo }: KeycloakLoginProps) {
  const [params] = useSearchParams()
  const erro = params.get('erro')
  const message = erro ? (errorMessages[erro] ?? errorMessages.falha) : null

  return (
    <div className="mt-6 flex flex-col gap-4">
      {message && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">
          {message}
        </p>
      )}
      <Button asChild size="lg" className="group w-full">
        <a href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>
          Entrar com a conta da PREFCG
          <ArrowRight aria-hidden className="transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
        </a>
      </Button>
    </div>
  )
}
