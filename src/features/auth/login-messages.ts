/** O que dizer quando o login é aberto com `?erro=` (ex.: a sessão terminou e o site trouxe a pessoa de volta). */
const errorMessages: Record<string, string> = {
  sessao_expirada: 'Sua sessão terminou: 30 minutos sem uso, limite de 8 horas ou uma alteração na sua conta. Entre de novo para voltar à página em que estava.',
}

export function loginNotice(code: string | null): string | null {
  return code ? (errorMessages[code] ?? null) : null
}
