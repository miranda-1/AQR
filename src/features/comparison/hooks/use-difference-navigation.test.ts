import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defined } from '@/test/files'
import { demoComparisonResult } from '../mocks/demo-comparison'
import { useDifferenceNavigation } from './use-difference-navigation'

const differences = demoComparisonResult.differences

describe('useDifferenceNavigation', () => {
  it('começa na primeira diferença e não passa das pontas', () => {
    const { result } = renderHook(() => useDifferenceNavigation(differences))
    expect(result.current.active?.id).toBe(differences[0]?.id)
    expect(result.current.hasPrevious).toBe(false)

    act(() => result.current.previous())
    expect(result.current.activeIndex).toBe(0)

    for (let i = 0; i < differences.length + 3; i++) act(() => result.current.next())
    expect(result.current.activeIndex).toBe(differences.length - 1)
    expect(result.current.hasNext).toBe(false)
  })

  it('filtra por tipo e move a seleção para um item visível', () => {
    const { result } = renderHook(() => useDifferenceNavigation(differences))
    act(() => result.current.setFilter('deletion'))
    expect(result.current.visible.every((difference) => difference.kind === 'deletion')).toBe(true)
    expect(result.current.active?.kind).toBe('deletion')
    expect(result.current.activeIndex).toBe(0)
  })

  it('mantém a seleção ao filtrar se ela continuar visível', () => {
    const { result } = renderHook(() => useDifferenceNavigation(differences))
    const modification = defined(differences.find((difference) => difference.kind === 'modification' && difference.id !== differences[0]?.id))
    act(() => result.current.select(modification.id))
    act(() => result.current.setFilter('modification'))
    expect(result.current.active?.id).toBe(modification.id)
  })
})
