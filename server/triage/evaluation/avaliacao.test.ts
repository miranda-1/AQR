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

  it('gera o relatório com métricas por classe e as divergências', () => {
    const texto = relatorio(avaliacao)
    expect(texto).toContain('## E4: classificação documental')
    expect(texto).toContain('Matriz de confusão')
    expect(texto).toContain('DSD-28/matricula.pdf')
  })
})
