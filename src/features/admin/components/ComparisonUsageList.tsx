import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useAsyncData } from '../hooks/use-async-data'
import type { ComparisonUsage } from '../model/types'
import { useAdminSession } from '../session/admin-session'
import { formatDate } from './AccountsList'

const personOf = (item: ComparisonUsage) => item.nome ?? item.usuario ?? 'Conta removida'
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Quantas comparações cada pessoa fez nos últimos 12 meses. Nada do conteúdo nem os nomes dos arquivos. */
export function ComparisonUsageList() {
  const { service } = useAdminSession()
  const isWide = useMediaQuery('(min-width: 768px)')
  const result = useAsyncData((signal) => service.listComparisonUsage({ signal }), 'uso')
  const items = result.status === 'ready' ? result.data : undefined

  return (
    <div>
      <p role="status" className="text-sm text-muted-foreground">
        {result.status === 'loading' && 'Carregando o uso da comparação…'}
        {items && (items.length === 1 ? '1 pessoa usou a comparação.' : `${items.length} pessoas usaram a comparação.`)}
      </p>

      {result.status === 'error' && (
        <div role="alert" className="mt-4 rounded-lg bg-deletion-bg p-5 text-deletion">
          <p className="font-semibold">Não foi possível carregar o uso da comparação.</p>
          <p className="mt-1">{result.message}</p>
          <Button type="button" variant="outline" className="mt-4 bg-white text-ink" onClick={result.reload}>Tentar de novo</Button>
        </div>
      )}

      {items && items.length === 0 && <p className="mt-4 text-muted-foreground">Ninguém comparou documentos nos últimos 12 meses.</p>}

      {items && items.length > 0 &&
        (isWide ? (
          <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-surface">
            <table className="w-full text-left text-[0.9375rem]">
              <caption className="sr-only">Comparações por pessoa nos últimos 12 meses</caption>
              <thead className="bg-surface-sunken text-sm text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Pessoa</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Em 12 meses</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Em 30 dias</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Concluídas</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Com falha</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Última</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-surface-sunken/60">
                {items.map((item) => (
                  <tr key={item.contaId ?? item.usuario ?? item.ultimaEm}>
                    <th scope="row" className="px-4 py-3.5 font-semibold text-ink">
                      {personOf(item)}
                      {item.usuario && item.nome && <span className="block text-sm font-normal text-muted-foreground">{item.usuario}</span>}
                    </th>
                    <td className="px-4 py-3.5 text-right font-semibold text-ink tabular-nums">{item.total}</td>
                    <td className="px-4 py-3.5 text-right text-ink tabular-nums">{item.ultimos30Dias}</td>
                    <td className="px-4 py-3.5 text-right text-ink tabular-nums">{item.concluidas}</td>
                    <td className="px-4 py-3.5 text-right text-ink tabular-nums">{item.falhas}</td>
                    <td className="px-4 py-3.5 text-muted-foreground"><time dateTime={item.ultimaEm}>{formatDate(item.ultimaEm)}</time></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {items.map((item) => (
              <li key={item.contaId ?? item.usuario ?? item.ultimaEm} className="rounded-lg bg-white p-4 shadow-surface">
                <p className="font-semibold text-ink">{personOf(item)}</p>
                {item.usuario && item.nome && <p className="text-sm text-muted-foreground">{item.usuario}</p>}
                <p className="mt-2 text-[0.9375rem] text-ink">
                  {plural(item.total, 'comparação', 'comparações')} em 12 meses · {item.ultimos30Dias} em 30 dias
                </p>
                <p className="text-sm text-muted-foreground">
                  {plural(item.concluidas, 'concluída', 'concluídas')} · {plural(item.falhas, 'com falha', 'com falha')} · última em{' '}
                  <time dateTime={item.ultimaEm}>{formatDate(item.ultimaEm)}</time>
                </p>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}
