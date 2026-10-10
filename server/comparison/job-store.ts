import { randomUUID } from 'node:crypto'
import type { ComparisonJob } from '../../shared/contracts/comparison.ts'

/** Motivos do cancelamento de uma tarefa (`signal.reason`). */
export const CANCELLED_BY_REQUESTER = 'cancelada_por_quem_enviou'
export const SERVER_SHUTDOWN = 'servidor_desligando'

/** Depois de entregue, o resultado ainda vale por este tempo, só para uma nova tentativa de quem o pediu. */
export const DELIVERY_GRACE_MS = 60_000

interface JobRecord {
  job: ComparisonJob
  controller: AbortController
  /** Conta de quem enviou (login real); `null` quando não há autenticação (desenvolvimento). */
  owner: string | null
  /** Momento a partir do qual a tarefa concluída é descartada. */
  expiresAt: number | undefined
}

/**
 * Tarefas de comparação, só em memória; os PDFs nunca passam por aqui e nada vai para o disco.
 * Cada tarefa pertence a quem a enviou: outra pessoa recebe "não encontrada", como se não existisse.
 * O resultado é descartado logo depois de entregue (`delivered`) ou, se ninguém o buscar, `ttlMs`
 * depois de pronto. Reiniciar o servidor apaga tudo.
 */
export class ComparisonJobStore {
  private readonly records = new Map<string, JobRecord>()
  private readonly ttlMs: number
  private readonly now: () => number

  constructor(ttlMs: number, now: () => number = Date.now) {
    this.ttlMs = ttlMs
    this.now = now
  }

  create(owner: string | null = null): { id: string; signal: AbortSignal } {
    this.purgeExpired()
    const id = randomUUID()
    const controller = new AbortController()
    this.records.set(id, { job: { id, status: 'queued' }, controller, owner, expiresAt: undefined })
    return { id, signal: controller.signal }
  }

  private recordFor(id: string, requester: string | null): JobRecord | undefined {
    const record = this.records.get(id)
    if (!record) return undefined
    if (record.expiresAt !== undefined && record.expiresAt <= this.now()) {
      this.records.delete(id)
      return undefined
    }
    if (record.owner !== null && record.owner !== requester) return undefined
    return record
  }

  /** A tarefa, se existir e for de `requester` (tarefas sem dono valem para qualquer um). */
  get(id: string, requester: string | null = null): ComparisonJob | undefined {
    return this.recordFor(id, requester)?.job
  }

  /** O resultado chegou a quem pediu: descarta em seguida (sobra só uma margem para repetir o pedido). */
  delivered(id: string): void {
    const record = this.records.get(id)
    if (!record || record.expiresAt === undefined) return
    record.expiresAt = Math.min(record.expiresAt, this.now() + DELIVERY_GRACE_MS)
  }

  /** Atualiza o andamento. Ignora tarefas já concluídas ou removidas. */
  progress(job: ComparisonJob & { status: 'processing' }): void {
    const record = this.records.get(job.id)
    if (record && (record.job.status === 'queued' || record.job.status === 'processing')) record.job = job
  }

  finish(job: ComparisonJob & { status: 'completed' | 'failed' }): void {
    const record = this.records.get(job.id)
    if (!record) return
    record.job = job
    record.expiresAt = this.now() + this.ttlMs
  }

  /** Cancela (se ainda estiver em andamento) e descarta a tarefa, se ela for de `requester`. */
  remove(id: string, requester: string | null = null): void {
    const record = this.recordFor(id, requester)
    if (!record) return
    record.controller.abort(CANCELLED_BY_REQUESTER)
    this.records.delete(id)
  }

  purgeExpired(): void {
    const now = this.now()
    for (const [id, record] of this.records) {
      if (record.expiresAt !== undefined && record.expiresAt <= now) this.records.delete(id)
    }
  }

  /** Cancela tudo (ao desligar o servidor). */
  clear(): void {
    for (const record of this.records.values()) record.controller.abort(SERVER_SHUTDOWN)
    this.records.clear()
  }

  get size(): number {
    return this.records.size
  }
}
