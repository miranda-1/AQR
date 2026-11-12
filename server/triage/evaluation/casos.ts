import type { ClasseDocumental, NomeCampo, estadosCampo } from '../../../shared/contracts/triage.ts'
import type { ExpectativaRegra, GabaritoPacote } from '../corpus/gabarito.ts'
import { gerarCorpus } from '../corpus/generate.ts'
import { gerarIndependente, type GabaritoIndependente } from '../corpus/independente.ts'
import { gerarNovo, type GabaritoNovo } from '../corpus/novo.ts'
import { gerarValidacao, type GabaritoValidacao } from '../corpus/validacao.ts'

/**
 * Os dois conjuntos de avaliação num formato só, sem mexer nos gabaritos: o de desenvolvimento
 * (DSD-01 a 48, usado durante a implementação) e o de validação (VAL-01 a 16, escrito antes da
 * extração e do motor, com outros modelos de texto).
 */

export type Conjunto = 'desenvolvimento' | 'validacao' | 'independente' | 'novo'

export const CONJUNTOS: readonly Conjunto[] = ['desenvolvimento', 'validacao', 'independente', 'novo']

/** Nome de cada conjunto no relatório. */
export const NOME_CONJUNTO: Record<Conjunto, string> = {
  desenvolvimento: 'desenvolvimento (DSD, usado na implementação)',
  validacao: 'validação usada nos ajustes (VAL)',
  independente: 'independente IND (usado nas correções da E6.1)',
  novo: 'segundo independente congelado (NOV)',
}

export interface AnexoEsperado {
  nome: string
  sha256: string
  /** `null`: o arquivo não traz documento legível (corrompido, vazio, suspeito). */
  classe: ClasseDocumental | null
  classesNoArquivo: ClasseDocumental[]
  /** Como o documento é lido de fato. */
  leitura: 'camada-de-texto' | 'ocr' | 'nao-interpretado' | 'nenhuma'
  qualidade?: 'boa' | 'ruido' | 'muito-degradada'
  campos: Partial<Record<NomeCampo, string>>
  estados: Partial<Record<NomeCampo, (typeof estadosCampo)[number]>>
  normalizados: Partial<Record<NomeCampo, string | number>>
}

export interface CasoAvaliacao {
  id: string
  conjunto: Conjunto
  titulo: string
  entrada: GabaritoPacote['entrada']
  anexos: AnexoEsperado[]
  regras: Record<string, ExpectativaRegra>
  arquivos: { nome: string; bytes: Uint8Array }[]
}

export function casoDeDesenvolvimento(gabarito: GabaritoPacote, arquivos: CasoAvaliacao['arquivos']): CasoAvaliacao {
  return {
    id: gabarito.id,
    conjunto: 'desenvolvimento',
    titulo: gabarito.titulo,
    entrada: gabarito.entrada,
    anexos: gabarito.anexos.map((anexo) => ({
      nome: anexo.nome,
      sha256: anexo.sha256,
      classe: anexo.classe,
      classesNoArquivo: anexo.classe ? [anexo.classe] : [],
      leitura: anexo.leitura,
      ...(anexo.qualidade ? { qualidade: anexo.qualidade } : {}),
      campos: anexo.campos,
      estados: {},
      normalizados: {},
    })),
    regras: gabarito.regras,
    arquivos,
  }
}

function deValidacao(gabarito: GabaritoValidacao | GabaritoIndependente | GabaritoNovo, arquivos: CasoAvaliacao['arquivos'], conjunto: Conjunto = 'validacao'): CasoAvaliacao {
  return {
    id: gabarito.id,
    conjunto,
    titulo: gabarito.titulo,
    entrada: gabarito.entrada,
    anexos: gabarito.anexos,
    regras: gabarito.regras,
    arquivos,
  }
}

export async function casosDeAvaliacao(conjuntos: readonly Conjunto[] = CONJUNTOS): Promise<CasoAvaliacao[]> {
  const casos: CasoAvaliacao[] = []
  if (conjuntos.includes('desenvolvimento')) for (const pacote of await gerarCorpus()) casos.push(casoDeDesenvolvimento(pacote.gabarito, pacote.arquivos))
  if (conjuntos.includes('validacao')) for (const pacote of await gerarValidacao()) casos.push(deValidacao(pacote.gabarito, pacote.arquivos))
  if (conjuntos.includes('independente')) for (const pacote of await gerarIndependente()) casos.push(deValidacao(pacote.gabarito, pacote.arquivos, 'independente'))
  if (conjuntos.includes('novo')) for (const pacote of await gerarNovo()) casos.push(deValidacao(pacote.gabarito, pacote.arquivos, 'novo'))
  return casos
}
