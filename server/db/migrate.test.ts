import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { integerColumn, openDatabase, textColumn, transaction, type Database } from './database.ts'
import { migrate, migrations } from './migrate.ts'

function insertAccount(db: Database, id: string, usuario: string) {
  db.prepare(
    `INSERT INTO accounts (id, usuario, nome, papel, situacao, criada_em, atualizada_em)
     VALUES (?, ?, 'Nome', 'analista', 'ativa', '2026-10-09', '2026-10-09')`,
  ).run(id, usuario)
}

describe('migrações', () => {
  let db: Database
  beforeEach(() => {
    db = openDatabase(':memory:')
  })
  afterEach(() => db.close())

  it('aplica todas e é idempotente', () => {
    expect(migrate(db)).toEqual(migrations.map((migration) => migration.version))
    expect(migrate(db)).toEqual([])
    const rows = db.prepare('SELECT version, name FROM schema_migrations').all()
    expect(rows.map((row) => textColumn(row, 'name'))).toEqual(['contas_e_auditoria'])
  })

  it('desfaz a migração inteira se ela falhar', () => {
    migrate(db)
    const broken = { version: 99, name: 'quebrada', sql: 'CREATE TABLE ok (id INTEGER); CREATE TABLE ok (id INTEGER);' }
    expect(() => migrate(db, [...migrations, broken])).toThrow()
    expect(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name = 'ok'").get()).toEqual({ n: 0 })
    expect(integerColumn(db.prepare('SELECT max(version) AS v FROM schema_migrations').get() ?? {}, 'v')).toBe(1)
  })

  describe('regras garantidas pelo banco', () => {
    beforeEach(() => {
      migrate(db)
    })

    it('usuário é único sem diferenciar maiúsculas e não pode ser alterado', () => {
      insertAccount(db, 'a', 'maria.silva')
      expect(() => insertAccount(db, 'b', 'Maria.Silva')).toThrow(/UNIQUE/)
      expect(() => db.prepare("UPDATE accounts SET usuario = 'outra' WHERE id = 'a'").run()).toThrow(/não pode ser alterado/)
      db.prepare("UPDATE accounts SET nome = 'Maria' WHERE id = 'a'").run()
    })

    it('contas não são excluídas', () => {
      insertAccount(db, 'a', 'maria.silva')
      expect(() => db.prepare("DELETE FROM accounts WHERE id = 'a'").run()).toThrow(/não são excluídas/)
    })

    it('papel e situação só aceitam os valores previstos', () => {
      expect(() =>
        db
          .prepare(
            `INSERT INTO accounts (id, usuario, nome, papel, situacao, criada_em, atualizada_em)
             VALUES ('x', 'joao', 'João', 'superusuario', 'ativa', 'h', 'h')`,
          )
          .run(),
      ).toThrow(/CHECK/)
    })

    it('a auditoria só aceita inserção', () => {
      insertAccount(db, 'a', 'maria.silva')
      db.prepare(
        `INSERT INTO audit_events (id, ocorrido_em, ator_id, ator_rotulo, ator_origem, acao, alvo_tipo, alvo_id, alvo_rotulo, detalhes)
         VALUES ('e1', 'h', NULL, 'sistema', 'sistema', 'conta.criada', 'conta', 'a', 'maria.silva', '{}')`,
      ).run()
      expect(() => db.prepare("UPDATE audit_events SET ator_rotulo = 'x'").run()).toThrow(/não pode ser alterada/)
      expect(() => db.prepare('DELETE FROM audit_events').run()).toThrow(/não pode ser apagada/)
    })

    it('transação desfaz tudo quando algo falha', () => {
      expect(() =>
        transaction(db, () => {
          insertAccount(db, 'a', 'maria.silva')
          insertAccount(db, 'b', 'maria.silva')
        }),
      ).toThrow()
      expect(db.prepare('SELECT count(*) AS n FROM accounts').get()).toEqual({ n: 0 })
    })
  })

  it('cria a pasta e usa WAL num banco em arquivo', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'aqr-db-'))
    try {
      const file = path.join(dir, 'sub', 'aqr.sqlite')
      const fileDb = openDatabase(file)
      migrate(fileDb)
      expect(fileDb.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' })
      fileDb.close()
      const reopened = openDatabase(file)
      expect(migrate(reopened)).toEqual([])
      reopened.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
