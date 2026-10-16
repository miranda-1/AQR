import { easeInOutCubic } from './timing'

/**
 * "Logo em pontinhos": amostra a forma da logo do AQR (letras e lente) em pontos, na posição
 * exata em que ela está na tela, e desenha os pontos voando dos anéis até essa forma.
 * A geometria da lente é a mesma de AqrLensSymbol (viewBox 64).
 */
export type DotTone = 'white' | 'faint' | 'yellow'

export interface DotTarget {
  x: number
  y: number
  tone: DotTone
}

export interface Dot extends DotTarget {
  fromX: number
  fromY: number
  delay: number
}

/** Amostra a logo renderizada (raiz do AqrLogo: A, lente, R) em pontos, em coordenadas da janela. */
export function sampleLogo(root: HTMLElement, step = 4): DotTarget[] {
  const box = root.getBoundingClientRect()
  const width = Math.ceil(box.width)
  const height = Math.ceil(box.height + 30)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const g = canvas.getContext('2d')
  const [letterA, lens, letterR] = Array.from(root.children)
  if (!g || !(lens instanceof SVGSVGElement)) return []

  // Letras, na fonte e na posição reais.
  for (const letter of [letterA, letterR]) {
    if (!(letter instanceof HTMLElement)) continue
    const style = getComputedStyle(letter)
    const rect = letter.getBoundingClientRect()
    g.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    g.fillStyle = '#fff'
    const metrics = g.measureText(letter.textContent)
    const ascent = metrics.actualBoundingBoxAscent
    g.fillText(letter.textContent, rect.left - box.left, rect.top - box.top + ascent + (rect.height - ascent) * 0.5)
  }

  // Lente: anel, cabo, faixa amarela e os dois traços internos.
  const lensBox = lens.getBoundingClientRect()
  const k = lensBox.width / 64
  const ox = lensBox.left - box.left
  const oy = lensBox.top - box.top
  g.strokeStyle = '#fff'
  g.lineCap = 'round'
  g.lineWidth = 7 * k
  g.beginPath()
  g.arc(ox + 27 * k, oy + 27 * k, 19 * k, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 9 * k
  g.beginPath()
  g.moveTo(ox + 40.5 * k, oy + 40.5 * k)
  g.lineTo(ox + 55 * k, oy + 55 * k)
  g.stroke()
  g.fillStyle = 'rgb(255, 204, 0)'
  g.fillRect(ox + 14 * k, oy + 19.5 * k, 26 * k, 8 * k)
  g.fillStyle = 'rgb(255, 255, 254)'
  g.fillRect(ox + 17 * k, oy + 22 * k, 20 * k, 3.5 * k)
  g.fillStyle = 'rgb(128, 128, 128)'
  g.fillRect(ox + 17 * k, oy + 30.5 * k, 13 * k, 3.5 * k)

  const data = g.getImageData(0, 0, width, height).data
  const points: DotTarget[] = []
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      if ((data[i + 3] ?? 0) <= 128) continue
      const red = data[i] ?? 0
      const blue = data[i + 2] ?? 0
      const tone: DotTone = blue < 100 ? 'yellow' : red < 200 ? 'faint' : 'white'
      points.push({ x: x + box.left, y: y + box.top, tone })
    }
  }
  return points
}

/** Dá a cada ponto uma origem num dos anéis (centrados em `center`) e um pequeno atraso aleatório. */
export function scatterFromRings(targets: DotTarget[], center: { x: number; y: number }, radii: readonly number[]): Dot[] {
  return targets.map((target) => {
    const radius = radii[Math.floor(Math.random() * radii.length)] ?? 300
    const angle = Math.random() * Math.PI * 2
    return { ...target, fromX: center.x + Math.cos(angle) * radius, fromY: center.y + Math.sin(angle) * radius, delay: Math.random() * 0.35 }
  })
}

/** Cores dos pontos no fundo "Névoa": a logo é azul, e o "branco" da amostra vira o azul institucional. */
const fills: Record<DotTone, (q: number) => string> = {
  yellow: () => 'rgba(255, 204, 0, 0.95)',
  faint: (q) => `rgba(40, 53, 135, ${0.2 + 0.2 * q})`,
  white: (q) => `rgba(40, 53, 135, ${0.35 + 0.6 * q})`,
}

/**
 * Desenha os pontos no instante `progress` (0 = nos anéis, 1 = formando a logo).
 * Pontos à esquerda de `hideLeftOf` não são desenhados (a varredura já os trocou pela logo sólida).
 */
export function drawDots(ctx: CanvasRenderingContext2D, dots: readonly Dot[], progress: number, hideLeftOf = -Infinity) {
  const { width, height } = ctx.canvas
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.restore()
  for (const dot of dots) {
    if (dot.x < hideLeftOf) continue
    const q = easeInOutCubic(Math.max(0, Math.min(1, (progress - dot.delay) / (1 - dot.delay))))
    ctx.fillStyle = fills[dot.tone](q)
    ctx.beginPath()
    ctx.arc(dot.fromX + (dot.x - dot.fromX) * q, dot.fromY + (dot.y - dot.fromY) * q, 1.7 + q * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
}
