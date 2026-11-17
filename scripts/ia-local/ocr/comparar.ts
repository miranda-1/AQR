import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import { createOcrEngine } from '../../../server/documents/ocr/ocr-engine.ts'
import { openPdf } from '../../../server/documents/pdf/load.ts'
import { renderPage, scaleForWidth } from '../../../server/documents/pdf/render.ts'
import { IMOVEL_BASE, pdfDigitalizado, textoDaPeca, type Imovel, type Qualidade } from '../../../server/triage/corpus/documents.ts'
import { LIMITES_AVALIACAO } from '../../../server/triage/evaluation/run.ts'
import { triarAnexo } from '../../../server/triage/pipeline.ts'
import { dobrar, type LinhaLida } from '../../../server/triage/reading/text.ts'
import { segundaLeitura, type MecanismoOcr } from './segunda-leitura.ts'

/**
 * `npx tsx scripts/ia-local/ocr/comparar.ts`: compara o OCR do motor (Tesseract) com os candidatos
 * à segunda leitura (PaddleOCR PP-OCRv5 e Vision) em páginas digitalizadas PRÓPRIAS desta
 * comparação (fora dos conjuntos IA), em três qualidades. Mede, por mecanismo: valores de campo
 * lidos exatamente (depois de tirar espaços e pontuação), rótulos lidos, palavras com caixa e tempo.
 * Grava `docs/triagem/comparacao-ocr-e11.3.md`.
 */

const IMOVEIS: Imovel[] = [
  { ...IMOVEL_BASE, matricula: '318.204', area: '486,75 m²', inscricao: '7171.0047.015', lote: '47', quadra: '15' },
  { ...IMOVEL_BASE, matricula: '52.913', area: '1.204,30 m²', inscricao: '4020.0113.008', lote: '8', quadra: '113' },
  { ...IMOVEL_BASE, matricula: '207.661', area: '360,00 m²', inscricao: '6301.0022.019', lote: '19', quadra: '22' },
]
const PECAS = ['requerimento', 'matricula', 'ficha-cadastral', 'memorial'] as const
const QUALIDADES: Qualidade[] = ['boa', 'ruido', 'muito-degradada']
const CAMPOS = ['matricula', 'area', 'inscricao'] as const
const ROTULOS = [/\bmatricula\b/u, /\barea\b/u, /\binscricao\b/u]

/** Valor lido exatamente: os dígitos, na ordem, numa mesma linha (separadores podem variar). */
const digitos = (texto: string) => texto.replace(/\D/gu, '')

function leuValor(linhas: readonly LinhaLida[], valor: string): boolean {
  const alvo = digitos(valor)
  return linhas.some((linha) => linha.palavras.some((_, i) => digitos(linha.palavras.slice(i, i + 3).map((p) => p.texto).join(' ')).includes(alvo) && digitos(linha.palavras[i]?.texto ?? '').length > 0))
}

async function png(bytes: Uint8Array): Promise<Buffer> {
  const pdf = await openPdf(bytes, 'pagina', LIMITES_AVALIACAO.reading)
  try {
    const page = await pdf.getPage(1)
    const raster = await renderPage(page, { scale: scaleForWidth(page, 1700) })
    const canvas = createCanvas(raster.width, raster.height)
    const contexto = canvas.getContext('2d')
    const imagem = contexto.createImageData(raster.width, raster.height)
    imagem.data.set(raster.data)
    contexto.putImageData(imagem, 0, 0)
    return canvas.toBuffer('image/png')
  } finally {
    await pdf.loadingTask.destroy()
  }
}

type Mecanismo = 'tesseract (motor)' | MecanismoOcr
interface Medida { paginas: number; valores: number; valoresLidos: number; rotulos: number; rotulosLidos: number; palavrasComCaixa: number; palavras: number; tempos: number[]; falhas: number }
const vazio = (): Medida => ({ paginas: 0, valores: 0, valoresLidos: 0, rotulos: 0, rotulosLidos: 0, palavrasComCaixa: 0, palavras: 0, tempos: [], falhas: 0 })

const ocr = (await createOcrEngine()).engine
if (!ocr) throw new Error('OCR do motor indisponível')
const medidas = new Map<string, Medida>()
const medida = (mecanismo: Mecanismo, qualidade: Qualidade) => {
  const chave = `${mecanismo}|${qualidade}`
  if (!medidas.has(chave)) medidas.set(chave, vazio())
  return medidas.get(chave) as Medida
}

let seed = 7700
for (const imovel of IMOVEIS) {
  for (const peca of PECAS) {
    const texto = textoDaPeca(peca, imovel)
    const impressos = CAMPOS.filter((campo) => texto.linhas.some((linha) => linha.includes(imovel[campo])))
    const rotulos = ROTULOS.filter((rotulo) => texto.linhas.some((linha) => rotulo.test(dobrar(linha))))
    for (const qualidade of QUALIDADES) {
      seed += 1
      const bytes = await pdfDigitalizado(texto, qualidade, seed)
      const leituras: { mecanismo: Mecanismo; linhas: LinhaLida[]; ms: number }[] = []
      const t0 = performance.now()
      const anexo = await triarAnexo('anexo-1', 'p.pdf', bytes, { limites: LIMITES_AVALIACAO, ocr })
      leituras.push({ mecanismo: 'tesseract (motor)', linhas: anexo.lido.linhas, ms: Math.round(performance.now() - t0) })
      const imagem = await png(bytes)
      for (const mecanismo of ['paddle', 'vision'] as const) {
        try {
          const r = await segundaLeitura(imagem, 1, mecanismo)
          leituras.push({ mecanismo, linhas: r.linhas, ms: r.duracaoMs })
        } catch {
          medida(mecanismo, qualidade).falhas += 1
        }
      }
      for (const { mecanismo, linhas, ms } of leituras) {
        const m = medida(mecanismo, qualidade)
        m.paginas += 1
        m.tempos.push(ms)
        m.valores += impressos.length
        m.valoresLidos += impressos.filter((campo) => leuValor(linhas, imovel[campo])).length
        m.rotulos += rotulos.length
        const texto = dobrar(linhas.map((linha) => linha.texto).join('\n'))
        m.rotulosLidos += rotulos.filter((rotulo) => rotulo.test(texto)).length
        const palavras = linhas.flatMap((linha) => linha.palavras)
        m.palavras += palavras.length
        m.palavrasComCaixa += palavras.filter((p) => p.regiao && p.regiao.width > 0 && p.regiao.height > 0).length
      }
    }
  }
}
await ocr.close()

const mediana = (valores: number[]) => [...valores].sort((a, b) => a - b)[Math.floor(valores.length / 2)] ?? 0
const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : '—')
const l: string[] = ['# Comparação de OCR para a segunda leitura (E11.3)', '', '> Gerado por `npx tsx scripts/ia-local/ocr/comparar.ts`. Páginas digitalizadas sintéticas próprias desta comparação (3 imóveis × 4 peças × 3 qualidades = 36 páginas), fora dos conjuntos IA. Tudo local; PaddleOCR e Vision rodam no sandbox sem rede.', '', '"Valor lido": os dígitos do valor (matrícula, área, inscrição) aparecem na ordem certa numa mesma linha. O tempo do motor inclui a leitura do PDF inteiro; o dos outros, só o OCR da imagem já desenhada (1700 px de largura) e a partida do processo.', '']
l.push('| Mecanismo | Qualidade | Páginas | Valores lidos | Rótulos lidos | Palavras com caixa | Tempo mediano | Falhas |', '|---|---|---:|---:|---:|---:|---:|---:|')
for (const mecanismo of ['tesseract (motor)', 'paddle', 'vision'] as const) {
  for (const qualidade of QUALIDADES) {
    const m = medida(mecanismo, qualidade)
    l.push(`| ${mecanismo} | ${qualidade} | ${m.paginas} | ${pct(m.valoresLidos, m.valores)} | ${pct(m.rotulosLidos, m.rotulos)} | ${pct(m.palavrasComCaixa, m.palavras)} | ${mediana(m.tempos)} ms | ${m.falhas} |`)
  }
}
l.push('')
writeFileSync(path.resolve('docs/triagem/comparacao-ocr-e11.3.md'), `${l.join('\n')}\n`)
console.log(l.join('\n'))
