import { secaoClassificacao } from './classificacao.ts'
import { secaoComparacoes, secaoExtracao } from './extracao.ts'
import { secaoExemplos, secaoRegras } from './regras.ts'
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
    `- Conjunto de validação: ${conjuntos('validacao').length} pacotes, ${anexos('validacao')} anexos (VAL-01 a 16, escritos antes da extração e do motor, com outros modelos de texto).`,
    `- OCR local: ${avaliacao.ocrDisponivel ? 'disponível' : '**indisponível** (páginas digitalizadas ficam sem leitura)'}.`,
    '',
    ...secaoClassificacao(avaliacao.classificacao),
    ...secaoExtracao(avaliacao.extracao, avaliacao.extras),
    ...secaoComparacoes(avaliacao.executados),
    ...secaoRegras(avaliacao.regras, triagens),
    ...secaoExemplos(triagens, EXEMPLOS),
  ]
  return `${linhas.join('\n').trimEnd()}\n`
}
