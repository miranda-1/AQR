import { randomUUID } from 'node:crypto'
import type { SugestaoVerificada } from '../../../shared/contracts/triage-ia.ts'
import type { Evidencia } from '../../../shared/contracts/triage.ts'
import { integerColumn, optionalTextColumn, textColumn, type Database, type Row } from '../../db/database.ts'
import type { AvaliacaoDetalhada } from '../engine/engine.ts'
import type { ExecucaoIa } from '../ia/executar.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { estadoDoAnexo } from './estado.ts'

/**
 * Acesso ao banco da triagem. Só SQL e conversão de linhas: as regras de negócio ficam em
 * `service.ts`. As operações de várias tabelas são chamadas dentro de `transaction()` pelo serviço.
 */

export type SituacaoTriagem = 'recebido' | 'processando' | 'aguardando-revisao' | 'revisado' | 'falhou'
export type SituacaoAnalise = 'processando' | 'concluida' | 'falhou' | 'interrompida'
export type AcaoEvento =
  | 'triagem.criada'
  | 'analise.iniciada'
  | 'analise.concluida'
  | 'analise.falhou'
  | 'analise.interrompida'
  | 'confirmacao.registrada'
  | 'revisao.registrada'
  | 'reprocessamento.solicitado'
  | 'conteudo.acessado'
  | 'conteudo.expurgado'
  | 'acesso.negado'

export interface TriagemRow {
  id: string
  referencia: string | null
  modo: 'experimental-sintetico'
  protocoladoEm: string
  criadaPor: string
  criadaEm: string
  situacao: SituacaoTriagem
  analiseAtual: number | null
  versao: number
  atualizadaEm: string
  retencaoAte: string
}

export interface AnexoRow {
  id: string
  triagemId: string
  ordem: number
  nome: string
  sha256: string
  bytes: number
  recebidoEm: string
  conteudo: 'nao-armazenado' | 'armazenado' | 'expurgado'
  conteudoRef: string | null
  expurgadoEm: string | null
}

export interface AnaliseRow {
  id: string
  triagemId: string
  numero: number
  motivo: 'inicial' | 'reprocessamento' | 'retomada'
  situacao: SituacaoAnalise
  motorVersao: string
  catalogoVersao: string
  catalogoSha256: string
  anexosSha256: string[]
  entrada: unknown
  baseAnalise: number | null
  iniciadaPor: string
  iniciadaEm: string
  encerradaEm: string | null
  falha: string | null
  resultado: unknown
}

export interface ConfirmacaoRow {
  id: string
  triagemId: string
  tipo: 'modalidade' | 'etapa' | 'integridade' | 'condicao'
  chave: string
  valor: unknown
  justificativa: string
  autorId: string
  autorRotulo: string
  em: string
}

export interface RevisaoRow {
  id: string
  triagemId: string
  analiseId: string
  analiseNumero: number
  regraId: string | null
  campoId: string | null
  decisao: 'confirmado' | 'descartado' | 'corrigido' | 'encaminhado'
  justificativa: string
  correcao: { anterior: string | null; novo: string } | null
  revisorId: string
  revisorRotulo: string
  em: string
  /** Revisão de uma análise anterior cuja decisão esta mantém (achado idêntico); `null` nas demais. */
  baseRevisaoId: string | null
}

export interface EventoRow {
  id: string
  ocorridoEm: string
  triagemId: string | null
  atorId: string | null
  atorRotulo: string
  acao: AcaoEvento
  detalhes: Record<string, unknown>
}

const json = (valor: unknown) => JSON.stringify(valor)
const parse = (valor: string | null): unknown => (valor === null ? null : JSON.parse(valor))

function triagemDe(row: Row): TriagemRow {
  const analise = row.analise_atual
  return {
    id: textColumn(row, 'id'),
    referencia: optionalTextColumn(row, 'referencia'),
    modo: 'experimental-sintetico',
    protocoladoEm: textColumn(row, 'protocolado_em'),
    criadaPor: textColumn(row, 'criada_por'),
    criadaEm: textColumn(row, 'criada_em'),
    situacao: textColumn(row, 'situacao') as SituacaoTriagem,
    analiseAtual: analise === null || analise === undefined ? null : integerColumn(row, 'analise_atual'),
    versao: integerColumn(row, 'versao'),
    atualizadaEm: textColumn(row, 'atualizada_em'),
    retencaoAte: textColumn(row, 'retencao_ate'),
  }
}

function anexoDe(row: Row): AnexoRow {
  return {
    id: textColumn(row, 'id'),
    triagemId: textColumn(row, 'triagem_id'),
    ordem: integerColumn(row, 'ordem'),
    nome: textColumn(row, 'nome'),
    sha256: textColumn(row, 'sha256'),
    bytes: integerColumn(row, 'bytes'),
    recebidoEm: textColumn(row, 'recebido_em'),
    conteudo: textColumn(row, 'conteudo') as AnexoRow['conteudo'],
    conteudoRef: optionalTextColumn(row, 'conteudo_ref'),
    expurgadoEm: optionalTextColumn(row, 'expurgado_em'),
  }
}

function analiseDe(row: Row): AnaliseRow {
  const base = row.base_analise
  return {
    id: textColumn(row, 'id'),
    triagemId: textColumn(row, 'triagem_id'),
    numero: integerColumn(row, 'numero'),
    motivo: textColumn(row, 'motivo') as AnaliseRow['motivo'],
    situacao: textColumn(row, 'situacao') as SituacaoAnalise,
    motorVersao: textColumn(row, 'motor_versao'),
    catalogoVersao: textColumn(row, 'catalogo_versao'),
    catalogoSha256: textColumn(row, 'catalogo_sha256'),
    anexosSha256: JSON.parse(textColumn(row, 'anexos_sha256')) as string[],
    entrada: JSON.parse(textColumn(row, 'entrada')),
    baseAnalise: base === null || base === undefined ? null : integerColumn(row, 'base_analise'),
    iniciadaPor: textColumn(row, 'iniciada_por'),
    iniciadaEm: textColumn(row, 'iniciada_em'),
    encerradaEm: optionalTextColumn(row, 'encerrada_em'),
    falha: optionalTextColumn(row, 'falha'),
    resultado: parse(optionalTextColumn(row, 'resultado')),
  }
}

export class TriagemRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  // ---------- versões ----------

  registrarVersao(motorVersao: string, catalogoVersao: string, catalogoSha256: string, em: string): string {
    const existente = this.db
      .prepare('SELECT id FROM triagem_versoes WHERE motor_versao = ? AND catalogo_versao = ? AND catalogo_sha256 = ?')
      .get(motorVersao, catalogoVersao, catalogoSha256)
    if (existente) return textColumn(existente, 'id')
    const id = randomUUID()
    this.db.prepare('INSERT INTO triagem_versoes (id, motor_versao, catalogo_versao, catalogo_sha256, registrada_em) VALUES (?, ?, ?, ?, ?)').run(id, motorVersao, catalogoVersao, catalogoSha256, em)
    return id
  }

  // ---------- processos ----------

  inserirTriagem(triagem: TriagemRow & { chaveIdempotencia: string | null }): void {
    this.db
      .prepare(
        `INSERT INTO triagens (id, referencia, modo, protocolado_em, criada_por, criada_em, chave_idempotencia, situacao, analise_atual, versao, atualizada_em, retencao_ate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(triagem.id, triagem.referencia, triagem.modo, triagem.protocoladoEm, triagem.criadaPor, triagem.criadaEm, triagem.chaveIdempotencia, triagem.situacao, triagem.analiseAtual, triagem.versao, triagem.atualizadaEm, triagem.retencaoAte)
  }

  triagem(id: string): TriagemRow | undefined {
    const row = this.db.prepare('SELECT * FROM triagens WHERE id = ?').get(id)
    return row ? triagemDe(row) : undefined
  }

  porIdempotencia(contaId: string, chave: string): TriagemRow | undefined {
    const row = this.db.prepare('SELECT * FROM triagens WHERE criada_por = ? AND chave_idempotencia = ?').get(contaId, chave)
    return row ? triagemDe(row) : undefined
  }

  listar(filtro: { criadaPor?: string; limit: number; offset: number }): { itens: TriagemRow[]; total: number } {
    const where = filtro.criadaPor ? 'WHERE criada_por = :criadaPor' : ''
    const params: Record<string, string> = filtro.criadaPor ? { criadaPor: filtro.criadaPor } : {}
    const total = this.db.prepare(`SELECT count(*) AS n FROM triagens ${where}`).get(params)
    const rows = this.db.prepare(`SELECT * FROM triagens ${where} ORDER BY criada_em DESC, rowid DESC LIMIT :limit OFFSET :offset`).all({ ...params, limit: filtro.limit, offset: filtro.offset })
    return { itens: rows.map(triagemDe), total: total ? integerColumn(total, 'n') : 0 }
  }

  /**
   * Atualiza situação e análise atual só se a versão ainda for a esperada (controle de
   * concorrência otimista). Devolve `false` se outra alteração chegou antes.
   */
  atualizarTriagem(id: string, versaoEsperada: number, mudanca: { situacao: SituacaoTriagem; analiseAtual?: number | null }, em: string): boolean {
    const resultado = this.db
      .prepare(
        `UPDATE triagens SET situacao = ?, analise_atual = coalesce(?, analise_atual), versao = versao + 1, atualizada_em = ?
         WHERE id = ? AND versao = ?`,
      )
      .run(mudanca.situacao, mudanca.analiseAtual ?? null, em, id, versaoEsperada)
    return Number(resultado.changes) === 1
  }

  // ---------- anexos ----------

  inserirAnexo(anexo: AnexoRow): void {
    this.db
      .prepare(
        `INSERT INTO triagem_anexos (id, triagem_id, ordem, nome, sha256, bytes, recebido_em, conteudo, conteudo_ref, expurgado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .run(anexo.id, anexo.triagemId, anexo.ordem, anexo.nome, anexo.sha256, anexo.bytes, anexo.recebidoEm, anexo.conteudo, anexo.conteudoRef)
  }

  anexos(triagemId: string): AnexoRow[] {
    return this.db.prepare('SELECT * FROM triagem_anexos WHERE triagem_id = ? ORDER BY ordem').all(triagemId).map(anexoDe)
  }

  conteudosVencidos(agora: string): AnexoRow[] {
    return this.db
      .prepare(
        `SELECT a.* FROM triagem_anexos a JOIN triagens t ON t.id = a.triagem_id
         WHERE a.conteudo = 'armazenado' AND t.retencao_ate <= ? AND t.situacao <> 'processando'`,
      )
      .all(agora)
      .map(anexoDe)
  }

  marcarExpurgado(anexoId: string, em: string): void {
    this.db.prepare("UPDATE triagem_anexos SET conteudo = 'expurgado', conteudo_ref = NULL, expurgado_em = ? WHERE id = ? AND conteudo = 'armazenado'").run(em, anexoId)
  }

  // ---------- análises ----------

  inserirAnalise(analise: Omit<AnaliseRow, 'motorVersao' | 'catalogoVersao' | 'catalogoSha256' | 'encerradaEm' | 'falha' | 'resultado'> & { versaoId: string }): void {
    this.db
      .prepare(
        `INSERT INTO triagem_analises (id, triagem_id, numero, motivo, situacao, versao_id, anexos_sha256, entrada, base_analise, iniciada_por, iniciada_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(analise.id, analise.triagemId, analise.numero, analise.motivo, analise.situacao, analise.versaoId, json(analise.anexosSha256), json(analise.entrada), analise.baseAnalise, analise.iniciadaPor, analise.iniciadaEm)
  }

  private readonly ANALISE_SQL = `SELECT a.*, v.motor_versao, v.catalogo_versao, v.catalogo_sha256 FROM triagem_analises a JOIN triagem_versoes v ON v.id = a.versao_id`

  analise(id: string): AnaliseRow | undefined {
    const row = this.db.prepare(`${this.ANALISE_SQL} WHERE a.id = ?`).get(id)
    return row ? analiseDe(row) : undefined
  }

  analisePorNumero(triagemId: string, numero: number): AnaliseRow | undefined {
    const row = this.db.prepare(`${this.ANALISE_SQL} WHERE a.triagem_id = ? AND a.numero = ?`).get(triagemId, numero)
    return row ? analiseDe(row) : undefined
  }

  analises(triagemId: string): AnaliseRow[] {
    return this.db.prepare(`${this.ANALISE_SQL} WHERE a.triagem_id = ? ORDER BY a.numero`).all(triagemId).map(analiseDe)
  }

  proximoNumero(triagemId: string): number {
    const row = this.db.prepare('SELECT coalesce(max(numero), 0) + 1 AS n FROM triagem_analises WHERE triagem_id = ?').get(triagemId)
    return row ? integerColumn(row, 'n') : 1
  }

  analisesProcessando(): AnaliseRow[] {
    return this.db.prepare(`${this.ANALISE_SQL} WHERE a.situacao = 'processando'`).all().map(analiseDe)
  }

  encerrarAnalise(id: string, situacao: Exclude<SituacaoAnalise, 'processando'>, em: string, extra: { falha?: string; resultado?: unknown } = {}): boolean {
    const resultado = this.db
      .prepare("UPDATE triagem_analises SET situacao = ?, encerrada_em = ?, falha = ?, resultado = ? WHERE id = ? AND situacao = 'processando'")
      .run(situacao, em, extra.falha ?? null, extra.resultado === undefined ? null : json(extra.resultado), id)
    return Number(resultado.changes) === 1
  }

  // ---------- resultado da análise ----------

  private inserirEvidencias(analiseId: string, donoTipo: 'classificacao' | 'campo' | 'avaliacao', donoId: string, evidencias: readonly Evidencia[]): void {
    const insert = this.db.prepare('INSERT INTO triagem_evidencias (analise_id, dono_tipo, dono_id, anexo_id, sha256, pagina, regioes, trecho, origem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const evidencia of evidencias) {
      insert.run(analiseId, donoTipo, donoId, evidencia.anexoId, evidencia.sha256, evidencia.pagina ?? null, evidencia.regioes ? json(evidencia.regioes) : null, evidencia.trecho ?? null, evidencia.origem)
    }
  }

  gravarLeituras(analiseId: string, anexos: readonly AnexoTriado[]): void {
    const leitura = this.db.prepare('INSERT INTO triagem_leituras (analise_id, anexo_id, estado) VALUES (?, ?, ?)')
    const classificacao = this.db.prepare(
      'INSERT INTO triagem_classificacoes (analise_id, anexo_id, classe, confianca, metodo, alternativas, justificativa, composto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    const campo = this.db.prepare(
      `INSERT INTO triagem_campos (analise_id, campo_id, anexo_id, campo, estado, valor_bruto, valor_normalizado, unidade, alternativas, confianca, metodo, corrigido_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const anexo of anexos) {
      leitura.run(analiseId, anexo.lido.id, json(estadoDoAnexo(anexo)))
      const c = anexo.classificacao
      classificacao.run(analiseId, anexo.lido.id, c.contrato.classe, c.contrato.confianca, c.contrato.metodo, json(c.contrato.alternativas), c.justificativa, c.composto ? 1 : 0)
      this.inserirEvidencias(analiseId, 'classificacao', anexo.lido.id, c.contrato.evidencias)
      for (const detalhe of anexo.campos) {
        const k = detalhe.contrato
        campo.run(
          analiseId,
          k.id,
          k.anexoId,
          k.campo,
          k.estado,
          k.valorBruto ?? null,
          k.valorNormalizado === undefined ? null : json(k.valorNormalizado),
          k.unidade ?? null,
          k.alternativas ? json(k.alternativas) : null,
          k.confianca,
          k.metodo,
          k.corrigidoPor ?? null,
        )
        this.inserirEvidencias(analiseId, 'campo', k.id, k.evidencias)
      }
    }
  }

  gravarAvaliacoes(analiseId: string, avaliacoes: readonly { detalhe: AvaliacaoDetalhada; recalculada: boolean; origemAnalise: number | null }[]): void {
    const insert = this.db.prepare(
      `INSERT INTO triagem_avaliacoes (analise_id, regra_id, regra_versao, resultado, tipo, severidade, confianca, rascunho, motivo, conteudo, recalculada, origem_analise)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const { detalhe, recalculada, origemAnalise } of avaliacoes) {
      const c = detalhe.contrato
      insert.run(analiseId, c.regraId, c.regraVersao, c.resultado, c.tipo ?? null, c.severidade, detalhe.confianca, c.rascunho, c.motivo ?? null, json(detalhe), recalculada ? 1 : 0, origemAnalise)
      this.inserirEvidencias(analiseId, 'avaliacao', c.regraId, c.evidencias)
    }
  }

  leituras(analiseId: string): { anexoId: string; estado: string }[] {
    return this.db
      // Na ordem de recebimento: o motor depende da ordem dos anexos (ex.: campos usados, evidências).
      .prepare('SELECT l.anexo_id, l.estado FROM triagem_leituras l JOIN triagem_anexos a ON a.id = l.anexo_id WHERE l.analise_id = ? ORDER BY a.ordem')
      .all(analiseId)
      .map((row) => ({ anexoId: textColumn(row, 'anexo_id'), estado: textColumn(row, 'estado') }))
  }

  avaliacoes(analiseId: string): { detalhe: AvaliacaoDetalhada; recalculada: boolean; origemAnalise: number | null }[] {
    return this.db
      .prepare('SELECT conteudo, recalculada, origem_analise FROM triagem_avaliacoes WHERE analise_id = ? ORDER BY regra_id')
      .all(analiseId)
      .map((row) => {
        const origem = row.origem_analise
        return {
          detalhe: JSON.parse(textColumn(row, 'conteudo')) as AvaliacaoDetalhada,
          recalculada: integerColumn(row, 'recalculada') === 1,
          origemAnalise: origem === null || origem === undefined ? null : integerColumn(row, 'origem_analise'),
        }
      })
  }

  contarEvidencias(analiseId: string): number {
    const row = this.db.prepare('SELECT count(*) AS n FROM triagem_evidencias WHERE analise_id = ?').get(analiseId)
    return row ? integerColumn(row, 'n') : 0
  }

  // ---------- confirmações, revisões, eventos ----------

  inserirConfirmacao(c: ConfirmacaoRow): void {
    this.db
      .prepare('INSERT INTO triagem_confirmacoes (id, triagem_id, tipo, chave, valor, justificativa, autor_id, autor_rotulo, em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, c.triagemId, c.tipo, c.chave, json(c.valor), c.justificativa, c.autorId, c.autorRotulo, c.em)
  }

  confirmacoes(triagemId: string): ConfirmacaoRow[] {
    return this.db
      .prepare('SELECT * FROM triagem_confirmacoes WHERE triagem_id = ? ORDER BY em, rowid')
      .all(triagemId)
      .map((row) => ({
        id: textColumn(row, 'id'),
        triagemId: textColumn(row, 'triagem_id'),
        tipo: textColumn(row, 'tipo') as ConfirmacaoRow['tipo'],
        chave: textColumn(row, 'chave'),
        valor: JSON.parse(textColumn(row, 'valor')),
        justificativa: textColumn(row, 'justificativa'),
        autorId: textColumn(row, 'autor_id'),
        autorRotulo: textColumn(row, 'autor_rotulo'),
        em: textColumn(row, 'em'),
      }))
  }

  inserirRevisao(r: Omit<RevisaoRow, 'analiseNumero'>): void {
    this.db
      .prepare(
        `INSERT INTO triagem_revisoes (id, triagem_id, analise_id, regra_id, campo_id, decisao, justificativa, correcao, revisor_id, revisor_rotulo, em, base_revisao_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(r.id, r.triagemId, r.analiseId, r.regraId, r.campoId, r.decisao, r.justificativa, r.correcao ? json(r.correcao) : null, r.revisorId, r.revisorRotulo, r.em, r.baseRevisaoId)
  }

  revisoes(triagemId: string): RevisaoRow[] {
    return this.db
      .prepare('SELECT r.*, a.numero FROM triagem_revisoes r JOIN triagem_analises a ON a.id = r.analise_id WHERE r.triagem_id = ? ORDER BY r.em, r.rowid')
      .all(triagemId)
      .map((row) => ({
        id: textColumn(row, 'id'),
        triagemId: textColumn(row, 'triagem_id'),
        analiseId: textColumn(row, 'analise_id'),
        analiseNumero: integerColumn(row, 'numero'),
        regraId: optionalTextColumn(row, 'regra_id'),
        campoId: optionalTextColumn(row, 'campo_id'),
        decisao: textColumn(row, 'decisao') as RevisaoRow['decisao'],
        justificativa: textColumn(row, 'justificativa'),
        correcao: parse(optionalTextColumn(row, 'correcao')) as RevisaoRow['correcao'],
        revisorId: textColumn(row, 'revisor_id'),
        revisorRotulo: textColumn(row, 'revisor_rotulo'),
        em: textColumn(row, 'em'),
        baseRevisaoId: optionalTextColumn(row, 'base_revisao_id'),
      }))
  }

  // ---------- IA documental (E11.0): separada de campos do motor e de correções humanas ----------

  inserirExecucaoIa(id: string, triagemId: string, analiseId: string, execucao: ExecucaoIa): void {
    this.db
      .prepare(
        `INSERT INTO triagem_ia_execucoes (id, triagem_id, analise_id, provedor, modelo_id, modelo_versao, pesos_sha256, prompt_sha256, configuracao_versao, situacao,
           iniciada_em, encerrada_em, duracao_ms, propostas_recebidas, propostas_invalidas, propostas_descartadas_limite, memoria_mb, saida_sha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id, triagemId, analiseId, execucao.modelo.provedor, execucao.modelo.id, execucao.modelo.versao, execucao.modelo.pesosSha256, execucao.modelo.promptSha256, execucao.modelo.configuracaoVersao,
        execucao.situacao, execucao.iniciadaEm, execucao.encerradaEm, execucao.duracaoMs, execucao.propostasRecebidas, execucao.propostasInvalidas, execucao.propostasDescartadasPorLimite,
        execucao.memoriaMb, execucao.saidaSha256,
      )
  }

  inserirSugestaoIa(execucaoId: string, analiseId: string, ordem: number, anexoIdRegistrado: string | null, sugestao: SugestaoVerificada): void {
    this.db
      .prepare(
        `INSERT INTO triagem_ia_sugestoes (id, execucao_id, analise_id, ordem, anexo_id, anexo_sha256, tipo, classe, campo, valor_bruto, pagina, regioes, trecho, fundamento, metodo,
           confianca_declarada, nivel, situacao, motivo, relacao_motor, efeito)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        sugestao.id, execucaoId, analiseId, ordem, anexoIdRegistrado, sugestao.anexoSha256, sugestao.tipo, sugestao.classe, sugestao.campo, sugestao.valorBruto, sugestao.pagina,
        json(sugestao.regioes), sugestao.trecho, sugestao.fundamento, sugestao.metodo, sugestao.confiancaDeclarada, sugestao.nivel, sugestao.situacao, sugestao.motivo, sugestao.relacaoMotor,
        sugestao.efeito,
      )
  }

  execucaoIa(analiseId: string): (ExecucaoIa & { id: string }) | null {
    const row = this.db.prepare('SELECT * FROM triagem_ia_execucoes WHERE analise_id = ?').get(analiseId)
    if (!row) return null
    const opcionalInteiro = (coluna: string) => (row[coluna] === null || row[coluna] === undefined ? null : integerColumn(row, coluna))
    return {
      id: textColumn(row, 'id'),
      modelo: {
        provedor: textColumn(row, 'provedor') as ExecucaoIa['modelo']['provedor'],
        id: textColumn(row, 'modelo_id'),
        versao: textColumn(row, 'modelo_versao'),
        pesosSha256: optionalTextColumn(row, 'pesos_sha256'),
        promptSha256: textColumn(row, 'prompt_sha256'),
        configuracaoVersao: textColumn(row, 'configuracao_versao'),
      },
      situacao: textColumn(row, 'situacao') as ExecucaoIa['situacao'],
      iniciadaEm: textColumn(row, 'iniciada_em'),
      encerradaEm: textColumn(row, 'encerrada_em'),
      duracaoMs: integerColumn(row, 'duracao_ms'),
      propostasRecebidas: integerColumn(row, 'propostas_recebidas'),
      propostasInvalidas: integerColumn(row, 'propostas_invalidas'),
      propostasDescartadasPorLimite: integerColumn(row, 'propostas_descartadas_limite'),
      memoriaMb: opcionalInteiro('memoria_mb'),
      saidaSha256: optionalTextColumn(row, 'saida_sha256'),
    }
  }

  sugestoesIa(analiseId: string): SugestaoVerificada[] {
    return this.db
      .prepare('SELECT * FROM triagem_ia_sugestoes WHERE analise_id = ? ORDER BY ordem')
      .all(analiseId)
      .map((row) => ({
        id: textColumn(row, 'id'),
        tipo: textColumn(row, 'tipo') as SugestaoVerificada['tipo'],
        anexoId: optionalTextColumn(row, 'anexo_id') ?? '',
        anexoSha256: textColumn(row, 'anexo_sha256'),
        pagina: row.pagina === null || row.pagina === undefined ? null : integerColumn(row, 'pagina'),
        regioes: JSON.parse(textColumn(row, 'regioes')) as SugestaoVerificada['regioes'],
        classe: optionalTextColumn(row, 'classe') as SugestaoVerificada['classe'],
        campo: optionalTextColumn(row, 'campo') as SugestaoVerificada['campo'],
        valorBruto: optionalTextColumn(row, 'valor_bruto'),
        trecho: optionalTextColumn(row, 'trecho'),
        fundamento: optionalTextColumn(row, 'fundamento') as SugestaoVerificada['fundamento'],
        metodo: 'modelo-local' as const,
        confiancaDeclarada: typeof row.confianca_declarada === 'number' ? row.confianca_declarada : null,
        nivel: optionalTextColumn(row, 'nivel') as SugestaoVerificada['nivel'],
        situacao: textColumn(row, 'situacao') as SugestaoVerificada['situacao'],
        motivo: textColumn(row, 'motivo') as SugestaoVerificada['motivo'],
        relacaoMotor: optionalTextColumn(row, 'relacao_motor') as SugestaoVerificada['relacaoMotor'],
        efeito: 'nenhum' as const,
      }))
  }

  inserirEvento(evento: EventoRow): void {
    this.db
      .prepare('INSERT INTO triagem_eventos (id, ocorrido_em, triagem_id, ator_id, ator_rotulo, acao, detalhes) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(evento.id, evento.ocorridoEm, evento.triagemId, evento.atorId, evento.atorRotulo, evento.acao, json(evento.detalhes))
  }

  eventos(triagemId: string): EventoRow[] {
    return this.db
      .prepare('SELECT * FROM triagem_eventos WHERE triagem_id = ? ORDER BY ocorrido_em, rowid')
      .all(triagemId)
      .map((row) => ({
        id: textColumn(row, 'id'),
        ocorridoEm: textColumn(row, 'ocorrido_em'),
        triagemId: optionalTextColumn(row, 'triagem_id'),
        atorId: optionalTextColumn(row, 'ator_id'),
        atorRotulo: textColumn(row, 'ator_rotulo'),
        acao: textColumn(row, 'acao') as AcaoEvento,
        detalhes: JSON.parse(textColumn(row, 'detalhes')) as Record<string, unknown>,
      }))
  }
}
