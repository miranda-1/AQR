import { useDocumentTitle } from '@/hooks/use-document-title'

export function AccountsPage() {
  useDocumentTitle('Contas')

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Administração de contas</h1>
    </div>
  )
}
