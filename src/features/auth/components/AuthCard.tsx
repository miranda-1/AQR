import type { ReactNode } from 'react'
import { AqrLogo } from '@/components/layout/AqrLogo'
import { BrandMark } from '@/components/layout/BrandMark'
import { DottedRings } from './DottedRings'
import '@/features/auth/login.css'

interface AuthCardProps {
  title: string
  description: ReactNode
  children: ReactNode
}

/**
 * Cartão das páginas de senha ("Esqueci a senha", "Definir senha"): o mesmo fundo "Névoa", os anéis
 * e o cartão branco do login, sem as folhas nem a entrada animada, que são só do login.
 */
export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="login-mist fixed inset-0 overflow-hidden">
        <DottedRings />
      </div>
      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-12">
        <div className="login-card w-full max-w-[440px] px-[22px] pt-8 pb-7 sm:px-10 sm:pt-10 sm:pb-9">
          <div className="login-enter">
            <BrandMark height={34} className="mx-auto h-[34px] w-auto" />
            <div className="mt-6 flex items-center justify-center gap-2.5">
              <AqrLogo size={24} />
              <span className="text-[0.8125rem] leading-tight text-muted-foreground">
                Análise e Qualificação
                <br />
                de Requerimentos
              </span>
            </div>
            <div aria-hidden className="mx-auto mt-5 h-1 w-10 rounded-full bg-brand-yellow" />
            <div className="mt-5 text-center">
              <h1 className="text-[1.625rem] font-extrabold tracking-tight text-ink">{title}</h1>
              <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">{description}</p>
            </div>
            <div>{children}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
