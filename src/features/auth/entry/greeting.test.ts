import { describe, expect, it } from 'vitest'
import { firstName, greetingFor, partOfDayGreeting } from './greeting'

const at = (hour: number) => new Date(2026, 9, 15, hour, 30)

describe('Saudação da entrada', () => {
  it('usa a primeira parte do usuário, com a inicial maiúscula', () => {
    expect(firstName('maria.souza')).toBe('Maria')
    expect(firstName('Maria Souza')).toBe('Maria')
    expect(firstName('  JOAO_silva ')).toBe('Joao')
    expect(firstName('   ')).toBe('')
  })

  it('cumprimenta pelo horário', () => {
    expect(partOfDayGreeting(at(4))).toBe('Boa noite')
    expect(partOfDayGreeting(at(5))).toBe('Bom dia')
    expect(partOfDayGreeting(at(11))).toBe('Bom dia')
    expect(partOfDayGreeting(at(12))).toBe('Boa tarde')
    expect(partOfDayGreeting(at(17))).toBe('Boa tarde')
    expect(partOfDayGreeting(at(18))).toBe('Boa noite')
  })

  it('junta a saudação e o nome; sem nome, só a saudação', () => {
    expect(greetingFor('maria.souza', at(9))).toBe('Bom dia, Maria')
    expect(greetingFor('', at(20))).toBe('Boa noite')
  })
})
