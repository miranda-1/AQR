import { ArrowRight, MailCheck } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { appConfig } from '@/config/app'
import { routes } from '@/config/routes'
import { useAuthSession } from '@/features/auth/auth-session'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { inputClass } from '@/features/auth/components/LoginForm'
import { requestPasswordLink } from '@/features/auth/password-reset'
import { useDocumentTitle } from '@/hooks/use-document-title'

const backLink = 'font-semibold text-brand underline-offset-4 hover:underline'

/** "Esqueceu a senha?": o AQR envia por e-mail um link para uma página dele mesmo. */
export function ForgotPasswordPage() {
  useDocumentTitle('Esqueci a senha')
  const { mode } = useAuthSession()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (mode === 'loading') return null

  if (mode !== 'keycloak') {
    return (
      <AuthCard title="Esqueci a senha" description={`Procure o suporte da ${appConfig.organization.short} para criar uma nova senha.`}>
        <p className="mt-6 text-center text-[0.84375rem] text-muted-foreground">
          <Link to={routes.login} className={backLink}>
            Voltar para a entrada
          </Link>
        </p>
      </AuthCard>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const usuario = inputRef.current?.value.trim() ?? ''
    if (!usuario) {
      setFieldError('Informe seu usuário ou e-mail.')
      return inputRef.current?.focus()
    }
    setNotice(null)
    setSending(true)
    const result = await requestPasswordLink(usuario)
    setSending(false)
    if (!result.ok) return setNotice(result.message)
    setSent(true)
  }

  if (sent) {
    return (
      <AuthCard title="Confira seu e-mail" description="Se o usuário ou e-mail informado tiver uma conta ativa no AQR, enviamos um link para criar uma nova senha.">
        <div role="status" className="mt-6 flex gap-3 rounded-lg bg-brand-50 px-3.5 py-3 text-sm text-ink">
          <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
          <p>O link vale por 1 hora e só pode ser usado uma vez. Se não chegar em alguns minutos, confira a caixa de spam ou peça de novo.</p>
        </div>
        <p className="mt-[18px] text-center text-[0.84375rem] text-muted-foreground">
          <Link to={routes.login} className={backLink}>
            Voltar para a entrada
          </Link>
        </p>
      </AuthCard>
    )
  }

  const errorId = `${id}-erro`
  return (
    <AuthCard title="Esqueci a senha" description="Informe seu usuário ou e-mail. Vamos enviar um link para você criar uma nova senha.">
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="mt-6 flex flex-col gap-4" aria-label="Pedir link de nova senha">
        {notice && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">
            {notice}
          </p>
        )}
        <div>
          <label htmlFor={`${id}-usuario`} className="mb-1.5 block text-sm font-semibold text-ink">
            Usuário ou e-mail
          </label>
          <input
            ref={inputRef}
            id={`${id}-usuario`}
            name="usuario"
            autoComplete="username"
            className={inputClass}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? errorId : undefined}
            onChange={() => {
              setFieldError(null)
              setNotice(null)
            }}
            disabled={sending}
          />
          {fieldError && (
            <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive">
              {fieldError}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="group mt-1 w-full" disabled={sending}>
          {sending ? 'Enviando…' : 'Enviar link'}
          <ArrowRight aria-hidden className="transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
        </Button>
      </form>
      <p className="mt-[18px] text-center text-[0.84375rem] text-muted-foreground">
        Lembrou a senha?{' '}
        <Link to={routes.login} className={backLink}>
          Voltar para a entrada
        </Link>
        .
      </p>
    </AuthCard>
  )
}
