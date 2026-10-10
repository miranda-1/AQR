import {
  CircleAlert,
  KeyRound,
  Link2,
  Lock,
  LockOpen,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  ShieldX,
  UserPlus,
} from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import { accessEventTypes } from '../../../../shared/contracts/admin'
import { useAsyncData } from '../hooks/use-async-data'
import type { AccessEvent, AccessEventQuery, AccessEventType } from '../model/types'
import { useAdminSession } from '../session/admin-session'
import { formatDate } from './AccountsList'
import { fieldClass, labelClass } from './field-styles'

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

/** Rótulo e ícone de cada tipo de registro; recusas e falhas ganham também um tratamento de alerta. */
export const accessEventMeta: Record<AccessEventType, { label: string; Icon: Icon; alert?: boolean }> = {
  'login.ok': { label: 'Entrou no AQR', Icon: LogIn },
  'login.sem_conta': { label: 'Login recusado: sem conta no AQR', Icon: ShieldX, alert: true },
  'login.conta_inativa': { label: 'Login recusado: conta desativada', Icon: ShieldX, alert: true },
  'login.falha': { label: 'Falha ao confirmar o login', Icon: CircleAlert, alert: true },
  'login.vinculo_pendente': { label: 'Login recusado: vínculo pendente', Icon: ShieldX, alert: true },
  'login.vinculo_divergente': { label: 'Login recusado: vínculo diferente', Icon: ShieldX, alert: true },
  logout: { label: 'Saiu do AQR', Icon: LogOut },
  'identidade.criada': { label: 'Acesso criado no Keycloak', Icon: UserPlus },
  'identidade.convite_enviado': { label: 'Convite enviado por e-mail', Icon: Mail },
  'identidade.senha_redefinicao_enviada': { label: 'Link de nova senha enviado', Icon: KeyRound },
  'identidade.bloqueada': { label: 'Acesso bloqueado no Keycloak', Icon: Lock },
  'identidade.reativada': { label: 'Acesso reativado no Keycloak', Icon: LockOpen },
  'identidade.sincronizada': { label: 'Sincronizado com o Keycloak', Icon: RefreshCw },
  'identidade.vinculada': { label: 'Conta vinculada ao Keycloak', Icon: Link2 },
  'identidade.falha': { label: 'Falha no Keycloak', Icon: CircleAlert, alert: true },
}

const detailLabels: Record<string, string> = {
  sessoes_encerradas: 'As sessões abertas da conta foram encerradas.',
  keycloak_nao_encerrado: 'O AQR encerrou a sessão, mas não conseguiu encerrar a do Keycloak.',
}

function detailOf(detalhe: string): string {
  if (detailLabels[detalhe]) return detailLabels[detalhe]
  if (detalhe.startsWith('sub=')) return `Identificador no Keycloak: ${detalhe.slice(4)}`
  return `Detalhe: ${detalhe}`
}

function describe(event: AccessEvent): string {
  const who = event.usuario ? `Usuário ${event.usuario}` : 'Usuário não identificado'
  const by = event.ator ? ` Por ${event.ator.usuario ?? 'um administrador'}.` : ''
  const ip = event.ip ? ` Endereço ${event.ip}.` : ''
  return `${who}.${by}${ip}`
}

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Registros de acesso, do mais recente ao mais antigo, com filtro por tipo e por usuário. */
export function AccessEventList({ pageSize = 15 }: { pageSize?: number }) {
  const { service } = useAdminSession()
  const [evento, setEvento] = useState<AccessEventType | ''>('')
  const [usuarioText, setUsuarioText] = useState('')
  const [page, setPage] = useState(1)
  const usuario = useDebounced(usuarioText.trim(), 300)
  const query: AccessEventQuery = { page, pageSize, ...(evento ? { evento } : {}), ...(usuario ? { usuario } : {}) }
  const result = useAsyncData((signal) => service.listAccessEvents(query, { signal }), JSON.stringify(query))
  const data = result.status === 'ready' ? result.data : undefined
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div>
      <form role="search" aria-label="Filtrar registros de acesso" className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
        <div>
          <label htmlFor="filtro-evento" className={labelClass}>Tipo de registro</label>
          <select
            id="filtro-evento"
            value={evento}
            onChange={(event) => {
              setEvento(accessEventTypes.find((item) => item === event.target.value) ?? '')
              setPage(1)
            }}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {accessEventTypes.map((item) => (
              <option key={item} value={item}>{accessEventMeta[item].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-usuario" className={labelClass}>Usuário</label>
          <input
            id="filtro-usuario"
            type="search"
            value={usuarioText}
            onChange={(event) => {
              setUsuarioText(event.target.value)
              setPage(1)
            }}
            placeholder="Ex.: ana.souza"
            autoComplete="off"
            spellCheck={false}
            maxLength={100}
            className={fieldClass}
          />
        </div>
      </form>

      <p role="status" className="mt-4 text-sm text-muted-foreground">
        {result.status === 'loading' && 'Carregando os registros…'}
        {data && (data.total === 1 ? '1 registro encontrado.' : `${data.total} registros encontrados.`)}
      </p>

      {result.status === 'error' && (
        <div role="alert" className="mt-4 rounded-lg bg-deletion-bg p-5 text-deletion">
          <p className="font-semibold">Não foi possível carregar os registros de acesso.</p>
          <p className="mt-1">{result.message}</p>
          <Button type="button" variant="outline" className="mt-4 bg-white text-ink" onClick={result.reload}>Tentar de novo</Button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="mt-4 text-muted-foreground">
          {evento || usuario ? 'Nenhum registro corresponde aos filtros.' : 'Nenhum registro de acesso ainda.'}
        </p>
      )}

      {data && data.items.length > 0 && (
        <ol className="mt-4 grid gap-3">
          {data.items.map((event) => {
            const { label, Icon, alert } = accessEventMeta[event.evento]
            const detail = event.detalhe ? detailOf(event.detalhe) : null
            return (
              <li key={event.id} className="rounded-lg bg-white p-4 shadow-surface">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={alert ? 'inline-flex items-center gap-2 font-semibold text-deletion' : 'inline-flex items-center gap-2 font-semibold text-ink'}>
                    <Icon aria-hidden className={alert ? 'size-4' : 'size-4 text-brand'} />
                    {label}
                  </p>
                  <time dateTime={event.ocorridoEm} className="text-sm text-muted-foreground">{formatDate(event.ocorridoEm)}</time>
                </div>
                <p className="mt-1 text-[0.9375rem] text-ink">{describe(event)}</p>
                {detail && <p className="mt-1 break-words text-sm text-muted-foreground">{detail}</p>}
              </li>
            )
          })}
        </ol>
      )}

      {data && data.total > data.pageSize && (
        <nav aria-label="Páginas dos registros de acesso" className="mt-5 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {data.page} de {pageCount}</span>
          <Button type="button" variant="outline" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Próxima</Button>
        </nav>
      )}
    </div>
  )
}
