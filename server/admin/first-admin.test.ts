import { openDatabase } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { AuditRepository } from './audit-repository.ts'
import { createFirstAdmin } from './first-admin.ts'

describe('primeiro administrador', () => {
  it('cria o administrador com auditoria do sistema e recusa um segundo', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    const account = createFirstAdmin(db, { usuario: 'Maria', nome: 'Maria Souza', email: null })
    expect(account).toMatchObject({ usuario: 'maria', papel: 'administrador', situacao: 'ativa' })
    const [event] = new AuditRepository(db).list({ limit: 10, offset: 0 }).items
    expect(event).toMatchObject({ acao: 'conta.criada', ator: { id: null, rotulo: 'sistema', origem: 'sistema' } })
    expect(() => createFirstAdmin(db, { usuario: 'outro', nome: 'Outro', email: null })).toThrow(/Já existe/u)
    db.close()
  })
})
