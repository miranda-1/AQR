import type { ComponentType } from 'react'
import type { ToolIllustrationKind } from '../tools'
import { CompareIllustration } from './CompareIllustration'
import type { IllustrationProps } from './IllustrationFrame'

const illustrations: Record<ToolIllustrationKind, ComponentType<IllustrationProps>> = {
  comparison: CompareIllustration,
}

export function ToolIllustration({ kind, ...props }: IllustrationProps & { kind: ToolIllustrationKind }) {
  const Illustration = illustrations[kind]
  return <Illustration {...props} />
}
