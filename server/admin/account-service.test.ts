import type { AuditEvent } from '../../shared/contracts/admin.ts'
import { openDatabase, type Database } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { ApiError } from '../http/errors.ts'
import { seedAccount } from '../test/accounts.ts'
import { AccountService, type AuditActor } from './account-service.ts'

describe('AccountService', () => {
  let db: Database
  let service: AccountService
  let actor: AuditActor
  let adminId: string
  let sequence: number

  beforeEach(() => {
    db = openDatabase(':memory:')
    migrate(db)
    adminId = seedAccount(db, 'admin.principal')
    actor = { id: adminId, rotulo: 'Admin principal', origem: 'dev' }
    sequence = 0
    service = new AccountService(db, {
      now: () => '2026-10-09T20:00:00.000Z',
      createId: () => `id-${++sequence}`,
    })
  })

  afterEach(() => db.close())

  const createAnalyst = (usuario = 'ana.silva', email: string | null = 'ana@prefeitura.gov.br') =>
    service.create({ usuario, nome: '  Ana   Silva  ', email, papel: 'analista' }, actor)

  it('cria uma conta normalizada e registra a auditoria na mesma operação', () => {
    const account = service.create(
      { usuario: ' ANA.SILVA ', nome: '  Ana   Silva  ', email: ' ANA@PREFEITURA.GOV.BR ', papel: 'analista' },
      actor,
    )

    expect(account).toMatchObject({
      usuario: 'ana.silva',
      nome: 'Ana Silva',
      email: 'ana@prefeitura.gov.br',
      papel: 'analista',
      situacao: 'ativa',
      versao: 1,
    })
    expect(service.listAudit({ contaId: account.id }).items).toMatchObject([
      { acao: 'conta.criada', ator: actor, alvo: { id: account.id } },
    ])
  })

  it('recusa campos inválidos e usuário ou e-mail duplicados sem diferenciar maiúsculas', () => {
    expect(() => service.create({ usuario: 'x', nome: '', email: 'errado', papel: 'analista' }, actor)).toThrowError(ApiError)
    createAnalyst()
    expect(() => createAnalyst('ANA.SILVA', null)).toThrowError(expect.objectContaining({ code: 'USERNAME_TAKEN' }))
    expect(() => createAnalyst('outra.pessoa', 'ANA@PREFEITURA.GOV.BR')).toThrowError(
      expect.objectContaining({ code: 'EMAIL_TAKEN' }),
    )
  })

  it('edita dados, mantém o usuário imutável e registra mudança de papel', () => {
    const account = createAnalyst()
    const updated = service.update(
      account.id,
      { nome: 'Ana Souza', email: null, papel: 'administrador', versao: account.versao },
      actor,
    )

    expect(updated).toMatchObject({ usuario: 'ana.silva', nome: 'Ana Souza', papel: 'administrador', versao: 2 })
    expect(service.listAudit({ contaId: account.id }).items[0]).toMatchObject({ acao: 'conta.papel_alterado' })
  })

  it('detecta edição concorrente pela versão', () => {
    const account = createAnalyst()
    expect(() =>
      service.update(account.id, { nome: 'Outro nome', email: null, papel: 'analista', versao: 99 }, actor),
    ).toThrowError(expect.objectContaining({ code: 'VERSION_CONFLICT' }))
  })

  it('não rebaixa nem desativa o último administrador ativo', () => {
    expect(() =>
      service.update(adminId, {
        nome: 'Admin principal',
        email: null,
        papel: 'analista',
        versao: service.get(adminId).versao,
      }, actor),
    ).toThrowError(expect.objectContaining({ code: 'LAST_ACTIVE_ADMIN' }))

    const otherActor: AuditActor = { id: 'outro', rotulo: 'Outro admin', origem: 'dev' }
    expect(() => service.deactivate(adminId, { versao: service.get(adminId).versao }, otherActor)).toThrowError(
      expect.objectContaining({ code: 'LAST_ACTIVE_ADMIN' }),
    )
  })

  it('não permite que o administrador desative a própria conta', () => {
    seedAccount(db, 'admin.reserva')
    expect(() => service.deactivate(adminId, { versao: service.get(adminId).versao }, actor)).toThrowError(
      expect.objectContaining({ code: 'SELF_DEACTIVATION' }),
    )
  })

  it('desativa e reativa outra conta, preservando o motivo na auditoria', () => {
    const account = createAnalyst()
    const inactive = service.deactivate(account.id, { versao: account.versao, motivo: 'Mudança de setor' }, actor)
    const active = service.reactivate(account.id, { versao: inactive.versao }, actor)

    expect(inactive).toMatchObject({ situacao: 'inativa', versao: 2 })
    expect(active).toMatchObject({ situacao: 'ativa', desativadaEm: null, versao: 3 })
    const events = service.listAudit({ contaId: account.id }).items
    expect(events.map((event: AuditEvent) => event.acao)).toEqual(['conta.reativada', 'conta.desativada', 'conta.criada'])
    expect(events[1]?.detalhes.motivo).toBe('Mudança de setor')
  })

  it('reverte a alteração quando a auditoria não pode ser gravada', () => {
    const account = createAnalyst()
    db.exec(`CREATE TRIGGER teste_recusa_auditoria BEFORE INSERT ON audit_events
      BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;`)

    expect(() =>
      service.update(account.id, { nome: 'Não deve persistir', email: null, papel: 'analista', versao: 1 }, actor),
    ).toThrow()
    expect(service.get(account.id)).toMatchObject({ nome: 'Ana Silva', versao: 1 })
  })

  it('busca curingas literalmente e pagina no limite definido', () => {
    createAnalyst('ana_percentual', null)
    createAnalyst('ana.comum', null)
    expect(service.list({ q: '%' }).total).toBe(0)
    expect(service.list({ q: 'ana_', pageSize: 500 }).pageSize).toBe(100)
  })
})
