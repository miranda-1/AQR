import { easeInOutCubic, sleep, tween } from './timing'

/**
 * Entrada depois do login (decisões do responsável em 15/10/2026; referência em
 * docs/propostas-login/login-entrada-final.html):
 * 1. as folhas "Original" e "Atualizado" ficam lado a lado e a linha amarela desce pela página inteira,
 *    acendendo as diferenças, que viram etiquetas numa lista entre as folhas;
 * 2. "corte limpo": a linha sobe apagando os PDFs e revelando a saudação, e desce trocando-a pela logo.
 * Depois disso, a logo voa até o cabeçalho (EntryHandoff). Só usa transform, opacity e clip-path.
 */
export interface ScanEntryElements {
  /** Pilha do login: as duas folhas (`.login-sheet`) e o cartão. */
  stack: HTMLElement
  /** Camada abaixo do cartão, apagada pela linha na subida. */
  docsLayer: HTMLElement
  /** Onde ficam as cópias soltas das folhas. */
  copies: HTMLElement
  listTitle: HTMLElement
  /** Etiquetas da lista, uma por diferença ([data-row]). */
  chips: readonly HTMLElement[]
  scan: HTMLElement
  /** Camadas de tela inteira, recortadas pela linha. */
  greetingLayer: HTMLElement
  greetingText: HTMLElement
  logoLayer: HTMLElement
  logo: HTMLElement
  name: HTMLElement
}

const EASE = 'cubic-bezier(.6, 0, .2, 1)'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const centerY = (element: Element) => {
  const rect = element.getBoundingClientRect()
  return rect.top + rect.height / 2
}

async function play(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions, signal: AbortSignal) {
  const animation = element.animate(frames, { fill: 'forwards', easing: EASE, ...options })
  const cancel = () => animation.cancel()
  signal.addEventListener('abort', cancel, { once: true })
  try {
    await animation.finished
  } catch {
    // Cancelada: o AbortError abaixo encerra a sequência.
  }
  signal.removeEventListener('abort', cancel)
  if (signal.aborted) throw new DOMException('Animação cancelada', 'AbortError')
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** Troca as folhas do login por cópias soltas, na mesma posição, que a entrada pode mover. */
function cloneSheets(stack: HTMLElement, copies: HTMLElement) {
  const rect = stack.getBoundingClientRect()
  const box: Box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  const clone = (version: 'original' | 'updated') => {
    const sheet = stack.querySelector<HTMLElement>(`.login-sheet[data-version="${version}"]`)
    if (!sheet) throw new Error(`Folha "${version}" não encontrada`)
    const copy = sheet.cloneNode(true) as HTMLElement
    copy.classList.remove('is-back', 'is-front')
    copy.classList.add('is-copy')
    Object.assign(copy.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
      transform: getComputedStyle(sheet).transform,
    })
    copies.append(copy)
    sheet.style.visibility = 'hidden'
    return copy
  }
  // O atualizado fica atrás, como no login.
  const updated = clone('updated')
  const original = clone('original')
  return { box, original, updated }
}

/** Transformação que põe o centro da folha em (cx, cy) com escala s (a origem é o pé da folha). */
function placeSheet(box: Box, cx: number, cy: number, s: number) {
  const tx = cx - (box.left + box.width / 2)
  const ty = cy - (box.top + box.height - (s * box.height) / 2)
  return `translate(${tx}px, ${ty}px) scale(${s})`
}

export async function playScanEntry(el: ScanEntryElements, signal: AbortSignal): Promise<void> {
  const W = window.innerWidth
  const H = window.innerHeight
  const { box, original, updated } = cloneSheets(el.stack, el.copies)
  const sheets = [original, updated]

  // 1) As folhas ficam lado a lado, de pé; os destaques se apagam para a varredura acendê-los de novo.
  sheets.forEach((sheet) => sheet.classList.add('is-scanning'))
  const gap = Math.min(200, W * 0.26)
  const s = Math.min(1, (H * 0.56) / box.height, (W - gap - 48) / 2 / box.width)
  const dx = (s * box.width + gap) / 2
  const cy = H / 2 - 50
  await Promise.all([
    play(original, [{ transform: getComputedStyle(original).transform }, { transform: placeSheet(box, W / 2 - dx, cy, s) }], { duration: 850 }, signal),
    play(updated, [{ transform: getComputedStyle(updated).transform }, { transform: placeSheet(box, W / 2 + dx, cy, s) }], { duration: 850 }, signal),
  ])

  // 2) A linha desce pela página inteira; cada diferença encontrada vira uma etiqueta na lista do meio.
  const left = original.getBoundingClientRect()
  const right = updated.getBoundingClientRect()
  const listTop = left.top + 74 * s
  Object.assign(el.listTitle.style, { left: `${W / 2}px`, top: `${listTop - 34}px` })
  void play(el.listTitle, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 }, signal).catch(() => {})

  const scan = el.scan
  const x0 = left.left - 18
  const x1 = right.right + 18
  const y0 = left.top + 6
  const y1 = left.bottom - 6
  Object.assign(scan.style, { left: `${x0}px`, width: `${x1 - x0}px`, top: `${y0}px` })
  await play(scan, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 }, signal)

  const lines = sheets.flatMap((sheet) => Array.from(sheet.querySelectorAll<HTMLElement>('.login-doc-line:not(.is-title)')))
  const shownChips = new Set<string>()
  const showChip = (line: HTMLElement) => {
    const row = line.dataset.row ?? ''
    const chip = el.chips.find((candidate) => candidate.dataset.row === row)
    if (!chip || shownChips.has(row)) return
    const slot = el.chips.indexOf(chip)
    const badge = line.querySelector('.login-doc-badge')?.getBoundingClientRect()
    const x = W / 2
    const y = listTop + slot * 34
    Object.assign(chip.style, { left: `${x}px`, top: `${y}px` })
    shownChips.add(row)
    const fromX = badge ? badge.left + badge.width / 2 - x : 0
    const fromY = badge ? badge.top + badge.height / 2 - y : 0
    void play(
      chip,
      [
        { transform: `translate(calc(-50% + ${fromX}px), calc(-50% + ${fromY}px)) scale(.3)`, opacity: 0.4 },
        { transform: 'translate(-50%, -50%)', opacity: 1 },
      ],
      { duration: 650, easing: 'cubic-bezier(.3, 1.3, .5, 1)' },
      signal,
    ).catch(() => {})
  }
  await tween(
    2600,
    (p) => {
      const y = lerp(y0, y1, p)
      scan.style.top = `${y}px`
      for (const line of lines) {
        if (line.classList.contains('is-read') || centerY(line) > y) continue
        line.classList.add('is-read')
        if (line.dataset.kind) {
          line.classList.add('is-found')
          showChip(line)
        }
      }
    },
    signal,
  )
  await sleep(700, signal)

  // 3) A saudação fica na altura da logo; a linha sobe apagando os PDFs e revelando-a.
  const logoBox = el.logo.getBoundingClientRect()
  const textBox = el.greetingText.getBoundingClientRect()
  el.greetingText.style.transform = `translateY(${logoBox.top + logoBox.height / 2 - (textBox.top + textBox.height / 2)}px)`
  const top = left.top - 24
  await tween(
    1100,
    (p) => {
      const y = lerp(y1, top, easeInOutCubic(p))
      scan.style.top = `${y}px`
      el.docsLayer.style.clipPath = `inset(0 0 ${H - y}px 0)`
      el.greetingLayer.style.clipPath = `inset(${y}px 0 0 0)`
    },
    signal,
  )
  await sleep(700, signal)

  // 4) A linha desce trocando a saudação pelo AQR.
  const bounds = [el.greetingText, el.logo, el.name].map((element) => element.getBoundingClientRect())
  const bottom = Math.max(...bounds.map((rect) => rect.bottom)) + 28
  await tween(
    1100,
    (p) => {
      const y = lerp(top, bottom, easeInOutCubic(p))
      scan.style.top = `${y}px`
      el.logoLayer.style.clipPath = `inset(0 0 ${H - y}px 0)`
      el.greetingLayer.style.clipPath = `inset(${y}px 0 0 0)`
    },
    signal,
  )
  await play(scan, [{ opacity: 1 }, { opacity: 0 }], { duration: 320 }, signal)
  await sleep(1400, signal)
}
