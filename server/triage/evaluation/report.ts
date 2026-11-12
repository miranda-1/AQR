import { secaoClassificacao } from './classificacao.ts'
import { secaoComparacoes, secaoExtracao } from './extracao.ts'
import type { Avaliacao } from './run.ts'

/** Relatório em Markdown da avaliação da triagem (gerado; não editar à mão). */
export function relatorio(avaliacao: Avaliacao): string {
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
  ]
  return `${linhas.join('\n').trimEnd()}\n`
}
