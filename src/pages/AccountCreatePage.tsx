import { useState } from 'react'
import { useNavigate } from 'react-router'
import { routes } from '@/config/routes'
import { AccountForm } from '@/features/admin/components/AccountForm'
import { fieldErrorsOf } from '@/features/admin/components/field-errors'
import { AccountServiceError } from '@/features/admin/model/types'
import { useAdminSession } from '@/features/admin/session/admin-session'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function AccountCreatePage() {
  useDocumentTitle('Nova conta')
  const { service } = useAdminSession()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | undefined>()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nova conta</h1>
      <p className="mt-2 text-muted-foreground">A conta nasce ativa. A senha não é guardada no AQR.</p>
      <div className="mt-6 rounded-xl bg-white p-5 shadow-surface sm:p-8">
        <AccountForm
          submitLabel="Criar conta"
          formError={formError}
          onCancel={() => void navigate(routes.adminAccounts)}
          onSubmit={async (values) => {
            setFormError(undefined)
            try {
              const created = await service.createAccount(values)
              await navigate(routes.adminAccounts, { state: { notice: `Conta de ${created.nome} criada.` } })
              return undefined
            } catch (error) {
              const fields = fieldErrorsOf(error)
              if (Object.keys(fields).length === 0) {
                setFormError(error instanceof AccountServiceError ? error.message : 'Não foi possível criar a conta. Tente de novo em instantes.')
              }
              return fields
            }
          }}
        />
      </div>
    </div>
  )
}
