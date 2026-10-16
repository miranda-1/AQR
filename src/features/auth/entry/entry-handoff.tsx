import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AqrLogo } from '@/components/layout/AqrLogo'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useAuthSession } from '../auth-session'
import { DottedRings, ringRadii } from '../components/DottedRings'
import { drawDots, sampleLogo, scatterFromRings } from './dot-logo'
import { isAbortError, sleep, tween } from './timing'
import '../login.css'

/**
 * Passagens animadas entre o login e o site, acima do roteador (sobrevivem à troca de rota):
 * - entrada: depois de navegar, a logo voa da tela de entrada até o cabeçalho ([data-entry-target]);
 * - saída: a logo sai do cabeçalho, vai ao centro, se desfaz em pontinhos que voltam aos anéis,
 *   e a sessão é encerrada; o login aparece por baixo, com o mesmo fundo.
 * No fundo "Névoa" a logo é sempre azul: nada troca de cor durante o voo.
 */
interface HandoffStart {
  /** Posição da logo na tela de entrada. */
  from: DOMRect
  /** Tamanho das letras da logo na tela de entrada. */
  size: number
}

interface EntryHandoffValue {
  start: (handoff: HandoffStart) => void
  /** Sai do site com a animação "logo volta ao centro" e encerra a sessão. */
  exit: () => void
}

const EntryHandoffContext = createContext<EntryHandoffValue | null>(null)

const FLIGHT_MS = 1000
const FIND_TARGET_FRAMES = 30
const easing = 'cubic-bezier(.65, 0, .35, 1)'

function canAnimate(): boolean {
  return typeof Element.prototype.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function EntryHandoff({ from, size, onDone }: HandoffStart & { onDone: () => void }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const flyerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    let attempts = 0
    let target: HTMLElement | null = null
    const animations: Animation[] = []

    const fly = () => {
      const layer = layerRef.current
      const flyer = flyerRef.current
      target = document.querySelector<HTMLElement>('[data-entry-target]')
      if (!target && attempts++ < FIND_TARGET_FRAMES) {
        frame = requestAnimationFrame(fly)
        return
      }
      if (!layer || !flyer || typeof flyer.animate !== 'function') return onDone()

      const timing: KeyframeAnimationOptions = { duration: FLIGHT_MS, easing, fill: 'forwards' }
      animations.push(layer.animate([{ opacity: 1 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], timing))

      if (target) {
        const to = target.getBoundingClientRect()
        target.style.visibility = 'hidden'
        animations.push(
          flyer.animate(
            [{ transform: 'none' }, { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})` }],
            timing,
          ),
        )
      } else {
        animations.push(flyer.animate([{ opacity: 1 }, { opacity: 0 }], timing))
      }
      Promise.all(animations.map((animation) => animation.finished)).then(onDone, onDone)
    }

    frame = requestAnimationFrame(fly)
    return () => {
      cancelAnimationFrame(frame)
      animations.forEach((animation) => animation.cancel())
      if (target) target.style.visibility = ''
    }
  }, [from, onDone])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <div ref={layerRef} className="login-mist absolute inset-0 overflow-hidden">
        <DottedRings dimmed glow={false} />
      </div>
      <div ref={flyerRef} className="absolute origin-top-left" style={{ left: from.left, top: from.top }}>
        <AqrLogo size={size} />
      </div>
    </div>
  )
}

/** Saída: a logo volta do cabeçalho ao centro e se desfaz em pontinhos que voltam aos anéis. */
function ExitToLogin({ onSignOut, onDone }: { onSignOut: () => void; onDone: () => void }) {
  const isWide = useMediaQuery('(min-width: 768px)')
  const size = isWide ? 80 : 58
  const layerRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const flyerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const source = document.querySelector<HTMLElement>('[data-entry-target]')
    const layer = layerRef.current
    const center = centerRef.current
    const centerLogo = center?.firstElementChild
    const flyer = flyerRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    async function play() {
      if (!source || !layer || !flyer || !(centerLogo instanceof HTMLElement) || !canvas || !ctx) return
      const from = source.getBoundingClientRect()
      const to = centerLogo.getBoundingClientRect()
      const timing: KeyframeAnimationOptions = { duration: FLIGHT_MS, easing, fill: 'forwards' }

      // 1) A logo sai do cabeçalho e vai ao centro, enquanto o fundo do login volta.
      source.style.visibility = 'hidden'
      flyer.style.left = `${to.left}px`
      flyer.style.top = `${to.top}px`
      const flight = [
        layer.animate([{ opacity: 0 }, { opacity: 1, offset: 0.75 }, { opacity: 1 }], timing),
        flyer.animate(
          [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})` }, { transform: 'none' }],
          timing,
        ),
      ]
      signal.addEventListener('abort', () => flight.forEach((animation) => animation.cancel()), { once: true })
      await Promise.all(flight.map((animation) => animation.finished))

      // 2) No centro, a logo vira pontinhos que voltam para os anéis.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const dots = scatterFromRings(sampleLogo(centerLogo), { x: window.innerWidth / 2, y: window.innerHeight / 2 }, ringRadii)
      drawDots(ctx, dots, 1)
      flyer.style.visibility = 'hidden'
      await sleep(150, signal)
      await tween(1300, (p) => drawDots(ctx, dots, 1 - p), signal)
      await tween(300, (p) => (canvas.style.opacity = String(1 - p)), signal)

      // 3) A sessão termina; o login aparece por baixo, com o mesmo fundo e os mesmos anéis.
      onSignOut()
      await sleep(80, signal)
    }

    play()
      .catch((error: unknown) => {
        if (!isAbortError(error)) onSignOut()
      })
      .finally(() => {
        if (!signal.aborted) onDone()
      })

    return () => {
      controller.abort()
      if (source) source.style.visibility = ''
    }
  }, [onDone, onSignOut])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <div ref={layerRef} className="login-mist absolute inset-0 overflow-hidden opacity-0">
        <DottedRings glow={false} />
      </div>
      <div ref={centerRef} className="invisible absolute inset-0 flex items-center justify-center">
        <AqrLogo size={size} />
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div ref={flyerRef} className="absolute origin-top-left">
        <AqrLogo size={size} />
      </div>
    </div>
  )
}

export function EntryHandoffProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAuthSession()
  const [handoff, setHandoff] = useState<HandoffStart | null>(null)
  const [exiting, setExiting] = useState(false)

  const start = useCallback((next: HandoffStart) => setHandoff(next), [])
  const finishEntry = useCallback(() => setHandoff(null), [])
  const finishExit = useCallback(() => setExiting(false), [])
  const exit = useCallback(() => {
    // Sem animação (movimento reduzido ou navegador sem suporte): sai direto.
    if (!canAnimate() || !document.querySelector('[data-entry-target]')) return signOut()
    setExiting(true)
  }, [signOut])

  const value = useMemo(() => ({ start, exit }), [start, exit])

  return (
    <EntryHandoffContext.Provider value={value}>
      {children}
      {handoff && <EntryHandoff {...handoff} onDone={finishEntry} />}
      {exiting && <ExitToLogin onSignOut={signOut} onDone={finishExit} />}
    </EntryHandoffContext.Provider>
  )
}

export function useEntryHandoff(): EntryHandoffValue {
  const context = useContext(EntryHandoffContext)
  if (!context) throw new Error('useEntryHandoff precisa estar dentro de EntryHandoffProvider')
  return context
}
