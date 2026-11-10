import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { AqrLogo } from '@/components/layout/AqrLogo'
import { BrandMark } from '@/components/layout/BrandMark'
import { appConfig } from '@/config/app'
import { routes } from '@/config/routes'
import { useAuthSession } from '@/features/auth/auth-session'
import { ComparedSheet, DifferenceChip, sheetDifferences } from '@/features/auth/components/ComparedSheet'
import { DottedRings } from '@/features/auth/components/DottedRings'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useEntryHandoff } from '@/features/auth/entry/entry-handoff'
import { greetingFor } from '@/features/auth/entry/greeting'
import { playScanEntry } from '@/features/auth/entry/scan-entry'
import { isAbortError } from '@/features/auth/entry/timing'
import { loginNotice } from '@/features/auth/login-messages'
import { loginWithPassword } from '@/features/auth/password-login'
import { destinationAfterLogin } from '@/features/auth/RequireAuth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import '@/features/auth/login.css'

type Phase = 'form' | 'entering'

export function LoginPage() {
  useDocumentTitle('Entrar')
  const { isAuthenticated, mode, signIn } = useAuthSession()
  const navigate = useNavigate()
  const location = useLocation()
  const handoff = useEntryHandoff()
  const reducedMotion = usePrefersReducedMotion()
  const isWide = useMediaQuery('(min-width: 768px)')
  const logoSize = isWide ? 80 : 58

  const [phase, setPhase] = useState<Phase>('form')
  const [pulse, setPulse] = useState(0)
  const [greeting, setGreeting] = useState('')
  const stackRef = useRef<HTMLDivElement>(null)
  const docsLayerRef = useRef<HTMLDivElement>(null)
  const copiesRef = useRef<HTMLDivElement>(null)
  const listTitleRef = useRef<HTMLParagraphElement>(null)
  const scanRef = useRef<HTMLDivElement>(null)
  const greetingLayerRef = useRef<HTMLDivElement>(null)
  const greetingTextRef = useRef<HTMLParagraphElement>(null)
  const logoLayerRef = useRef<HTMLDivElement>(null)
  const [checking, setChecking] = useState(false)
  // Aviso do login: o motivo de ter voltado (?erro=) ou a recusa do servidor (senha errada, sem conta…).
  const [notice, setNotice] = useState<string | null>(() => loginNotice(new URLSearchParams(location.search).get('erro')))
  const logoRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLParagraphElement>(null)
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

  const playEntry = useCallback(
    async (userName: string) => {
      setGreeting(greetingFor(userName))
      const stack = stackRef.current
      const docsLayer = docsLayerRef.current
      const copies = copiesRef.current
      const listTitle = listTitleRef.current
      const scan = scanRef.current
      const greetingLayer = greetingLayerRef.current
      const greetingText = greetingTextRef.current
      const logoLayer = logoLayerRef.current
      const logo = logoRef.current
      const name = nameRef.current
      const ready = stack && docsLayer && copies && listTitle && scan && greetingLayer && greetingText && logoLayer && logo && name
      // Sem animação (movimento reduzido ou navegador sem Web Animations): entra direto.
      if (reducedMotion || !ready || typeof Element.prototype.animate !== 'function') return goToSite(userName, false)

      const controller = new AbortController()
      abortRef.current = controller
      try {
        setPhase('entering')
        // Espera o React escrever a saudação antes de medi-la.
        await new Promise((resolve) => requestAnimationFrame(resolve))
        const chips = Array.from(docsLayer.querySelectorAll<HTMLElement>('.login-chip'))
        const elements = { stack, docsLayer, copies, listTitle, chips, scan, greetingLayer, greetingText, logoLayer, logo, name }
        await playScanEntry(elements, controller.signal)
        // A logo voa para o cabeçalho do site (EntryHandoff).
        goToSite(userName, true)
      } catch (error) {
        if (!isAbortError(error)) goToSite(userName, false)
      }
    },
    [goToSite, reducedMotion],
  )

  /** Login real: o servidor confere usuário e senha no sistema de login; só depois a entrada animada começa. */
  const submitReal = useCallback(
    async (userName: string, password: string) => {
      setNotice(null)
      setChecking(true)
      const result = await loginWithPassword(userName.trim(), password)
      setChecking(false)
      if (!result.ok) return setNotice(result.message)
      void playEntry(result.nome)
    },
    [playEntry],
  )

  // Já com sessão (inclusive logo depois de entrar), o login leva ao destino.
  if (isAuthenticated) return <Navigate to={destination} replace />
  if (mode === 'loading') return null

  const entering = phase === 'entering'

  return (
    // overflow-x-clip: as folhas inclinadas do leque não podem criar rolagem lateral no celular.
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="login-mist fixed inset-0 overflow-hidden">
        <DottedRings dimmed={entering} pulseKey={pulse} />
      </div>

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-12">
        <div ref={stackRef} className={cn('login-stack', entering && 'is-leaving')}>
          <ComparedSheet version="updated" className="is-back" />
          <ComparedSheet version="original" className="is-front" />
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
                {mode === 'unavailable' ? (
                  <p role="alert" className="mt-6 rounded-lg bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">
                    Não foi possível verificar o sistema de login. Recarregue a página em instantes; se continuar, fale com o suporte da {appConfig.organization.short}.
                  </p>
                ) : (
                  <LoginForm
                    onSubmit={(userName, password) => (mode === 'keycloak' ? void submitReal(userName, password) : void playEntry(userName))}
                    notice={notice}
                    onEdit={() => setNotice(null)}
                    onType={() => setPulse((value) => value + 1)}
                    disabled={entering || checking}
                  />
                )}
                <p className="mt-[18px] text-center text-[0.84375rem] text-muted-foreground">
                  {mode === 'keycloak' ? (
                    <>
                      Esqueceu a senha?{' '}
                      <Link to={routes.forgotPassword} className="font-semibold text-brand underline-offset-4 hover:underline">
                        Receba um link por e-mail
                      </Link>
                      .
                    </>
                  ) : (
                    `Esqueceu a senha? Procure o suporte da ${appConfig.organization.short}.`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Entrada (decorativa; o status abaixo informa leitores de tela). Abaixo do cartão: cópias das folhas e a lista. */}
      <div ref={docsLayerRef} aria-hidden className="pointer-events-none fixed inset-0 z-[5]">
        <div ref={copiesRef} />
        <p ref={listTitleRef} className="login-list-title">
          Diferenças
        </p>
        {sheetDifferences.map(({ row, kind }) => (
          <DifferenceChip key={row} row={row} kind={kind} />
        ))}
      </div>
      {/* Acima do cartão: a saudação e a logo, que a linha amarela revela. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-20">
        <div ref={greetingLayerRef} className="login-reveal absolute inset-0 flex items-center justify-center px-4">
          <p ref={greetingTextRef} className="text-center text-[2.5rem] leading-tight font-extrabold tracking-[-0.03em] text-brand md:text-[4rem]">
            {greeting}
          </p>
        </div>
        <div ref={logoLayerRef} className="login-reveal absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div ref={logoRef}>
            <AqrLogo size={logoSize} />
          </div>
          <p ref={nameRef} className="text-base text-muted-foreground">
            {appConfig.fullName}
          </p>
        </div>
        <div ref={scanRef} className="login-scan" />
      </div>
      <p role="status" className="sr-only">
        {entering ? `${greeting}. Entrando no AQR…` : checking ? 'Conferindo usuário e senha…' : ''}
      </p>
    </div>
  )
}
