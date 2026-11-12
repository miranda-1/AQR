import { secaoClassificacao } from './classificacao.ts'
import { secaoComparacoes, secaoExtracao } from './extracao.ts'
import { secaoExemplos, secaoRegras, tabelaResumoRegras } from './regras.ts'
import { CONJUNTOS, NOME_CONJUNTO } from './casos.ts'
import type { Avaliacao } from './run.ts'

/** Relatório em Markdown da avaliação da triagem (gerado; não editar à mão). */
/** Casos mostrados por extenso no relatório: divergência, ausência em pacote completo, pacote parcial, condição. */
const EXEMPLOS: [string, string][] = [
  ['DSD-16', 'AQR-GCA-018'],
  ['DSD-08', 'AQR-GCA-003'],
  ['DSD-46', 'AQR-GCA-002'],
  ['DSD-42', 'AQR-GCA-028'],
  ['DSD-43', 'AQR-GCA-028'],
  ['DSD-26', 'AQR-GCA-009'],
  ['DSD-23', 'AQR-GCA-016'],
  ['VAL-13', 'AQR-GCA-001'],
]

export function relatorio(avaliacao: Avaliacao): string {
  const triagens = avaliacao.executados.flatMap(({ caso, triagem }) => (triagem ? [{ caso, triagem }] : []))
  const conjuntos = (conjunto: string) => avaliacao.executados.filter((item) => item.caso.conjunto === conjunto)
  const anexos = (conjunto: string) => conjuntos(conjunto).reduce((soma, item) => soma + item.anexos.length, 0)
  const linhas = [
    '# Avaliação da triagem experimental (E4–E6)',
    '',
    '> Gerado por `npm run triagem:avaliar`. Não editar à mão. Só documentos fictícios. O catálogo não é homologado pela GCA:',
    '> os resultados medem verificações técnicas experimentais, não conformidade nem decisão administrativa.',
    '',
    `- Conjunto de desenvolvimento: ${conjuntos('desenvolvimento').length} pacotes, ${anexos('desenvolvimento')} anexos (DSD-01 a 48, usados durante a implementação).`,
    `- Conjunto de validação: ${conjuntos('validacao').length} pacotes, ${anexos('validacao')} anexos (VAL-01 a 16, escritos antes da extração e do motor, mas **usados para corrigir defeitos**: não são mais medida independente).`,
    `- Conjunto independente: ${conjuntos('independente').length} pacotes, ${anexos('independente')} anexos (IND-01 a 16, gabarito congelado antes da primeira execução, mas **usado nas correções da E6.1**; primeira execução registrada em \`avaliacao-independente-primeira-execucao.md\`).`,
    `- Segundo conjunto independente: ${conjuntos('novo').length} pacotes, ${anexos('novo')} anexos (NOV-01 a 16, gabarito congelado em \`docs/triagem/casos/novo-gabarito.json\` antes da primeira execução; **é a medida de generalização da E6.1**; primeira execução registrada em \`avaliacao-novo-primeira-execucao.md\`).`,
    `- OCR local: ${avaliacao.ocrDisponivel ? 'disponível' : '**indisponível** (páginas digitalizadas ficam sem leitura)'}.`,
    '',
    '## Resumo por conjunto',
    '',
    '| Conjunto | Anexos | Classe igual ao gabarito | Classe errada proposta | Abstenções de classe | Campos impressos | Campos certos | Valor errado aceito | Normalização errada |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...CONJUNTOS.filter((conjunto) => avaliacao.classificacao.some((item) => item.conjunto === conjunto)).map((conjunto) => {
      const classes = avaliacao.classificacao.filter((item) => item.conjunto === conjunto)
      const campos = avaliacao.extracao.filter((item) => item.conjunto === conjunto)
      return `| ${NOME_CONJUNTO[conjunto]} | ${classes.length} | ${classes.filter((item) => !item.origemErro).length} | ${classes.filter((item) => item.origemErro && item.obtido !== 'indeterminada').length} | ${classes.filter((item) => item.origemErro && item.obtido === 'indeterminada').length} | ${campos.length} | ${campos.filter((item) => item.certo).length} | ${campos.filter((item) => item.erro === 'valor-diferente').length} | ${campos.filter((item) => item.normalizacao === 'errada').length} |`
    }),
    '',
    'Regras:',
    '',
    ...tabelaResumoRegras(avaliacao.regras),
    '',
    ...secaoClassificacao(avaliacao.classificacao),
    ...secaoExtracao(avaliacao.extracao, avaliacao.extras),
    ...secaoComparacoes(avaliacao.executados),
    ...secaoRegras(avaliacao.regras, triagens),
    ...secaoExemplos(triagens, EXEMPLOS),
  ]
  return `${linhas.join('\n').trimEnd()}\n`
}
