import { randomUUID } from 'node:crypto'
import {
  condicaoIdSchema,
  etapas,
  modalidades,
  processoTriagemSchema,
  type CampoExtraido,
  type Condicao,
  type Etapa,
  type Modalidade,
  type NomeCampo,
} from '../../../shared/contracts/triage.ts'
import type { AccountRole } from '../../../shared/contracts/admin.ts'
import { transaction, type Database } from '../../db/database.ts'
import type { CatalogoNormativo } from '../catalog/catalog.ts'
import type { EntradaTriagem, Enquadramento } from '../engine/context.ts'
import { executarTriagem, type AvaliacaoDetalhada, type ResultadoTriagem } from '../engine/engine.ts'
import { normalizarCampo, type CampoDetalhado } from '../extraction/extract.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { mascararDocumentos } from '../reading/text.ts'
import { ConteudoIndisponivel, type ConteudoCifrado } from './conteudo.ts'
import { anexoDoEstado } from './estado.ts'
import { TriagemRepository, type AcaoEvento, type AnaliseRow, type AnexoRow, type RevisaoRow, type TriagemRow } from './repository.ts'

/**
 * Serviço da triagem persistida (E7). Regras:
 * - processo só é visto e alterado por quem o criou ou por administrador;
 * - toda alteração é transação, com controle de concorrência pela versão do processo;
 * - análise encerrada, revisão, confirmação e evento não mudam mais: correção é registro novo;
 * - reprocessar cria outra análise, recalcula só as regras afetadas pelas correções e confirmações
 *   e reaproveita (com referência) as demais; a análise anterior continua consultável;
 * - nada aqui decide, aprova, indefere, arquiva, anui ou comunica (AQR-GCA-040).
 */

/** Versão do motor gravada em cada análise (núcleo E4–E6.1). */
export const MOTOR_VERSAO = 'aqr-triagem@6.1.0'

export interface Ator {
  accountId: string
  usuario: string
  papel: AccountRole
}

export type CodigoErroTriagem = 'NAO_ENCONTRADA' | 'CONFLITO_DE_VERSAO' | 'EM_PROCESSAMENTO' | 'ENTRADA_INVALIDA' | 'SEM_CONTEUDO' | 'SEM_ANALISE'

export class TriagemErro extends Error {
  override name = 'TriagemErro'
  readonly codigo: CodigoErroTriagem

  constructor(codigo: CodigoErroTriagem, mensagem: string) {
    super(mensagem)
    this.codigo = codigo
  }
}

export interface ArquivoRecebido {
  nome: string
  bytes: Uint8Array
  sha256: string
}

export interface NovaTriagem {
  referencia: string | null
  protocoladoEm: string
  modalidade: Modalidade
  etapa: Etapa
  chaveIdempotencia?: string
}

export type Confirmacao =
  | { tipo: 'modalidade'; valor: Modalidade; justificativa: string }
  | { tipo: 'etapa'; valor: Etapa; justificativa: string }
  | { tipo: 'integridade'; valor: 'completo' | 'parcial' | 'desconhecida'; justificativa: string }
  | { tipo: 'condicao'; condicao: string; valor: boolean; justificativa: string }

export type NovaRevisao =
  | { decisao: 'confirmado' | 'descartado' | 'encaminhado'; regraId: string; justificativa: string }
  | { decisao: 'corrigido'; campoId: string; novoValor: string; justificativa: string }

/**
 * Do que cada regra depende, para recalcular só as afetadas. Campos: nomes de campo lidos pela
 * regra. `integridade`: a regra aponta ausência e depende da completude do pacote. As regras com
 * condição de servidor dependem das condições do catálogo. Modalidade ou etapa nova recalcula tudo.
 */
export const DEPENDENCIAS: Record<string, { campos: readonly NomeCampo[]; integridade: boolean }> = {
  'AQR-GCA-001': { campos: ['assunto'], integridade: false },
  'AQR-GCA-002': { campos: [], integridade: true },
  'AQR-GCA-003': { campos: [], integridade: true },
  'AQR-GCA-006': { campos: ['lote', 'matricula'], integridade: true },
  'AQR-GCA-008': { campos: ['matricula', 'lote'], integridade: true },
  'AQR-GCA-009': { campos: ['data-emissao'], integridade: false },
  'AQR-GCA-010': { campos: ['signatario', 'titular'], integridade: true },
  'AQR-GCA-011': { campos: ['rt-nome'], integridade: true },
  'AQR-GCA-012': { campos: [], integridade: true },
  'AQR-GCA-013': { campos: [], integridade: true },
  'AQR-GCA-016': { campos: [], integridade: false },
  'AQR-GCA-018': { campos: ['titular', 'rt-nome', 'lote', 'quadra', 'bairro', 'parcelamento', 'matricula'], integridade: false },
  'AQR-GCA-019': { campos: ['assunto'], integridade: false },
  'AQR-GCA-020': { campos: ['matricula', 'lote', 'quadra', 'inscricao', 'bairro'], integridade: false },
  'AQR-GCA-021': { campos: ['data-revisao'], integridade: false },
  'AQR-GCA-022': { campos: ['escala-situacao'], integridade: false },
  'AQR-GCA-023': { campos: ['formato-folha'], integridade: false },
  'AQR-GCA-028': { campos: ['area'], integridade: true },
  'AQR-GCA-043': { campos: [], integridade: false },
}

export interface OpcoesServico {
  db: Database
  catalogo: CatalogoNormativo
  conteudo: ConteudoCifrado | null
  retencaoHoras: number
  agora?: () => Date
}

export class TriagemService {
  readonly repo: TriagemRepository
  private readonly db: Database
  private readonly catalogo: CatalogoNormativo
  private readonly conteudo: ConteudoCifrado | null
  private readonly retencaoHoras: number
  private readonly agora: () => Date

  constructor(opcoes: OpcoesServico) {
    this.db = opcoes.db
    this.repo = new TriagemRepository(opcoes.db)
    this.catalogo = opcoes.catalogo
    this.conteudo = opcoes.conteudo
    this.retencaoHoras = opcoes.retencaoHoras
    this.agora = opcoes.agora ?? (() => new Date())
  }

  private instante(): string {
    return this.agora().toISOString()
  }

  get armazenaConteudo(): boolean {
    return this.conteudo !== null
  }

  private evento(acao: AcaoEvento, triagemId: string | null, ator: Ator | null, detalhes: Record<string, unknown> = {}): void {
    this.repo.inserirEvento({ id: randomUUID(), ocorridoEm: this.instante(), triagemId, atorId: ator?.accountId ?? null, atorRotulo: ator?.usuario ?? 'sistema', acao, detalhes })
  }

  // ---------- acesso ----------

  /** Processo visível ao ator, ou erro "não encontrado" (sem revelar que existe). */
  triagemDe(ator: Ator, id: string): TriagemRow {
    const triagem = this.repo.triagem(id)
    if (!triagem) throw new TriagemErro('NAO_ENCONTRADA', 'Processo de triagem não encontrado.')
    if (ator.papel !== 'administrador' && triagem.criadaPor !== ator.accountId) {
      this.evento('acesso.negado', null, ator, { alvo: 'triagem' })
      throw new TriagemErro('NAO_ENCONTRADA', 'Processo de triagem não encontrado.')
    }
    return triagem
  }

  listar(ator: Ator, pagina: { limit: number; offset: number }) {
    return this.repo.listar({ ...(ator.papel === 'administrador' ? {} : { criadaPor: ator.accountId }), ...pagina })
  }

  // ---------- criação e análise ----------

  /**
   * Registra o processo e os anexos e abre a análise inicial ("processando"). Com a mesma chave de
   * idempotência, devolve o processo já criado. O conteúdo só é guardado (cifrado) se houver chave.
   */
  criar(ator: Ator, dados: NovaTriagem, arquivos: readonly ArquivoRecebido[]): { triagem: TriagemRow; analise: AnaliseRow | undefined; anexos: AnexoRow[]; nova: boolean } {
    if (dados.chaveIdempotencia) {
      const existente = this.repo.porIdempotencia(ator.accountId, dados.chaveIdempotencia)
      if (existente) {
        const anexos = this.repo.anexos(existente.id)
        const mesmos = anexos.length === arquivos.length && anexos.every((anexo, indice) => anexo.sha256 === arquivos[indice]?.sha256)
        if (!mesmos) throw new TriagemErro('ENTRADA_INVALIDA', 'Esta chave de idempotência já foi usada com outros arquivos.')
        return { triagem: existente, analise: this.repo.analisePorNumero(existente.id, 1), anexos, nova: false }
      }
    }
    if (arquivos.length === 0) throw new TriagemErro('ENTRADA_INVALIDA', 'Envie ao menos um anexo.')
    const agora = this.instante()
    const triagemId = randomUUID()
    // Conteúdo cifrado antes da transação (arquivo em disco); se a transação falhar, é expurgado.
    const refs = arquivos.map((arquivo) => (this.conteudo ? this.conteudo.guardar(arquivo.bytes) : null))
    try {
      return transaction(this.db, () => {
        const triagem: TriagemRow = {
          id: triagemId,
          referencia: dados.referencia,
          modo: 'experimental-sintetico',
          protocoladoEm: dados.protocoladoEm,
          criadaPor: ator.accountId,
          criadaEm: agora,
          situacao: 'processando',
          analiseAtual: null,
          versao: 1,
          atualizadaEm: agora,
          retencaoAte: new Date(this.agora().getTime() + this.retencaoHoras * 3600_000).toISOString(),
        }
        this.repo.inserirTriagem({ ...triagem, chaveIdempotencia: dados.chaveIdempotencia ?? null })
        const anexos = arquivos.map((arquivo, indice): AnexoRow => {
          const ref = refs[indice] ?? null
          return { id: randomUUID(), triagemId, ordem: indice + 1, nome: arquivo.nome, sha256: arquivo.sha256, bytes: arquivo.bytes.byteLength, recebidoEm: agora, conteudo: ref ? 'armazenado' : 'nao-armazenado', conteudoRef: ref, expurgadoEm: null }
        })
        for (const anexo of anexos) this.repo.inserirAnexo(anexo)
        const entrada: EntradaTriagem = {
          processoId: triagemId,
          referencia: dados.referencia,
          protocoladoEm: dados.protocoladoEm,
          modalidade: { valor: dados.modalidade, origem: 'declarado' },
          etapa: { valor: dados.etapa, origem: 'declarado' },
          integridadeDoPacote: { valor: 'desconhecida', origem: 'declarado' },
          condicoes: [],
          criadoPor: ator.accountId,
          criadoEm: agora,
        }
        const analise = this.abrirAnalise(triagemId, 1, 'inicial', entrada, anexos, null, ator)
        this.evento('triagem.criada', triagemId, ator, { anexos: anexos.length, conteudo: this.conteudo ? 'cifrado' : 'nao-armazenado' })
        return { triagem, analise, anexos, nova: true }
      })
    } catch (error) {
      for (const ref of refs) if (ref) this.conteudo?.expurgar(ref)
      throw error
    }
  }

  private abrirAnalise(triagemId: string, numero: number, motivo: AnaliseRow['motivo'], entrada: EntradaTriagem, anexos: readonly AnexoRow[], base: number | null, ator: Ator): AnaliseRow {
    const agora = this.instante()
    const versaoId = this.repo.registrarVersao(MOTOR_VERSAO, this.catalogo.versao, this.catalogo.sha256, agora)
    const id = randomUUID()
    this.repo.inserirAnalise({ id, triagemId, numero, motivo, situacao: 'processando', versaoId, anexosSha256: anexos.map((anexo) => anexo.sha256), entrada, baseAnalise: base, iniciadaPor: ator.accountId, iniciadaEm: agora })
    this.evento('analise.iniciada', triagemId, ator, { analise: numero, motivo })
    const analise = this.repo.analise(id)
    if (!analise) throw new Error('análise recém-criada não encontrada')
    return analise
  }

  /** Grava o resultado do núcleo (leitura → regras) de uma análise "processando". */
  concluirAnalise(analiseId: string, triados: readonly AnexoTriado[]): ResultadoTriagem {
    const analise = this.repo.analise(analiseId)
    if (!analise || analise.situacao !== 'processando') throw new TriagemErro('NAO_ENCONTRADA', 'Análise não está em processamento.')
    const anexos = this.repo.anexos(analise.triagemId)
    const porId = new Map(anexos.map((anexo) => [anexo.id, anexo]))
    for (const triado of triados) {
      if (porId.get(triado.lido.id)?.sha256 !== triado.lido.inspecao.sha256) throw new Error('Resultado com anexo que não corresponde aos registrados')
    }
    const resultado = executarTriagem(analise.entrada as EntradaTriagem, triados, { catalogo: this.catalogo })
    transaction(this.db, () => {
      this.repo.gravarLeituras(analiseId, triados)
      this.repo.gravarAvaliacoes(analiseId, resultado.avaliacoes.map((detalhe) => ({ detalhe, recalculada: true, origemAnalise: null })))
      this.encerrarComSucesso(analise, resultado.processo, null)
    })
    return resultado
  }

  private encerrarComSucesso(analise: AnaliseRow, processo: unknown, ator: Ator | null): void {
    const agora = this.instante()
    if (!this.repo.encerrarAnalise(analise.id, 'concluida', agora, { resultado: processo })) throw new TriagemErro('CONFLITO_DE_VERSAO', 'A análise já foi encerrada.')
    const triagem = this.repo.triagem(analise.triagemId)
    if (!triagem || !this.repo.atualizarTriagem(triagem.id, triagem.versao, { situacao: 'aguardando-revisao', analiseAtual: analise.numero }, agora)) {
      throw new TriagemErro('CONFLITO_DE_VERSAO', 'O processo mudou durante a análise.')
    }
    this.evento('analise.concluida', analise.triagemId, ator, { analise: analise.numero })
  }

  /** Falha técnica (motivo sem dado de documento). O processo volta à última análise concluída, se houver. */
  encerrarSemSucesso(analiseId: string, situacao: 'falhou' | 'interrompida', motivo: string): void {
    transaction(this.db, () => {
      const analise = this.repo.analise(analiseId)
      if (!analise || analise.situacao !== 'processando') return
      const agora = this.instante()
      this.repo.encerrarAnalise(analiseId, situacao, agora, { falha: motivo.slice(0, 200) })
      const triagem = this.repo.triagem(analise.triagemId)
      if (triagem) this.repo.atualizarTriagem(triagem.id, triagem.versao, { situacao: triagem.analiseAtual ? 'aguardando-revisao' : 'falhou' }, agora)
      this.evento(situacao === 'falhou' ? 'analise.falhou' : 'analise.interrompida', analise.triagemId, null, { analise: analise.numero, motivo: motivo.slice(0, 200) })
    })
  }

  /** Ao iniciar o servidor: análises que estavam rodando quando ele parou ficam "interrompidas". */
  recuperarInterrompidas(): number {
    const pendentes = this.repo.analisesProcessando()
    for (const analise of pendentes) this.encerrarSemSucesso(analise.id, 'interrompida', 'servidor reiniciado durante o processamento')
    return pendentes.length
  }

  // ---------- enquadramento atual ----------

  entradaAtual(triagem: TriagemRow): EntradaTriagem {
    const inicial = this.repo.analisePorNumero(triagem.id, 1)
    if (!inicial) throw new TriagemErro('SEM_ANALISE', 'Processo sem análise inicial.')
    const entrada = structuredClone(inicial.entrada) as EntradaTriagem
    const condicoes = new Map<string, Condicao>()
    for (const c of this.repo.confirmacoes(triagem.id)) {
      const confirmado = { origem: 'confirmado-servidor' as const, confirmadoPor: c.autorId, confirmadoEm: c.em }
      if (c.tipo === 'modalidade') entrada.modalidade = { valor: c.valor as Modalidade, ...confirmado }
      else if (c.tipo === 'etapa') entrada.etapa = { valor: c.valor as Etapa, ...confirmado }
      else if (c.tipo === 'integridade') entrada.integridadeDoPacote = { valor: c.valor as Enquadramento<'completo' | 'parcial' | 'desconhecida'>['valor'], ...confirmado }
      else condicoes.set(c.chave, { id: c.chave, valor: { valor: c.valor as boolean, ...confirmado }, evidencias: [] })
    }
    entrada.condicoes = [...condicoes.values()]
    return entrada
  }

  // ---------- confirmações e revisões ----------

  private exigirVersao(triagem: TriagemRow, versaoEsperada: number): void {
    if (triagem.versao !== versaoEsperada) throw new TriagemErro('CONFLITO_DE_VERSAO', `O processo foi alterado por outra ação (versão ${triagem.versao}). Atualize e tente de novo.`)
    if (triagem.situacao === 'processando') throw new TriagemErro('EM_PROCESSAMENTO', 'O processo está em processamento. Aguarde terminar.')
  }

  confirmar(ator: Ator, triagemId: string, versaoEsperada: number, confirmacao: Confirmacao): TriagemRow {
    const condicoesDoCatalogo = new Set(this.catalogo.regras.flatMap((regra) => regra.condicoes))
    if (confirmacao.tipo === 'modalidade' && !modalidades.includes(confirmacao.valor)) throw new TriagemErro('ENTRADA_INVALIDA', 'Modalidade fora do catálogo.')
    if (confirmacao.tipo === 'etapa' && !etapas.includes(confirmacao.valor)) throw new TriagemErro('ENTRADA_INVALIDA', 'Etapa desconhecida.')
    if (confirmacao.tipo === 'condicao' && (!condicaoIdSchema.safeParse(confirmacao.condicao).success || !condicoesDoCatalogo.has(confirmacao.condicao))) {
      throw new TriagemErro('ENTRADA_INVALIDA', 'Condição desconhecida no catálogo.')
    }
    if (confirmacao.tipo === 'integridade' && confirmacao.justificativa.trim().length < 5) {
      throw new TriagemErro('ENTRADA_INVALIDA', 'Confirmar a integridade do pacote exige justificativa (ex.: conferido com o protocolo).')
    }
    return transaction(this.db, () => {
      const triagem = this.triagemDe(ator, triagemId)
      this.exigirVersao(triagem, versaoEsperada)
      const agora = this.instante()
      this.repo.inserirConfirmacao({
        id: randomUUID(),
        triagemId,
        tipo: confirmacao.tipo,
        chave: confirmacao.tipo === 'condicao' ? confirmacao.condicao : confirmacao.tipo,
        valor: confirmacao.valor,
        justificativa: mascararDocumentos(confirmacao.justificativa),
        autorId: ator.accountId,
        autorRotulo: ator.usuario,
        em: agora,
      })
      if (!this.repo.atualizarTriagem(triagemId, versaoEsperada, { situacao: triagem.situacao }, agora)) throw new TriagemErro('CONFLITO_DE_VERSAO', 'O processo foi alterado por outra ação. Atualize e tente de novo.')
      this.evento('confirmacao.registrada', triagemId, ator, { tipo: confirmacao.tipo, ...(confirmacao.tipo === 'condicao' ? { condicao: confirmacao.condicao } : {}) })
      return this.repo.triagem(triagemId) ?? triagem
    })
  }

  revisar(ator: Ator, triagemId: string, versaoEsperada: number, revisao: NovaRevisao): { triagem: TriagemRow; revisaoId: string } {
    return transaction(this.db, () => {
      const triagem = this.triagemDe(ator, triagemId)
      this.exigirVersao(triagem, versaoEsperada)
      if (!triagem.analiseAtual) throw new TriagemErro('SEM_ANALISE', 'O processo ainda não tem análise concluída para revisar.')
      const analise = this.repo.analisePorNumero(triagemId, triagem.analiseAtual)
      if (!analise) throw new TriagemErro('SEM_ANALISE', 'Análise atual não encontrada.')
      const justificativa = mascararDocumentos(revisao.justificativa.trim())
      if ((revisao.decisao === 'descartado' || revisao.decisao === 'corrigido') && justificativa.length < 5) {
        throw new TriagemErro('ENTRADA_INVALIDA', 'Descartar um achado ou corrigir um campo exige justificativa.')
      }
      const id = randomUUID()
      const agora = this.instante()
      if (revisao.decisao === 'corrigido') {
        const campo = this.campoDaAnalise(analise, revisao.campoId)
        if (!campo) throw new TriagemErro('ENTRADA_INVALIDA', 'Campo não encontrado na análise atual.')
        const novo = revisao.novoValor.trim()
        if (novo.length === 0 || novo.length > 500) throw new TriagemErro('ENTRADA_INVALIDA', 'Informe o valor corrigido (até 500 caracteres).')
        this.repo.inserirRevisao({ id, triagemId, analiseId: analise.id, regraId: null, campoId: revisao.campoId, decisao: 'corrigido', justificativa, correcao: { anterior: campo.contrato.valorBruto ?? null, novo }, revisorId: ator.accountId, revisorRotulo: ator.usuario, em: agora })
      } else {
        const avaliacao = this.repo.avaliacoes(analise.id).find((item) => item.detalhe.contrato.regraId === revisao.regraId)
        if (!avaliacao) throw new TriagemErro('ENTRADA_INVALIDA', 'Regra não avaliada na análise atual.')
        if ((revisao.decisao === 'confirmado' || revisao.decisao === 'descartado') && avaliacao.detalhe.contrato.resultado !== 'achado') {
          throw new TriagemErro('ENTRADA_INVALIDA', 'Só um achado pode ser confirmado ou descartado; use "encaminhado" para registrar a análise de outro resultado.')
        }
        this.repo.inserirRevisao({ id, triagemId, analiseId: analise.id, regraId: revisao.regraId, campoId: null, decisao: revisao.decisao, justificativa, correcao: null, revisorId: ator.accountId, revisorRotulo: ator.usuario, em: agora })
      }
      const situacao = this.todosAchadosRevisados(triagemId, analise) ? 'revisado' : 'aguardando-revisao'
      if (!this.repo.atualizarTriagem(triagemId, versaoEsperada, { situacao }, agora)) throw new TriagemErro('CONFLITO_DE_VERSAO', 'O processo foi alterado por outra ação. Atualize e tente de novo.')
      this.evento('revisao.registrada', triagemId, ator, { analise: analise.numero, decisao: revisao.decisao, ...(revisao.decisao === 'corrigido' ? { campo: revisao.campoId } : { regra: revisao.regraId }) })
      return { triagem: this.repo.triagem(triagemId) ?? triagem, revisaoId: id }
    })
  }

  private todosAchadosRevisados(triagemId: string, analise: AnaliseRow): boolean {
    const achados = this.repo.avaliacoes(analise.id).filter((item) => item.detalhe.contrato.resultado === 'achado').map((item) => item.detalhe.contrato.regraId)
    const revisadas = new Set(this.repo.revisoes(triagemId).filter((r) => r.analiseId === analise.id && r.regraId).map((r) => r.regraId))
    return achados.length > 0 && achados.every((regra) => revisadas.has(regra))
  }

  // ---------- leitura das análises ----------

  anexosDaAnalise(analise: AnaliseRow): AnexoTriado[] {
    const registrados = new Map(this.repo.anexos(analise.triagemId).map((anexo) => [anexo.id, anexo]))
    return this.repo.leituras(analise.id).map(({ anexoId, estado }) => anexoDoEstado(estado, registrados.get(anexoId)?.sha256 ?? ''))
  }

  private campoDaAnalise(analise: AnaliseRow, campoId: string): CampoDetalhado | undefined {
    return this.anexosDaAnalise(analise).flatMap((anexo) => anexo.campos).find((campo) => campo.contrato.id === campoId)
  }

  // ---------- reprocessamento ----------

  /**
   * Nova análise a partir da atual, com as correções de campo e as confirmações registradas. Só as
   * regras afetadas são recalculadas; as demais são copiadas com referência à análise de origem. O
   * motor roda inteiro como verificação: se uma regra "não afetada" mudar, ela é tratada como afetada
   * e o fato fica no evento (dependência não prevista).
   */
  reprocessar(ator: Ator, triagemId: string, versaoEsperada: number): { triagem: TriagemRow; analise: AnaliseRow; recalculadas: string[]; reaproveitadas: string[] } {
    return transaction(this.db, () => {
      const triagem = this.triagemDe(ator, triagemId)
      this.exigirVersao(triagem, versaoEsperada)
      if (!triagem.analiseAtual) throw new TriagemErro('SEM_ANALISE', 'Não há análise concluída para reprocessar. Envie o pacote de novo.')
      const base = this.repo.analisePorNumero(triagemId, triagem.analiseAtual)
      if (!base) throw new TriagemErro('SEM_ANALISE', 'Análise atual não encontrada.')
      this.evento('reprocessamento.solicitado', triagemId, ator, { base: base.numero })

      const corrigidos = new Set<NomeCampo>()
      const anexos = this.anexosDaAnalise(base).map((anexo) => this.aplicarCorrecoes(anexo, triagemId, corrigidos))
      const entrada = this.entradaAtual(triagem)
      const anterior = base.entrada as EntradaTriagem
      const mudouEnquadramento = JSON.stringify([anterior.modalidade, anterior.etapa]) !== JSON.stringify([entrada.modalidade, entrada.etapa])
      const mudouIntegridade = JSON.stringify(anterior.integridadeDoPacote) !== JSON.stringify(entrada.integridadeDoPacote)
      const condicoesMudadas = new Set(
        [...entrada.condicoes, ...anterior.condicoes]
          .map((condicao) => condicao.id)
          .filter((id) => JSON.stringify(entrada.condicoes.find((c) => c.id === id)) !== JSON.stringify(anterior.condicoes.find((c) => c.id === id))),
      )

      const resultado = executarTriagem(entrada, anexos, { catalogo: this.catalogo })
      const antigas = new Map(this.repo.avaliacoes(base.id).map((item) => [item.detalhe.contrato.regraId, item]))
      const afetada = (detalhe: AvaliacaoDetalhada): boolean => {
        const regra = this.catalogo.regras.find((item) => item.id === detalhe.contrato.regraId)
        const dependencia = DEPENDENCIAS[detalhe.contrato.regraId]
        if (mudouEnquadramento || !dependencia || !regra) return true
        if (dependencia.integridade && mudouIntegridade) return true
        if (regra.condicoes.some((condicao) => condicoesMudadas.has(condicao))) return true
        return dependencia.campos.some((campo) => corrigidos.has(campo))
      }
      const recalculadas: string[] = []
      const reaproveitadas: string[] = []
      const naoPrevistas: string[] = []
      const finais = resultado.avaliacoes.map((detalhe) => {
        const antiga = antigas.get(detalhe.contrato.regraId)
        if (afetada(detalhe) || !antiga) {
          recalculadas.push(detalhe.contrato.regraId)
          return { detalhe, recalculada: true, origemAnalise: null }
        }
        const igual = JSON.stringify(semId(antiga.detalhe)) === JSON.stringify(semId(detalhe))
        if (!igual) {
          naoPrevistas.push(detalhe.contrato.regraId)
          recalculadas.push(detalhe.contrato.regraId)
          return { detalhe, recalculada: true, origemAnalise: null }
        }
        reaproveitadas.push(detalhe.contrato.regraId)
        return { detalhe: antiga.detalhe, recalculada: false, origemAnalise: antiga.origemAnalise ?? base.numero }
      })

      const numero = this.repo.proximoNumero(triagemId)
      const registrados = this.repo.anexos(triagemId)
      const analise = this.abrirAnalise(triagemId, numero, 'reprocessamento', entrada, registrados, base.numero, ator)
      this.repo.gravarLeituras(analise.id, anexos)
      this.repo.gravarAvaliacoes(analise.id, finais)
      const processo = processoTriagemSchema.parse({ ...resultado.processo, avaliacoes: finais.map((item) => item.detalhe.contrato) })
      const agora = this.instante()
      this.repo.encerrarAnalise(analise.id, 'concluida', agora, { resultado: processo })
      const atual = this.repo.triagem(triagemId)
      if (!atual || !this.repo.atualizarTriagem(triagemId, atual.versao, { situacao: 'aguardando-revisao', analiseAtual: numero }, agora)) {
        throw new TriagemErro('CONFLITO_DE_VERSAO', 'O processo foi alterado por outra ação. Atualize e tente de novo.')
      }
      this.evento('analise.concluida', triagemId, ator, { analise: numero, base: base.numero, recalculadas: recalculadas.length, reaproveitadas: reaproveitadas.length, ...(naoPrevistas.length ? { dependenciaNaoPrevista: naoPrevistas } : {}) })
      const final = this.repo.analise(analise.id)
      if (!final) throw new Error('análise recém-concluída não encontrada')
      return { triagem: this.repo.triagem(triagemId) ?? atual, analise: final, recalculadas, reaproveitadas }
    })
  }

  /** Substitui, só nesta análise nova, os campos corrigidos por servidor; o extraído continua na anterior. */
  private aplicarCorrecoes(anexo: AnexoTriado, triagemId: string, corrigidos: Set<NomeCampo>): AnexoTriado {
    const ultimas = new Map<string, RevisaoRow>()
    for (const revisao of this.repo.revisoes(triagemId)) if (revisao.decisao === 'corrigido' && revisao.campoId) ultimas.set(revisao.campoId, revisao)
    const campos = anexo.campos.map((campo): CampoDetalhado => {
      const revisao = ultimas.get(campo.contrato.id)
      if (!revisao?.correcao || campo.contrato.corrigidoPor === revisao.id) return campo
      corrigidos.add(campo.contrato.campo)
      const novo = revisao.correcao.novo
      const normalizacao = normalizarCampo(campo.contrato.campo, novo)
      const contrato: CampoExtraido = {
        id: campo.contrato.id,
        anexoId: campo.contrato.anexoId,
        campo: campo.contrato.campo,
        estado: 'encontrado',
        valorBruto: novo,
        ...(normalizacao?.situacao === 'normalizado' ? { valorNormalizado: normalizacao.valor, ...(campo.contrato.campo === 'area' ? { unidade: 'm2' as const } : {}) } : {}),
        confianca: 1,
        metodo: 'servidor',
        evidencias: [{ anexoId: campo.contrato.anexoId, sha256: anexo.lido.inspecao.sha256, trecho: `Corrigido por servidor (revisão ${revisao.id.slice(0, 8)})`, origem: 'servidor' }],
        corrigidoPor: revisao.id,
      }
      return { ...campo, contrato, ocorrencias: [{ campo: campo.contrato.campo, valorBruto: novo, linha: { pagina: 1, palavras: [], texto: '' }, inicio: 0, fim: 0, confianca: 1, ocr: false, confiancaOcr: 100, ato: false, incerto: false }] }
    })
    return { ...anexo, campos }
  }

  /**
   * Retomada: processo sem análise concluída (falhou ou foi interrompido) é processado de novo a
   * partir do conteúdo cifrado. Sem conteúdo guardado, não há como retomar: o pacote precisa ser
   * enviado de novo. Devolve a análise aberta e os arquivos decifrados para a fila.
   */
  iniciarRetomada(ator: Ator, triagemId: string, versaoEsperada: number): { analise: AnaliseRow; arquivos: { id: string; nome: string; bytes: Uint8Array }[] } {
    return transaction(this.db, () => {
      const triagem = this.triagemDe(ator, triagemId)
      this.exigirVersao(triagem, versaoEsperada)
      if (triagem.analiseAtual) throw new TriagemErro('ENTRADA_INVALIDA', 'O processo já tem análise concluída: use o reprocessamento.')
      const anexos = this.repo.anexos(triagemId)
      if (!this.conteudo || anexos.some((anexo) => anexo.conteudo !== 'armazenado' || !anexo.conteudoRef)) {
        throw new TriagemErro('SEM_CONTEUDO', 'O conteúdo dos anexos não está guardado: envie o pacote de novo.')
      }
      const conteudo = this.conteudo
      const arquivos = anexos.map((anexo) => ({ id: anexo.id, nome: anexo.nome, bytes: conteudo.ler(anexo.conteudoRef ?? '', anexo.sha256) }))
      this.evento('reprocessamento.solicitado', triagemId, ator, { retomada: true })
      const analise = this.abrirAnalise(triagemId, this.repo.proximoNumero(triagemId), 'retomada', this.entradaAtual(triagem), anexos, null, ator)
      if (!this.repo.atualizarTriagem(triagemId, versaoEsperada, { situacao: 'processando' }, this.instante())) throw new TriagemErro('CONFLITO_DE_VERSAO', 'O processo foi alterado por outra ação. Atualize e tente de novo.')
      return { analise, arquivos }
    })
  }

  // ---------- conteúdo ----------

  lerConteudo(ator: Ator, triagemId: string, anexoId: string): { anexo: AnexoRow; bytes: Uint8Array } {
    const triagem = this.triagemDe(ator, triagemId)
    const anexo = this.repo.anexos(triagem.id).find((item) => item.id === anexoId)
    if (!anexo) throw new TriagemErro('NAO_ENCONTRADA', 'Anexo não encontrado.')
    if (anexo.conteudo !== 'armazenado' || !anexo.conteudoRef || !this.conteudo) {
      throw new TriagemErro('SEM_CONTEUDO', anexo.conteudo === 'expurgado' ? 'O conteúdo deste anexo já foi expurgado (prazo de retenção).' : 'O conteúdo deste anexo não é armazenado nesta configuração; só metadados e resultados.')
    }
    try {
      const bytes = this.conteudo.ler(anexo.conteudoRef, anexo.sha256)
      this.evento('conteudo.acessado', triagemId, ator, { anexo: anexo.ordem })
      return { anexo, bytes }
    } catch (error) {
      if (error instanceof ConteudoIndisponivel) throw new TriagemErro('SEM_CONTEUDO', 'O conteúdo deste anexo não está disponível ou não confere com o hash registrado.')
      throw error
    }
  }

  /** Expurgo do conteúdo vencido, verificado (o arquivo não existe mais) e registrado. */
  expurgarVencidos(): { expurgados: number; falhas: number } {
    let expurgados = 0
    let falhas = 0
    for (const anexo of this.repo.conteudosVencidos(this.instante())) {
      const verificado = anexo.conteudoRef && this.conteudo ? this.conteudo.expurgar(anexo.conteudoRef) : false
      if (!verificado) {
        falhas += 1
        continue
      }
      transaction(this.db, () => {
        this.repo.marcarExpurgado(anexo.id, this.instante())
        this.evento('conteudo.expurgado', anexo.triagemId, null, { anexo: anexo.ordem, sha256: anexo.sha256, verificado: true })
      })
      expurgados += 1
    }
    return { expurgados, falhas }
  }
}

/** Avaliação sem o id do processo, para comparar análises. */
function semId(detalhe: AvaliacaoDetalhada): unknown {
  const { contrato, ...resto } = detalhe
  return { ...resto, contrato: { ...contrato, id: '' } }
}
