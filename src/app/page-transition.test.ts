import { describe, expect, it } from 'vitest'
import { pageOrder, setPageDirection } from './page-transition'

describe('transição "deslizar"', () => {
  it('segue a ordem da sub-barra', () => {
    expect(pageOrder('/')).toBe(0)
    expect(pageOrder('/comparacao')).toBe(1)
    expect(pageOrder('/comparacao/resultado')).toBeGreaterThan(pageOrder('/comparacao'))
    expect(pageOrder('/triagem')).toBe(2)
  })

  it('desliza para a frente ao avançar e para trás ao voltar', () => {
    setPageDirection('/', '/triagem')
    expect(document.documentElement.dataset.pageDirection).toBe('forward')
    setPageDirection('/triagem', '/comparacao')
    expect(document.documentElement.dataset.pageDirection).toBe('back')
  })
})
