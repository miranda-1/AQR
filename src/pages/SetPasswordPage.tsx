import { ArrowRight, CircleCheck } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, type PasswordLinkInfo } from '../../shared/contracts/auth'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { inputClass } from '@/features/auth/components/LoginForm'
import { checkPasswordLink, setPasswordWithLink } from '@/features/auth/password-reset'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/utils'

const backLink = 'font-semibold text-brand underline-offset-4 hover:underline'

type Field = 'senha' | 'confirmacao'
type State =
  | { step: 'checking' }
  | { step: 'invalid'; message: string }
  | { step: 'form'; info: PasswordLinkInfo }
  | { step: 'done'; usuario: string }

/** Confere a senha nova antes de enviar; o servidor confere de novo (e o sistema de login, a política dele). */
export function passwordProblem(senha: string, usuario: string): string | null {
  if (senha.length < PASSWORD_MIN_LENGTH) return `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
  if (senha.length > PASSWORD_MAX_LENGTH) return `Use no máximo ${PASSWORD_MAX_LENGTH} caracteres.`
  if (usuario && senha.toLowerCase().includes(usuario.toLowerCase())) return 'A senha não pode conter o seu usuário.'
  return null
}

/**
 * Página aberta pelo link do e-mail (convite ou nova senha). O código vem depois do `#` e sai da
 * barra de endereço assim que a página abre, para não ficar no histórico.
 */
export function SetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [codigo] = useState(() => location.hash.replace(/^#/u, ''))
  const [state, setState] = useState<State>(() =>
    codigo ? { step: 'checking' } : { step: 'invalid', message: 'O link está incompleto. Abra de novo o link do e-mail ou peça um novo.' },
  )
  const info = state.step === 'form' ? state.info : null
  useDocumentTitle(info?.finalidade === 'convite' ? 'Crie sua senha' : 'Nova senha')

  useEffect(() => {
    if (location.hash) void navigate({ pathname: location.pathname, search: location.search }, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!codigo) return
    let cancelled = false
    void checkPasswordLink(codigo).then((result) => {
      if (cancelled) return
      setState(result.ok ? { step: 'form', info: result.data } : { step: 'invalid', message: result.message })
    })
    return () => {
      cancelled = true
    }
  }, [codigo])

  if (state.step === 'checking') {
    return (
      <AuthCard title="Definir senha" description="Conferindo o link…">
        <p role="status" className="sr-only">
          Conferindo o link
        </p>
      </AuthCard>
    )
  }

  if (state.step === 'invalid') {
    return (
      <AuthCard title="Link sem validade" description="Não foi possível usar este link.">
        <p role="alert" className="mt-6 rounded-lg bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">
          {state.message}
        </p>
        <p className="mt-[18px] text-center text-[0.84375rem] text-muted-foreground">
          <Link to={routes.forgotPassword} className={backLink}>
            Pedir um novo link
          </Link>{' '}
          ou{' '}
          <Link to={routes.login} className={backLink}>
            voltar para a entrada
          </Link>
          .
        </p>
      </AuthCard>
    )
  }

  if (state.step === 'done') {
    return (
      <AuthCard title="Senha definida" description="Pronto. Agora é só entrar com o seu usuário e a senha nova.">
        <div role="status" className="mt-6 flex gap-3 rounded-lg bg-brand-50 px-3.5 py-3 text-sm text-ink">
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
          <p>
            Seu usuário é <strong className="font-semibold">{state.usuario}</strong>.
          </p>
        </div>
        <Button size="lg" className="group mt-5 w-full" onClick={() => void navigate(routes.login)}>
          Ir para a entrada
          <ArrowRight aria-hidden className="transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
        </Button>
      </AuthCard>
    )
  }

  return <SetPasswordForm codigo={codigo} info={state.info} onDone={(usuario) => setState({ step: 'done', usuario })} onInvalid={(message) => setState({ step: 'invalid', message })} />
}

interface SetPasswordFormProps {
  codigo: string
  info: PasswordLinkInfo
  onDone: (usuario: string) => void
  onInvalid: (message: string) => void
}

function SetPasswordForm({ codigo, info, onDone, onInvalid }: SetPasswordFormProps) {
  const id = useId()
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invite = info.finalidade === 'convite'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const senha = passwordRef.current?.value ?? ''
    const confirmacao = confirmRef.current?.value ?? ''
    const next: Partial<Record<Field, string>> = {}
    const problem = passwordProblem(senha, info.usuario)
    if (problem) next.senha = problem
    else if (senha !== confirmacao) next.confirmacao = 'As duas senhas não são iguais.'
    setErrors(next)
    if (next.senha) return passwordRef.current?.focus()
    if (next.confirmacao) return confirmRef.current?.focus()

    setNotice(null)
    setSaving(true)
    const result = await setPasswordWithLink(codigo, senha)
    setSaving(false)
    if (result.ok) return onDone(result.data.usuario)
    if (result.status === 410) return onInvalid(result.message)
    if (result.fields.senha) {
      setErrors({ senha: result.fields.senha })
      passwordRef.current?.focus()
    }
    setNotice(result.message)
  }

  function clearError(field: Field) {
    setNotice(null)
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const errorId = (field: Field) => `${id}-${field}-erro`
  const hintId = `${id}-dica`

  return (
    <AuthCard
      title={invite ? 'Crie sua senha' : 'Nova senha'}
      description={invite ? `Olá, ${info.nome}. Defina a senha para entrar no AQR.` : `Olá, ${info.nome}. Escolha uma senha nova para entrar no AQR.`}
    >
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="mt-6 flex flex-col gap-4" aria-label={invite ? 'Criar senha' : 'Definir nova senha'}>
        {notice && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">
            {notice}
          </p>
        )}
        {/* Usuário visível e oculto ao mesmo tempo: o gerenciador de senhas do navegador salva o par certo. */}
        <p className="rounded-lg bg-surface-sunken px-3.5 py-2.5 text-sm text-muted-foreground">
          Usuário: <strong className="font-semibold text-ink">{info.usuario}</strong>
        </p>
        <input type="text" name="usuario" autoComplete="username" value={info.usuario} readOnly hidden />

        <div>
          <label htmlFor={`${id}-senha`} className="mb-1.5 block text-sm font-semibold text-ink">
            Senha nova
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id={`${id}-senha`}
              name="senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              className={cn(inputClass, 'pr-24')}
              aria-invalid={errors.senha ? true : undefined}
              aria-describedby={errors.senha ? `${errorId('senha')} ${hintId}` : hintId}
              onChange={() => clearError('senha')}
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}
              className="absolute top-1/2 right-1.5 h-9 -translate-y-1/2 rounded-md px-2.5 text-sm font-semibold text-brand hover:bg-brand-50"
              disabled={saving}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errors.senha && (
            <p id={errorId('senha')} className="mt-1.5 text-sm font-medium text-destructive">
              {errors.senha}
            </p>
          )}
          <p id={hintId} className="mt-1.5 text-[0.8125rem] text-muted-foreground">
            Pelo menos {PASSWORD_MIN_LENGTH} caracteres. Uma frase longa é mais segura que uma palavra complicada.
          </p>
        </div>

        <div>
          <label htmlFor={`${id}-confirmacao`} className="mb-1.5 block text-sm font-semibold text-ink">
            Repita a senha nova
          </label>
          <input
            ref={confirmRef}
            id={`${id}-confirmacao`}
            name="confirmacao"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            className={inputClass}
            aria-invalid={errors.confirmacao ? true : undefined}
            aria-describedby={errors.confirmacao ? errorId('confirmacao') : undefined}
            onChange={() => clearError('confirmacao')}
            disabled={saving}
          />
          {errors.confirmacao && (
            <p id={errorId('confirmacao')} className="mt-1.5 text-sm font-medium text-destructive">
              {errors.confirmacao}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="group mt-1 w-full" disabled={saving}>
          {saving ? 'Salvando…' : invite ? 'Criar senha' : 'Salvar senha nova'}
          <ArrowRight aria-hidden className="transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
        </Button>
      </form>
    </AuthCard>
  )
}
