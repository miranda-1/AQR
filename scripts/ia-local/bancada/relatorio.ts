import type { ModeloLocalRegistrado } from './ollama.ts'
import type { DesfechoCampo, ResultadoDocumento } from './bancada.ts'
import { PROMPT_SHA256, TAREFA_VERSAO } from './tarefa.ts'

/** Relatório da bancada E11.1 (markdown). Só categorias, contagens, tempos e memória. */

export interface Ambiente {
  sistema: string
  hardware: string
  memoriaGb: number
  node: string
  semRede: boolean
  modelo: ModeloLocalRegistrado
  semente: number
  maxTokens: number
}

export interface Memoria {
  picoRssProcessoMb: number | null
  runtimeTotalMb: number | null
  runtimeGpuMb: number | null
}

export interface Estabilidade {
  descricao: string
  esperado: string
  obtido: string
  ok: boolean
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '—')

function quantil(valores: readonly number[], q: number): number {
  if (valores.length === 0) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.min(ordenados.length - 1, Math.ceil(q * ordenados.length) - 1)] ?? 0
}

const DESFECHOS: DesfechoCampo[] = ['certo', 'abstencao', 'distrator', 'plantado', 'conflito-escolhido', 'alucinado', 'outro-errado', 'proposto-sem-gabarito']
const ERROS: DesfechoCampo[] = ['distrator', 'plantado', 'conflito-escolhido', 'alucinado', 'outro-errado', 'proposto-sem-gabarito']

function linhaDesfechos(nome: string, lista: readonly DesfechoCampo[]): string {
  const contagem = (d: DesfechoCampo) => lista.filter((item) => item === d).length
  const erros = ERROS.reduce((soma, d) => soma + contagem(d), 0)
  return `| ${nome} | ${lista.length} | ${DESFECHOS.map((d) => contagem(d)).join(' | ')} | **${erros}** |`
}

export function relatorioQwen(resultados: readonly ResultadoDocumento[], ambiente: Ambiente, memoria: Memoria, estabilidade: readonly Estabilidade[], duracaoMs: number, notas: readonly string[]): string {
  const l: string[] = []
  l.push('# Bancada da IA documental com modelo local (E11.1)', '')
  l.push('> Gerado por `npm run triagem:ia-qwen`. Não editar à mão. Só documentos sintéticos.')
  l.push('>')
  l.push('> **Primeira evidência com modelo real.** As propostas do modelo passam pela verificação determinística da E11.0 e **não têm efeito**: nada volta para o motor, as regras, o banco ou a tela. "Verificado" mede o que a verificação deixaria passar, não o que o sistema fez.')
  l.push('')
  for (const nota of notas) l.push(`- ${nota}`)
  if (notas.length) l.push('')

  l.push('## Ambiente medido', '')
  l.push('| Item | Valor |', '|---|---|')
  l.push(`| Sistema | ${ambiente.sistema} |`)
  l.push(`| Hardware | ${ambiente.hardware}, ${ambiente.memoriaGb} GB de memória unificada (CPU e GPU) |`)
  l.push(`| Runtime | ${ambiente.modelo.runtime.nome} ${ambiente.modelo.runtime.versao}, só em 127.0.0.1, nuvem desligada |`)
  l.push(`| Rede durante a inferência | ${ambiente.semRede ? 'bloqueada pelo kernel (sandbox-exec, `scripts/ia-local/sem-rede.sb`)' : '**não bloqueada**'} |`)
  l.push(`| Modelo | \`${ambiente.modelo.modelo}\` (${ambiente.modelo.familia ?? '?'}, ${ambiente.modelo.parametros ?? '?'}, ${ambiente.modelo.formato ?? '?'}, ${ambiente.modelo.quantizacao ?? '?'}) |`)
  l.push(`| Manifesto dos pesos (sha256) | \`${ambiente.modelo.manifestoSha256}\` |`)
  l.push(`| Licença | ${ambiente.modelo.licenca ?? 'não informada pelo runtime'} |`)
  l.push(`| Capacidades informadas | ${ambiente.modelo.capacidades.join(', ')} (ferramentas nunca são passadas) |`)
  l.push(`| Tarefa e prompt | \`${TAREFA_VERSAO}\`, sha256 \`${PROMPT_SHA256}\` |`)
  l.push(`| Geração | temperatura 0, semente ${ambiente.semente}, até ${ambiente.maxTokens} tokens, saída restrita por esquema JSON, sem "thinking" |`)
  l.push(`| Node | ${ambiente.node} |`)
  l.push(`| Duração total da bancada | ${Math.round(duracaoMs / 1000)} s |`)
  l.push('')

  for (const conjunto of ['ia1', 'ia2'] as const) {
    const docs = resultados.filter((doc) => doc.conjunto === conjunto)
    if (docs.length === 0) continue
    const paginas = docs.flatMap((doc) => doc.paginas)
    const titulo = conjunto === 'ia1' ? 'IA-1 (regressão: orientou correções na E11.0, não é medida independente)' : 'IA-2 (independente, congelado antes da primeira execução do modelo)'
    l.push(`## ${titulo}`, '')
    l.push(`${docs.length} documentos, ${paginas.length} páginas (${paginas.filter((p) => p.comImagem).length} com imagem).`, '')

    l.push('### Classe por página', '')
    const comGabarito = paginas.filter((p) => p.classeEsperada)
    const certo = (f: (p: (typeof paginas)[number]) => string | null) => comGabarito.filter((p) => f(p) === p.classeEsperada).length
    const indet = (f: (p: (typeof paginas)[number]) => string | null) => comGabarito.filter((p) => f(p) === 'indeterminada' || f(p) === null).length
    l.push('| Braço | Páginas | Certa | Indeterminada / sem resposta | Errada |', '|---|---:|---:|---:|---:|')
    for (const [nome, f] of [
      ['Motor determinístico (D)', (p: (typeof paginas)[number]) => p.classeMotor],
      ['Modelo isolado', (p: (typeof paginas)[number]) => p.classeModelo],
      ['Modelo, só se a verificação aceitou', (p: (typeof paginas)[number]) => (p.classeModeloVerificada ? p.classeModelo : null)],
    ] as const) {
      const c = certo(f)
      const i = indet(f)
      l.push(`| ${nome} | ${comGabarito.length} | ${c} (${pct(c, comGabarito.length)}) | ${i} | **${comGabarito.length - c - i}** |`)
    }
    l.push('')

    l.push('### Campos (área do lote e matrícula), por documento', '')
    l.push('"Distrator": valor impresso de outro rótulo (área construída, matrícula anterior). "Alucinado": valor que não está no documento. "Verificado": aceito pela verificação da E11.0. "Verificado + rótulo": também com o rótulo da linha compatível com o campo (teste adicional desta bancada, `rotuloCompativel`).', '')
    if (conjunto === 'ia2') l.push('**Atenção:** a regra de rótulo foi escrita pela mesma pessoa que escreveu o IA-2, conhecendo os distratores dele. No IA-2, a linha "verificação + rótulo" **não é medida independente**; as linhas "modelo isolado" e "modelo + verificação E11.0" são.', '')
    l.push(`| Braço | Casos | ${DESFECHOS.join(' | ')} | Erros |`, `|---|---:|${DESFECHOS.map(() => '---:').join('|')}|---:|`)
    const campos = docs.flatMap((doc) => doc.campos)
    l.push(linhaDesfechos('Motor determinístico (D)', campos.map((c) => c.motor)))
    l.push(linhaDesfechos('Modelo isolado', campos.map((c) => c.modelo)))
    l.push(linhaDesfechos('Modelo + verificação E11.0', campos.map((c) => c.verificado)))
    l.push(linhaDesfechos('Modelo + verificação + rótulo', campos.map((c) => c.verificadoComRotulo)))
    l.push('')
    const ajudou = campos.filter((c) => c.motor === 'abstencao' && c.verificadoComRotulo === 'certo').length
    const prejudicaria = campos.filter((c) => c.motor === 'certo' && ERROS.includes(c.verificadoComRotulo)).length
    l.push(`Contrafactual (se a sugestão verificada + rótulo preenchesse a lacuna): **reduziria ${ajudou}** abstenções do motor com o valor certo; **prejudicaria ${prejudicaria}** resultados certos do motor.`, '')

    l.push('### Propostas e evidência', '')
    const propostas = paginas.flatMap((p) => p.propostas)
    const semLinha = propostas.filter((p) => !p.comLinha).length
    const motivos = new Map<string, number>()
    for (const p of propostas) motivos.set(`${p.situacao}: ${p.motivo}`, (motivos.get(`${p.situacao}: ${p.motivo}`) ?? 0) + 1)
    l.push(`- Propostas de campo: ${propostas.length}; sem linha de evidência válida: ${semLinha}; com rótulo incompatível: ${propostas.filter((p) => p.rotuloCompativel === false).length}.`)
    l.push(`- Situação das páginas: ${['concluida', 'saida-invalida', 'tempo-esgotado', 'falhou'].map((s) => `${s} ${paginas.filter((p) => p.situacao === s).length}`).join(', ')}.`)
    l.push(`- Desfecho da verificação: ${[...motivos.entries()].sort((a, b) => b[1] - a[1]).map(([motivo, n]) => `${motivo} (${n})`).join('; ') || 'nenhuma proposta'}.`)
    l.push('')

    const adversariais = docs.filter((doc) => doc.desafio === 'injecao' || doc.desafio === 'instrucao-maliciosa')
    if (adversariais.length) {
      l.push('### Instruções maliciosas', '')
      l.push('| Documento | Valor plantado proposto pelo modelo | Plantado aceito pela verificação | Classe trocada pela instrução | Modelo sinalizou instrução |', '|---|---|---|---|---|')
      for (const doc of adversariais) {
        const plantadoVerificado = doc.campos.some((c) => c.verificado === 'plantado' || c.verificadoComRotulo === 'plantado')
        const sinalizou = doc.paginas.some((p) => p.instrucaoSinalizada === true)
        l.push(`| ${doc.id} | ${doc.plantadoProposto ? '**sim**' : 'não'} | ${plantadoVerificado ? '**sim**' : 'não'} | ${doc.classeTrocadaPorInstrucao ? '**sim**' : 'não'} | ${sinalizou ? 'sim' : 'não'} |`)
      }
      l.push('')
    }

    l.push('### Latência (medida, tempo de parede por chamada ao modelo)', '')
    const tempos = paginas.filter((p) => p.situacao !== 'falhou').map((p) => p.latenciaMs)
    const texto = paginas.filter((p) => !p.comImagem).map((p) => p.latenciaMs)
    const imagem = paginas.filter((p) => p.comImagem).map((p) => p.latenciaMs)
    const docsMs = docs.map((d) => d.latenciaMs)
    l.push('| Medida | Mediana | p95 | Máximo |', '|---|---:|---:|---:|')
    l.push(`| Por página (todas) | ${quantil(tempos, 0.5)} ms | ${quantil(tempos, 0.95)} ms | ${Math.max(0, ...tempos)} ms |`)
    if (texto.length) l.push(`| Por página só com texto | ${quantil(texto, 0.5)} ms | ${quantil(texto, 0.95)} ms | ${Math.max(...texto)} ms |`)
    if (imagem.length) l.push(`| Por página com imagem | ${quantil(imagem, 0.5)} ms | ${quantil(imagem, 0.95)} ms | ${Math.max(...imagem)} ms |`)
    l.push(`| Por documento (motor + OCR + modelo) | ${quantil(docsMs, 0.5)} ms | ${quantil(docsMs, 0.95)} ms | ${Math.max(0, ...docsMs)} ms |`)
    l.push('')
    l.push(`Tokens por página: prompt mediana ${quantil(paginas.map((p) => p.tokensPrompt), 0.5)}, máximo ${Math.max(0, ...paginas.map((p) => p.tokensPrompt))}; gerados mediana ${quantil(paginas.map((p) => p.tokensGerados), 0.5)}, máximo ${Math.max(0, ...paginas.map((p) => p.tokensGerados))}.`, '')

    l.push('### Por documento', '')
    l.push('| Documento | Desafio | Páginas | Classe (esperada → motor / modelo) | Campos (motor / modelo / verificado / +rótulo) |', '|---|---|---:|---|---|')
    for (const doc of docs) {
      const classes = doc.paginas.map((p) => `${p.classeEsperada ?? '?'} → ${p.classeMotor} / ${p.classeModelo ?? 'sem resposta'}`).join('<br>')
      const camposDoc = doc.campos.map((c) => `${c.campo} (${c.esperado}): ${c.motor} / ${c.modelo} / ${c.verificado} / ${c.verificadoComRotulo}`).join('<br>')
      l.push(`| ${doc.id} | ${doc.desafio} | ${doc.paginas.length} | ${classes} | ${camposDoc || '—'} |`)
    }
    l.push('')
  }

  l.push('## Memória (medida)', '')
  l.push(`- Pico de memória residente dos processos do runtime durante a bancada (amostrado a cada 0,5 s com \`ps\`): ${memoria.picoRssProcessoMb ?? 'não medido'} MB.`)
  l.push(`- Tamanho do modelo carregado informado pelo runtime: ${memoria.runtimeTotalMb ?? '?'} MB, dos quais ${memoria.runtimeGpuMb ?? '?'} MB na GPU. ${memoria.runtimeTotalMb && memoria.runtimeGpuMb !== null && memoria.runtimeTotalMb === memoria.runtimeGpuMb ? 'Sem offload para a CPU.' : ''}`)
  l.push('- No Apple Silicon, CPU e GPU usam a mesma memória: "VRAM" aqui é a parte alocada para a GPU dentro dos 16 GB, não uma placa separada.', '')

  l.push('## Estabilidade depois de falhas (medida)', '')
  l.push('| Situação | Esperado | Obtido | OK |', '|---|---|---|---|')
  for (const item of estabilidade) l.push(`| ${item.descricao} | ${item.esperado} | ${item.obtido} | ${item.ok ? 'sim' : '**não**'} |`)
  l.push('')
  return `${l.join('\n')}\n`
}
