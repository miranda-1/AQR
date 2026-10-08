import { appConfig } from '@/config/app'

export function AppFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-[1920px] flex-col gap-1 px-4 py-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <p>
          <span className="font-semibold text-ink">{appConfig.organization.municipality}</span>
          <span className="block lg:inline">
            <span className="hidden lg:inline"> | </span>
            {appConfig.organization.short} — {appConfig.organization.long}
          </span>
        </p>
        {appConfig.isPrototype && (
          <p className="lg:text-right">
            {appConfig.name}: protótipo de interface. Os resultados exibidos são demonstrativos.
          </p>
        )}
      </div>
    </footer>
  )
}
