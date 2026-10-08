import { cn } from '@/lib/utils'

const variants = {
  development: 'border-line-strong bg-surface-sunken text-muted-foreground',
  prototype: 'border-modification-line bg-modification-bg text-modification',
  available: 'border-addition-line bg-addition-bg text-addition',
} as const

interface StatusBadgeProps {
  variant: keyof typeof variants
  children: React.ReactNode
  className?: string
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
