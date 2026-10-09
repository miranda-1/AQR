import { randomUUID } from 'node:crypto'
import type { ComparisonJob } from '../../shared/contracts/comparison.ts'

interface JobRecord {
  job: ComparisonJob
  controller: AbortController
  /** Momento a partir do qual a tarefa concluída é descartada. */
  expiresAt: number | undefined
}

/**
 * Tarefas de comparação, só em memória. O resultado fica disponível por `ttlMs` depois de pronto
 * e então é descartado; os PDFs nunca passam por aqui. Reiniciar o servidor apaga tudo.
 */
export class ComparisonJobStore {
  private readonly records = new Map<string, JobRecord>()
  private readonly ttlMs: number
  private readonly now: () => number

  constructor(ttlMs: number, now: () => number = Date.now) {
    this.ttlMs = ttlMs
    this.now = now
  }

  create(): { id: string; signal: AbortSignal } {
    this.purgeExpired()
    const id = randomUUID()
    const controller = new AbortController()
    this.records.set(id, { job: { id, status: 'queued' }, controller, expiresAt: undefined })
    return { id, signal: controller.signal }
  }

  get(id: string): ComparisonJob | undefined {
    const record = this.records.get(id)
    if (!record) return undefined
    if (record.expiresAt !== undefined && record.expiresAt <= this.now()) {
      this.records.delete(id)
      return undefined
    }
    return record.job
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

  /** Cancela (se ainda estiver em andamento) e descarta a tarefa. */
  remove(id: string): void {
    const record = this.records.get(id)
    if (!record) return
    record.controller.abort()
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
    for (const record of this.records.values()) record.controller.abort()
    this.records.clear()
  }

  get size(): number {
    return this.records.size
  }
}
