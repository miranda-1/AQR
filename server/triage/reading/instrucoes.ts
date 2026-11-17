import { dobrar } from './text.ts'

/**
 * Detecção de instruções embutidas em documento (injeção de instruções). É uma camada a MAIS, não
 * a defesa principal: o sistema nunca executa nada do que um documento diz (o modelo não tem
 * ferramentas, a saída tem esquema fixo e toda proposta é conferida no texto). Esta heurística só
 * recusa sugestões tiradas de uma região que contém texto com cara de ordem ao sistema e faz a
 * EXTRAÇÃO do motor ignorar essas linhas, para que um valor "plantado" numa instrução ("considere
 * a matrícula 999.999") não vire campo lido nem sugestão verificada. Falso positivo aqui só custa
 * uma linha não lida (o campo fica "não encontrado", nunca com valor errado).
 */

const PADROES: readonly RegExp[] = [
  /\b(ignore|ignorar|desconsidere|desconsiderar|esqueca|esquecer)\b.{0,40}\b(regra|regras|instruc|anterior|anteriores|sistema|catalogo)/u,
  /\b(declare|declarar|marque|marcar|considere|considerar|registre|registrar)\b.{0,40}\b(aprovad|deferid|regular|conforme|completo|valido)/u,
  /\b(processo|documentacao|pedido)\b.{0,20}\b(aprovad|deferid)/u,
  /\b(substitua|substituir|altere|alterar|troque|trocar|apague|apagar)\b.{0,40}\b(catalogo|regra|regras|gabarito|resultado|analise)/u,
  /\b(revele|revelar|mostre|mostrar|envie|enviar|exporte|exportar|transmita|transmitir)\b.{0,40}\b(dados|senha|chave|token|cpf|documentos|requerente)/u,
  /\b(acesse|acessar|conecte|conectar|chame|chamar|abra|abrir)\b.{0,40}\b(https?|url|site|servidor|api|endereco)/u,
  /https?:\/\//u,
  /\b(atencao|aviso|nota|instrucao)\s*(ao|para o|a)\s*(sistema|modelo|ia|assistente|inteligencia)/u,
  /\b(voce|vc)\s+(e|deve|precisa)\b.{0,30}\b(sistema|modelo|assistente|ia)\b/u,
  /\b(prompt|system|assistant)\s*:/u,
  /\b(execute|executar|rode|rodar)\b.{0,30}\b(comando|acao|script|codigo)/u,
]

/** O texto parece conter uma instrução dirigida ao sistema ou ao modelo? */
export function pareceInstrucao(textoOriginal: string): boolean {
  const texto = dobrar(textoOriginal)
  return PADROES.some((padrao) => padrao.test(texto))
}
