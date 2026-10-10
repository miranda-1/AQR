import type { AccessEvent, Account, ComparisonUsage } from './model/types'

/** Contas fictícias para os testes das telas de administração. */
export function makeAccount(overrides: Partial<Account> & Pick<Account, 'id' | 'usuario' | 'nome'>): Account {
  return {
    email: null,
    papel: 'analista',
    situacao: 'ativa',
    criadaEm: '2026-10-01T12:00:00.000Z',
    atualizadaEm: '2026-10-01T12:00:00.000Z',
    desativadaEm: null,
    versao: 1,
    ...overrides,
  }
}

export const sampleAccounts: Account[] = [
  makeAccount({ id: 'u1', usuario: 'ana.lima', nome: 'Ana Lima', email: 'ana@campogrande.ms.gov.br', papel: 'administrador' }),
  makeAccount({ id: 'u2', usuario: 'bruno.reis', nome: 'Bruno Reis' }),
  makeAccount({ id: 'u3', usuario: 'carla.nunes', nome: 'Carla Nunes', situacao: 'inativa', desativadaEm: '2026-10-05T12:00:00.000Z' }),
]

/** Registros de acesso fictícios (mais recente primeiro). */
export const sampleAccessEvents: AccessEvent[] = [
  { id: 'a3', ocorridoEm: '2026-10-09T15:00:00.000Z', evento: 'login.sem_conta', usuario: 'visitante', contaId: null, ator: null, ip: '10.0.0.9', detalhe: null },
  { id: 'a2', ocorridoEm: '2026-10-09T14:00:00.000Z', evento: 'identidade.senha_redefinicao_enviada', usuario: 'bruno.reis', contaId: 'u2', ator: { id: 'u1', usuario: 'ana.lima' }, ip: null, detalhe: 'sessoes_encerradas' },
  { id: 'a1', ocorridoEm: '2026-10-09T13:00:00.000Z', evento: 'login.ok', usuario: 'ana.lima', contaId: 'u1', ator: null, ip: '10.0.0.2', detalhe: null },
]

/** Uso da comparação fictício. */
export const sampleComparisonUsage: ComparisonUsage[] = [
  { contaId: 'u2', usuario: 'bruno.reis', nome: 'Bruno Reis', total: 12, ultimos30Dias: 4, concluidas: 11, falhas: 1, ultimaEm: '2026-10-09T16:00:00.000Z' },
  { contaId: 'u1', usuario: 'ana.lima', nome: 'Ana Lima', total: 1, ultimos30Dias: 1, concluidas: 1, falhas: 0, ultimaEm: '2026-10-08T10:00:00.000Z' },
]
