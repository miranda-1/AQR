import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { coveredFraction, iou } from '../geometry.ts'
import type { AnalyzedPage, ExtractedLine } from '../pdf/extract.ts'
import type { OcrPage } from './ocr-engine.ts'

/** Palavra de OCR que é só ruído: confiança abaixo do mínimo, ou um sinal solto pouco confiável. */
export function isOcrNoise(text: string, confidence: number, minConfidence: number): boolean {
  if (confidence < minConfidence) return true
  return !/[\p{L}\p{N}]/u.test(text) && confidence < 80
}

/**
 * Junta as palavras do OCR às da camada de texto, sem duplicar o que o PDF já tem como texto e
 * sem as leituras que são ruído (pontos de sujeira, rabiscos lidos como letras).
 */
export function mergeOcr(page: AnalyzedPage, ocr: OcrPage, minConfidence = 0): ExtractedLine[] {
  const textWords = page.lines.flatMap((line) => line.words)
  const images = page.objects.images.map((image) => image.region)
  const overlapsText = (region: NormalizedRect) =>
    textWords.some((word) => iou(word.region, region) > 0.2 || coveredFraction(region, word.region) > 0.5)
  const ocrLines: ExtractedLine[] = []
  for (const line of ocr.lines) {
    const words = line.words
      .filter((word) => !isOcrNoise(word.text, word.confidence, minConfidence))
      .filter((word) => !overlapsText(word.region))
      .filter((word) => page.content !== 'mixed' || images.some((image) => coveredFraction(word.region, image) > 0.6))
      .map((word) => ({ text: word.text, region: word.region, source: 'ocr' as const, confidence: word.confidence }))
    if (words.length > 0) ocrLines.push({ words })
  }
  if (page.content === 'mixed') return [...page.lines, ...ocrLines]
  return [...page.lines, ...ocrLines].sort(
    (a, b) => (a.words[0]?.region.y ?? 0) - (b.words[0]?.region.y ?? 0) || (a.words[0]?.region.x ?? 0) - (b.words[0]?.region.x ?? 0),
  )
}
