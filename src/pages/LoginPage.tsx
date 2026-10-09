import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { AqrLogo } from '@/components/layout/AqrLogo'
import { BrandMark } from '@/components/layout/BrandMark'
import { appConfig } from '@/config/app'
import { useAuthSession } from '@/features/auth/auth-session'
import { DottedRings, ringRadii } from '@/features/auth/components/DottedRings'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { drawDots, sampleLogo, scatterFromRings } from '@/features/auth/entry/dot-logo'
import { useEntryHandoff } from '@/features/auth/entry/entry-handoff'
import { easeInOutCubic, isAbortError, sleep, tween } from '@/features/auth/entry/timing'
import { destinationAfterLogin } from '@/features/auth/RequireAuth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import '@/features/auth/login.css'

type Phase = 'form' | 'entering'

/** Nome da fonte da interface, para esperar que esteja carregada antes de amostrar a logo. */
const LOGO_FONT = '800 80px "Plus Jakarta Sans Variable"'

export function LoginPage() {
  useDocumentTitle('Entrar')
  const { isAuthenticated, signIn } = useAuthSession()
  const navigate = useNavigate()
  const location = useLocation()
  const handoff = useEntryHandoff()
  const reducedMotion = usePrefersReducedMotion()
  const isWide = useMediaQuery('(min-width: 768px)')
  const logoSize = isWide ? 80 : 58

  const [phase, setPhase] = useState<Phase>('form')
  const [pulse, setPulse] = useState(0)
  const [nameVisible, setNameVisible] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const sweepRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const destination = destinationAfterLogin(location.state)

  const goToSite = useCallback(
    (userName: string, withHandoff: boolean) => {
      const logo = logoRef.current?.firstElementChild
      if (withHandoff && logo) handoff.start({ from: logo.getBoundingClientRect(), size: logoSize })
      signIn(userName)
      navigate(destination, { replace: true })
    },
    [destination, handoff, logoSize, navigate, signIn],
  )

  const playEntry = useCallback(async (userName: string) => {
    const canvas = canvasRef.current
    const logoWrap = logoRef.current
    const logo = logoWrap?.firstElementChild
    const sweep = sweepRef.current
    const ctx = canvas?.getContext('2d')
    // Sem animação (movimento reduzido ou navegador sem canvas): entra direto.
    if (reducedMotion || !canvas || !ctx || !logoWrap || !(logo instanceof HTMLElement) || !sweep) return goToSite(userName, false)

    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller
    try {
      setPhase('entering')
      await Promise.race([document.fonts?.load(LOGO_FONT), sleep(600, signal)])

      // 1) Os pontos saem dos anéis e formam o AQR.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      const dots = scatterFromRings(sampleLogo(logo), center, ringRadii)
      await sleep(250, signal)
      await tween(1500, (p) => drawDots(ctx, dots, p), signal)
      await sleep(400, signal)

      // 2) Varredura: uma linha amarela troca os pontos pela logo sólida.
      const box = logo.getBoundingClientRect()
      const startX = box.left - 20
      const endX = box.right + 20
      sweep.style.top = `${box.top - 24}px`
      sweep.style.height = `${box.height + 48}px`
      sweep.style.opacity = '1'
      logoWrap.style.visibility = 'visible'
      await tween(
        950,
        (p) => {
          const x = startX + (endX - startX) * easeInOutCubic(p)
          sweep.style.transform = `translateX(${x}px)`
          if (p > 0.9) sweep.style.opacity = String((1 - p) * 10)
          logoWrap.style.clipPath = `inset(-20% ${Math.max(0, 100 - ((x - box.left) / box.width) * 100)}% -20% 0)`
          drawDots(ctx, dots, 1, x)
        },
        signal,
      )
      logoWrap.style.clipPath = ''
      sweep.style.opacity = '0'
      drawDots(ctx, [], 1)
      setNameVisible(true)
      await sleep(1400, signal)

      // 3) A logo voa para o cabeçalho do site (EntryHandoff).
      goToSite(userName, true)
    } catch (error) {
      if (!isAbortError(error)) goToSite(userName, false)
    }
  }, [goToSite, reducedMotion])

  // Já com sessão (inclusive logo depois de entrar), o login leva ao destino.
  if (isAuthenticated) return <Navigate to={destination} replace />

  const entering = phase === 'entering'

  return (
    // overflow-x-clip: as folhas inclinadas do leque não podem criar rolagem lateral no celular.
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="login-night fixed inset-0 overflow-hidden">
        <DottedRings dimmed={entering} pulseKey={pulse} />
      </div>

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-12">
        <div className={cn('login-stack', entering && 'is-leaving')}>
          <div aria-hidden className="login-sheet is-back" />
          <div aria-hidden className="login-sheet is-front" />
          <div className="login-card px-[22px] pt-8 pb-7 sm:px-10 sm:pt-10 sm:pb-9">
            <div className="login-enter">
              <BrandMark height={34} className="mx-auto h-[34px] w-auto" />
              <div className="mt-6 flex items-center justify-center gap-2.5">
                <AqrLogo size={24} animated />
                <span className="text-[0.8125rem] leading-tight text-muted-foreground">
                  Análise e Qualificação
                  <br />
                  de Requerimentos
                </span>
              </div>
              <div aria-hidden className="mx-auto mt-5 h-1 w-10 rounded-full bg-brand-yellow" />
              <div className="mt-5 text-center">
                <h1 className="text-[1.625rem] font-extrabold tracking-tight text-ink">Entrar</h1>
                <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">
                  Use seu usuário e senha da {appConfig.organization.short}.
                </p>
              </div>
              <div>
                <LoginForm onSubmit={playEntry} onType={() => setPulse((value) => value + 1)} disabled={entering} />
                <p className="mt-[18px] text-center text-[0.84375rem] text-muted-foreground">
                  Esqueceu a senha? Procure o suporte da {appConfig.organization.short}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Entrada: pontos, varredura e logo, sobre o mesmo fundo. Decorativo; o status abaixo informa leitores de tela. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-20">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div ref={logoRef} className="invisible">
            <AqrLogo size={logoSize} tone="negative" />
          </div>
          <p className={cn('login-entry-name text-base text-white/85', nameVisible && 'is-visible')}>{appConfig.fullName}</p>
        </div>
        <div ref={sweepRef} className="absolute top-0 left-0 w-[3px] rounded-full bg-brand-yellow opacity-0" />
      </div>
      <p role="status" className="sr-only">
        {entering ? 'Entrando no AQR…' : ''}
      </p>
    </div>
  )
}
