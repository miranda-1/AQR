/**
 * Login fictício da versão de demonstração: um usuário e uma senha genéricos, conferidos no próprio
 * navegador. Não é segurança (qualquer pessoa pode ler estes valores no código do site); só mantém a
 * tela de login. O login real (Keycloak) fica na branch `dev`.
 */
export const DEMO_CREDENTIALS = { userName: 'admin', password: 'admin' } as const

export const DEMO_LOGIN_ERROR = 'Usuário ou senha incorretos. Confira os dados e tente de novo.'

export function checkDemoCredentials(userName: string, password: string): boolean {
  return userName.trim().toLowerCase() === DEMO_CREDENTIALS.userName && password === DEMO_CREDENTIALS.password
}
