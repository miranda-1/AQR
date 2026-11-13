import type { LeituraLimites } from './reading/read.ts'
import type { AnexoTriado } from './pipeline.ts'

/** Dados da thread de triagem: os anexos (bytes transferidos) e os limites de leitura. */
export interface TriagemWorkerInput {
  anexos: { id: string; nome: string; bytes: Uint8Array }[]
  limites: LeituraLimites
  ocr: boolean
  ocrLanguagePath: string
}

/** Mensagens da thread para o servidor. Falha leva só um código técnico, sem dado de documento. */
export type TriagemWorkerMessage =
  | { type: 'progresso'; concluidos: number; total: number }
  | { type: 'concluido'; anexos: AnexoTriado[] }
  | { type: 'falhou'; motivo: string }
