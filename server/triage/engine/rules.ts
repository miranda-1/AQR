import type { ClasseDocumental, Evidencia, NomeCampo } from '../../../shared/contracts/triage.ts'
import { compararCampo, type Comparacao } from '../extraction/compare.ts'
import { chaveDeTexto, modalidadeDoAssunto, normalizarCodigo, normalizarData, normalizarIdentificador } from '../extraction/normalize.ts'
import { corresponder, linhasDoQuadro, mapaDeImoveis, type Declaracao, type MapaImoveis, type Vinculo } from './imoveis.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { dobrar } from '../reading/text.ts'
import {
  anexosDaClasse,
  avaliarPresenca,
  anexosQuePodemSer,
  camposDe,
  integridadeParaProcura,
  evidenciaDoAnexo,
  type FuncaoRegra,
  type ResultadoDaRegra,
  type ValorConflitante,
} from './context.ts'

/**
 * As 19 regras de documento do catálogo `1.0-review` aplicáveis a desdobro na abertura (E6),
 * implementadas como verificação técnica experimental. Cada função segue a "lógica" da regra no
 * catálogo; onde o catálogo deixa espaço de interpretação, a leitura adotada está comentada e
 * registrada em `docs/triagem/e4-e6.md`. Nenhuma regra decide, aprova ou comunica: o resultado é
 * rascunho para revisão de servidor.
 *
 * Os textos dos rascunhos não trazem nome de pessoa nem número de documento: valores ficam no
 * quadro estruturado (`valoresConflitantes`), com a evidência (AQR-GCA-041).
 */

const DRTS: ClasseDocumental[] = ['drt-01', 'drt-02-projeto', 'drt-02-implantacao', 'drt-03']

const nomeCampo: Record<NomeCampo, string> = {
  assunto: 'assunto',
  lote: 'lote',
  quadra: 'quadra',
  parcelamento: 'parcelamento',
  bairro: 'bairro',
  matricula: 'matrícula',
  cartorio: 'cartório',
  inscricao: 'inscrição imobiliária',
  titular: 'titular',
  signatario: 'signatário',
  'rt-nome': 'responsável técnico',
  'rt-registro': 'registro profissional',
  'data-emissao': 'data de emissão',
  'data-revisao': 'data de revisão',
  area: 'área',
  'escala-situacao': 'escala da planta de situação',
  'formato-folha': 'formato da folha',
}

const nomeClasse: Partial<Record<ClasseDocumental, string>> = {
  requerimento: 'requerimento',
  'drt-01': 'DRT 01',
  'drt-02-projeto': 'DRT 02 de projeto',
  'drt-02-implantacao': 'DRT 02 de implantação',
  'drt-03': 'DRT 03',
  'matricula-transcricao': 'matrícula/transcrição',
  'inscricao-imobiliaria': 'documento de inscrição imobiliária',
  'art-rrt-similar': 'ART/RRT',
  prancha: 'prancha',
  memorial: 'memorial',
  'gdu-gdr': 'GDU/GDR',
  representacao: 'documento de representação',
}

const pdf = (anexo: AnexoTriado) => anexo.lido.inspecao.tipoReal === 'pdf'

function conflitos(comparacao: Comparacao): ValorConflitante {
  return {
    campo: comparacao.campo,
    valores: comparacao.grupos.flatMap((grupo) =>
      grupo.map((valor) => ({ anexoId: valor.anexoId, classe: valor.classe, campoId: valor.campoId, valorBruto: valor.valorBruto, evidencias: valor.evidencias })),
    ),
  }
}

function evidenciasDe(comparacoes: readonly Comparacao[]): Evidencia[] {
  return comparacoes.flatMap((comparacao) => comparacao.grupos.flatMap((grupo) => grupo.flatMap((valor) => valor.evidencias.slice(0, 1))))
}

function camposUsados(comparacoes: readonly Comparacao[]): string[] {
  return [...new Set(comparacoes.flatMap((comparacao) => comparacao.grupos.flatMap((grupo) => grupo.map((valor) => valor.campoId))))]
}

/** Descrição dos pares divergentes sem os valores (que ficam no quadro estruturado). */
function descreverDivergencia(comparacao: Comparacao): string {
  const lados = comparacao.grupos.map((grupo) => [...new Set(grupo.map((valor) => nomeClasse[valor.classe as ClasseDocumental] ?? valor.classe))].join(' e '))
  return `${nomeCampo[comparacao.campo]} difere entre ${lados.join(' × ')}`
}

/**
 * Resultado de um conjunto de comparações: divergência → achado; nada comparável → não avaliável;
 * caso contrário, sem achado (com o que ficou de fora registrado como limitação).
 */
function resultadoDeComparacoes(comparacoes: readonly Comparacao[], titulo: string, semDadosMotivo: string): ResultadoDaRegra {
  const divergentes = comparacoes.filter((item) => item.resultado === 'diverge')
  const comparadas = comparacoes.filter((item) => item.resultado === 'diverge' || item.resultado === 'coincide')
  // Valor ambíguo, ilegível ou pouco confiável em qualquer anexo: aquele campo não sustenta "sem achado".
  const comIncerteza = comparacoes.filter((item) => item.inconclusivos.length > 0)
  const limitacoes = comIncerteza.map((item) => `${nomeCampo[item.campo]} não comparado com segurança em ${item.inconclusivos.map((valor) => `${valor.anexoId} (${valor.motivo})`).join(', ')}`)
  if (divergentes.length > 0) {
    return {
      resultado: 'achado',
      tipo: 'divergencia',
      rascunho: `${titulo}: ${divergentes.map(descreverDivergencia).join('; ')}. Os valores e as páginas estão no quadro comparativo. O sistema não indica qual documento está correto.`,
      evidencias: evidenciasDe(divergentes),
      camposUsados: camposUsados(divergentes),
      valoresConflitantes: divergentes.map(conflitos),
      confianca: divergentes.every((item) => item.grupos.every((grupo) => grupo.every((valor) => valor.evidencias.every((evidencia) => evidencia.origem === 'camada-de-texto')))) ? 'alta' : 'media',
      limitacoes,
    }
  }
  if (comIncerteza.length > 0) {
    const motivo = `Extração ambígua ou incerta: ${limitacoes.join('; ')}.`.slice(0, 500)
    return { resultado: 'nao-avaliavel', motivo, rascunho: `${titulo}: comparação não conclusiva; ${comIncerteza.map((item) => nomeCampo[item.campo]).join(', ')} com leitura incerta em algum anexo.`, evidencias: evidenciasDe(comparadas).slice(0, 8), confianca: 'baixa', limitacoes }
  }
  if (comparadas.length === 0) {
    return { resultado: 'nao-avaliavel', motivo: semDadosMotivo, rascunho: `${titulo}: ${semDadosMotivo}`, confianca: 'baixa', limitacoes }
  }
  return {
    resultado: 'sem-achado',
    rascunho: `${titulo}: ${comparadas.map((item) => nomeCampo[item.campo]).join(', ')} coincidem entre os anexos em que foram encontrados.`,
    evidencias: evidenciasDe(comparadas).slice(0, 8),
    camposUsados: camposUsados(comparadas),
    confianca: 'alta',
    limitacoes,
  }
}

/** Pacote com indício de mais de um imóvel: a verificação de correspondência não conclui. */
function variosImoveis(indicio: string, oQue: string): ResultadoDaRegra {
  return {
    resultado: 'nao-avaliavel',
    motivo: `Indício de mais de um imóvel (${indicio}); o motor verifica um imóvel por pacote.`,
    rascunho: `Não foi possível verificar ${oQue}: ${indicio}. Conferência manual.`,
    confianca: 'baixa',
    limitacoes: ['Limitação conhecida: um imóvel por pacote.'],
  }
}

/**
 * Correspondência declarado × documento, imóvel a imóvel. Lacuna só vira achado com pacote completo
 * confirmado, todos os números lidos com segurança e nenhum anexo que possa ser o documento; senão,
 * não avaliável. Não conclui nada sobre propriedade ou validade: só "há documento com este número".
 */
function lacunaPorImovel(
  ctx: Parameters<FuncaoRegra>[0],
  opcoes: { declarados: Declaracao; documentos: readonly Vinculo[]; classe: ClasseDocumental; rotulo: string; documento: string; campo: 'matricula' | 'lote' },
): ResultadoDaRegra {
  const { declarados, documentos } = opcoes
  const correspondencia = corresponder(declarados, documentos)
  const total = declarados.valores.length
  const quadro: ValorConflitante = { campo: opcoes.campo, valores: linhasDoQuadro(declarados, documentos, opcoes.classe, opcoes.campo) }
  const limitacoes = [
    'Correspondência só pelo número normalizado; propriedade, cadeia dominial e validade registral não são avaliadas.',
    ...(correspondencia.naoDeclarados.length > 0 ? [`${correspondencia.naoDeclarados.length} documento(s) com número não declarado no requerimento.`] : []),
  ]
  const evidencias = [...declarados.evidencias, ...documentos.flatMap((documento) => documento.evidencias)]
  if (correspondencia.semDocumento.length === 0) {
    return {
      resultado: 'sem-achado',
      rascunho: `Cada um dos ${total} ${opcoes.rotulo} tem ${opcoes.documento} entre os anexos recebidos.`,
      evidencias,
      camposUsados: declarados.campoIds,
      valoresConflitantes: [quadro],
      confianca: 'media',
      limitacoes,
    }
  }
  const impedimentos = [
    ...(integridadeParaProcura(ctx.entrada) !== 'completo' ? ['pacote não confirmado como completo'] : []),
    ...(declarados.incerta ? ['declaração do requerimento com leitura incerta'] : []),
    ...correspondencia.incertos.map((documento) => `${documento.anexoId} sem número lido com segurança`),
    ...anexosQuePodemSer(ctx, [opcoes.classe]).map((anexo) => `${anexo.lido.id} pode ser o documento`),
  ]
  if (impedimentos.length > 0) {
    return {
      resultado: 'nao-avaliavel',
      motivo: `${correspondencia.semDocumento.length} de ${total} ${opcoes.rotulo} sem ${opcoes.documento}, mas não dá para concluir: ${impedimentos.join('; ')}.`.slice(0, 500),
      rascunho: `Possível lacuna por imóvel não confirmada (${impedimentos.join('; ')}). Conferir o quadro de correspondência.`,
      evidencias,
      valoresConflitantes: [quadro],
      confianca: 'baixa',
      limitacoes,
    }
  }
  return {
    resultado: 'achado',
    tipo: 'nao-localizado',
    rascunho: `Possível pendência: ${correspondencia.semDocumento.length} de ${total} ${opcoes.rotulo} sem ${opcoes.documento} entre os anexos recebidos. Os números estão no quadro de correspondência. Servidor confere antes de qualquer comunicação.`,
    procura: { integridadeDoPacote: 'completo', anexosProcurados: ctx.anexos.map((anexo) => ({ anexoId: anexo.lido.id, classe: anexo.classificacao.contrato.classe })) },
    evidencias,
    camposUsados: declarados.campoIds,
    valoresConflitantes: [quadro],
    confianca: 'media',
    limitacoes,
  }
}

// ---------- regras ----------

/** AQR-GCA-001: assunto ausente ou não mapeável → modalidade indeterminada, para triagem humana. */
const r001: FuncaoRegra = (ctx) => {
  const requerimentos = anexosDaClasse(ctx, 'requerimento')
  if (requerimentos.length === 0) {
    return { resultado: 'nao-avaliavel', motivo: 'Nenhum requerimento classificado entre os anexos recebidos (ver AQR-GCA-002).', rascunho: 'Assunto não verificado: não há requerimento classificado.', confianca: 'baixa' }
  }
  const campos = requerimentos.flatMap((anexo) => camposDe(ctx, anexo.lido.id, 'assunto') ?? [])
  const encontrados = campos.filter((campo) => campo.contrato.estado === 'encontrado' && campo.contrato.valorBruto !== undefined)
  const mapeados = encontrados.filter((campo) => modalidadeDoAssunto(campo.contrato.valorBruto ?? '') !== null)
  if (mapeados.length > 0) {
    const modalidades = [...new Set(mapeados.map((campo) => modalidadeDoAssunto(campo.contrato.valorBruto ?? '')))]
    return {
      resultado: 'sem-achado',
      rascunho: `Assunto do requerimento reconhecível (modalidade ${modalidades.join(', ')}).`,
      evidencias: mapeados.flatMap((campo) => campo.contrato.evidencias.slice(0, 1)),
      camposUsados: mapeados.map((campo) => campo.contrato.id),
      confianca: 'alta',
      limitacoes: ['A modalidade do assunto não altera o enquadramento: só o servidor confirma a modalidade.'],
    }
  }
  if (encontrados.length > 0) {
    return {
      resultado: 'achado',
      tipo: 'condicao-indeterminada',
      rascunho: 'Assunto do requerimento não corresponde a uma modalidade do catálogo: modalidade indeterminada, para classificação pelo servidor.',
      evidencias: encontrados.flatMap((campo) => campo.contrato.evidencias.slice(0, 1)),
      camposUsados: encontrados.map((campo) => campo.contrato.id),
      confianca: 'media',
    }
  }
  const lidos = campos.filter((campo) => campo.contrato.estado === 'nao-encontrado')
  if (lidos.length > 0 && lidos.length === campos.length) {
    return {
      resultado: 'achado',
      tipo: 'condicao-indeterminada',
      rascunho: 'Assunto não localizado no texto lido do requerimento: modalidade indeterminada, para classificação pelo servidor. O sistema não infere o assunto do nome do arquivo.',
      evidencias: requerimentos.map((anexo) => evidenciaDoAnexo(anexo)),
      camposUsados: lidos.map((campo) => campo.contrato.id),
      confianca: 'media',
      limitacoes: ['O assunto pode estar sob outro rótulo que o sistema não reconhece.'],
    }
  }
  return { resultado: 'nao-avaliavel', motivo: 'Assunto do requerimento ilegível ou com mais de um valor.', rascunho: 'Assunto do requerimento não pôde ser lido com segurança.', confianca: 'baixa' }
}

/** AQR-GCA-002. */
const r002: FuncaoRegra = (ctx) => avaliarPresenca(ctx, { classes: ['requerimento'], nome: 'Requerimento' })

/** AQR-GCA-003: DRT 01; DRT 03 (ou 02) não substitui. */
const r003: FuncaoRegra = (ctx) => {
  const outras = DRTS.filter((classe) => classe !== 'drt-01').flatMap((classe) => anexosDaClasse(ctx, classe))
  const complemento = outras.length > 0 ? `Há ${outras.map((anexo) => nomeClasse[anexo.classificacao.contrato.classe as ClasseDocumental] ?? 'outra DRT').join(', ')}, que não substitui a DRT 01 segundo o catálogo.` : undefined
  const resultado = avaliarPresenca(ctx, { classes: ['drt-01'], nome: 'DRT 01', ...(complemento ? { complemento } : {}) })
  if (resultado.resultado === 'achado') {
    resultado.evidencias = [...(resultado.evidencias ?? []), ...outras.map((anexo) => evidenciaDoAnexo(anexo))]
    resultado.tipo = 'nao-localizado'
  }
  return resultado
}

/** AQR-GCA-006: para cada lote declarado, um documento de inscrição; lacuna é alerta, não conclusão. */
const r006: FuncaoRegra = (ctx) => {
  const lotes = ctx.campos.filter((campo) => campo.contrato.campo === 'lote' && (campo.contrato.estado === 'encontrado' || campo.contrato.estado === 'varios-valores'))
  const fichas = anexosDaClasse(ctx, 'inscricao-imobiliaria')
  if (fichas.length === 0 && lotes.length === 0) {
    return { resultado: 'nao-avaliavel', motivo: 'Nenhum lote identificado nos anexos lidos.', rascunho: 'Documento de inscrição imobiliária não verificado: lotes não identificados.', confianca: 'baixa' }
  }
  const presenca = avaliarPresenca(ctx, { classes: ['inscricao-imobiliaria'], nome: 'Documento de inscrição imobiliária' })
  const mapa = mapaDeImoveis(ctx)
  if (presenca.resultado !== 'sem-achado' || mapa.lotes.valores.length <= 1) return presenca
  // Vários lotes declarados: cada um precisa de documento de inscrição com o mesmo lote.
  return lacunaPorImovel(ctx, {
    declarados: mapa.lotes,
    documentos: mapa.inscricoes,
    classe: 'inscricao-imobiliaria',
    rotulo: 'lotes declarados no requerimento',
    documento: 'documento de inscrição com o mesmo lote',
    campo: 'lote',
  })
}

/** AQR-GCA-008. */
const r008: FuncaoRegra = (ctx) => {
  const identificado = ctx.campos.some((campo) => (campo.contrato.campo === 'matricula' || campo.contrato.campo === 'lote') && campo.contrato.estado === 'encontrado')
  if (!identificado && anexosDaClasse(ctx, 'matricula-transcricao').length === 0) {
    return { resultado: 'nao-avaliavel', motivo: 'Imóvel não identificado nos anexos lidos.', rascunho: 'Título registral não verificado: imóvel não identificado.', confianca: 'baixa' }
  }
  const presenca = avaliarPresenca(ctx, { classes: ['matricula-transcricao'], nome: 'Certidão de matrícula ou transcrição' })
  const mapa = mapaDeImoveis(ctx)
  if (presenca.resultado !== 'sem-achado' || !mapa.varios) return presenca
  if (mapa.matriculas.valores.length === 0) {
    return variosImoveis('há títulos com números diferentes e o requerimento não declara as matrículas', 'qual título corresponde a cada imóvel declarado')
  }
  // Cada matrícula declarada precisa de título com o mesmo número (dossiê, ensaio T03).
  return lacunaPorImovel(ctx, {
    declarados: mapa.matriculas,
    documentos: mapa.titulos,
    classe: 'matricula-transcricao',
    rotulo: 'matrículas declaradas no requerimento',
    documento: 'título registral com o mesmo número',
    campo: 'matricula',
  })
}

const DIA_MS = 24 * 60 * 60 * 1000
/** Fuso de Campo Grande (UTC−4, sem horário de verão desde 2019): o dia do protocolo é o dia local. */
function diaDoProtocolo(instante: string): string {
  return new Date(Date.parse(instante) - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * AQR-GCA-009: registra as datas e o intervalo aparente entre a emissão do título e o protocolo e
 * encaminha a avaliação temporal ao servidor. Não há limiar: o dossiê não autoriza decidir a
 * contagem dos 30 dias (pergunta 5), então nenhum intervalo vira "sem achado" nem "vencido".
 * Sempre que há data legível, o resultado é um alerta de conferência ("condição indeterminada").
 */
const r009: FuncaoRegra = (ctx) => {
  const titulos = anexosDaClasse(ctx, 'matricula-transcricao')
  if (titulos.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Sem título registral classificado: não há data de emissão.', rascunho: 'Data do título não verificada: título não localizado.', confianca: 'baixa' }
  const datas = titulos.map((anexo) => ({ anexo, campo: camposDe(ctx, anexo.lido.id, 'data-emissao') }))
  const legiveis = datas.filter((item) => item.campo?.contrato.estado === 'encontrado')
  if (legiveis.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Data de emissão do título não localizada ou ilegível.', rascunho: 'Data de emissão do título não pôde ser lida.', confianca: 'baixa' }
  const protocolo = diaDoProtocolo(ctx.entrada.protocoladoEm)
  const registros: string[] = []
  const evidencias: Evidencia[] = []
  const usados: string[] = []
  let ambigua = false
  for (const { campo } of legiveis) {
    if (!campo) continue
    usados.push(campo.contrato.id)
    evidencias.push(...campo.contrato.evidencias.slice(0, 1))
    const normalizada = normalizarData(campo.contrato.valorBruto ?? '')
    if (!normalizada || normalizada.situacao === 'ambiguo') {
      ambigua = true
      registros.push(`emissão "${campo.contrato.valorBruto ?? ''}" com leitura ambígua (${normalizada?.situacao === 'ambiguo' ? normalizada.descricao : 'formato não reconhecido'}); intervalo não calculado`)
      continue
    }
    const dias = Math.round((Date.parse(protocolo) - Date.parse(normalizada.valor)) / DIA_MS)
    registros.push(
      dias < 0
        ? `emissão em ${normalizada.valor}, posterior ao dia do protocolo`
        : `emissão em ${normalizada.valor}; intervalo aparente de ${dias} dia(s) corrido(s) até o dia do protocolo`,
    )
  }
  return {
    resultado: 'achado',
    tipo: 'condicao-indeterminada',
    rascunho: `Datas para conferência do prazo do título (protocolo registrado em ${ctx.entrada.protocoladoEm}, dia ${protocolo} no fuso de Campo Grande): ${registros.join('; ')}. O sistema não aplica critério de contagem, não declara validade nem vencimento; a avaliação temporal é do servidor.`,
    evidencias,
    camposUsados: usados,
    confianca: ambigua ? 'baixa' : 'media',
    limitacoes: ['A forma de contagem do prazo de 30 dias (corrida ou útil, marco inicial, fuso) não é homologada: pergunta 5 do dossiê.', 'O intervalo em dias corridos é só apresentação, não critério.'],
  }
}

/** AQR-GCA-010: terceiro assina e nenhum documento de representação é classificável. Não julga poderes. */
const r010: FuncaoRegra = (ctx) => {
  const requerimentos = anexosDaClasse(ctx, 'requerimento')
  if (requerimentos.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Sem requerimento: não há signatário a comparar.', rascunho: 'Representação não verificada: requerimento não localizado.', confianca: 'baixa' }
  const signatarios = requerimentos.flatMap((anexo) => camposDe(ctx, anexo.lido.id, 'signatario') ?? [])
  const titulares = requerimentos.flatMap((anexo) => camposDe(ctx, anexo.lido.id, 'titular') ?? [])
  const signatario = signatarios.find((campo) => campo.contrato.estado === 'encontrado')
  const titular = titulares.find((campo) => campo.contrato.estado === 'encontrado')
  if (!signatario || !titular) {
    return { resultado: 'nao-avaliavel', motivo: 'Signatário ou titular aparente não lido com segurança no requerimento.', rascunho: 'Representação não verificada: signatário ou titular não identificado no requerimento.', confianca: 'baixa' }
  }
  const usados = [signatario.contrato.id, titular.contrato.id]
  if (chaveDeTexto(signatario.contrato.valorBruto ?? '') === chaveDeTexto(titular.contrato.valorBruto ?? '')) {
    return { resultado: 'nao-aplicavel', motivo: 'O signatário coincide com o titular aparente do requerimento.', rascunho: 'Signatário e titular aparente coincidem: não há representação a comprovar.', camposUsados: usados, confianca: 'alta' }
  }
  const presenca = avaliarPresenca(ctx, { classes: ['representacao'], nome: 'Documento de representação', complemento: 'O signatário do requerimento não coincide com o titular aparente.' })
  return {
    ...presenca,
    ...(presenca.resultado === 'sem-achado' ? { rascunho: 'O signatário não é o titular aparente; há documento de representação classificável. Os poderes não são julgados pelo sistema.' } : {}),
    camposUsados: usados,
    evidencias: [...(presenca.evidencias ?? []), ...signatario.contrato.evidencias.slice(0, 1), ...titular.contrato.evidencias.slice(0, 1)],
    limitacoes: [...(presenca.limitacoes ?? []), 'Nomes comparados sem acento e sem caixa; abreviações contam como diferença. Poderes e validade da representação são análise humana.'],
  }
}

/** AQR-GCA-011. */
const r011: FuncaoRegra = (ctx) => {
  const rt = ctx.campos.some((campo) => campo.contrato.campo === 'rt-nome' && campo.contrato.estado === 'encontrado')
  if (!rt && anexosDaClasse(ctx, 'art-rrt-similar').length === 0) {
    return { resultado: 'nao-avaliavel', motivo: 'Responsável técnico não identificado nos anexos lidos.', rascunho: 'ART/RRT não verificada: responsável técnico não identificado.', confianca: 'baixa' }
  }
  return avaliarPresenca(ctx, { classes: ['art-rrt-similar'], nome: 'ART, RRT ou documento similar de responsabilidade técnica' })
}

/** AQR-GCA-012: PDF da prancha e ao menos um DWG ou DXF; o CAD não é aberto. */
const r012: FuncaoRegra = (ctx) => {
  const pranchaPdf = avaliarPresenca(ctx, { classes: ['prancha'], nome: 'Prancha em PDF', aceita: pdf })
  const cad = avaliarPresenca(ctx, { classes: ['cad'], nome: 'Desenho DWG ou DXF' })
  const partes = [pranchaPdf, cad]
  const achados = partes.filter((parte) => parte.resultado === 'achado')
  if (achados.length > 0) {
    const procura = achados.find((parte) => parte.procura)?.procura
    return {
      resultado: 'achado',
      tipo: achados.some((parte) => parte.tipo === 'nao-localizado') ? 'nao-localizado' : 'formato-incompativel',
      rascunho: achados.map((parte) => parte.rascunho).join(' '),
      ...(procura ? { procura } : {}),
      evidencias: partes.flatMap((parte) => parte.evidencias ?? []),
      confianca: 'media',
      limitacoes: ['O conteúdo do DWG/DXF não é aberto nem interpretado.'],
    }
  }
  const naoAvaliaveis = partes.filter((parte) => parte.resultado === 'nao-avaliavel')
  if (naoAvaliaveis.length > 0) {
    return { resultado: 'nao-avaliavel', motivo: naoAvaliaveis.map((parte) => parte.motivo).join(' ').slice(0, 500), rascunho: naoAvaliaveis.map((parte) => parte.rascunho).join(' '), confianca: 'baixa' }
  }
  return { resultado: 'sem-achado', rascunho: 'Prancha em PDF e desenho DWG/DXF localizados.', evidencias: partes.flatMap((parte) => parte.evidencias ?? []), confianca: 'alta', limitacoes: ['O conteúdo do DWG/DXF não é aberto nem interpretado.'] }
}

/** AQR-GCA-013: memorial em PDF; DOCX isolado não satisfaz o formato expresso. */
const r013: FuncaoRegra = (ctx) => avaliarPresenca(ctx, { classes: ['memorial'], nome: 'Memorial descritivo em PDF', aceita: pdf })

const ROTULO_RT = /\b(?:responsavel tecnico|profissional)\b/u

/**
 * AQR-GCA-016: campo de assinatura do RT nitidamente vazio na prancha ou no memorial. Só PDF com
 * texto tem o rótulo localizável; assinatura eletrônica não é validada.
 */
const r016: FuncaoRegra = (ctx) => {
  const pecas = [...anexosDaClasse(ctx, 'prancha'), ...anexosDaClasse(ctx, 'memorial')]
  if (pecas.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Planta e memorial não localizados entre os anexos.', rascunho: 'Assinatura do RT não verificada: peças não localizadas.', confianca: 'baixa' }
  const vazias: { anexo: AnexoTriado; evidencia: Evidencia }[] = []
  const preenchidas: Evidencia[] = []
  const naoVerificadas: string[] = []
  for (const anexo of pecas) {
    const areas = anexo.lido.assinaturas.filter((area) => ROTULO_RT.test(dobrar(area.rotulo)))
    if (areas.length === 0) {
      naoVerificadas.push(`${anexo.lido.id}: área de assinatura do RT não localizada (${anexo.lido.origemTexto ?? 'sem texto'})`)
      continue
    }
    for (const area of areas) {
      const evidencia: Evidencia = { anexoId: anexo.lido.id, sha256: anexo.lido.inspecao.sha256, pagina: area.pagina, regioes: [area.regiaoVerificada, area.regiaoRotulo], trecho: area.rotulo, origem: 'camada-de-texto' }
      if (area.situacao === 'vazia') vazias.push({ anexo, evidencia })
      else if (area.situacao === 'preenchida') preenchidas.push(evidencia)
      else naoVerificadas.push(`${anexo.lido.id}: área de assinatura com pouca tinta, indeterminada`)
    }
  }
  const limitacoes = ['Só a presença de traço na área de assinatura é vista; autoria, assinatura eletrônica e validade não são verificadas.', ...naoVerificadas]
  if (vazias.length > 0) {
    return {
      resultado: 'achado',
      tipo: 'condicao-indeterminada',
      rascunho: `Área de assinatura do responsável técnico aparentemente vazia em ${vazias.map(({ anexo }) => `${nomeClasse[anexo.classificacao.contrato.classe as ClasseDocumental] ?? 'peça'} (${anexo.lido.id})`).join(', ')}. Verificar se há assinatura eletrônica ou física.`,
      evidencias: vazias.map((item) => item.evidencia),
      anexos: vazias.map(({ anexo }) => anexo.lido.id),
      confianca: 'media',
      limitacoes,
    }
  }
  if (naoVerificadas.length > 0) {
    return { resultado: 'nao-avaliavel', motivo: naoVerificadas.join('; ').slice(0, 500), rascunho: 'Assinatura do RT não verificável em todas as peças.', evidencias: preenchidas, confianca: 'baixa', limitacoes }
  }
  return { resultado: 'sem-achado', rascunho: 'Área de assinatura do RT com traço em todas as peças verificadas.', evidencias: preenchidas, confianca: 'media', limitacoes }
}

/** AQR-GCA-018: campos da ART/RRT × requerimento e título; discrepância é revisão, não falsidade. */
const CAMPOS_018: NomeCampo[] = ['titular', 'rt-nome', 'lote', 'quadra', 'bairro', 'parcelamento', 'matricula']
const r018: FuncaoRegra = (ctx) => {
  const arts = anexosDaClasse(ctx, 'art-rrt-similar').filter((anexo) => anexo.lido.legibilidade === 'legivel')
  if (arts.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Nenhuma ART/RRT legível entre os anexos.', rascunho: 'Campos da ART/RRT não comparados: documento não localizado ou ilegível.', confianca: 'baixa' }
  const mapa = mapaDeImoveis(ctx)
  if (mapa.varios) return artComVariosImoveis(ctx, arts, mapa)
  const classes: ClasseDocumental[] = ['art-rrt-similar', 'requerimento', 'matricula-transcricao']
  // Só contam os campos em que a ART tem valor: divergência só entre requerimento e título é da regra 020.
  const comparacoes = CAMPOS_018.map((campo) => compararCampo(ctx.campos, campo, classes)).filter(
    (comparacao) => comparacao.grupos.some((grupo) => grupo.some((valor) => valor.classe === 'art-rrt-similar')) || comparacao.inconclusivos.some((valor) => valor.classe === 'art-rrt-similar'),
  )
  const naoExtraidos = CAMPOS_018.filter((campo) => !arts.some((anexo) => camposDe(ctx, anexo.lido.id, campo)?.contrato.estado === 'encontrado'))
  const resultado = resultadoDeComparacoes(comparacoes, 'Campos da ART/RRT', 'Nenhum campo da ART/RRT pôde ser comparado.')
  if (naoExtraidos.length > 0) resultado.limitacoes = [...(resultado.limitacoes ?? []), `Não extraídos da ART/RRT: ${naoExtraidos.map((campo) => nomeCampo[campo]).join(', ')}.`]
  if (resultado.resultado === 'sem-achado' && naoExtraidos.length > 0) resultado.confianca = 'media'
  return resultado
}

/** Valor normalizado de matrícula ou lote do anexo, quando lido com segurança (um só). */
function numeroDo(ctx: Parameters<FuncaoRegra>[0], anexoId: string, campo: 'matricula' | 'lote'): { valores: string[]; brutoDe: (valor: string) => string; incerto: boolean; evidencias: Evidencia[]; campoId?: string } {
  const detalhe = camposDe(ctx, anexoId, campo)?.contrato
  if (!detalhe || detalhe.estado === 'nao-encontrado' || detalhe.estado === 'nao-aplicavel') return { valores: [], brutoDe: (valor) => valor, incerto: false, evidencias: [] }
  const brutos = detalhe.estado === 'encontrado' && detalhe.valorBruto ? [detalhe.valorBruto] : detalhe.estado === 'varios-valores' ? (detalhe.alternativas ?? []) : []
  const pares = brutos.flatMap((bruto) => {
    const normalizado = campo === 'matricula' ? normalizarIdentificador(bruto) : normalizarCodigo(bruto)
    return normalizado?.situacao === 'normalizado' ? [{ bruto, valor: String(normalizado.valor) }] : []
  })
  return {
    valores: pares.map((par) => par.valor),
    brutoDe: (valor: string) => pares.find((par) => par.valor === valor)?.bruto ?? valor,
    incerto: detalhe.estado === 'ilegivel' || pares.length !== brutos.length || brutos.length === 0,
    evidencias: detalhe.evidencias.slice(0, 1),
    campoId: detalhe.id,
  }
}

/**
 * 020 com vários imóveis: (1) toda matrícula citada numa peça precisa estar entre as declaradas no
 * requerimento; (2) lote, quadra, inscrição e bairro só são comparados entre peças do mesmo imóvel
 * (mesma matrícula). Peça que cita mais de um imóvel não entra na comparação por imóvel.
 */
function identidadePorImovel(ctx: Parameters<FuncaoRegra>[0], classes: readonly ClasseDocumental[], mapa: MapaImoveis): ResultadoDaRegra {
  const declaradas = mapa.matriculas.valores.length > 0 ? mapa.matriculas.valores : [...new Set(mapa.titulos.flatMap((titulo) => (titulo.valor ? [titulo.valor] : [])))]
  if (declaradas.length === 0) return variosImoveis('vários imóveis sem matrícula declarada nem título com número legível', 'a identidade de cada imóvel entre as peças')
  const anexos = classes.filter((classe) => classe !== 'requerimento').flatMap((classe) => anexosDaClasse(ctx, classe))
  const fora: ValorConflitante['valores'] = []
  const grupos = new Map<string, string[]>()
  const incertas: string[] = []
  for (const anexo of anexos) {
    const numero = numeroDo(ctx, anexo.lido.id, 'matricula')
    if (numero.incerto && numero.valores.length === 0 && camposDe(ctx, anexo.lido.id, 'matricula')) incertas.push(`${anexo.lido.id}: matrícula com leitura incerta`)
    for (const valor of numero.valores) {
      if (!declaradas.includes(valor)) fora.push({ anexoId: anexo.lido.id, classe: anexo.classificacao.contrato.classe, campoId: numero.campoId ?? '', valorBruto: numero.brutoDe(valor), evidencias: numero.evidencias })
    }
    if (numero.valores.length === 1 && numero.valores[0]) grupos.set(numero.valores[0], [...(grupos.get(numero.valores[0]) ?? []), anexo.lido.id])
  }
  const limitacoes = ['Vários imóveis: comparação feita imóvel a imóvel, pela matrícula citada em cada peça; peças sem matrícula ou com mais de uma não entram na comparação por imóvel.', ...incertas]
  if (fora.length > 0) {
    return {
      resultado: 'achado',
      tipo: 'divergencia',
      rascunho: 'Identidade dos imóveis: peça cita matrícula que não está entre as declaradas no requerimento. Os números estão no quadro comparativo. O sistema não indica qual documento está correto.',
      evidencias: [...mapa.matriculas.evidencias, ...fora.flatMap((valor) => valor.evidencias)],
      camposUsados: mapa.matriculas.campoIds,
      valoresConflitantes: [{ campo: 'matricula', valores: [...linhasDoQuadro(mapa.matriculas, [], 'requerimento', 'matricula'), ...fora] }],
      confianca: 'media',
      limitacoes,
    }
  }
  const comparacoes = [...grupos.values()]
    .filter((ids) => ids.length >= 2)
    .flatMap((ids) => (['lote', 'quadra', 'inscricao', 'bairro'] as NomeCampo[]).map((campo) => compararCampo(ctx.campos.filter((item) => ids.includes(item.contrato.anexoId)), campo, classes)))
  const resultado = resultadoDeComparacoes(comparacoes, 'Identidade de cada imóvel', 'Não há duas peças do mesmo imóvel com identificadores para comparar.')
  return { ...resultado, limitacoes: [...limitacoes, ...(resultado.limitacoes ?? [])] }
}

/** 018 com vários imóveis: titular e RT comparados com o requerimento; lote e matrícula da ART precisam estar entre os declarados. */
function artComVariosImoveis(ctx: Parameters<FuncaoRegra>[0], arts: readonly AnexoTriado[], mapa: MapaImoveis): ResultadoDaRegra {
  const comparacoes = (['titular', 'rt-nome'] as NomeCampo[]).map((campo) => compararCampo(ctx.campos, campo, ['art-rrt-similar', 'requerimento']))
  const fora: ValorConflitante[] = []
  for (const campo of ['lote', 'matricula'] as const) {
    const declarados = campo === 'lote' ? mapa.lotes : mapa.matriculas
    if (declarados.valores.length === 0) continue
    for (const anexo of arts) {
      const numero = numeroDo(ctx, anexo.lido.id, campo)
      const ausentes = numero.valores.filter((valor) => !declarados.valores.includes(valor))
      if (ausentes.length > 0) {
        fora.push({
          campo,
          valores: [
            ...linhasDoQuadro(declarados, [], 'requerimento', campo),
            ...ausentes.map((valor) => ({ anexoId: anexo.lido.id, classe: 'art-rrt-similar', campoId: numero.campoId ?? '', valorBruto: numero.brutoDe(valor), evidencias: numero.evidencias })),
          ],
        })
      }
    }
  }
  const limitacoes = ['Vários imóveis: lote e matrícula da ART/RRT conferidos contra a lista declarada; quadra, bairro e parcelamento não são comparados.']
  if (fora.length > 0) {
    return {
      resultado: 'achado',
      tipo: 'divergencia',
      rascunho: `Campos da ART/RRT: ${fora.map((item) => nomeCampo[item.campo]).join(', ')} não está entre os declarados no requerimento. Os valores estão no quadro comparativo. O sistema não indica qual documento está correto.`,
      evidencias: fora.flatMap((item) => item.valores.flatMap((valor) => valor.evidencias)),
      valoresConflitantes: fora,
      confianca: 'media',
      limitacoes,
    }
  }
  const resultado = resultadoDeComparacoes(comparacoes, 'Campos da ART/RRT', 'Nenhum campo da ART/RRT pôde ser comparado.')
  return { ...resultado, limitacoes: [...limitacoes, ...(resultado.limitacoes ?? [])] }
}

/** AQR-GCA-019: assunto em requerimento, DRT, planta e memorial; não altera a modalidade sozinho. */
const r019: FuncaoRegra = (ctx) => {
  const comparacao = compararCampo(ctx.campos, 'assunto', ['requerimento', ...DRTS, 'prancha', 'memorial'])
  return resultadoDeComparacoes([comparacao], 'Assunto das peças', 'Menos de duas peças com assunto legível para comparar.')
}

/** AQR-GCA-020: matrícula, lote, quadra, inscrição e bairro após normalização conservadora. */
const CAMPOS_020: NomeCampo[] = ['matricula', 'lote', 'quadra', 'inscricao', 'bairro']
const r020: FuncaoRegra = (ctx) => {
  const classes: ClasseDocumental[] = ['requerimento', 'matricula-transcricao', 'prancha', 'memorial', 'inscricao-imobiliaria']
  const mapa = mapaDeImoveis(ctx)
  if (mapa.varios) return identidadePorImovel(ctx, classes, mapa)
  return resultadoDeComparacoes(CAMPOS_020.map((campo) => compararCampo(ctx.campos, campo, classes)), 'Identidade do imóvel', 'Nenhum identificador do imóvel encontrado com confiança em dois anexos.')
}

/** AQR-GCA-021: datas de revisão da planta e do memorial, quando inequívocas. */
const r021: FuncaoRegra = (ctx) => {
  if (anexosDaClasse(ctx, 'prancha').length === 0 || anexosDaClasse(ctx, 'memorial').length === 0) {
    return { resultado: 'nao-avaliavel', motivo: 'Planta e memorial não estão ambos entre os anexos classificados.', rascunho: 'Datas de revisão não comparadas: falta uma das peças.', confianca: 'baixa' }
  }
  return resultadoDeComparacoes([compararCampo(ctx.campos, 'data-revisao', ['prancha', 'memorial'])], 'Data de revisão da planta e do memorial', 'Datas de revisão não legíveis ou ambíguas em uma das peças.')
}

/** AQR-GCA-022: a situação mostra 1:10.000? Sem medir escala pelo raster. */
const ESCALA_SITUACAO = 10_000
const r022: FuncaoRegra = (ctx) => {
  const pranchas = anexosDaClasse(ctx, 'prancha')
  if (pranchas.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Prancha não localizada entre os anexos.', rascunho: 'Escala da situação não verificada: prancha não localizada.', confianca: 'baixa' }
  const diferentes: Evidencia[] = []
  const iguais: Evidencia[] = []
  const usados: string[] = []
  const semEscala: AnexoTriado[] = []
  const incertas: string[] = []
  for (const anexo of pranchas) {
    const campo = camposDe(ctx, anexo.lido.id, 'escala-situacao')?.contrato
    if (!campo || campo.estado === 'ilegivel' || anexo.lido.legibilidade !== 'legivel') {
      incertas.push(`${anexo.lido.id}: escala não lida com segurança`)
      continue
    }
    if (campo.estado === 'nao-encontrado') {
      semEscala.push(anexo)
      continue
    }
    usados.push(campo.id)
    if (campo.estado === 'encontrado' && campo.valorNormalizado === ESCALA_SITUACAO) iguais.push(...campo.evidencias.slice(0, 1))
    else if (campo.estado === 'encontrado' && typeof campo.valorNormalizado === 'number') diferentes.push(...campo.evidencias.slice(0, 1))
    else incertas.push(`${anexo.lido.id}: escala com mais de um valor ou sem leitura numérica`)
  }
  if (diferentes.length > 0) {
    return {
      resultado: 'achado',
      tipo: 'divergencia',
      rascunho: 'A escala declarada da planta de situação difere de 1:10.000. Conferir na prancha; o sistema não mede a escala pelo desenho.',
      evidencias: diferentes,
      camposUsados: usados,
      confianca: 'media',
      limitacoes: incertas,
    }
  }
  if (semEscala.length > 0) {
    return {
      resultado: 'achado',
      tipo: 'condicao-indeterminada',
      rascunho: 'Escala da planta de situação não localizada no texto lido da prancha. Conferir se a situação mostra 1:10.000.',
      evidencias: semEscala.map((anexo) => evidenciaDoAnexo(anexo)),
      confianca: 'baixa',
      limitacoes: ['A escala pode estar no desenho, fora do texto lido.', ...incertas],
    }
  }
  if (iguais.length === 0 || incertas.length > 0) return { resultado: 'nao-avaliavel', motivo: incertas.join('; ').slice(0, 500) || 'Escala não lida.', rascunho: 'Escala da situação não pôde ser lida com segurança em todas as pranchas.', evidencias: iguais, confianca: 'baixa' }
  return { resultado: 'sem-achado', rascunho: 'A planta de situação declara 1:10.000.', evidencias: iguais, camposUsados: usados, confianca: 'alta' }
}

/**
 * AQR-GCA-023: formato da folha da prancha × formatos permitidos pelo termo de referência da
 * modalidade. Só o TR 002 (R, D, DM, R/D, D/R) foi conferido: p. 4, item VII, "prancha A-3, A-2 ou
 * A-1". Para as demais modalidades a tabela não está conferida e a regra fica não avaliável.
 *
 * Política de abstenção: o resultado só é conclusivo com o formato **declarado** na prancha. O
 * tamanho da página do arquivo serve só para corroborar; se diverge do declarado, ou se não há
 * formato declarado, a regra não conclui (página digitalizada nem é medida: o tamanho do scan não é
 * o da folha original). O carimbo não é verificado.
 */
export const FORMATOS_DE_FOLHA = {
  fonte: 'S07',
  documento: 'TR n.º 002 – Modalidade remembramento, desdobro e desmembramento',
  local: 'p. 4, item VII',
  sha256: 'a13d7b540d131c46f3c02867a244939d2f401ee5f13ec1d6e14ddbb5a705d50b',
  trecho: 'Uma (01) via do projeto podendo ser em prancha A-3, A-2 ou A-1',
  modalidades: ['R', 'D', 'DM', 'R/D', 'D/R'],
  permitidos: ['A3', 'A2', 'A1'],
} as const

const MEDIDAS_ISO: Record<string, readonly [number, number]> = { A0: [2384, 3370], A1: [1684, 2384], A2: [1191, 1684], A3: [842, 1191], A4: [595, 842] }
function formatoDaFolha(largura: number, altura: number): string | undefined {
  const [menor, maior] = largura < altura ? [largura, altura] : [altura, largura]
  return Object.entries(MEDIDAS_ISO).find(([, [a, b]]) => Math.abs(a - menor) <= a * 0.03 && Math.abs(b - maior) <= b * 0.03)?.[0]
}

const r023: FuncaoRegra = (ctx) => {
  const modalidade = ctx.entrada.modalidade.valor
  const tabela = (FORMATOS_DE_FOLHA.modalidades as readonly string[]).includes(modalidade) ? FORMATOS_DE_FOLHA : undefined
  const pranchas = anexosDaClasse(ctx, 'prancha')
  if (pranchas.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Prancha não localizada entre os anexos.', rascunho: 'Formato da prancha não verificado: prancha não localizada.', confianca: 'baixa' }
  if (!tabela) {
    return { resultado: 'nao-avaliavel', motivo: `Formatos permitidos para a modalidade ${modalidade} não conferidos no termo de referência.`, rascunho: 'Formato da prancha não confrontado: tabela de formatos desta modalidade não conferida.', confianca: 'baixa' }
  }
  const limitacoes = [`Formatos permitidos: ${tabela.permitidos.join(', ')} (${tabela.fonte}, ${tabela.local}).`, 'Presença e conteúdo do carimbo não são verificados.']
  const fora: { evidencia: Evidencia; formato: string }[] = []
  const aceitos: Evidencia[] = []
  const indefinidos: string[] = []
  const usados: string[] = []
  for (const anexo of pranchas) {
    const campo = camposDe(ctx, anexo.lido.id, 'formato-folha')?.contrato
    const declarado = campo?.estado === 'encontrado' && typeof campo.valorNormalizado === 'string' ? campo.valorNormalizado : undefined
    const pagina = anexo.lido.paginas[0]
    const medida = pagina?.conteudo !== 'scanned' && pagina?.larguraPt && pagina.alturaPt ? formatoDaFolha(pagina.larguraPt, pagina.alturaPt) : undefined
    if (!declarado || !campo) {
      indefinidos.push(`${anexo.lido.id}: formato não declarado ou não lido com segurança${campo ? ` (${campo.estado})` : ''}`)
      continue
    }
    usados.push(campo.id)
    if (medida && medida !== declarado) {
      indefinidos.push(`${anexo.lido.id}: formato declarado ${declarado}, mas a página do arquivo mede ${medida}`)
      continue
    }
    const evidencia = campo.evidencias[0] ?? evidenciaDoAnexo(anexo)
    if ((tabela.permitidos as readonly string[]).includes(declarado)) aceitos.push(evidencia)
    else fora.push({ evidencia, formato: declarado })
  }
  if (fora.length > 0) {
    return {
      resultado: 'achado',
      tipo: 'formato-incompativel',
      rascunho: `Formato de folha da prancha (${[...new Set(fora.map((item) => item.formato))].join(', ')}) fora dos permitidos pelo ${tabela.documento.split(' – ')[0]} (${tabela.permitidos.join(', ')}). Conferir na prancha.`,
      evidencias: fora.map((item) => item.evidencia),
      camposUsados: usados,
      confianca: 'media',
      limitacoes: [...limitacoes, ...indefinidos],
    }
  }
  if (indefinidos.length > 0) {
    return { resultado: 'nao-avaliavel', motivo: indefinidos.join('; ').slice(0, 500), rascunho: 'Formato da prancha não confrontado: formato não declarado ou inconsistente com o arquivo.', evidencias: aceitos, camposUsados: usados, confianca: 'baixa', limitacoes }
  }
  return { resultado: 'sem-achado', rascunho: `Prancha em formato permitido pelo ${tabela.documento.split(' – ')[0]} (${tabela.permitidos.join(', ')}).`, evidencias: aceitos, camposUsados: usados, confianca: 'media', limitacoes }
}

/**
 * AQR-GCA-028: só roda com a condição confirmada por servidor (o motor cuida disso). Executável:
 * GDU/GDR em PDF entre os anexos. A divergência com a LC 74, art. 22, fica registrada.
 */
const r028: FuncaoRegra = (ctx) => {
  const resultado = avaliarPresenca(ctx, { classes: ['gdu-gdr'], nome: 'GDU/GDR em PDF', aceita: pdf, complemento: 'Condição de área confirmada por servidor; consulta GCA/PLANURB.' })
  return {
    ...resultado,
    limitacoes: [...(resultado.limitacoes ?? []), 'Divergência registrada no catálogo com a LC 74, art. 22 (gatilhos da GDU); o enquadramento é do servidor.', 'Validade e conteúdo da GDU não são verificados.'],
  }
}

/** AQR-GCA-043: formato real × declarado; JPG/PDF para administrativos, PDF + DWG/DXF para prancha. */
const ADMINISTRATIVOS: ClasseDocumental[] = ['requerimento', ...DRTS, 'matricula-transcricao', 'inscricao-imobiliaria', 'art-rrt-similar', 'representacao', 'gdu-gdr']
const FORMATOS_ACEITOS: Partial<Record<ClasseDocumental, readonly string[]>> = {
  ...Object.fromEntries(ADMINISTRATIVOS.map((classe) => [classe, ['pdf', 'jpeg']])),
  prancha: ['pdf'],
  memorial: ['pdf'],
  cad: ['dwg', 'dxf'],
}
const r043: FuncaoRegra = (ctx) => {
  const problemas: { anexo: AnexoTriado; tipo: 'ilegivel' | 'formato-incompativel'; descricao: string }[] = []
  for (const anexo of ctx.anexos) {
    const { inspecao } = anexo.lido
    const classe = anexo.classificacao.contrato.classe
    if (inspecao.isolamento.isolado) {
      problemas.push({ anexo, tipo: 'formato-incompativel', descricao: `conteúdo isolado por suspeita (${inspecao.isolamento.motivos.join(', ')}); o arquivo não foi aberto` })
    } else if (inspecao.integridade === 'corrompido' || inspecao.integridade === 'protegido-por-senha' || inspecao.integridade === 'vazio') {
      problemas.push({ anexo, tipo: 'ilegivel', descricao: `arquivo ${inspecao.integridade === 'vazio' ? 'vazio' : inspecao.integridade === 'corrompido' ? 'corrompido' : 'protegido por senha'}: ilegível para a triagem` })
    } else if (inspecao.extensaoConfere === false) {
      problemas.push({ anexo, tipo: 'formato-incompativel', descricao: `extensão .${inspecao.extensao} não corresponde ao conteúdo (${inspecao.tipoReal.toUpperCase()})` })
    } else if (classe !== 'indeterminada' && FORMATOS_ACEITOS[classe] && !FORMATOS_ACEITOS[classe]?.includes(inspecao.tipoReal)) {
      problemas.push({ anexo, tipo: 'formato-incompativel', descricao: `${nomeClasse[classe] ?? classe} em ${inspecao.tipoReal.toUpperCase()}; o formato esperado é ${(FORMATOS_ACEITOS[classe] ?? []).map((tipo) => tipo.toUpperCase()).join(' ou ')}` })
    }
  }
  if (problemas.length === 0) return { resultado: 'sem-achado', rascunho: 'Os anexos abrem e têm formato compatível com o requisito em que foram classificados.', confianca: 'alta', limitacoes: ['Anexo sem classe não tem requisito de formato a conferir.'] }
  return {
    resultado: 'achado',
    tipo: problemas.some((item) => item.tipo === 'formato-incompativel') ? 'formato-incompativel' : 'ilegivel',
    rascunho: `Formato de arquivo para conferência: ${problemas.map((item) => `${item.anexo.lido.id} — ${item.descricao}`).join('; ')}.`.slice(0, 2000),
    evidencias: problemas.map((item) => ({ anexoId: item.anexo.lido.id, sha256: item.anexo.lido.inspecao.sha256, trecho: item.descricao.slice(0, 200), origem: 'metadado-arquivo' as const })),
    anexos: problemas.map((item) => item.anexo.lido.id),
    confianca: 'alta',
    limitacoes: ['Formato verificado pelo conteúdo do arquivo; o requisito vem da classe proposta pelo sistema.'],
  }
}

/** Regras implementadas, por id do catálogo. */
export const REGRAS: Record<string, FuncaoRegra> = {
  'AQR-GCA-001': r001,
  'AQR-GCA-002': r002,
  'AQR-GCA-003': r003,
  'AQR-GCA-006': r006,
  'AQR-GCA-008': r008,
  'AQR-GCA-009': r009,
  'AQR-GCA-010': r010,
  'AQR-GCA-011': r011,
  'AQR-GCA-012': r012,
  'AQR-GCA-013': r013,
  'AQR-GCA-016': r016,
  'AQR-GCA-018': r018,
  'AQR-GCA-019': r019,
  'AQR-GCA-020': r020,
  'AQR-GCA-021': r021,
  'AQR-GCA-022': r022,
  'AQR-GCA-023': r023,
  'AQR-GCA-028': r028,
  'AQR-GCA-043': r043,
}

/** Garantias do sistema: não avaliam documento; valem como invariantes do resultado. */
export const GARANTIAS: Record<string, string> = {
  'AQR-GCA-040': 'Nenhum resultado é decisão: o texto dos alertas é recusado se tiver palavra de decisão, o resultado não tem campo de decisão e a conversão em ato administrativo é bloqueada.',
  'AQR-GCA-041': 'Evidência minimizada: trechos com CPF/CNPJ mascarados e recusados se completos; rascunhos sem nomes nem números de documento; resumo para log sem trechos nem valores.',
}

