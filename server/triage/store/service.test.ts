import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDatabase, textColumn, type Database } from '../../db/database.ts'
import { migrate } from '../../db/migrate.ts'
import { seedAccount } from '../../test/accounts.ts'
import { defined } from '../../test/defined.ts'
import { loadCatalog, type CatalogoNormativo } from '../catalog/catalog.ts'
import { gerarPacote } from '../corpus/generate.ts'
import { PACOTES } from '../corpus/pacotes.ts'
import { LIMITES_AVALIACAO } from '../evaluation/run.ts'
import { triarAnexo } from '../pipeline.ts'
import { ConteudoCifrado } from './conteudo.ts'
import { MOTOR_VERSAO, TriagemErro, TriagemService, type Ator } from './service.ts'

const CATALOGO_DIR = fileURLToPath(new URL('../../../docs/triagem/catalogo/', import.meta.url))

let catalogo: CatalogoNormativo
beforeAll(async () => {
  catalogo = await loadCatalog(CATALOGO_DIR)
})

let db: Database
let analista: Ator
let outro: Ator
let admin: Ator
let relogio: Date
let pastaConteudo: string
let servico: TriagemService

function novoServico(conteudo: ConteudoCifrado | null = null): TriagemService {
  return new TriagemService({ db, catalogo, conteudo, retencaoHoras: 72, agora: () => relogio })
}

beforeEach(() => {
  db = openDatabase(':memory:')
  migrate(db)
  relogio = new Date('2026-11-12T12:00:00.000Z')
  analista = { accountId: seedAccount(db, 'ana.analista', 'analista'), usuario: 'ana.analista', papel: 'analista' }
  outro = { accountId: seedAccount(db, 'beto.analista', 'analista'), usuario: 'beto.analista', papel: 'analista' }
  admin = { accountId: seedAccount(db, 'carla.admin', 'administrador'), usuario: 'carla.admin', papel: 'administrador' }
  pastaConteudo = mkdtempSync(path.join(tmpdir(), 'aqr-triagem-'))
  servico = novoServico()
})

afterEach(() => {
  db.close()
  rmSync(pastaConteudo, { recursive: true, force: true })
})

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Cria o processo com os arquivos de um pacote do corpus e roda o núcleo (sem OCR: pacotes de texto). */
async function processar(pacoteId: string, opcoes: { servico?: TriagemService; ator?: Ator; chave?: string } = {}) {
  const usado = opcoes.servico ?? servico
  const gerado = await gerarPacote(defined(PACOTES.find((item) => item.id === pacoteId)))
  const arquivos = gerado.arquivos.map((arquivo) => ({ nome: arquivo.nome, bytes: arquivo.bytes, sha256: sha(arquivo.bytes) }))
  const criado = usado.criar(opcoes.ator ?? analista, { referencia: null, protocoladoEm: '2026-11-05T13:00:00.000Z', modalidade: 'D', etapa: 'abertura', ...(opcoes.chave ? { chaveIdempotencia: opcoes.chave } : {}) }, arquivos)
  const triados = []
  for (const anexo of criado.anexos) {
    const arquivo = defined(arquivos[anexo.ordem - 1])
    triados.push(await triarAnexo(anexo.id, anexo.nome, arquivo.bytes, { limites: LIMITES_AVALIACAO }))
  }
  const resultado = usado.concluirAnalise(defined(criado.analise).id, triados)
  return { criado, resultado, arquivos }
}

const avaliacaoAtual = (triagemId: string, regra: string) => {
  const triagem = defined(servico.repo.triagem(triagemId))
  const analise = defined(servico.repo.analisePorNumero(triagemId, defined(triagem.analiseAtual)))
  return defined(servico.repo.avaliacoes(analise.id).find((item) => item.detalhe.contrato.regraId === `AQR-GCA-${regra}`))
}

describe('persistência da triagem (E7)', () => {
  it('grava processo, anexos com SHA-256, análise com versão do motor e do catálogo, e fica aguardando revisão', async () => {
    const { criado, arquivos } = await processar('DSD-01')
    const triagem = defined(servico.repo.triagem(criado.triagem.id))
    expect([triagem.situacao, triagem.analiseAtual, triagem.versao]).toEqual(['aguardando-revisao', 1, 2])
    expect(servico.repo.anexos(triagem.id).map((anexo) => anexo.sha256)).toEqual(arquivos.map((arquivo) => arquivo.sha256))
    const analise = defined(servico.repo.analisePorNumero(triagem.id, 1))
    expect([analise.situacao, analise.motorVersao, analise.catalogoVersao, analise.catalogoSha256]).toEqual(['concluida', MOTOR_VERSAO, '1.0-review', catalogo.sha256])
    expect(analise.anexosSha256).toEqual(arquivos.map((arquivo) => arquivo.sha256))
    expect(servico.repo.avaliacoes(analise.id)).toHaveLength(19)
    expect(servico.repo.contarEvidencias(analise.id)).toBeGreaterThan(50)
    expect(servico.repo.eventos(triagem.id).map((evento) => evento.acao)).toEqual(['analise.iniciada', 'triagem.criada', 'analise.concluida'])
  })

  it('o estado guardado para reprocessar não tem o texto integral dos documentos', async () => {
    const { criado } = await processar('DSD-01')
    const analise = defined(servico.repo.analisePorNumero(criado.triagem.id, 1))
    for (const { estado } of servico.repo.leituras(analise.id)) {
      expect(estado).not.toContain('DOCUMENTO FICTÍCIO PARA TESTE')
      expect(JSON.parse(estado).lido.linhas).toEqual([])
    }
  })

  it('idempotência: a mesma chave devolve o mesmo processo; com outros arquivos, recusa', async () => {
    const primeiro = await processar('DSD-01', { chave: 'chave-de-teste-1' })
    const gerado = await gerarPacote(defined(PACOTES.find((item) => item.id === 'DSD-01')))
    const mesmos = gerado.arquivos.map((arquivo) => ({ nome: arquivo.nome, bytes: arquivo.bytes, sha256: sha(arquivo.bytes) }))
    const repetido = servico.criar(analista, { referencia: null, protocoladoEm: '2026-11-05T13:00:00.000Z', modalidade: 'D', etapa: 'abertura', chaveIdempotencia: 'chave-de-teste-1' }, mesmos)
    expect([repetido.nova, repetido.triagem.id]).toEqual([false, primeiro.criado.triagem.id])
    expect(() => servico.criar(analista, { referencia: null, protocoladoEm: '2026-11-05T13:00:00.000Z', modalidade: 'D', etapa: 'abertura', chaveIdempotencia: 'chave-de-teste-1' }, mesmos.slice(1))).toThrow(/outros arquivos/u)
  })

  it('integridade transacional: falha no meio da criação não deixa processo, anexo nem conteúdo', () => {
    const chave = Buffer.alloc(32, 7)
    const comConteudo = novoServico(new ConteudoCifrado(pastaConteudo, chave))
    const bytes = new TextEncoder().encode('%PDF-1.7 conteudo ficticio')
    // Chave de idempotência curta demais: o banco recusa depois que o conteúdo já foi cifrado.
    expect(() => comConteudo.criar(analista, { referencia: null, protocoladoEm: '2026-11-05T13:00:00.000Z', modalidade: 'D', etapa: 'abertura', chaveIdempotencia: 'curta' }, [{ nome: 'a.pdf', bytes, sha256: sha(bytes) }])).toThrow(/CHECK/u)
    expect(textColumn(defined(db.prepare('SELECT count(*) || \'\' AS n FROM triagens').get()), 'n')).toBe('0')
    expect(textColumn(defined(db.prepare('SELECT count(*) || \'\' AS n FROM triagem_anexos').get()), 'n')).toBe('0')
    expect(readdirSync(pastaConteudo)).toEqual([])
  })

  it('revisões, eventos, avaliações, campos, evidências e análises encerradas não podem ser alterados nem apagados', async () => {
    const { criado } = await processar('DSD-16')
    const triagemId = criado.triagem.id
    servico.revisar(analista, triagemId, 2, { decisao: 'confirmado', regraId: 'AQR-GCA-018', justificativa: 'conferido' })
    for (const tabela of ['triagem_revisoes', 'triagem_eventos', 'triagem_avaliacoes', 'triagem_campos', 'triagem_evidencias', 'triagem_leituras', 'triagem_classificacoes', 'triagem_versoes']) {
      expect(() => db.prepare(`DELETE FROM ${tabela}`).run(), tabela).toThrow(/não pode ser apagad/u)
    }
    expect(() => db.prepare("UPDATE triagem_revisoes SET justificativa = 'x'").run()).toThrow(/não pode ser alterad/u)
    expect(() => db.prepare("UPDATE triagem_campos SET valor_bruto = 'x'").run()).toThrow(/não pode ser alterad/u)
    expect(() => db.prepare("UPDATE triagem_analises SET falha = 'x'").run()).toThrow(/encerrada não pode ser alterada/u)
    expect(() => db.prepare("UPDATE triagem_anexos SET sha256 = 'x'").run()).toThrow(/não podem ser alterados/u)
    expect(() => db.prepare('DELETE FROM triagens').run()).toThrow(/não são excluídos/u)
    // Nenhuma ação de decisão existe na trilha.
    expect(() => db.prepare("INSERT INTO triagem_eventos (id, ocorrido_em, triagem_id, ator_id, ator_rotulo, acao, detalhes) VALUES ('x', 'h', NULL, NULL, 's', 'triagem.aprovada', '{}')").run()).toThrow(/CHECK/u)
  })

  it('só quem criou ou um administrador vê o processo; tentativa de outro analista fica registrada', async () => {
    const { criado } = await processar('DSD-01')
    expect(() => servico.triagemDe(outro, criado.triagem.id)).toThrow(TriagemErro)
    expect(servico.triagemDe(admin, criado.triagem.id).id).toBe(criado.triagem.id)
    expect(servico.listar(outro, { limit: 10, offset: 0 }).total).toBe(0)
    expect(servico.listar(admin, { limit: 10, offset: 0 }).total).toBe(1)
    const negados = db.prepare("SELECT count(*) AS n FROM triagem_eventos WHERE acao = 'acesso.negado'").get()
    expect(Number(negados?.n)).toBe(1)
  })

  it('controle de concorrência: versão desatualizada é recusada', async () => {
    const { criado } = await processar('DSD-01')
    servico.confirmar(analista, criado.triagem.id, 2, { tipo: 'modalidade', valor: 'D', justificativa: 'conferido no protocolo' })
    expect(() => servico.confirmar(analista, criado.triagem.id, 2, { tipo: 'etapa', valor: 'abertura', justificativa: 'conferido' })).toThrow(/alterado por outra ação/u)
    expect(defined(servico.repo.triagem(criado.triagem.id)).versao).toBe(3)
  })

  it('pacote não confirmado não aponta ausência; confirmado como completo, o reprocessamento recalcula só as regras afetadas', async () => {
    const { criado } = await processar('DSD-15')
    const id = criado.triagem.id
    expect(avaliacaoAtual(id, '013').detalhe.contrato.resultado).toBe('nao-avaliavel')
    expect(() => servico.confirmar(analista, id, 2, { tipo: 'integridade', valor: 'completo', justificativa: '' })).toThrow(/justificativa/u)
    servico.confirmar(analista, id, 2, { tipo: 'integridade', valor: 'completo', justificativa: 'Conferido com o protocolo: 7 anexos.' })
    const { analise, recalculadas, reaproveitadas } = servico.reprocessar(analista, id, 3)
    expect(analise.numero).toBe(2)
    expect(analise.motivo).toBe('reprocessamento')
    expect(avaliacaoAtual(id, '013').detalhe.contrato).toMatchObject({ resultado: 'achado', tipo: 'nao-localizado' })
    expect(recalculadas).toContain('AQR-GCA-013')
    expect(reaproveitadas).toContain('AQR-GCA-019')
    expect(reaproveitadas).toContain('AQR-GCA-043')
    const copiada = avaliacaoAtual(id, '019')
    expect([copiada.recalculada, copiada.origemAnalise]).toEqual([false, 1])
    // A análise anterior continua lá, com o resultado de antes.
    const primeira = defined(servico.repo.analisePorNumero(id, 1))
    expect(servico.repo.avaliacoes(primeira.id).find((item) => item.detalhe.contrato.regraId === 'AQR-GCA-013')?.detalhe.contrato.resultado).toBe('nao-avaliavel')
  })

  it('correção humana de campo: novo registro, original preservado, só as regras afetadas recalculadas', async () => {
    const { criado } = await processar('DSD-17')
    const id = criado.triagem.id
    expect(avaliacaoAtual(id, '020').detalhe.contrato.resultado).toBe('achado')
    const primeira = defined(servico.repo.analisePorNumero(id, 1))
    const prancha = defined(servico.anexosDaAnalise(primeira).find((anexo) => anexo.classificacao.contrato.classe === 'prancha'))
    const campoId = `${prancha.lido.id}:matricula`
    expect(() => servico.revisar(analista, id, 2, { decisao: 'corrigido', campoId, novoValor: '90417', justificativa: '' })).toThrow(/justificativa/u)
    servico.revisar(analista, id, 2, { decisao: 'corrigido', campoId, novoValor: '90417', justificativa: 'Conferido na prancha original.' })
    const { recalculadas, reaproveitadas } = servico.reprocessar(analista, id, 3)
    expect(recalculadas).toEqual(expect.arrayContaining(['AQR-GCA-020', 'AQR-GCA-018', 'AQR-GCA-008', 'AQR-GCA-006']))
    expect(reaproveitadas).toEqual(expect.arrayContaining(['AQR-GCA-021', 'AQR-GCA-016', 'AQR-GCA-043']))
    expect(avaliacaoAtual(id, '020').detalhe.contrato.resultado).toBe('sem-achado')
    const original = db.prepare('SELECT valor_bruto, corrigido_por FROM triagem_campos WHERE analise_id = ? AND campo_id = ?').get(primeira.id, campoId)
    expect(original).toEqual({ valor_bruto: '90471', corrigido_por: null })
    const segunda = defined(servico.repo.analisePorNumero(id, 2))
    const corrigido = db.prepare('SELECT valor_bruto, corrigido_por, metodo FROM triagem_campos WHERE analise_id = ? AND campo_id = ?').get(segunda.id, campoId)
    expect(corrigido?.valor_bruto).toBe('90417')
    expect(corrigido?.metodo).toBe('servidor')
    expect(typeof corrigido?.corrigido_por).toBe('string')
    expect(servico.repo.analises(id).map((analise) => [analise.numero, analise.situacao])).toEqual([[1, 'concluida'], [2, 'concluida']])
  })

  it('revisão de achado: confirmar e descartar só achado; descartar exige justificativa; tudo revisado muda a situação', async () => {
    const { criado } = await processar('DSD-16')
    const id = criado.triagem.id
    expect(() => servico.revisar(analista, id, 2, { decisao: 'confirmado', regraId: 'AQR-GCA-019', justificativa: 'ok' })).toThrow(/Só um achado/u)
    expect(() => servico.revisar(analista, id, 2, { decisao: 'descartado', regraId: 'AQR-GCA-018', justificativa: '' })).toThrow(/justificativa/u)
    const achados = servico.repo.avaliacoes(defined(servico.repo.analisePorNumero(id, 1)).id).filter((item) => item.detalhe.contrato.resultado === 'achado')
    let versao = 2
    for (const item of achados) {
      servico.revisar(analista, id, versao, { decisao: 'descartado', regraId: item.detalhe.contrato.regraId, justificativa: 'Revisado e descartado no teste.' })
      versao += 1
    }
    expect(defined(servico.repo.triagem(id)).situacao).toBe('revisado')
    expect(servico.repo.revisoes(id)).toHaveLength(achados.length)
  })

  it('condição de enquadramento confirmada recalcula a 028', async () => {
    const { criado } = await processar('DSD-42')
    const id = criado.triagem.id
    expect(avaliacaoAtual(id, '028').detalhe.contrato.resultado).toBe('condicao-pendente')
    expect(() => servico.confirmar(analista, id, 2, { tipo: 'condicao', condicao: 'inventada', valor: true, justificativa: 'x' })).toThrow(/desconhecida/u)
    servico.confirmar(analista, id, 2, { tipo: 'condicao', condicao: 'area-situacao-acima-2ha', valor: true, justificativa: 'Área conferida na matrícula.' })
    servico.confirmar(analista, id, 3, { tipo: 'integridade', valor: 'completo', justificativa: 'Conferido com o protocolo.' })
    const { recalculadas } = servico.reprocessar(analista, id, 4)
    expect(recalculadas).toContain('AQR-GCA-028')
    expect(avaliacaoAtual(id, '028').detalhe.contrato).toMatchObject({ resultado: 'achado', tipo: 'nao-localizado' })
  })

  it('reinício do servidor: análise que estava rodando fica interrompida e o processo não fica preso', async () => {
    const gerado = await gerarPacote(defined(PACOTES.find((item) => item.id === 'DSD-01')))
    const criado = servico.criar(analista, { referencia: null, protocoladoEm: '2026-11-05T13:00:00.000Z', modalidade: 'D', etapa: 'abertura' }, gerado.arquivos.map((arquivo) => ({ nome: arquivo.nome, bytes: arquivo.bytes, sha256: sha(arquivo.bytes) })))
    expect(defined(servico.repo.triagem(criado.triagem.id)).situacao).toBe('processando')
    expect(novoServico().recuperarInterrompidas()).toBe(1)
    expect(defined(servico.repo.triagem(criado.triagem.id)).situacao).toBe('falhou')
    expect(defined(servico.repo.analisePorNumero(criado.triagem.id, 1)).situacao).toBe('interrompida')
    expect(servico.repo.eventos(criado.triagem.id).map((evento) => evento.acao)).toContain('analise.interrompida')
  })

  it('conteúdo cifrado em repouso, conferido pelo hash, recusado se adulterado e expurgado de forma verificável', async () => {
    const chave = Buffer.alloc(32, 9)
    const comConteudo = novoServico(new ConteudoCifrado(pastaConteudo, chave))
    const { criado, arquivos } = await processar('DSD-01', { servico: comConteudo })
    const anexo = defined(comConteudo.repo.anexos(criado.triagem.id)[0])
    expect(anexo.conteudo).toBe('armazenado')
    const arquivo = path.join(pastaConteudo, `${defined(anexo.conteudoRef)}.bin`)
    expect(readFileSync(arquivo).includes(Buffer.from('DOCUMENTO FICT'))).toBe(false)
    expect(readdirSync(pastaConteudo).join(' ')).not.toContain('requerimento')
    expect(sha(comConteudo.lerConteudo(analista, criado.triagem.id, anexo.id).bytes)).toBe(defined(arquivos[0]).sha256)
    expect(() => comConteudo.lerConteudo(outro, criado.triagem.id, anexo.id)).toThrow(/não encontrado/u)
    // Adulterado: a autenticação do AES-GCM recusa.
    const dados = readFileSync(arquivo)
    dados[dados.length - 1] = (dados[dados.length - 1] ?? 0) ^ 0xff
    writeFileSync(arquivo, dados)
    expect(() => comConteudo.lerConteudo(analista, criado.triagem.id, anexo.id)).toThrow(/não está disponível/u)
    // Antes do prazo nada é expurgado; depois, tudo, com verificação.
    expect(comConteudo.expurgarVencidos()).toEqual({ expurgados: 0, falhas: 0 })
    relogio = new Date('2026-11-16T00:00:00.000Z')
    expect(comConteudo.expurgarVencidos().expurgados).toBe(8)
    expect(readdirSync(pastaConteudo)).toEqual([])
    expect(comConteudo.repo.anexos(criado.triagem.id).every((item) => item.conteudo === 'expurgado' && item.conteudoRef === null)).toBe(true)
    expect(comConteudo.repo.eventos(criado.triagem.id).filter((evento) => evento.acao === 'conteudo.expurgado').every((evento) => evento.detalhes.verificado === true)).toBe(true)
    expect(() => comConteudo.lerConteudo(analista, criado.triagem.id, anexo.id)).toThrow(/expurgado/u)
    // O resultado sintético continua consultável depois do expurgo.
    expect(comConteudo.repo.analises(criado.triagem.id)).toHaveLength(1)
  })

  it('sem chave de conteúdo, nada do arquivo é guardado: só metadados e resultados', async () => {
    const { criado } = await processar('DSD-01')
    expect(servico.repo.anexos(criado.triagem.id).every((anexo) => anexo.conteudo === 'nao-armazenado')).toBe(true)
    expect(() => servico.lerConteudo(analista, criado.triagem.id, defined(servico.repo.anexos(criado.triagem.id)[0]).id)).toThrow(/não é armazenado/u)
  })
})
