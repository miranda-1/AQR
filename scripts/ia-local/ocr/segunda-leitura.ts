import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import type { LinhaLida } from '../../../server/triage/reading/text.ts'

/**
 * Segunda leitura independente de páginas digitalizadas (E11.3), com um mecanismo de OCR DIFERENTE
 * do motor (que usa Tesseract). Roda num processo próprio, dentro do mesmo sandbox sem rede do
 * modelo (`scripts/ia-local/sem-rede.sb`), com tempo máximo, e devolve linhas com palavras e
 * caixas no formato do AQR. A saída do processo é validada com zod: o que não couber é descartado.
 *
 * Mecanismos:
 * - `paddle`: modelos PP-OCRv5 (latino) do PaddleOCR via RapidOCR + onnxruntime, em CPU, num
 *   ambiente Python próprio (`~/.aqr-ia/ocr-paddle`), multiplataforma (serve num servidor Linux);
 * - `vision`: o OCR nativo do macOS (Vision), só no Mac, sem download.
 *
 * A imagem vai para um arquivo temporário (0600) numa pasta própria, apagada no fim.
 */

export type MecanismoOcr = 'paddle' | 'vision'

const SANDBOX = path.join(import.meta.dirname, '..', 'sem-rede.sb')
const ESTADO = process.env.AQR_IA_ESTADO ?? path.join(homedir(), '.aqr-ia')

const COMANDOS: Record<MecanismoOcr, (imagem: string) => string[]> = {
  paddle: (imagem) => [path.join(ESTADO, 'ocr-paddle', 'bin', 'python'), path.join(import.meta.dirname, 'paddle-ocr.py'), imagem],
  vision: (imagem) => [path.join(ESTADO, 'bin', 'vision-ocr'), imagem],
}

const numero01 = z.number().min(-0.05).max(1.05)
const saidaOcrSchema = z.strictObject({
  linhas: z
    .array(
      z.strictObject({
        texto: z.string().max(2000),
        confianca: z.number().min(0).max(1),
        palavras: z.array(z.strictObject({ texto: z.string().max(500), x: numero01, y: numero01, largura: numero01, altura: numero01 })).max(400),
      }),
    )
    .max(2000),
})

const limitar = (valor: number) => Math.min(1, Math.max(0, valor))

export interface ResultadoSegundaLeitura {
  mecanismo: MecanismoOcr
  linhas: LinhaLida[]
  duracaoMs: number
}

export async function segundaLeitura(png: Buffer, pagina: number, mecanismo: MecanismoOcr, timeoutMs = 60_000): Promise<ResultadoSegundaLeitura> {
  const pasta = mkdtempSync(path.join(tmpdir(), 'aqr-ocr2-'))
  const imagem = path.join(pasta, 'pagina.png')
  writeFileSync(imagem, png, { mode: 0o600 })
  const inicio = performance.now()
  try {
    const [programa, ...argumentos] = COMANDOS[mecanismo](imagem)
    if (!programa) throw new Error('mecanismo sem comando')
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile('sandbox-exec', ['-f', SANDBOX, programa, ...argumentos], { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' }, (erro, saida) => {
        if (erro) reject(new Error(`segunda leitura (${mecanismo}) falhou: ${erro.killed ? 'tempo esgotado' : `código ${String(erro.code)}`}`))
        else resolve(saida)
      })
    })
    const saida = saidaOcrSchema.parse(JSON.parse(stdout))
    const linhas: LinhaLida[] = saida.linhas
      .map((linha) => ({
        pagina,
        texto: linha.texto,
        palavras: linha.palavras.map((palavra) => ({
          texto: palavra.texto,
          origem: 'ocr' as const,
          confianca: Math.round(linha.confianca * 100),
          regiao: { x: limitar(palavra.x), y: limitar(palavra.y), width: limitar(palavra.largura), height: limitar(palavra.altura) },
        })),
      }))
      .filter((linha) => linha.palavras.length > 0)
      // Ordem de leitura: de cima para baixo.
      .sort((a, b) => (a.palavras[0]?.regiao.y ?? 0) - (b.palavras[0]?.regiao.y ?? 0))
    return { mecanismo, linhas, duracaoMs: Math.round(performance.now() - inicio) }
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}
