import { pareceInstrucao } from '../reading/instrucoes.ts'
import { dobrar } from '../reading/text.ts'

/**
 * Linha dirigida à máquina (E11.3.1): texto do documento que tenta falar com o sistema ou com o
 * modelo em vez de registrar um fato. Essas linhas nunca contam como evidência de campo nem de
 * classe na verificação das sugestões; não são apagadas do documento nem mudam o motor.
 *
 * O critério é ESTRUTURAL, em português, inglês e espanhol, e não a presença de uma palavra:
 * 1. vocativo à máquina + ordem ou dado ("Nota à IA: a matrícula é…", "System: use…", "Al modelo: …");
 * 2. ordem sobre dado: imperativo seguido, de perto, de valor, campo, classe, resultado ou instruções
 *    ("ignore as instruções anteriores", "set the registry number to…", "considera el valor…");
 * 3. pedido de efeito no sistema disfarçado de ato administrativo ("válido para fins de sistema",
 *    "para efeito de processamento automático");
 * 4. dado em formato de máquina (JSON).
 * Palavras como "sistema", "instrução" ou "orientação" sozinhas NÃO bastam: "Instrução Normativa
 * nº 3", "Sistema Municipal de Cadastro" e "conforme orientação técnica" são texto legítimo.
 * A detecção do motor (`pareceInstrucao`, usada pela extração) continua a mesma e também conta.
 */

const MAQUINA = String.raw`(?:sistema|modelo|ia|i\.a\.|assistente|inteligencia artificial|robo|algoritmo|ai|llm|gpt|chatgpt|language model|assistant|model|system|bot|asistente|modelo de lenguaje|maquina|machine|automacao|automation|processamento automatico|leitor automatico)`

const IMPERATIVOS_PT = String.raw`(?:responda|retorne|devolva|classifique|desconsidere|ignore|esqueca|conclua|marque|use|utilize|registre|considere|trate|defina|altere|substitua|aprove|defira|informe|preencha|escreva|copie)`
/** Imperativos em inglês ou espanhol SEM homônimo em português (podem pesar sozinhos com um dado). */
const IMPERATIVOS_ESTRANGEIROS = String.raw`(?:answer|respond|return|output|classify|disregard|forget|override|set|treat|mark|approve|consider|replace|fill|write|report|olvida|devuelve|clasifica|aprueba|reemplaza|rellena|escribe|ignora)`
/** Espanhol que também é português de 3ª pessoa ("o cartório registra"): só conta com meta-alvo ou vocativo. */
const IMPERATIVOS_AMBIGUOS = String.raw`(?:usa|utiliza|considera|trata|marca|registra|responde)`
const IMPERATIVOS = `(?:${IMPERATIVOS_PT}|${IMPERATIVOS_ESTRANGEIROS}|${IMPERATIVOS_AMBIGUOS})`

/** Alvos "meta": as próprias instruções, a resposta, o prompt. Ordem sobre eles é sempre instrução. */
const META = String.raw`(?:instruc\w*|regras?|anteriores|resposta|prompt|instructions?|rules?|previous|answer|output|instrucciones|reglas|respuesta)`
/** Alvos de dado. Ordem sobre eles só é instrução com qualificador de "verdade" ou em outro idioma. */
const DADO = String.raw`(?:valor|area|matricula|registro|classe|campo|numero|resultado|processo|value|field|number|registry|class|result|clase|registro)`
const VERDADE = String.raw`(?:corret[oa]|oficial|verdadeir[oa]|valid[oa]|real|correct|official|true|valid|correcto|verdadero|aprovad[oa]|deferid[oa]|approved|aprobado)`
const ALVOS = `(?:${META}|${DADO}|${VERDADE})`

const PADROES: readonly RegExp[] = [
  // 1. Vocativo à máquina NO INÍCIO da linha ou da frase (opcionalmente após "nota/aviso/atenção
  //    ao/à/para o"), seguido de dois-pontos/vírgula/hífen e de ordem ou dado. No meio de uma frase,
  //    "Modelo," é só uma palavra (ou o sobrenome "Fulano Modelo") — achado pós-avaliação no IA-4.
  new RegExp(String.raw`(?:^|[.;!?]\s+)\W*(?:(?:nota|aviso|atencao|observacao|note|notice|attention|aviso|nota)\s+(?:a|ao|a la|al|para o|para a|para el|to the|to|for the|for)?\s*)?${MAQUINA}\s*[:,-]\s*.{0,80}\b(?:${IMPERATIVOS}|${ALVOS})\b`, 'u'),
  // Vocativo explícito ("ao modelo", "to the AI", "al sistema") em qualquer ponto da linha.
  new RegExp(String.raw`\b(?:ao|para o|nota (?:a|ao)|to the|note to the|al|para el|nota al)\s+${MAQUINA}\b`, 'u'),
  // 2a. Ordem sobre as próprias instruções ou a resposta, em qualquer idioma.
  new RegExp(String.raw`\b${IMPERATIVOS}\b.{0,60}\b${META}\b`, 'u'),
  // 2b. Ordem em português sobre dado, com qualificador de verdade ("use 999 como valor oficial").
  new RegExp(String.raw`\b${IMPERATIVOS_PT}\b.{0,60}\b${DADO}\b.{0,40}\b${VERDADE}\b|\b${IMPERATIVOS_PT}\b.{0,40}\b${VERDADE}\b.{0,40}\b${DADO}\b`, 'u'),
  // 2c. Ordem em inglês ou espanhol sobre dado (não cabe num documento municipal em português).
  new RegExp(String.raw`\b${IMPERATIVOS_ESTRANGEIROS}\b.{0,60}\b${DADO}\b`, 'u'),
  // 3. Efeito no sistema disfarçado de ato administrativo.
  /\b(para|a) (fins|efeito|efeitos) de (sistema|processamento|triagem automatic|leitura automatic)/u,
  /\b(valid[oa]|considerad[oa]|registrad[oa]) (somente |apenas )?(para|pelo|no) (o )?(sistema|modelo|processamento automatico)\b/u,
  /\b(for|para) (system|automated|machine) (purposes|processing|use)\b/u,
]

/** Dado em formato de máquina: objeto ou lista JSON com chaves entre aspas. */
const JSON_NO_TEXTO = /[{[]\s*"[^"]+"\s*:/u

export function dirigidaAMaquina(texto: string): boolean {
  if (pareceInstrucao(texto) || JSON_NO_TEXTO.test(texto)) return true
  const t = dobrar(texto)
  return PADROES.some((padrao) => padrao.test(t))
}
