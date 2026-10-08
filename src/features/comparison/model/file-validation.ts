import * as z from 'zod/mini'
import { comparisonConfig } from '@/config/comparison'
import { formatFileSize } from '@/lib/format'

export type FileValidationResult = { ok: true } | { ok: false; message: string }

const maxSizeLabel = formatFileSize(comparisonConfig.maxFileSizeBytes)

/** Regras verificáveis pelos metadados do arquivo, sem lê-lo. */
export const pdfFileMetadataSchema = z.object({
  name: z.string().check(
    z.refine((name) => name.toLowerCase().endsWith('.pdf'), { error: 'O arquivo precisa ser um PDF (extensão .pdf).' }),
  ),
  type: z.string().check(
    z.refine((type) => type === '' || type === 'application/pdf', { error: 'O arquivo precisa ser um PDF.' }),
  ),
  size: z.number().check(
    z.positive({ error: 'O arquivo está vazio.' }),
    z.maximum(comparisonConfig.maxFileSizeBytes, { error: `O arquivo excede o limite de ${maxSizeLabel}.` }),
  ),
})

async function readSignature(file: Blob, length: number): Promise<string> {
  const buffer = await file.slice(0, length).arrayBuffer()
  return String.fromCharCode(...new Uint8Array(buffer))
}

/**
 * Validação local, feita no navegador. Nenhum conteúdo é enviado a servidores.
 * Lê apenas os 5 primeiros bytes para confirmar a assinatura de PDF.
 */
export async function validatePdfFile(file: File): Promise<FileValidationResult> {
  const parsed = pdfFileMetadataSchema.safeParse({ name: file.name, type: file.type, size: file.size })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Arquivo inválido.' }
  }

  try {
    const signature = await readSignature(file, comparisonConfig.pdfSignature.length)
    if (signature !== comparisonConfig.pdfSignature) {
      return { ok: false, message: 'O conteúdo do arquivo não corresponde a um PDF válido.' }
    }
  } catch {
    return { ok: false, message: 'Não foi possível ler o arquivo. Verifique se ele está acessível e tente novamente.' }
  }

  return { ok: true }
}
