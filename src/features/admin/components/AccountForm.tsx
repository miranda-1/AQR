import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  normalizeEmail,
  normalizeName,
  normalizeUsername,
  validateAccountFields,
  type FieldErrors,
} from '../../../../shared/validation/account'
import type { Account, AccountRole } from '../model/types'
import { fieldClass, labelClass } from './field-styles'

export interface AccountFormValues {
  usuario: string
  nome: string
  email: string | null
  papel: AccountRole
}

interface AccountFormProps {
  /** Conta em edição: o usuário aparece só para leitura (não muda depois de criado). */
  account?: Account
  submitLabel: string
  /** Envia os valores já normalizados. Devolve erros por campo do servidor, se houver. */
  onSubmit: (values: AccountFormValues) => Promise<FieldErrors | undefined>
  onCancel: () => void
  /** Mensagem geral de erro (conflito de versão, rede…), mostrada acima do formulário. */
  formError?: string | undefined
  /** Impede o envio (conta desativada ou carregando). */
  disabled?: boolean
}

const fieldOrder = ['usuario', 'nome', 'email', 'papel'] as const

/** Formulário de criação e edição. Valida no navegador para avisar cedo; o servidor decide. */
export function AccountForm({ account, submitLabel, onSubmit, onCancel, formError, disabled }: AccountFormProps) {
  const [usuario, setUsuario] = useState(account?.usuario ?? '')
  const [nome, setNome] = useState(account?.nome ?? '')
  const [email, setEmail] = useState(account?.email ?? '')
  const [papel, setPapel] = useState<AccountRole>(account?.papel ?? 'analista')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  const summary = fieldOrder.filter((field) => errors[field]).map((field) => ({ field, message: errors[field] }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values: AccountFormValues = {
      usuario: normalizeUsername(usuario),
      nome: normalizeName(nome),
      email: normalizeEmail(email),
      papel,
    }
    const found = validateAccountFields({
      ...(account ? {} : { usuario: values.usuario }),
      nome: values.nome,
      email: values.email,
      papel: values.papel,
    })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.getElementById(`campo-${Object.keys(found)[0]}`)?.focus()
      return
    }
    setSaving(true)
    const serverErrors = await onSubmit(values)
    setSaving(false)
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      setErrors(serverErrors)
      document.getElementById(`campo-${Object.keys(serverErrors)[0]}`)?.focus()
    }
  }

  const describe = (field: keyof FieldErrors, hint?: string) =>
    [hint ? `${field}-dica` : undefined, errors[field] ? `${field}-erro` : undefined].filter(Boolean).join(' ') || undefined

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={account ? 'Editar conta' : 'Nova conta'} className="grid gap-5">
      {formError && (
        <div role="alert" className="rounded-lg bg-deletion-bg p-4 text-deletion">{formError}</div>
      )}
      {summary.length > 0 && (
        <div role="alert" className="rounded-lg bg-deletion-bg p-4 text-deletion">
          <p className="font-semibold">Revise {summary.length === 1 ? 'o campo' : 'os campos'} abaixo antes de salvar.</p>
        </div>
      )}

      <div>
        <label htmlFor="campo-usuario" className={labelClass}>Usuário institucional</label>
        <input
          id="campo-usuario"
          value={usuario}
          readOnly={Boolean(account)}
          onChange={(event) => setUsuario(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={errors.usuario ? true : undefined}
          aria-describedby={describe('usuario', 'dica')}
          className={`${fieldClass} ${account ? 'bg-surface-sunken text-muted-foreground' : ''}`}
        />
        <p id="usuario-dica" className="mt-1.5 text-sm text-muted-foreground">
          {account ? 'O usuário não muda depois que a conta é criada.' : 'Login da pessoa na Prefeitura, em minúsculas. Não muda depois de criado.'}
        </p>
        {errors.usuario && <p id="usuario-erro" className="mt-1.5 text-sm font-semibold text-deletion">{errors.usuario}</p>}
      </div>

      <div>
        <label htmlFor="campo-nome" className={labelClass}>Nome</label>
        <input
          id="campo-nome"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          autoComplete="off"
          aria-invalid={errors.nome ? true : undefined}
          aria-describedby={describe('nome')}
          className={fieldClass}
        />
        {errors.nome && <p id="nome-erro" className="mt-1.5 text-sm font-semibold text-deletion">{errors.nome}</p>}
      </div>

      <div>
        <label htmlFor="campo-email" className={labelClass}>E-mail (opcional)</label>
        <input
          id="campo-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="off"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describe('email')}
          className={fieldClass}
        />
        {errors.email && <p id="email-erro" className="mt-1.5 text-sm font-semibold text-deletion">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="campo-papel" className={labelClass}>Papel</label>
        <select
          id="campo-papel"
          value={papel}
          onChange={(event) => setPapel(event.target.value === 'administrador' ? 'administrador' : 'analista')}
          aria-describedby={describe('papel', 'dica')}
          className={fieldClass}
        >
          <option value="analista">Analista</option>
          <option value="administrador">Administrador</option>
        </select>
        <p id="papel-dica" className="mt-1.5 text-sm text-muted-foreground">
          Analistas usam as ferramentas. Administradores também gerenciam as contas.
        </p>
        {errors.papel && <p id="papel-erro" className="mt-1.5 text-sm font-semibold text-deletion">{errors.papel}</p>}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={saving || disabled} className="min-h-11">
          {saving ? 'Salvando…' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-11">Cancelar</Button>
      </div>
    </form>
  )
}
