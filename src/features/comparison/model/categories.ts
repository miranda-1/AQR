import { Baseline, CircleAlert, Files, Image, Shapes, Type, type LucideIcon } from 'lucide-react'
import type { CategoryFilter } from '../hooks/use-difference-navigation'
import { categoryLabels } from './describe'
import { differenceCategories, type DifferenceCategory } from './types'

export const categoryIcons: Record<DifferenceCategory, LucideIcon> = {
  text: Type,
  image: Image,
  visual: Shapes,
  structure: Files,
  formatting: Baseline,
}

export interface CategoryOption {
  value: CategoryFilter
  label: string
  icon?: LucideIcon
}

export const categoryOptions: readonly CategoryOption[] = [
  { value: 'all', label: 'Todas as categorias' },
  ...differenceCategories.map((category) => ({ value: category, label: categoryLabels[category].plural, icon: categoryIcons[category] })),
  { value: 'needs-review', label: 'Para conferir', icon: CircleAlert },
]

export function isCategoryFilter(value: string): value is CategoryFilter {
  return categoryOptions.some((option) => option.value === value)
}
