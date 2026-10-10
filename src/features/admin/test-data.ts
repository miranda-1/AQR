import type { Account } from './model/types'

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
