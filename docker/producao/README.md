# Modelo do realm para produção

`aqr-realm.modelo.json` **não contém usuários, senhas nem segredos**. É só a estrutura (clientes, PKCE, bloqueio por tentativas, "Esqueceu a senha?"). Tudo que for credencial é criado no Keycloak de produção, nunca neste repositório.

Passos (resumo; detalhes e limitações em `docs/login-keycloak.md`):

1. Subir o Keycloak de produção em modo `start`, com HTTPS, `KC_HOSTNAME`, Postgres com backup e administrador próprio (nada de `admin/admin`).
2. Importar o modelo, trocando `TROCAR-PELO-DOMINIO-DO-AQR` pelo domínio real.
3. Em *Clients → aqr-admin → Credentials*, gerar o segredo (será `KEYCLOAK_ADMIN_CLIENT_SECRET`, mínimo de 24 caracteres; o AQR recusa o segredo de desenvolvimento).
4. Em *Clients → aqr-admin → Service accounts roles*, atribuir somente `manage-users` e `view-users` do `realm-management`.
5. Configurar o SMTP real em *Realm settings → Email*.
6. Guardar o segredo no cofre/variáveis de ambiente do servidor; nunca no frontend nem no git.
7. Conferir em *Realm settings → Sessions* que o login único do Keycloak cai com **30 min sem uso** e **8 h** no máximo (o modelo já traz `ssoSessionIdleTimeout` 1800 e `ssoSessionMaxLifespan` 28800, alinhados à sessão do AQR) e que "Lembrar de mim" está desligado. Em *Realm settings → User profile → email*, deixar a edição do e-mail só para administradores (o AQR também só vincula contas antigas com e-mail **confirmado** no Keycloak).
8. Atrás de proxy reverso (nginx, balanceador), informar `TRUST_PROXY` com o IP ou a faixa exata do proxy (nunca "todos"), para os registros de acesso guardarem o IP real de quem acessa.
9. Primeiro administrador: criar o usuário no Keycloak, `npm run admin:criar` no servidor e `npm run admin:vincular -- --usuario <login> --confirmo-identidade` depois de conferir a pessoa.

Os arquivos de `docker/dev/` (senhas fixas, HTTP, `start-dev`, Mailpit) são **só para desenvolvimento local** e não devem ser usados em produção; o servidor recusa `localhost` e o segredo de teste quando `NODE_ENV=production`.
