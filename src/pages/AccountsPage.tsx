import { AccountsList } from '@/features/admin/components/AccountsList'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function AccountsPage() {
  useDocumentTitle('Contas')

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Administração de contas</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Contas de quem usa o AQR. Contas desativadas não entram, mas continuam no histórico.
      </p>
      <AccountsList />
    </div>
  )
}
