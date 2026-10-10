import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useAsyncData } from '../hooks/use-async-data'
import type { AccountQuery, AccountRole, AccountStatus } from '../model/types'
import { useAdminSession } from '../session/admin-session'
import { RoleBadge, StatusBadge } from './AccountBadges'
import { fieldClass, labelClass } from './field-styles'

const PAGE_SIZE = 10
const SEARCH_DELAY_MS = 300

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

/** Valor digitado, atualizado só depois de uma pausa na digitação. */
function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Lista as contas com busca, filtros por papel e situação e paginação. */
export function AccountsList() {
  const { service } = useAdminSession()
  const isWide = useMediaQuery('(min-width: 768px)')
  const [text, setText] = useState('')
  const [papel, setPapel] = useState<AccountRole | ''>('')
  const [situacao, setSituacao] = useState<AccountStatus | ''>('')
  const [page, setPage] = useState(1)
  const q = useDebounced(text.trim(), SEARCH_DELAY_MS)

  const query: AccountQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(q ? { q } : {}),
    ...(papel ? { papel } : {}),
    ...(situacao ? { situacao } : {}),
  }
  const result = useAsyncData((signal) => service.listAccounts(query, { signal }), JSON.stringify(query))

  const changeFilter = (apply: () => void) => {
    apply()
    setPage(1)
  }
  const data = result.status === 'ready' ? result.data : undefined
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const filtering = Boolean(q || papel || situacao)

  return (
    <section aria-labelledby="contas-titulo" className="mt-6">
      <h2 id="contas-titulo" className="sr-only">Lista de contas</h2>
      <form
        role="search"
        aria-label="Buscar e filtrar contas"
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-4 rounded-lg bg-surface-sunken p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr]"
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="busca-contas" className={labelClass}>Buscar por usuário, nome ou e-mail</label>
          <input
            id="busca-contas"
            type="search"
            value={text}
            maxLength={100}
            autoComplete="off"
            onChange={(event) => changeFilter(() => setText(event.target.value))}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="filtro-papel" className={labelClass}>Papel</label>
          <select
            id="filtro-papel"
            value={papel}
            onChange={(event) => changeFilter(() => setPapel(event.target.value === 'administrador' || event.target.value === 'analista' ? event.target.value : ''))}
            className={fieldClass}
          >
            <option value="">Todos</option>
            <option value="administrador">Administrador</option>
            <option value="analista">Analista</option>
          </select>
        </div>
        <div>
          <label htmlFor="filtro-situacao" className={labelClass}>Situação</label>
          <select
            id="filtro-situacao"
            value={situacao}
            onChange={(event) => changeFilter(() => setSituacao(event.target.value === 'ativa' || event.target.value === 'inativa' ? event.target.value : ''))}
            className={fieldClass}
          >
            <option value="">Todas</option>
            <option value="ativa">Ativas</option>
            <option value="inativa">Desativadas</option>
          </select>
        </div>
      </form>

      <p role="status" className="mt-4 text-sm text-muted-foreground">
        {result.status === 'loading' && 'Carregando contas…'}
        {data && (data.total === 1 ? '1 conta encontrada.' : `${data.total} contas encontradas.`)}
      </p>

      {result.status === 'error' && (
        <div role="alert" className="mt-4 rounded-lg bg-deletion-bg p-5 text-deletion">
          <p className="font-semibold">Não foi possível carregar as contas.</p>
          <p className="mt-1">{result.message}</p>
          <Button type="button" variant="outline" className="mt-4 bg-white text-ink" onClick={result.reload}>
            Tentar de novo
          </Button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="mt-4 rounded-lg bg-white p-8 text-center shadow-surface">
          <p className="text-lg font-semibold text-ink">
            {filtering ? 'Nenhuma conta corresponde à busca.' : 'Ainda não há contas cadastradas.'}
          </p>
          <p className="mt-1 text-muted-foreground">
            {filtering ? 'Revise o texto buscado ou limpe os filtros.' : 'Crie a primeira conta para começar.'}
          </p>
        </div>
      )}

      {data && data.items.length > 0 &&
        (isWide ? (
          <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-surface">
            <table className="w-full text-left text-[0.9375rem]">
              <caption className="sr-only">Contas do AQR</caption>
              <thead className="bg-surface-sunken text-sm text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Nome</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Usuário</th>
                  <th scope="col" className="px-4 py-3 font-semibold">E-mail</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Papel</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Atualizada em</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-surface-sunken/60">
                {data.items.map((account) => (
                  <tr key={account.id}>
                    <th scope="row" className="px-4 py-3.5 font-semibold text-ink">{account.nome}</th>
                    <td className="px-4 py-3.5 text-ink">{account.usuario}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{account.email ?? 'Sem e-mail'}</td>
                    <td className="px-4 py-3.5"><RoleBadge role={account.papel} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={account.situacao} /></td>
                    <td className="px-4 py-3.5 text-muted-foreground">{formatDate(account.atualizadaEm)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link to={routes.adminAccount(account.id)} viewTransition className="font-semibold text-brand underline-offset-4 hover:underline">
                        Editar<span className="sr-only"> conta de {account.nome}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {data.items.map((account) => (
              <li key={account.id} className="rounded-lg bg-white p-4 shadow-surface">
                <p className="font-semibold text-ink">{account.nome}</p>
                <p className="text-sm text-muted-foreground">{account.usuario} · {account.email ?? 'Sem e-mail'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <RoleBadge role={account.papel} />
                  <StatusBadge status={account.situacao} />
                </div>
                <Link to={routes.adminAccount(account.id)} viewTransition className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline">
                  Editar<span className="sr-only"> conta de {account.nome}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}

      {data && data.total > data.pageSize && (
        <nav aria-label="Páginas de contas" className="mt-5 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {data.page} de {pageCount}</span>
          <Button type="button" variant="outline" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Próxima</Button>
        </nav>
      )}
    </section>
  )
}
