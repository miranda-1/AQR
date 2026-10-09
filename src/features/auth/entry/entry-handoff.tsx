import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AqrLogo } from '@/components/layout/AqrLogo'
import { DottedRings } from '../components/DottedRings'
import '../login.css'

/**
 * Passagem do login para o site: depois da navegação, uma camada com o fundo do login cobre
 * a página, e a logo voa da posição em que estava até o cabeçalho, de branco para azul,
 * enquanto o fundo some. O destino é o elemento marcado com [data-entry-target] (AppHeader).
 */
interface HandoffStart {
  /** Posição da logo na tela de entrada. */
  from: DOMRect
  /** Tamanho das letras da logo na tela de entrada. */
  size: number
}

interface EntryHandoffValue {
  start: (handoff: HandoffStart) => void
}

const EntryHandoffContext = createContext<EntryHandoffValue | null>(null)

const FLIGHT_MS = 1000
const FIND_TARGET_FRAMES = 30

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

      const easing = 'cubic-bezier(.65, 0, .35, 1)'
      const timing: KeyframeAnimationOptions = { duration: FLIGHT_MS, easing, fill: 'forwards' }
      animations.push(layer.animate([{ opacity: 1 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], timing))

      if (target) {
        const to = target.getBoundingClientRect()
        const scale = to.width / from.width
        target.style.visibility = 'hidden'
        animations.push(
          flyer.animate(
            [{ transform: 'none' }, { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})` }],
            timing,
          ),
        )
        const [negative, color] = Array.from(flyer.children)
        if (negative && color) {
          animations.push(negative.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0, offset: 0.8 }], timing))
          animations.push(color.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1, offset: 0.8 }], timing))
        }
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
      <div ref={layerRef} className="login-night absolute inset-0 overflow-hidden">
        <DottedRings dimmed />
      </div>
      <div ref={flyerRef} className="absolute origin-top-left" style={{ left: from.left, top: from.top }}>
        <AqrLogo size={size} tone="negative" />
        <AqrLogo size={size} className="absolute top-0 left-0 opacity-0" />
      </div>
    </div>
  )
}

export function EntryHandoffProvider({ children }: { children: ReactNode }) {
  const [handoff, setHandoff] = useState<HandoffStart | null>(null)
  const start = useCallback((next: HandoffStart) => setHandoff(next), [])
  const finish = useCallback(() => setHandoff(null), [])
  const value = useMemo(() => ({ start }), [start])

  return (
    <EntryHandoffContext.Provider value={value}>
      {children}
      {handoff && <EntryHandoff {...handoff} onDone={finish} />}
    </EntryHandoffContext.Provider>
  )
}

export function useEntryHandoff(): EntryHandoffValue {
  const context = useContext(EntryHandoffContext)
  if (!context) throw new Error('useEntryHandoff precisa estar dentro de EntryHandoffProvider')
  return context
}
