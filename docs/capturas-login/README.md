# Capturas do login real (para validação visual)

Geradas em 10/10/2026 num Chromium real, com o Keycloak local (`docker/dev/compose.yml`), a API em modo `AUTH_MODE=keycloak` e o site (`npm run dev`).

| Arquivo | O que mostra |
|---|---|
| `01-login-keycloak.png` | Tela de login do AQR no modo real: o botão "Entrar com a conta da PREFCG" no lugar dos campos (as credenciais são digitadas só no Keycloak). |
| `02-login-sessao-terminou.png` | A mesma tela quando a sessão termina (30 min sem uso, 8 h ou alteração na conta). |
| `03-tela-do-keycloak.png` | A página do Keycloak, em português, com "Esqueceu sua senha?". **Usa o tema padrão do Keycloak**; um tema com a identidade da PREFCG é pendência. |
| `04-registros-computador.png` | Administração → Registros: uso da comparação por pessoa e acessos. |
| `05-registros-celular.png` | Registros no celular (390 px), sem rolagem horizontal. |
| `06-login-celular.png` | Login no modo real no celular. |
