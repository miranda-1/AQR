import { CircleCheck, CircleOff, Pencil, Repeat, UserPlus } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { useAsyncData } from '../hooks/use-async-data'
import type { AuditAction, AuditEvent, AuditQuery } from '../model/types'
import { useAdminSession } from '../session/admin-session'
import { roleLabel, statusLabel } from './AccountBadges'
import { formatDate } from './AccountsList'
import { fieldClass, labelClass } from './field-styles'

export const actionMeta: Record<AuditAction, { label: string; Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }> = {
  'conta.criada': { label: 'Conta criada', Icon: UserPlus },
  'conta.editada': { label: 'Dados editados', Icon: Pencil },
  'conta.papel_alterado': { label: 'Papel alterado', Icon: Repeat },
  'conta.desativada': { label: 'Conta desativada', Icon: CircleOff },
  'conta.reativada': { label: 'Conta reativada', Icon: CircleCheck },
}

const fieldLabels = { usuario: 'Usuário', nome: 'Nome', email: 'E-mail', papel: 'Papel', situacao: 'Situação' } as const
const originLabel: Record<AuditEvent['ator']['origem'], string> = { dev: 'modo de desenvolvimento', real: 'login', sistema: 'sistema' }

function show(field: keyof typeof fieldLabels, value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'vazio'
  if (field === 'papel') return roleLabel[value === 'administrador' ? 'administrador' : 'analista']
  if (field === 'situacao') return statusLabel[value === 'ativa' ? 'ativa' : 'inativa']
  return value
}

/** O que mudou, em frases curtas ("Nome: Ana → Ana Lima"). */
export function describeChanges(event: AuditEvent): string[] {
  const { antes, depois, motivo } = event.detalhes
  const lines: string[] = []
  for (const field of Object.keys(fieldLabels) as Array<keyof typeof fieldLabels>) {
    const after = depois?.[field]
    if (after === undefined) continue
    const before = antes?.[field]
    if (antes === undefined) lines.push(`${fieldLabels[field]}: ${show(field, after)}`)
    else if (before !== after) lines.push(`${fieldLabels[field]}: ${show(field, before)} → ${show(field, after)}`)
  }
  if (motivo) lines.push(`Motivo: ${motivo}`)
  return lines
}

interface AuditListProps {
  /** Só os eventos de uma conta (histórico na edição). */
  contaId?: string
  pageSize?: number
  /** Mostra o filtro por ação e o nome da conta em cada evento (página geral). */
  showFilter?: boolean
  /** Muda quando a conta é alterada, para o histórico recarregar. */
  refreshKey?: string
}

/** Linha do tempo de auditoria, do mais recente ao mais antigo. */
export function AuditList({ contaId, pageSize = 10, showFilter = false, refreshKey = '' }: AuditListProps) {
  const { service } = useAdminSession()
  const [acao, setAcao] = useState<AuditAction | ''>('')
  const [page, setPage] = useState(1)
  const query: AuditQuery = { page, pageSize, ...(contaId ? { contaId } : {}), ...(acao ? { acao } : {}) }
  const result = useAsyncData((signal) => service.listAudit(query, { signal }), `${JSON.stringify(query)}|${refreshKey}`)
  const data = result.status === 'ready' ? result.data : undefined
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div>
      {showFilter && (
        <div className="max-w-xs">
          <label htmlFor="filtro-acao" className={labelClass}>Tipo de evento</label>
          <select
            id="filtro-acao"
            value={acao}
            onChange={(event) => {
              const found = (Object.keys(actionMeta) as AuditAction[]).find((item) => item === event.target.value)
              setAcao(found ?? '')
              setPage(1)
            }}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {(Object.keys(actionMeta) as AuditAction[]).map((item) => (
              <option key={item} value={item}>{actionMeta[item].label}</option>
            ))}
          </select>
        </div>
      )}

      <p role="status" className="mt-4 text-sm text-muted-foreground">
        {result.status === 'loading' && 'Carregando o histórico…'}
        {data && (data.total === 1 ? '1 evento registrado.' : `${data.total} eventos registrados.`)}
      </p>

      {result.status === 'error' && (
        <div role="alert" className="mt-4 rounded-lg bg-deletion-bg p-5 text-deletion">
          <p className="font-semibold">Não foi possível carregar o histórico.</p>
          <p className="mt-1">{result.message}</p>
          <Button type="button" variant="outline" className="mt-4 bg-white text-ink" onClick={result.reload}>Tentar de novo</Button>
        </div>
      )}

      {data && data.items.length === 0 && <p className="mt-4 text-muted-foreground">Nenhum evento registrado ainda.</p>}

      {data && data.items.length > 0 && (
        <ol className="mt-4 grid gap-3">
          {data.items.map((event) => {
            const { label, Icon } = actionMeta[event.acao]
            const changes = describeChanges(event)
            return (
              <li key={event.id} className="rounded-lg bg-white p-4 shadow-surface">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 font-semibold text-ink">
                    <Icon aria-hidden className="size-4 text-brand" />
                    {label}
                  </p>
                  <time dateTime={event.ocorridoEm} className="text-sm text-muted-foreground">{formatDate(event.ocorridoEm)}</time>
                </div>
                <p className="mt-1 text-[0.9375rem] text-ink">
                  {showFilter ? (
                    <>
                      Conta de{' '}
                      <Link to={routes.adminAccount(event.alvo.id)} viewTransition className="font-semibold text-brand underline-offset-4 hover:underline">
                        {event.alvo.rotulo}
                      </Link>
                      .{' '}
                    </>
                  ) : null}
                  Por {event.ator.rotulo} ({originLabel[event.ator.origem]}).
                </p>
                {changes.length > 0 && (
                  <ul className="mt-2 grid gap-0.5 text-sm text-muted-foreground">
                    {changes.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {data && data.total > data.pageSize && (
        <nav aria-label="Páginas do histórico" className="mt-5 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {data.page} de {pageCount}</span>
          <Button type="button" variant="outline" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Próxima</Button>
        </nav>
      )}
    </div>
  )
}
