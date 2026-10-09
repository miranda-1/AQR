import { ArrowRight } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LoginFormProps {
  /** Chamado com os campos preenchidos (recebe o usuário). Nesta etapa não há verificação de credenciais. */
  onSubmit: (userName: string) => void
  /** Chamado a cada tecla, para os anéis do fundo pulsarem. */
  onType?: () => void
  disabled?: boolean
}

type Field = 'username' | 'password'

const messages: Record<Field, string> = {
  username: 'Informe o usuário.',
  password: 'Informe a senha.',
}

const inputClass =
  'h-[46px] w-full rounded-lg border border-line-strong bg-white px-3.5 text-[0.9375rem] text-ink transition-[border-color,box-shadow] focus-visible:border-brand focus-visible:shadow-[0_0_0_3px_rgb(40_53_135_/_0.22)] focus-visible:outline-none aria-[invalid=true]:border-destructive'

export function LoginForm({ onSubmit, onType, disabled = false }: LoginFormProps) {
  const id = useId()
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Partial<Record<Field, string>> = {}
    if (!usernameRef.current?.value.trim()) next.username = messages.username
    if (!passwordRef.current?.value) next.password = messages.password
    setErrors(next)
    if (next.username) return usernameRef.current?.focus()
    if (next.password) return passwordRef.current?.focus()
    onSubmit(usernameRef.current?.value ?? '')
  }

  function clearError(field: Field) {
    onType?.()
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const errorId = (field: Field) => `${id}-${field}-erro`

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" aria-label="Entrar no AQR">
      <div>
        <label htmlFor={`${id}-usuario`} className="mb-1.5 block text-sm font-semibold text-ink">
          Usuário
        </label>
        <input
          ref={usernameRef}
          id={`${id}-usuario`}
          name="usuario"
          autoComplete="username"
          className={inputClass}
          aria-invalid={errors.username ? true : undefined}
          aria-describedby={errors.username ? errorId('username') : undefined}
          onChange={() => clearError('username')}
          disabled={disabled}
        />
        {errors.username && (
          <p id={errorId('username')} className="mt-1.5 text-sm font-medium text-destructive">
            {errors.username}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-senha`} className="mb-1.5 block text-sm font-semibold text-ink">
          Senha
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id={`${id}-senha`}
            name="senha"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className={cn(inputClass, 'pr-24')}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? errorId('password') : undefined}
            onChange={() => clearError('password')}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute top-1/2 right-1.5 h-9 -translate-y-1/2 rounded-md px-2.5 text-sm font-semibold text-brand hover:bg-brand-50"
            disabled={disabled}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {errors.password && (
          <p id={errorId('password')} className="mt-1.5 text-sm font-medium text-destructive">
            {errors.password}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="group mt-1 w-full" disabled={disabled}>
        Entrar
        <ArrowRight aria-hidden className="transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
      </Button>
    </form>
  )
}
