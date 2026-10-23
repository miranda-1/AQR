import { useState } from 'react'
import { ToolOption } from '@/features/home/components/ToolOption'
import { ToolShowcase } from '@/features/home/components/ToolShowcase'
import { defaultHomeToolId, homeTools, type HomeToolId } from '@/features/home/tools'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function HomePage() {
  useDocumentTitle('Início')
  const [activeId, setActiveId] = useState<HomeToolId>(defaultHomeToolId)
  const [runs, setRuns] = useState<Record<HomeToolId, number>>({ comparison: 0 })

  const active = homeTools.find((tool) => tool.id === activeId) ?? homeTools[0]

  function activate(id: HomeToolId) {
    if (id === activeId) return
    setActiveId(id)
    setRuns((current) => ({ ...current, [id]: current[id] + 1 }))
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10 lg:px-6 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex min-w-0 flex-col">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand">
            <span aria-hidden className="h-1 w-6 rounded-full bg-brand-yellow" />
            Ferramentas AQR
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Como podemos ajudar?</h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Escolha uma ferramenta para analisar e organizar seus documentos.
          </p>

          <nav aria-label="Ferramentas disponíveis" className="mt-8">
            <ul className="flex flex-col gap-4">
              {homeTools.map((tool) => (
                <li key={tool.id}>
                  <ToolOption tool={tool} active={tool.id === active?.id} onActivate={() => activate(tool.id)} />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {active && <ToolShowcase tools={homeTools} active={active} runs={runs} />}
      </div>
    </div>
  )
}
