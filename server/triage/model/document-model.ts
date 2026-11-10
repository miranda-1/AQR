import type { ClasseDocumental, NomeCampo } from '../../../shared/contracts/triage.ts'

/**
 * Ponto de encaixe de um modelo de IA LOCAL para a triagem, previsto para uma etapa futura e que
 * depende de decisão do responsável. Nada aqui chama modelo: a única implementação é
 * `nenhumModelo`, que não propõe nada.
 *
 * Regras do encaixe, válidas para qualquer implementação futura:
 * - o modelo só PROPÕE classe documental ou valor de campo, sempre com a página e a região de
 *   onde tirou a informação; nunca cria achado, fundamento ou decisão;
 * - proposta de campo só é aceita se o valor estiver no texto lido daquela região
 *   (`propostaAncorada`); o que não confere é descartado, não "corrigido";
 * - o modelo roda no ambiente do AQR (`local: true`); documento de requerente não sai do servidor.
 */

export interface Regiao {
  x: number
  y: number
  width: number
  height: number
}

/** Texto lido de um anexo, como o modelo o recebe. */
export interface LeituraParaModelo {
  anexoId: string
  sha256: string
  paginas: { pagina: number; palavras: { texto: string; regiao: Regiao }[] }[]
}

export interface PropostaClasse {
  anexoId: string
  classe: ClasseDocumental
  /** 0–1, como informada pelo modelo. Não vira confiança do sistema sem calibração. */
  confianca: number
  pagina: number
  regioes: Regiao[]
}

export interface PropostaCampo {
  anexoId: string
  campo: NomeCampo
  valorBruto: string
  confianca: number
  pagina: number
  regioes: Regiao[]
}

export interface DocumentModel {
  readonly id: string
  /** Só modelos que rodam no ambiente do AQR podem ser usados. */
  readonly local: true
  proporClasses(leitura: LeituraParaModelo): Promise<PropostaClasse[]>
  proporCampos(leitura: LeituraParaModelo, campos: readonly NomeCampo[]): Promise<PropostaCampo[]>
}

/** Padrão desta fase: nenhum modelo, nenhuma proposta. */
export const nenhumModelo: DocumentModel = {
  id: 'nenhum',
  local: true,
  proporClasses: async () => [],
  proporCampos: async () => [],
}

function intersects(a: Regiao, b: Regiao): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

const normalizar = (texto: string) => texto.normalize('NFC').toLowerCase().replace(/\s+/gu, ' ').trim()

/**
 * A proposta de campo está no texto lido? Junta as palavras da página que tocam as regiões citadas
 * e procura o valor proposto (sem diferenciar maiúsculas nem espaços repetidos). Valor ausente da
 * região, página inexistente ou região vazia: recusada.
 */
export function propostaAncorada(proposta: PropostaCampo, leitura: LeituraParaModelo): boolean {
  if (proposta.anexoId !== leitura.anexoId || proposta.regioes.length === 0) return false
  const valor = normalizar(proposta.valorBruto)
  if (!valor) return false
  const pagina = leitura.paginas.find((item) => item.pagina === proposta.pagina)
  if (!pagina) return false
  const texto = pagina.palavras
    .filter((palavra) => proposta.regioes.some((regiao) => intersects(regiao, palavra.regiao)))
    .map((palavra) => palavra.texto)
    .join(' ')
  return normalizar(texto).includes(valor)
}
