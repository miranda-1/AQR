import { anexoSchema } from '../../../shared/contracts/triage.ts'
import { INDETERMINADA } from './classificacao.ts'
import { relatorio } from './report.ts'
import { avaliar, type Avaliacao } from './run.ts'

/**
 * Avaliação integrada sobre os conjuntos sintéticos (desenvolvimento e validação), com OCR local.
 * Os limiares são guardas de regressão do que foi medido, não metas: um erro novo faz o teste
 * falhar e precisa de explicação, nunca de ajuste do gabarito.
 */

let avaliacao: Avaliacao
beforeAll(async () => {
  avaliacao = await avaliar()
}, 600_000)

describe('avaliação integrada da triagem', () => {
  it('roda com OCR local e todo anexo sai no formato do contrato', () => {
    expect(avaliacao.ocrDisponivel).toBe(true)
    for (const { anexos } of avaliacao.executados) for (const anexo of anexos) expect(anexoSchema.safeParse(anexo.contrato).success).toBe(true)
  })

  describe('E4: classificação', () => {
    it('nunca propõe classe errada: o que não acerta, deixa indeterminado', () => {
      const erradas = avaliacao.classificacao.filter((item) => item.origemErro && item.obtido !== INDETERMINADA)
      expect(erradas).toEqual([])
    })

    it('desenvolvimento: só abstém nas matrículas digitalizadas com OCR fraco', () => {
      const erros = avaliacao.classificacao.filter((item) => item.conjunto === 'desenvolvimento' && item.origemErro)
      expect(erros.map((item) => `${item.caso}/${item.anexo}:${item.origemErro}`)).toEqual(['DSD-28/matricula.pdf:leitura-ocr', 'DSD-29/matricula.pdf:leitura-ocr'])
    })

    it('validação: abstém só na declaração genérica (classe "outro" sem sinal próprio) e nota o arquivo composto', () => {
      const erros = avaliacao.classificacao.filter((item) => item.conjunto === 'validacao' && item.origemErro)
      expect(erros.map((item) => `${item.caso}/${item.anexo}`)).toEqual(['VAL-05/rrt.pdf'])
      const composto = avaliacao.classificacao.find((item) => item.caso === 'VAL-02' && item.anexo === 'documentos.pdf')
      expect(composto?.composto).toEqual({ esperado: ['requerimento', 'drt-01'], notado: true, classesNotadas: ['requerimento', 'drt-01'] })
    })

    it('rotação: a matrícula em JPG girado é lida na orientação certa', () => {
      const girado = avaliacao.executados.find((item) => item.caso.id === 'DSD-30')?.anexos.find((anexo) => anexo.lido.nome === 'matricula.jpg')
      expect(girado?.lido.paginas[0]?.rotacao).toBe(270)
      expect(girado?.classificacao.contrato.classe).toBe('matricula-transcricao')
    })
  })

  describe('E5: extração', () => {
    it('nenhum valor diferente do impresso passa por encontrado; normalização e evidência sempre certas', () => {
      expect(avaliacao.extracao.filter((item) => item.erro === 'valor-diferente')).toEqual([])
      expect(avaliacao.extracao.filter((item) => item.normalizacao === 'errada')).toEqual([])
      expect(avaliacao.extracao.filter((item) => item.evidencia === 'nao-ancorada')).toEqual([])
    })

    it('todo campo com valor tem evidência com o hash do anexo', () => {
      for (const { anexos } of avaliacao.executados) {
        for (const anexo of anexos) {
          for (const { contrato } of anexo.campos) {
            if (contrato.valorBruto === undefined && contrato.estado !== 'varios-valores') continue
            expect(contrato.evidencias.length).toBeGreaterThan(0)
            expect(contrato.evidencias.every((evidencia) => evidencia.sha256 === anexo.lido.inspecao.sha256)).toBe(true)
          }
        }
      }
    })

    it('desenvolvimento: os erros restantes vêm da classificação ou do OCR, não dos padrões', () => {
      const erros = avaliacao.extracao.filter((item) => item.conjunto === 'desenvolvimento' && !item.certo)
      expect(erros.filter((item) => item.origem === 'extracao')).toEqual([])
    })

    it('validação: os erros de padrão restantes são os rótulos fora do vocabulário, deixados como limitação', () => {
      const erros = avaliacao.extracao.filter((item) => item.conjunto === 'validacao' && item.origem === 'extracao')
      const tipos = new Set(erros.map((item) => `${item.anexo}:${item.campo}`))
      expect([...tipos].sort()).toEqual(['certidao.pdf:parcelamento', 'planta.pdf:area', 'req.pdf:assunto'])
    })
  })

  describe('E6: motor de regras', () => {
    it('desenvolvimento: todo resultado é um dos aceitos pelo gabarito', () => {
      expect(avaliacao.regras.filter((item) => item.conjunto === 'desenvolvimento' && !item.certo)).toEqual([])
    })

    it('validação: o único erro é o falso alerta da 001 por rótulo de assunto fora do vocabulário (VAL-13)', () => {
      const erros = avaliacao.regras.filter((item) => item.conjunto === 'validacao' && !item.certo)
      expect(erros.map((item) => `${item.caso}:${item.regraId}:${item.erro}:${item.origem}`)).toEqual(['VAL-13:AQR-GCA-001:falso-alerta:extracao'])
    })

    it('toda evidência de achado aponta para anexo e página do pacote e ancora os valores conflitantes', () => {
      expect(avaliacao.regras.filter((item) => item.obtido === 'achado' && item.evidencia !== 'correta')).toEqual([])
    })

    it('nenhum "não localizado" fora de pacote completo; 028 nunca acha sem condição confirmada', () => {
      for (const { caso, triagem } of avaliacao.executados) {
        const avaliacoes = triagem?.avaliacoes ?? []
        if (caso.entrada.integridadeDoPacote !== 'completo') expect(avaliacoes.filter((item) => item.contrato.tipo === 'nao-localizado')).toEqual([])
        const gdu = avaliacoes.find((item) => item.contrato.regraId === 'AQR-GCA-028')
        if (!caso.entrada.condicoesConfirmadas.some((condicao) => condicao.id === 'area-situacao-acima-2ha')) expect(gdu?.contrato.resultado).toBe('condicao-pendente')
      }
    })

    it('todo resultado de pacote é verificação experimental, sem decisão e sem comunicação', () => {
      for (const { triagem } of avaliacao.executados) {
        expect(triagem?.natureza).toBe('verificacao-tecnica-experimental')
        expect(triagem?.decisaoAdministrativa).toBeNull()
        expect(triagem?.comunicacaoAoRequerente).toBe('bloqueada')
      }
    })
  })

  it('gera o relatório com métricas por classe e as divergências', () => {
    const texto = relatorio(avaliacao)
    expect(texto).toContain('## E4: classificação documental')
    expect(texto).toContain('Matriz de confusão')
    expect(texto).toContain('DSD-28/matricula.pdf')
    expect(texto).toContain('## E5: extração e normalização de campos')
    expect(texto).toContain('### Comparação interdocumental')
    expect(texto).toContain('## E6: motor de regras')
    expect(texto).toContain('## Exemplos de triagem')
  })
})
