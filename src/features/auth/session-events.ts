/**
 * Aviso de que o servidor recusou a sessão (401) num pedido qualquer. Os serviços (comparação,
 * administração) não conhecem a sessão; quem cuida dela (`AuthSessionProvider`) escuta este aviso e,
 * no login real, leva a pessoa ao login na hora, em vez de mostrar uma falha genérica.
 */
export const SESSION_ENDED_EVENT = 'aqr:sessao-encerrada'

export function announceSessionEnded(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_ENDED_EVENT))
}
