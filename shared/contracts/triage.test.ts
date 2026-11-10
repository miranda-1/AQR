import {
  anexoSchema,
  avaliacaoRegraSchema,
  campoExtraidoSchema,
  classificacaoSchema,
  condicaoConfirmada,
  condicaoSchema,
  contemPalavraDeDecisao,
  enquadrado,
  evidenciaSchema,
  modalidadeSchema,
  processoTriagemSchema,
  revisaoSchema,
  TRIAGE_FORMAT_VERSION,
  type AvaliacaoRegra,
  type CampoExtraido,
  type ProcessoTriagem,
} from './triage.ts'

const HASH = 'a'.repeat(64)
const AGORA = '2026-11-09T12:00:00.000Z'
const evidencia = { anexoId: 'anexo-1', sha256: HASH, pagina: 1, regioes: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.05 }], origem: 'camada-de-texto' as const }
const fonte = { fonte: 'S07', url: 'https://exemplo.gov.br/tr-002.pdf', local: 'p.4 VIII', membroDoPacote: null }

function avaliacao(extra: Partial<AvaliacaoRegra> = {}): AvaliacaoRegra {
  return {
    id: 'av-1',
    regraId: 'AQR-GCA-013',
    regraVersao: '1.0-review',
    resultado: 'sem-achado',
    severidade: 'major',
    rascunho: 'Memorial em PDF localizado entre os anexos recebidos.',
    camposUsados: [],
    condicoesPendentes: [],
    evidencias: [evidencia],
    fundamentos: [fonte],
    ...extra,
  }
}

function campo(extra: Partial<CampoExtraido>): CampoExtraido {
  return { id: 'c-1', anexoId: 'anexo-1', campo: 'matricula', estado: 'encontrado', confianca: 0.9, metodo: 'padrao', evidencias: [evidencia], ...extra }
}

const issues = (result: { success: boolean; error?: { issues: { message: string }[] } }) => result.error?.issues.map((issue) => issue.message) ?? []

describe('contratos da triagem', () => {
  it('aceita só as modalidades do catálogo', () => {
    expect(modalidadeSchema.safeParse('D').success).toBe(true)
    expect(modalidadeSchema.safeParse('L5').success).toBe(false)
  })

  it('enquadramento: confirmação de servidor exige autor e data e não confirma "indeterminado"', () => {
    const schema = enquadrado(modalidadeSchema)
    expect(schema.safeParse({ valor: 'D', origem: 'declarado' }).success).toBe(true)
    expect(schema.safeParse({ valor: 'indeterminado', origem: 'proposto-sistema' }).success).toBe(true)
    expect(issues(schema.safeParse({ valor: 'D', origem: 'confirmado-servidor' }))).toContain('Confirmação de servidor exige quem confirmou e quando.')
    expect(issues(schema.safeParse({ valor: 'indeterminado', origem: 'confirmado-servidor', confirmadoPor: 's', confirmadoEm: AGORA }))).toContain(
      'Servidor confirma um valor; "indeterminado" não é confirmação.',
    )
    expect(issues(schema.safeParse({ valor: 'D', origem: 'declarado', confirmadoPor: 's' }))).toContain('Só a confirmação de servidor tem autor e data de confirmação.')
  })

  it('condição só vale confirmada por servidor', () => {
    const declarada = condicaoSchema.parse({ id: 'area-situacao-acima-2ha', valor: { valor: true, origem: 'declarado' }, evidencias: [] })
    const confirmada = condicaoSchema.parse({ id: 'area-situacao-acima-2ha', valor: { valor: false, origem: 'confirmado-servidor', confirmadoPor: 's', confirmadoEm: AGORA }, evidencias: [] })
    expect(condicaoConfirmada(declarada)).toBe('pendente')
    expect(condicaoConfirmada(confirmada)).toBe(false)
    expect(condicaoSchema.safeParse({ id: 'Área > 2ha', valor: { valor: true, origem: 'declarado' }, evidencias: [] }).success).toBe(false)
  })

  it('evidência: região precisa de página e o trecho não pode trazer CPF ou CNPJ completos', () => {
    expect(evidenciaSchema.safeParse(evidencia).success).toBe(true)
    expect(issues(evidenciaSchema.safeParse({ ...evidencia, pagina: undefined }))).toContain('Região sem página não localiza a evidência.')
    expect(issues(evidenciaSchema.safeParse({ ...evidencia, trecho: 'Titular CPF 123.456.789-09' }))).toContain(
      'O trecho da evidência traz CPF ou CNPJ sem máscara (AQR-GCA-041).',
    )
    expect(evidenciaSchema.safeParse({ ...evidencia, trecho: 'Titular CPF ***.***.***-09' }).success).toBe(true)
    expect(evidenciaSchema.safeParse({ ...evidencia, sha256: 'ABC' }).success).toBe(false)
  })

  it('campo não encontrado não tem valor: desconhecido fica desconhecido', () => {
    expect(campoExtraidoSchema.safeParse(campo({ valorBruto: '12345', valorNormalizado: '12345' })).success).toBe(true)
    expect(issues(campoExtraidoSchema.safeParse(campo({ estado: 'nao-encontrado', valorBruto: '0', evidencias: [] })))).toContain(
      'Campo não encontrado ou não aplicável não tem valor: desconhecido fica desconhecido.',
    )
    expect(campoExtraidoSchema.safeParse(campo({ estado: 'nao-encontrado', evidencias: [] })).success).toBe(true)
    expect(issues(campoExtraidoSchema.safeParse(campo({})))).toContain('Campo encontrado precisa de valor e de evidência.')
    expect(issues(campoExtraidoSchema.safeParse(campo({ estado: 'varios-valores', alternativas: ['12345'] })))).toContain('Vários valores exigem ao menos duas alternativas.')
    expect(campoExtraidoSchema.safeParse(campo({ estado: 'varios-valores', alternativas: ['12345', '12346'] })).success).toBe(true)
    expect(issues(campoExtraidoSchema.safeParse(campo({ campo: 'area', valorBruto: '2,0 ha', valorNormalizado: '2,0', unidade: 'ha' })))).toContain(
      'Unidade só acompanha valor numérico.',
    )
  })

  it('classificação proposta pelo sistema precisa de evidência; "indeterminada" não', () => {
    const base = { confianca: 'alta' as const, metodo: 'regra-lexica' as const, alternativas: [] }
    expect(issues(classificacaoSchema.safeParse({ ...base, classe: 'memorial', evidencias: [] }))).toContain('Classe proposta pelo sistema precisa de evidência.')
    expect(classificacaoSchema.safeParse({ ...base, classe: 'indeterminada', confianca: 'baixa', evidencias: [] }).success).toBe(true)
  })

  it('arquivo isolado não é lido nem classificado', () => {
    const anexo = {
      id: 'anexo-1',
      nome: 'pacote.zip',
      sha256: HASH,
      bytes: 10,
      extensao: 'zip',
      tipoReal: 'zip' as const,
      extensaoConfere: true,
      integridade: 'nao-suportado' as const,
      isolamento: { isolado: true, motivos: ['zip-caminho-perigoso' as const] },
      paginas: [],
      classificacao: { classe: 'indeterminada' as const, confianca: 'baixa' as const, metodo: 'tipo-de-arquivo' as const, evidencias: [], alternativas: [] },
    }
    expect(anexoSchema.safeParse(anexo).success).toBe(true)
    expect(issues(anexoSchema.safeParse({ ...anexo, isolamento: { isolado: true, motivos: [] } }))).toContain('Isolamento e motivos não conferem.')
    expect(issues(anexoSchema.safeParse({ ...anexo, classificacao: { ...anexo.classificacao, classe: 'memorial', evidencias: [evidencia] } }))).toContain(
      'Arquivo isolado não é lido nem classificado.',
    )
  })

  it('o alerta nunca usa palavras de decisão administrativa (AQR-GCA-040)', () => {
    for (const texto of ['Processo indeferido', 'Documentação aprovada', 'Reprovado por falta de memorial', 'Situação irregular', 'Arquivamento sugerido']) {
      expect(contemPalavraDeDecisao(texto), texto).toBe(true)
      expect(issues(avaliacaoRegraSchema.safeParse(avaliacao({ rascunho: texto })))).toContain(
        'O alerta não pode usar palavras de decisão administrativa (AQR-GCA-040).',
      )
    }
    expect(contemPalavraDeDecisao('Nenhum anexo foi classificado como memorial em PDF; servidor confere a comprovação.')).toBe(false)
  })

  it('achado precisa de tipo, evidência ou procura, e fundamento', () => {
    expect(issues(avaliacaoRegraSchema.safeParse(avaliacao({ resultado: 'achado', evidencias: [], fundamentos: [] })))).toEqual([
      'Achado precisa de tipo.',
      'Achado precisa de evidência ou do registro dos anexos procurados.',
      'Achado precisa de fundamento.',
    ])
    expect(issues(avaliacaoRegraSchema.safeParse(avaliacao({ tipo: 'divergencia' })))).toContain('Só achado tem tipo.')
  })

  it('"não localizado" só com pacote confirmado como completo', () => {
    const procura = (integridadeDoPacote: 'completo' | 'parcial' | 'desconhecida') => ({
      integridadeDoPacote,
      anexosProcurados: [{ anexoId: 'anexo-1', classe: 'prancha' }],
    })
    const naoLocalizado = (integridade: 'completo' | 'parcial' | 'desconhecida') =>
      avaliacao({
        resultado: 'achado',
        tipo: 'nao-localizado',
        evidencias: [],
        procura: procura(integridade),
        rascunho: 'Nenhum dos anexos recebidos foi classificado como memorial em PDF.',
      })
    expect(avaliacaoRegraSchema.safeParse(naoLocalizado('completo')).success).toBe(true)
    for (const integridade of ['parcial', 'desconhecida'] as const) {
      expect(issues(avaliacaoRegraSchema.safeParse(naoLocalizado(integridade)))).toContain(
        'Documento "não localizado" só pode ser apontado em pacote confirmado como completo; senão, a regra não é avaliável.',
      )
    }
    expect(
      avaliacaoRegraSchema.safeParse(avaliacao({ resultado: 'nao-avaliavel', motivo: 'Integridade do pacote não confirmada.', procura: procura('desconhecida') })).success,
    ).toBe(true)
  })

  it('condição pendente lista as condições; não avaliável e não aplicável explicam o motivo', () => {
    expect(issues(avaliacaoRegraSchema.safeParse(avaliacao({ resultado: 'condicao-pendente' })))).toContain('Condição pendente e lista de condições pendentes não conferem.')
    expect(avaliacaoRegraSchema.safeParse(avaliacao({ resultado: 'condicao-pendente', condicoesPendentes: ['area-situacao-acima-2ha'] })).success).toBe(true)
    expect(issues(avaliacaoRegraSchema.safeParse(avaliacao({ resultado: 'nao-avaliavel' })))).toContain('Regra não avaliável ou não aplicável precisa de motivo.')
  })

  it('revisão: descartar ou corrigir exige justificativa; corrigir exige os campos', () => {
    const revisao = { id: 'r-1', avaliacaoId: 'av-1', revisorId: 'conta-1', em: AGORA, justificativa: '' }
    expect(revisaoSchema.safeParse({ ...revisao, decisao: 'confirmado' }).success).toBe(true)
    expect(issues(revisaoSchema.safeParse({ ...revisao, decisao: 'descartado' }))).toContain('Descartar ou corrigir exige justificativa.')
    expect(issues(revisaoSchema.safeParse({ ...revisao, decisao: 'corrigido', justificativa: 'Lote lido errado pelo OCR' }))).toContain('Correção sem campos corrigidos.')
  })

  it('processo: só os anexos recebidos, referências internas coerentes', () => {
    const processo: ProcessoTriagem = {
      formato: TRIAGE_FORMAT_VERSION,
      id: 'proc-1',
      referencia: null,
      protocoladoEm: AGORA,
      modalidade: { valor: 'D', origem: 'declarado' },
      etapa: { valor: 'abertura', origem: 'declarado' },
      integridadeDoPacote: { valor: 'desconhecida', origem: 'proposto-sistema' },
      condicoes: [],
      catalogo: { versao: '1.0-review', sha256: HASH },
      situacao: 'recebido',
      anexos: [],
      campos: [],
      avaliacoes: [avaliacao()],
      revisoes: [],
      criadoPor: 'conta-1',
      criadoEm: AGORA,
    }
    expect(processoTriagemSchema.safeParse(processo).success).toBe(true)
    expect(issues(processoTriagemSchema.safeParse({ ...processo, campos: [campo({ valorBruto: '1', anexoId: 'outro' })] }))).toContain('Campo c-1 cita anexo inexistente.')
    expect(
      issues(processoTriagemSchema.safeParse({ ...processo, revisoes: [{ id: 'r', avaliacaoId: 'nada', revisorId: 'c', em: AGORA, decisao: 'confirmado', justificativa: '' }] })),
    ).toContain('Revisão r cita avaliação inexistente.')
  })
})
