import { createHash } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'
import { accountRoles } from '../../../shared/contracts/admin.ts'
import {
  analiseQuerySchema,
  anexosSaidaSchema,
  avaliacoesSaidaSchema,
  camposSaidaSchema,
  confirmacaoEntradaSchema,
  listaTriagensQuerySchema,
  listaTriagensSchema,
  novaTriagemSchema,
  reprocessarEntradaSchema,
  revisaoEntradaSchema,
  triagemCriadaSchema,
  triagemDetalheSchema,
  type TriagemResumo,
} from '../../../shared/contracts/triage-api.ts'
import type { AuthProvider } from '../../auth/auth-provider.ts'
import type { TriagemSettings } from '../../config.ts'
import { ApiError } from '../../http/errors.ts'
import { sanitizeFileName } from '../../http/file-name.ts'
import { TriagemErro, type Ator, type TriagemService } from '../store/service.ts'
import type { AnaliseRow, AnexoRow, RevisaoRow, TriagemRow } from '../store/repository.ts'
import type { anexoDoEstado } from '../store/estado.ts'
import type { TriagemWorkerPool } from '../worker-pool.ts'

/**
 * API da triagem documental experimental (E8). Regras de acesso, verificadas no servidor:
 * - toda rota exige pessoa identificada (conta ativa);
 * - analista cria processos e só vê, confirma, revisa e reprocessa os que criou;
 * - administrador vê todos (supervisão), mas não confirma, revisa nem reprocessa: essas ações são
 *   do servidor responsável pela análise;
 * - não há rota de decisão (aprovar, indeferir, anuir, arquivar) nem de alterar resultado de regra;
 *   o cliente só registra confirmações e revisões, e o motor recalcula.
 */

export interface TriagemRoutesOptions {
  auth: AuthProvider
  service: TriagemService
  pool: TriagemWorkerPool
  settings: TriagemSettings
  /** Modo de desenvolvimento: só pedidos deste computador (como a administração). */
  somenteLocal: boolean
  log: (mensagem: string, detalhes: Record<string, unknown>) => void
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u
const CHAVE_IDEMPOTENCIA = /^[A-Za-z0-9._:-]{8,100}$/u
const AVISO = 'Verificação técnica experimental com catálogo não homologado pela GCA, para revisão de servidor. Não é decisão administrativa e não deve ser enviada ao requerente sem revisão.'

function isLoopback(ip: string): boolean {
  return ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.')
}

function idParam(value: string, nome = 'processo'): string {
  if (!UUID.test(value)) throw new ApiError(404, 'NAO_ENCONTRADA', `${nome === 'processo' ? 'Processo de triagem' : 'Anexo'} não encontrado.`)
  return value
}

function corpo<T extends z.ZodType>(schema: T, valor: unknown): z.infer<T> {
  const parsed = schema.safeParse(valor)
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.') || 'corpo', issue.message]))
    throw new ApiError(400, 'ENTRADA_INVALIDA', 'Dados inválidos. Confira os campos indicados e envie de novo.', { fields })
  }
  return parsed.data
}

/** Erro do serviço → resposta HTTP, sem detalhes internos. */
function traduzir(error: unknown): never {
  if (error instanceof TriagemErro) {
    const status = { NAO_ENCONTRADA: 404, CONFLITO_DE_VERSAO: 409, EM_PROCESSAMENTO: 409, ENTRADA_INVALIDA: 400, SEM_CONTEUDO: 404, SEM_ANALISE: 409 }[error.codigo]
    throw new ApiError(status, error.codigo, error.message)
  }
  throw error
}

function resumo(triagem: TriagemRow, ator: Ator): TriagemResumo {
  return {
    id: triagem.id,
    referencia: triagem.referencia,
    modo: triagem.modo,
    situacao: triagem.situacao,
    versao: triagem.versao,
    analiseAtual: triagem.analiseAtual,
    protocoladoEm: triagem.protocoladoEm,
    criadaEm: triagem.criadaEm,
    atualizadaEm: triagem.atualizadaEm,
    retencaoAte: triagem.retencaoAte,
    criadaPorMim: triagem.criadaPor === ator.accountId,
  }
}

function revisaoSaida(r: RevisaoRow) {
  return { id: r.id, analise: r.analiseNumero, regraId: r.regraId, campoId: r.campoId, decisao: r.decisao, justificativa: r.justificativa, correcao: r.correcao, revisor: r.revisorRotulo, em: r.em }
}

export function registerTriagemRoutes(app: FastifyInstance, options: TriagemRoutesOptions): void {
  const { auth, service, pool, settings } = options

  /** Pessoa da requisição (401) com papel conhecido; no modo de desenvolvimento, só local (403). */
  async function atorDe(request: FastifyRequest): Promise<Ator> {
    if (options.somenteLocal && !isLoopback(request.ip)) throw new ApiError(403, 'LOCAL_ONLY', 'A triagem em modo de desenvolvimento só atende pedidos deste computador.')
    const principal = await auth.resolvePrincipal(request)
    if (!principal) throw new ApiError(401, 'UNAUTHENTICATED', 'Sua sessão terminou. Entre de novo para continuar.')
    if (!accountRoles.includes(principal.papel)) throw new ApiError(403, 'FORBIDDEN', 'Sua conta não tem permissão para a triagem.')
    return { accountId: principal.accountId, usuario: principal.usuario, papel: principal.papel }
  }

  /** Ações de análise (criar, confirmar, revisar, reprocessar): só analista. */
  function exigirAnalista(ator: Ator): void {
    if (ator.papel !== 'analista') {
      throw new ApiError(403, 'FORBIDDEN', 'Confirmações, revisões e reprocessamento são feitos pelo analista responsável pelo processo. O administrador acompanha, mas não altera a análise.')
    }
  }

  function exigirDono(ator: Ator, triagem: TriagemRow): void {
    if (triagem.criadaPor !== ator.accountId) throw new ApiError(403, 'FORBIDDEN', 'Só o analista que criou o processo pode alterar a análise.')
  }

  function analiseDe(triagem: TriagemRow, numero: number | undefined): AnaliseRow {
    const alvo = numero ?? triagem.analiseAtual
    const analise = alvo ? service.repo.analisePorNumero(triagem.id, alvo) : undefined
    if (!analise || analise.situacao !== 'concluida') throw new ApiError(409, 'SEM_ANALISE', 'Não há análise concluída com esse número. Se o processo está em processamento, aguarde.')
    return analise
  }

  /** Põe a análise na fila; o resultado vai para o banco quando a thread termina. */
  function processar(analiseId: string, arquivos: { id: string; nome: string; bytes: Uint8Array }[], signal: AbortSignal): void {
    pool
      .run(arquivos, signal)
      .then((resultado) => {
        if (resultado.status === 'concluido') service.concluirAnalise(analiseId, resultado.anexos)
        // No desligamento a fila encerra a thread: é interrupção, não falha do pacote.
        else service.encerrarSemSucesso(analiseId, signal.aborted ? 'interrompida' : 'falhou', signal.aborted ? 'servidor desligado' : resultado.motivo)
      })
      .catch((error: unknown) => {
        // Cancelada no desligamento: fica "interrompida" agora ou na próxima inicialização.
        try {
          service.encerrarSemSucesso(analiseId, signal.aborted ? 'interrompida' : 'falhou', signal.aborted ? 'servidor desligado' : error instanceof Error ? error.name : 'falha')
        } catch {
          // Banco já fechado: a recuperação na inicialização resolve.
        }
        options.log('triagem não concluída', { analise: analiseId, motivo: error instanceof Error ? error.name : 'desconhecido' })
      })
  }

  const desligamento = new AbortController()
  // `preClose` roda antes de todo `onClose` (inclusive o que encerra a fila de threads).
  app.addHook('preClose', async () => desligamento.abort())

  // ---------- criar ----------

  app.post('/api/triagens', async (request, reply) => {
    const ator = await atorDe(request)
    exigirAnalista(ator)
    if (!request.isMultipart()) throw new ApiError(415, 'MULTIPART_REQUIRED', 'Envie o pacote como formulário (multipart/form-data): o campo "metadados" (JSON) e os arquivos no campo "anexos".')
    const chaveHeader = request.headers['idempotency-key']
    const chave = typeof chaveHeader === 'string' ? chaveHeader : undefined
    if (chave !== undefined && !CHAVE_IDEMPOTENCIA.test(chave)) throw new ApiError(400, 'ENTRADA_INVALIDA', 'Idempotency-Key inválida: use de 8 a 100 letras, números ou . _ : -.')

    let metadados: unknown
    const arquivos: { nome: string; bytes: Uint8Array; sha256: string }[] = []
    let total = 0
    const parts = request.parts({ limits: { fileSize: settings.maxBytesArquivo, files: settings.maxAnexos, fields: 1, parts: settings.maxAnexos + 1, fieldSize: 16 * 1024 } })
    try {
      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname !== 'metadados' || typeof part.value !== 'string') throw new ApiError(400, 'UNEXPECTED_FIELD', 'Envie só o campo "metadados" (JSON) e os arquivos em "anexos".')
          try {
            metadados = JSON.parse(part.value)
          } catch {
            throw new ApiError(400, 'ENTRADA_INVALIDA', 'O campo "metadados" não é um JSON válido.')
          }
          continue
        }
        if (part.fieldname !== 'anexos') throw new ApiError(400, 'UNEXPECTED_FIELD', 'Envie os arquivos no campo "anexos".')
        const bytes = new Uint8Array(await part.toBuffer())
        total += bytes.byteLength
        if (total > settings.maxBytesPacote) throw new ApiError(413, 'PACOTE_GRANDE_DEMAIS', `O pacote passa do limite de ${Math.round(settings.maxBytesPacote / 1024 / 1024)} MB. Envie menos arquivos ou arquivos menores.`)
        // O nome só serve para exibir: nunca é caminho. Tipo real, integridade e isolamento são conferidos pelo conteúdo na thread.
        arquivos.push({ nome: sanitizeFileName(part.filename), bytes, sha256: createHash('sha256').update(bytes).digest('hex') })
      }
    } catch (error) {
      // Limites do upload com mensagem da triagem (os textos padrão são os da comparação de PDFs).
      const codigo = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
      if (codigo === 'FST_FILES_LIMIT' || codigo === 'FST_PARTS_LIMIT') throw new ApiError(400, 'ANEXOS_DEMAIS', `Envie no máximo ${settings.maxAnexos} arquivos por pacote.`)
      if (codigo === 'FST_REQ_FILE_TOO_LARGE') throw new ApiError(413, 'FILE_TOO_LARGE', `Cada arquivo pode ter até ${Math.round(settings.maxBytesArquivo / 1024 / 1024)} MB.`)
      if (codigo === 'FST_FIELDS_LIMIT') throw new ApiError(400, 'UNEXPECTED_FIELD', 'Envie só o campo "metadados" (JSON) e os arquivos em "anexos".')
      throw error
    }
    if (arquivos.length === 0) throw new ApiError(400, 'SEM_ANEXOS', 'Envie ao menos um arquivo no campo "anexos".')
    const dados = corpo(novaTriagemSchema, metadados)
    if (!pool.canAccept()) {
      reply.header('retry-after', '60')
      throw new ApiError(503, 'QUEUE_FULL', 'O servidor está ocupado com outras triagens. Tente de novo em alguns instantes.')
    }
    let criado
    try {
      criado = service.criar(ator, { ...dados, ...(chave ? { chaveIdempotencia: chave } : {}) }, arquivos)
    } catch (error) {
      traduzir(error)
    }
    if (criado.nova && criado.analise) {
      const porId = criado.anexos.map((anexo) => ({ id: anexo.id, nome: anexo.nome, bytes: arquivos[anexo.ordem - 1]?.bytes ?? new Uint8Array() }))
      processar(criado.analise.id, porId, desligamento.signal)
    }
    const triagem = service.repo.triagem(criado.triagem.id) ?? criado.triagem
    const saida = triagemCriadaSchema.parse({ triagem: resumo(triagem, ator), anexos: criado.anexos.map((anexo) => anexoSaida(anexo, null)), nova: criado.nova })
    return reply.status(criado.nova ? 202 : 200).header('location', `/api/triagens/${triagem.id}`).send(saida)
  })

  // ---------- consultar ----------

  app.get('/api/triagens', async (request) => {
    const ator = await atorDe(request)
    const query = corpo(listaTriagensQuerySchema, request.query)
    const { itens, total } = service.listar(ator, query)
    return listaTriagensSchema.parse({ itens: itens.map((item) => resumo(item, ator)), total })
  })

  app.get<{ Params: { id: string } }>('/api/triagens/:id', async (request) => {
    const ator = await atorDe(request)
    try {
      const triagem = service.triagemDe(ator, idParam(request.params.id))
      const entrada = service.entradaAtual(triagem)
      return triagemDetalheSchema.parse({
        triagem: resumo(triagem, ator),
        natureza: 'verificacao-tecnica-experimental',
        aviso: AVISO,
        enquadramento: {
          modalidade: entrada.modalidade,
          etapa: entrada.etapa,
          integridadeDoPacote: entrada.integridadeDoPacote,
          condicoes: entrada.condicoes.map((condicao) => ({ id: condicao.id, valor: condicao.valor.valor === true, ...(condicao.valor.confirmadoPor ? { confirmadoPor: condicao.valor.confirmadoPor } : {}), ...(condicao.valor.confirmadoEm ? { confirmadoEm: condicao.valor.confirmadoEm } : {}) })),
        },
        analises: service.repo.analises(triagem.id).map((analise) => ({
          numero: analise.numero,
          motivo: analise.motivo,
          situacao: analise.situacao,
          motorVersao: analise.motorVersao,
          catalogo: { versao: analise.catalogoVersao, sha256: analise.catalogoSha256 },
          anexosSha256: analise.anexosSha256,
          baseAnalise: analise.baseAnalise,
          iniciadaEm: analise.iniciadaEm,
          encerradaEm: analise.encerradaEm,
          falha: analise.falha,
        })),
        confirmacoes: service.repo.confirmacoes(triagem.id).map((c) => ({ id: c.id, tipo: c.tipo, chave: c.chave, valor: c.valor as string | boolean, justificativa: c.justificativa, autor: c.autorRotulo, em: c.em })),
        revisoes: service.repo.revisoes(triagem.id).map(revisaoSaida),
      })
    } catch (error) {
      traduzir(error)
    }
  })

  function anexoSaida(anexo: AnexoRow, estado: ReturnType<typeof anexoDoEstado> | null) {
    const inspecao = estado?.lido.inspecao
    return {
      id: anexo.id,
      ordem: anexo.ordem,
      nome: anexo.nome,
      sha256: anexo.sha256,
      bytes: anexo.bytes,
      conteudo: anexo.conteudo,
      tipoReal: inspecao?.tipoReal ?? null,
      extensaoConfere: inspecao?.extensaoConfere ?? null,
      integridade: inspecao?.integridade ?? null,
      isolado: inspecao ? inspecao.isolamento.isolado : null,
      motivosIsolamento: inspecao?.isolamento.motivos ?? [],
      classificacao: estado?.classificacao.contrato ?? null,
      justificativa: estado?.classificacao.justificativa ?? null,
    }
  }

  app.get<{ Params: { id: string } }>('/api/triagens/:id/anexos', async (request) => {
    const ator = await atorDe(request)
    try {
      const triagem = service.triagemDe(ator, idParam(request.params.id))
      const query = corpo(analiseQuerySchema, request.query)
      const numero = query.analise ?? triagem.analiseAtual
      const analise = numero ? service.repo.analisePorNumero(triagem.id, numero) : undefined
      const estados = new Map((analise?.situacao === 'concluida' ? service.anexosDaAnalise(analise) : []).map((anexo) => [anexo.lido.id, anexo]))
      return anexosSaidaSchema.parse({ analise: analise?.situacao === 'concluida' ? analise.numero : null, itens: service.repo.anexos(triagem.id).map((anexo) => anexoSaida(anexo, estados.get(anexo.id) ?? null)) })
    } catch (error) {
      traduzir(error)
    }
  })

  app.get<{ Params: { id: string } }>('/api/triagens/:id/avaliacoes', async (request) => {
    const ator = await atorDe(request)
    try {
      const triagem = service.triagemDe(ator, idParam(request.params.id))
      const analise = analiseDe(triagem, corpo(analiseQuerySchema, request.query).analise)
      const revisoes = service.repo.revisoes(triagem.id)
      return avaliacoesSaidaSchema.parse({
        analise: analise.numero,
        natureza: 'verificacao-tecnica-experimental',
        decisaoAdministrativa: null,
        itens: service.repo.avaliacoes(analise.id).map(({ detalhe, recalculada, origemAnalise }) => ({
          regraId: detalhe.contrato.regraId,
          regraVersao: detalhe.contrato.regraVersao,
          nome: detalhe.nomeRegra,
          resultado: detalhe.contrato.resultado,
          ...(detalhe.contrato.tipo ? { tipo: detalhe.contrato.tipo } : {}),
          severidade: detalhe.contrato.severidade,
          confianca: detalhe.confianca,
          rascunho: detalhe.contrato.rascunho,
          ...(detalhe.contrato.motivo ? { motivo: detalhe.contrato.motivo } : {}),
          evidencias: detalhe.contrato.evidencias,
          valoresConflitantes: detalhe.valoresConflitantes.map((conflito) => ({ campo: conflito.campo, valores: conflito.valores.map((valor) => ({ anexoId: valor.anexoId, classe: valor.classe, valorBruto: valor.valorBruto, evidencias: valor.evidencias })) })),
          ...(detalhe.contrato.procura ? { procura: detalhe.contrato.procura } : {}),
          fundamentos: detalhe.contrato.fundamentos,
          limitacoes: detalhe.limitacoes,
          revisaoHumana: detalhe.revisaoHumana,
          condicoesPendentes: detalhe.contrato.condicoesPendentes,
          recalculada,
          origemAnalise,
          revisoes: revisoes.filter((r) => r.regraId === detalhe.contrato.regraId && r.analiseId === analise.id).map(revisaoSaida),
        })),
      })
    } catch (error) {
      traduzir(error)
    }
  })

  app.get<{ Params: { id: string } }>('/api/triagens/:id/campos', async (request) => {
    const ator = await atorDe(request)
    try {
      const triagem = service.triagemDe(ator, idParam(request.params.id))
      const analise = analiseDe(triagem, corpo(analiseQuerySchema, request.query).analise)
      return camposSaidaSchema.parse({ analise: analise.numero, itens: service.anexosDaAnalise(analise).flatMap((anexo) => anexo.campos.map((campo) => campo.contrato)) })
    } catch (error) {
      traduzir(error)
    }
  })

  // ---------- conteúdo (sintético) ----------

  app.get<{ Params: { id: string; anexoId: string } }>('/api/triagens/:id/anexos/:anexoId/conteudo', async (request, reply: FastifyReply) => {
    const ator = await atorDe(request)
    try {
      const { anexo, bytes } = service.lerConteudo(ator, idParam(request.params.id), idParam(request.params.anexoId, 'anexo'))
      // Sempre como download, nunca exibido no navegador do domínio da API.
      const nome = encodeURIComponent(anexo.nome)
      return reply
        .header('content-type', 'application/octet-stream')
        .header('content-disposition', `attachment; filename="anexo-${anexo.ordem}"; filename*=UTF-8''${nome}`)
        .header('x-conteudo-sintetico', 'true')
        .send(Buffer.from(bytes))
    } catch (error) {
      traduzir(error)
    }
  })

  // ---------- confirmações, revisões, reprocessamento ----------

  app.post<{ Params: { id: string } }>('/api/triagens/:id/condicoes', async (request, reply) => {
    const ator = await atorDe(request)
    exigirAnalista(ator)
    const entrada = corpo(confirmacaoEntradaSchema, request.body)
    try {
      exigirDono(ator, service.triagemDe(ator, idParam(request.params.id)))
      const confirmacao =
        entrada.tipo === 'condicao'
          ? { tipo: 'condicao' as const, condicao: entrada.condicao, valor: entrada.valor, justificativa: entrada.justificativa }
          : entrada.tipo === 'modalidade'
            ? { tipo: 'modalidade' as const, valor: entrada.valor, justificativa: entrada.justificativa }
            : entrada.tipo === 'etapa'
              ? { tipo: 'etapa' as const, valor: entrada.valor, justificativa: entrada.justificativa }
              : { tipo: 'integridade' as const, valor: entrada.valor, justificativa: entrada.justificativa }
      const triagem = service.confirmar(ator, request.params.id, entrada.versaoEsperada, confirmacao)
      return reply.status(201).send({ triagem: resumo(triagem, ator), reprocessamentoNecessario: true })
    } catch (error) {
      traduzir(error)
    }
  })

  app.post<{ Params: { id: string } }>('/api/triagens/:id/revisoes', async (request, reply) => {
    const ator = await atorDe(request)
    exigirAnalista(ator)
    const entrada = corpo(revisaoEntradaSchema, request.body)
    try {
      exigirDono(ator, service.triagemDe(ator, idParam(request.params.id)))
      const { triagem, revisaoId } = service.revisar(
        ator,
        request.params.id,
        entrada.versaoEsperada,
        entrada.decisao === 'corrigido'
          ? { decisao: 'corrigido', campoId: entrada.campoId, novoValor: entrada.novoValor, justificativa: entrada.justificativa }
          : { decisao: entrada.decisao, regraId: entrada.regraId, justificativa: entrada.justificativa },
      )
      return reply.status(201).send({ triagem: resumo(triagem, ator), revisaoId, reprocessamentoNecessario: entrada.decisao === 'corrigido' })
    } catch (error) {
      traduzir(error)
    }
  })

  app.post<{ Params: { id: string } }>('/api/triagens/:id/reprocessar', async (request, reply) => {
    const ator = await atorDe(request)
    exigirAnalista(ator)
    const entrada = corpo(reprocessarEntradaSchema, request.body)
    try {
      const triagem = service.triagemDe(ator, idParam(request.params.id))
      exigirDono(ator, triagem)
      if (!triagem.analiseAtual) {
        // Sem análise concluída: retomada pelo conteúdo cifrado, na fila.
        if (!pool.canAccept()) throw new ApiError(503, 'QUEUE_FULL', 'O servidor está ocupado com outras triagens. Tente de novo em alguns instantes.')
        const { analise, arquivos } = service.iniciarRetomada(ator, triagem.id, entrada.versaoEsperada)
        processar(analise.id, arquivos, desligamento.signal)
        return reply.status(202).send({ triagem: resumo(service.repo.triagem(triagem.id) ?? triagem, ator), analise: analise.numero, recalculadas: [], reaproveitadas: [] })
      }
      const resultado = service.reprocessar(ator, triagem.id, entrada.versaoEsperada)
      return reply.status(201).send({ triagem: resumo(resultado.triagem, ator), analise: resultado.analise.numero, recalculadas: resultado.recalculadas, reaproveitadas: resultado.reaproveitadas })
    } catch (error) {
      traduzir(error)
    }
  })
}
