import type { ClasseDocumental, Evidencia, NomeCampo } from '../../../shared/contracts/triage.ts'
import { compararCampo, type Comparacao } from '../extraction/compare.ts'
import { chaveDeTexto, modalidadeDoAssunto, normalizarData } from '../extraction/normalize.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { dobrar } from '../reading/text.ts'
import {
  anexosDaClasse,
  avaliarPresenca,
  camposDe,
  evidenciaDoAnexo,
  integridadeParaProcura,
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
  const inconclusivas = comparacoes.filter((item) => item.resultado === 'inconclusivo')
  const limitacoes = inconclusivas.map((item) => `${nomeCampo[item.campo]}: ${item.inconclusivos.map((valor) => `${valor.anexoId} (${valor.motivo})`).join(', ')}`)
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
  if (comparadas.length === 0) {
    return { resultado: 'nao-avaliavel', motivo: semDadosMotivo, rascunho: `${titulo}: ${semDadosMotivo}`, confianca: 'baixa', limitacoes }
  }
  return {
    resultado: 'sem-achado',
    rascunho: `${titulo}: ${comparadas.map((item) => nomeCampo[item.campo]).join(', ')} coincidem entre os anexos em que foram encontrados.`,
    evidencias: evidenciasDe(comparadas).slice(0, 8),
    camposUsados: camposUsados(comparadas),
    confianca: inconclusivas.length > 0 ? 'media' : 'alta',
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
  if (presenca.resultado !== 'sem-achado') return presenca
  // Lotes do requerimento: com mais de um, confere a quantidade de documentos de inscrição.
  const doRequerimento = anexosDaClasse(ctx, 'requerimento').flatMap((anexo) => camposDe(ctx, anexo.lido.id, 'lote') ?? [])
  const declarados = new Set(doRequerimento.flatMap((campo) => (campo.contrato.estado === 'varios-valores' ? (campo.contrato.alternativas ?? []) : campo.contrato.valorBruto ? [campo.contrato.valorBruto] : [])))
  if (declarados.size > fichas.length && integridadeParaProcura(ctx.entrada) === 'completo') {
    return {
      resultado: 'achado',
      tipo: 'nao-localizado',
      rascunho: `O requerimento declara ${declarados.size} lotes e há ${fichas.length} documento(s) de inscrição entre os anexos recebidos. Lacuna para conferência, não conclusão sobre o cadastro.`,
      procura: { integridadeDoPacote: 'completo', anexosProcurados: ctx.anexos.map((anexo) => ({ anexoId: anexo.lido.id, classe: anexo.classificacao.contrato.classe })) },
      evidencias: [...fichas.map((anexo) => evidenciaDoAnexo(anexo)), ...doRequerimento.flatMap((campo) => campo.contrato.evidencias.slice(0, 1))],
      camposUsados: doRequerimento.map((campo) => campo.contrato.id),
      confianca: 'media',
    }
  }
  return { ...presenca, limitacoes: [...(presenca.limitacoes ?? []), 'A correspondência entre cada inscrição e cada lote não é verificada.'] }
}

/** AQR-GCA-008. */
const r008: FuncaoRegra = (ctx) => {
  const identificado = ctx.campos.some((campo) => (campo.contrato.campo === 'matricula' || campo.contrato.campo === 'lote') && campo.contrato.estado === 'encontrado')
  if (!identificado && anexosDaClasse(ctx, 'matricula-transcricao').length === 0) {
    return { resultado: 'nao-avaliavel', motivo: 'Imóvel não identificado nos anexos lidos.', rascunho: 'Título registral não verificado: imóvel não identificado.', confianca: 'baixa' }
  }
  const resultado = avaliarPresenca(ctx, { classes: ['matricula-transcricao'], nome: 'Certidão de matrícula ou transcrição' })
  return { ...resultado, limitacoes: [...(resultado.limitacoes ?? []), 'Com mais de um imóvel de origem, a correspondência título × imóvel não é verificada nesta fase.'] }
}

const DIA_MS = 24 * 60 * 60 * 1000
/** Fuso de Campo Grande (UTC−4, sem horário de verão desde 2019): o dia do protocolo é o dia local. */
function diaDoProtocolo(instante: string): string {
  return new Date(Date.parse(instante) - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * AQR-GCA-009: mostra o intervalo aparente entre a emissão do título e o protocolo, sem decidir a
 * contagem de 30 dias. Leitura do AQR: até 29 dias corridos o intervalo cabe em qualquer contagem
 * (corrida ou útil) e não gera alerta; a partir de 30, alerta para conferência, nunca "vencido".
 */
const r009: FuncaoRegra = (ctx) => {
  const titulos = anexosDaClasse(ctx, 'matricula-transcricao')
  if (titulos.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Sem título registral classificado: não há data de emissão.', rascunho: 'Data do título não verificada: título não localizado.', confianca: 'baixa' }
  const datas = titulos.map((anexo) => ({ anexo, campo: camposDe(ctx, anexo.lido.id, 'data-emissao') }))
  const legiveis = datas.filter((item) => item.campo?.contrato.estado === 'encontrado')
  if (legiveis.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Data de emissão do título não localizada ou ilegível.', rascunho: 'Data de emissão do título não pôde ser lida.', confianca: 'baixa' }
  const protocolo = diaDoProtocolo(ctx.entrada.protocoladoEm)
  const alertas: string[] = []
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
      alertas.push(`data de emissão "${campo.contrato.valorBruto ?? ''}" com leitura ambígua (${normalizada?.situacao === 'ambiguo' ? normalizada.descricao : 'formato não reconhecido'}); protocolo em ${protocolo}`)
      continue
    }
    const dias = Math.round((Date.parse(protocolo) - Date.parse(normalizada.valor)) / DIA_MS)
    if (dias < 0) alertas.push(`emissão (${normalizada.valor}) posterior ao protocolo (${protocolo})`)
    else if (dias >= 30) alertas.push(`intervalo aparente de ${dias} dias corridos entre a emissão (${normalizada.valor}) e o protocolo (${protocolo})`)
  }
  if (alertas.length === 0) {
    return {
      resultado: 'sem-achado',
      rascunho: 'Emissão do título até 29 dias corridos antes do protocolo; dentro de 30 dias em qualquer contagem.',
      evidencias,
      camposUsados: usados,
      confianca: 'media',
      limitacoes: ['O fuso e o dia exato do protocolo vêm do registro do sistema; o prazo aplicável é conferência humana.'],
    }
  }
  return {
    resultado: 'achado',
    // O prazo é condição que só o servidor determina: o achado é sempre "condição indeterminada".
    tipo: 'condicao-indeterminada',
    rascunho: `Conferir o prazo do título: ${alertas.join('; ')}. O sistema não decide a contagem do prazo nem afirma vencimento.`,
    evidencias,
    camposUsados: usados,
    confianca: ambigua ? 'baixa' : 'media',
    limitacoes: ['Contagem (corrida ou útil), fuso e marco inicial do prazo são decisão humana.'],
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

/** AQR-GCA-019: assunto em requerimento, DRT, planta e memorial; não altera a modalidade sozinho. */
const r019: FuncaoRegra = (ctx) => {
  const comparacao = compararCampo(ctx.campos, 'assunto', ['requerimento', ...DRTS, 'prancha', 'memorial'])
  return resultadoDeComparacoes([comparacao], 'Assunto das peças', 'Menos de duas peças com assunto legível para comparar.')
}

/** AQR-GCA-020: matrícula, lote, quadra, inscrição e bairro após normalização conservadora. */
const CAMPOS_020: NomeCampo[] = ['matricula', 'lote', 'quadra', 'inscricao', 'bairro']
const r020: FuncaoRegra = (ctx) => {
  const classes: ClasseDocumental[] = ['requerimento', 'matricula-transcricao', 'prancha', 'memorial', 'inscricao-imobiliaria']
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
  if (iguais.length === 0) return { resultado: 'nao-avaliavel', motivo: incertas.join('; ').slice(0, 500) || 'Escala não lida.', rascunho: 'Escala da situação não pôde ser lida.', confianca: 'baixa' }
  return { resultado: 'sem-achado', rascunho: 'A planta de situação declara 1:10.000.', evidencias: iguais, camposUsados: usados, confianca: incertas.length ? 'media' : 'alta', limitacoes: incertas }
}

/**
 * AQR-GCA-023: formato da folha. O catálogo dá só os exemplos "A3" (positivo) e "A0" (negativo);
 * a tabela de formatos do TR 001/002/003 não está no repositório. Formato fora dos exemplos fica
 * não avaliável, em vez de decidido por suposição. O carimbo não é verificado.
 */
const FORMATOS_DO_CATALOGO: Record<string, 'aceito' | 'nao-aceito'> = { A3: 'aceito', A0: 'nao-aceito' }
const MEDIDAS_ISO: Record<string, readonly [number, number]> = { A0: [2384, 3370], A1: [1684, 2384], A2: [1191, 1684], A3: [842, 1191], A4: [595, 842] }
function formatoDaFolha(largura: number, altura: number): string | undefined {
  const [menor, maior] = largura < altura ? [largura, altura] : [altura, largura]
  return Object.entries(MEDIDAS_ISO).find(([, [a, b]]) => Math.abs(a - menor) <= a * 0.03 && Math.abs(b - maior) <= b * 0.03)?.[0]
}
const r023: FuncaoRegra = (ctx) => {
  const pranchas = anexosDaClasse(ctx, 'prancha')
  if (pranchas.length === 0) return { resultado: 'nao-avaliavel', motivo: 'Prancha não localizada entre os anexos.', rascunho: 'Formato da prancha não verificado: prancha não localizada.', confianca: 'baixa' }
  const limitacoes = ['Presença e conteúdo do carimbo não são verificados nesta fase.', 'Só A3 (aceito) e A0 (não aceito) vêm dos exemplos do catálogo; outros formatos dependem da tabela do TR.']
  const fora: Evidencia[] = []
  const aceitos: Evidencia[] = []
  const indefinidos: string[] = []
  const usados: string[] = []
  for (const anexo of pranchas) {
    const campo = camposDe(ctx, anexo.lido.id, 'formato-folha')?.contrato
    const pagina = anexo.lido.paginas[0]
    const pelaFolha = pagina?.larguraPt && pagina.alturaPt ? formatoDaFolha(pagina.larguraPt, pagina.alturaPt) : undefined
    const declarado = campo?.estado === 'encontrado' && typeof campo.valorNormalizado === 'string' ? campo.valorNormalizado : undefined
    const formato = declarado ?? pelaFolha
    if (campo?.estado === 'encontrado') usados.push(campo.id)
    const evidencia: Evidencia = declarado && campo ? (campo.evidencias[0] ?? evidenciaDoAnexo(anexo)) : { anexoId: anexo.lido.id, sha256: anexo.lido.inspecao.sha256, pagina: 1, trecho: `Folha de ${Math.round(pagina?.larguraPt ?? 0)} × ${Math.round(pagina?.alturaPt ?? 0)} pt`, origem: 'metadado-arquivo' }
    if (!formato) {
      indefinidos.push(`${anexo.lido.id}: formato não declarado nem reconhecível pelo tamanho da folha`)
      continue
    }
    if (declarado && pelaFolha && declarado !== pelaFolha) limitacoes.push(`${anexo.lido.id}: formato declarado ${declarado}, folha do arquivo com medida de ${pelaFolha}.`)
    const situacao = FORMATOS_DO_CATALOGO[formato]
    if (situacao === 'nao-aceito') fora.push(evidencia)
    else if (situacao === 'aceito') aceitos.push(evidencia)
    else indefinidos.push(`${anexo.lido.id}: formato ${formato} fora dos exemplos do catálogo`)
  }
  if (fora.length > 0) {
    return { resultado: 'achado', tipo: 'formato-incompativel', rascunho: 'Formato de folha da prancha fora do exemplo aceito no catálogo (A0). Conferir com o TR aplicável.', evidencias: fora, camposUsados: usados, confianca: 'media', limitacoes }
  }
  if (indefinidos.length > 0) {
    return { resultado: 'nao-avaliavel', motivo: indefinidos.join('; ').slice(0, 500), rascunho: 'Formato da prancha não confrontado: a lista de formatos permitidos do TR não está disponível ao sistema.', evidencias: aceitos, camposUsados: usados, confianca: 'baixa', limitacoes }
  }
  return { resultado: 'sem-achado', rascunho: 'Prancha em A3, formato do exemplo aceito do catálogo.', evidencias: aceitos, camposUsados: usados, confianca: 'media', limitacoes }
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

