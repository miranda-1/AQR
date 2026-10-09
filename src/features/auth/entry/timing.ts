/** Utilitários de tempo para as animações da entrada; todos podem ser cancelados por AbortSignal. */

function abortError() {
  return new DOMException('Animação cancelada', 'AbortError')
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError())
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(abortError()) }, { once: true })
  })
}

/** Chama step(p), com p de 0 a 1, a cada quadro, durante `ms`. */
export function tween(ms: number, step: (progress: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError())
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / ms)
      step(progress)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else resolve()
    }
    frame = requestAnimationFrame(tick)
    signal.addEventListener('abort', () => { cancelAnimationFrame(frame); reject(abortError()) }, { once: true })
  })
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
