/** Saudação da entrada ("pelo horário", decisão do responsável em 15/10/2026): não depende do gênero de quem entra. */

/** Primeira parte do usuário ("maria.souza" ou "Maria Souza" → "Maria"); vazio se não houver. */
export function firstName(userName: string): string {
  const first = userName.trim().split(/[.\s_@-]+/)[0] ?? ''
  return first ? first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1).toLocaleLowerCase('pt-BR') : ''
}

/** "Bom dia" (5h–11h), "Boa tarde" (12h–17h) ou "Boa noite" (18h–4h). */
export function partOfDayGreeting(date: Date): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function greetingFor(userName: string, date = new Date()): string {
  const name = firstName(userName)
  const greeting = partOfDayGreeting(date)
  return name ? `${greeting}, ${name}` : greeting
}
