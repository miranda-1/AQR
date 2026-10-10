import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { StatusBadge } from '@/features/admin/components/AccountBadges'
import { AccountForm } from '@/features/admin/components/AccountForm'
import { fieldErrorsOf } from '@/features/admin/components/field-errors'
import { AuditList } from '@/features/admin/components/AuditList'
import { StatusChangeDialog } from '@/features/admin/components/StatusChangeDialog'
import { formatDate } from '@/features/admin/components/AccountsList'
import { messageOf, useAsyncData } from '@/features/admin/hooks/use-async-data'
import { useAdminSession } from '@/features/admin/session/admin-session'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function AccountEditPage() {
  useDocumentTitle('Editar conta')
  const { id = '' } = useParams()
  const { service, mode } = useAdminSession()
  const navigate = useNavigate()
  const result = useAsyncData((signal) => service.getAccount(id, { signal }), id)
  const [formError, setFormError] = useState<string | undefined>()
  const [notice, setNotice] = useState<string | undefined>()
  const [accessError, setAccessError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const back = (
    <Button asChild variant="outline" className="mt-6">
      <Link to={routes.adminAccounts} viewTransition>Voltar à lista de contas</Link>
    </Button>
  )

  if (result.status === 'loading') {
    return <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-6"><p role="status" className="text-muted-foreground">Carregando a conta…</p></div>
  }
  if (result.status === 'error') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Conta indisponível</h1>
        <p role="alert" className="mt-3 text-muted-foreground">{result.message}</p>
        {back}
      </div>
    )
  }

  const account = result.data
  const inactive = account.situacao === 'inativa'

  async function runAccess(action: () => Promise<unknown>) {
    setBusy(true)
    setAccessError(undefined)
    setNotice(undefined)
    try {
      await action()
    } catch (error) {
      setAccessError(messageOf(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Editar conta</h1>
      <p className="mt-2 text-muted-foreground">Criada em {formatDate(account.criadaEm)}.</p>
      {notice && <p role="status" className="mt-4 rounded-lg bg-addition-bg p-4 font-semibold text-addition">{notice}</p>}

      <div className="mt-6 rounded-xl bg-white p-5 shadow-surface sm:p-8">
        <AccountForm
          key={account.versao}
          account={account}
          submitLabel="Salvar alterações"
          formError={formError}
          onCancel={() => void navigate(routes.adminAccounts)}
          onSubmit={async (values) => {
            setFormError(undefined)
            setNotice(undefined)
            try {
              const saved = await service.updateAccount(id, { nome: values.nome, email: values.email, papel: values.papel, versao: account.versao })
              await navigate(routes.adminAccounts, { state: { notice: saved.aviso ?? `Conta de ${saved.nome} salva.` } })
              return undefined
            } catch (error) {
              const fields = fieldErrorsOf(error)
              if (Object.keys(fields).length === 0) setFormError(messageOf(error))
              return fields
            }
          }}
        />
        {formError && (
          <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={result.reload}>
            Recarregar a conta
          </Button>
        )}
      </div>

      <section aria-labelledby="situacao-titulo" className="mt-6 rounded-xl bg-surface-sunken p-5 sm:p-8">
        <h2 id="situacao-titulo" className="text-xl font-extrabold text-ink">Situação da conta</h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
          Atual: <StatusBadge status={account.situacao} />
          {inactive && account.desativadaEm && <span>desde {formatDate(account.desativadaEm)}</span>}
        </p>
        <div className="mt-4">
          <StatusChangeDialog
            account={account}
            onConfirm={async (motivo) => {
              const input = { versao: account.versao, ...(motivo ? { motivo } : {}) }
              const changed = inactive ? await service.reactivateAccount(id, input) : await service.deactivateAccount(id, input)
              setFormError(undefined)
              setNotice(changed.aviso ?? (changed.situacao === 'inativa' ? 'Conta desativada.' : 'Conta reativada.'))
              result.reload()
            }}
          />
        </div>
      </section>

      {mode === 'real' && (
        <section aria-labelledby="acesso-titulo" className="mt-6 rounded-xl bg-surface-sunken p-5 sm:p-8">
          <h2 id="acesso-titulo" className="text-xl font-extrabold text-ink">Acesso ao sistema</h2>
          <p className="mt-2 text-muted-foreground">
            A senha é definida pela própria pessoa, por um link enviado por e-mail. O AQR nunca vê a senha.
          </p>
          {accessError && <p role="alert" className="mt-3 font-semibold text-destructive">{accessError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={busy || inactive}
              onClick={() => void runAccess(() => service.sendPasswordLink(id).then(() => setNotice(`Link para definir a senha enviado para ${account.email ?? 'o e-mail da conta'}.`)))}
            >
              Enviar link para definir a senha
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() => void runAccess(() => service.syncIdentity(id).then(() => setNotice('Acesso sincronizado com o Keycloak.')))}
            >
              Sincronizar com o Keycloak
            </Button>
          </div>
        </section>
      )}

      <section aria-labelledby="historico-titulo" className="mt-6">
        <h2 id="historico-titulo" className="text-xl font-extrabold text-ink">Histórico da conta</h2>
        <AuditList contaId={id} pageSize={5} refreshKey={String(account.versao)} />
      </section>
      {back}
    </div>
  )
}
