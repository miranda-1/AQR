/**
 * Vínculo da conta com a identidade no Keycloak pelo `sub` (id imutável do usuário), e não pelo
 * nome de usuário, que pode ser trocado ou reaproveitado. Uma vez gravado, o vínculo não muda e
 * cada `sub` pertence a uma única conta. Contas existentes ficam sem vínculo (`keycloak_sub` nulo)
 * e NÃO entram até serem vinculadas por um administrador (sincronizar) ou pelo operador
 * (`npm run admin:vincular`), que conferem a identidade no Keycloak com a credencial de serviço.
 *
 * Os eventos de acesso ganham os tipos do vínculo (tabela refeita: o SQLite não altera CHECK).
 */
export const migration0004 = {
  version: 4,
  name: 'vinculo_keycloak_sub',
  sql: `
ALTER TABLE accounts ADD COLUMN keycloak_sub TEXT CHECK (keycloak_sub IS NULL OR length(keycloak_sub) BETWEEN 1 AND 200);

CREATE UNIQUE INDEX accounts_keycloak_sub ON accounts (keycloak_sub) WHERE keycloak_sub IS NOT NULL;

CREATE TRIGGER accounts_keycloak_sub_imutavel
BEFORE UPDATE OF keycloak_sub ON accounts
WHEN OLD.keycloak_sub IS NOT NULL AND NEW.keycloak_sub IS NOT OLD.keycloak_sub
BEGIN
  SELECT RAISE(ABORT, 'O vínculo com o Keycloak não pode ser alterado');
END;

CREATE TABLE access_events_nova (
  id          TEXT PRIMARY KEY,
  ocorrido_em TEXT NOT NULL,
  evento      TEXT NOT NULL CHECK (evento IN (
    'login.ok', 'login.sem_conta', 'login.conta_inativa', 'login.falha', 'logout',
    'login.vinculo_pendente', 'login.vinculo_divergente',
    'identidade.criada', 'identidade.convite_enviado', 'identidade.senha_redefinicao_enviada',
    'identidade.bloqueada', 'identidade.reativada', 'identidade.sincronizada', 'identidade.vinculada',
    'identidade.falha'
  )),
  usuario     TEXT,
  conta_id    TEXT REFERENCES accounts (id),
  ip          TEXT,
  ator_id     TEXT REFERENCES accounts (id),
  detalhe     TEXT
);

INSERT INTO access_events_nova (id, ocorrido_em, evento, usuario, conta_id, ip, ator_id, detalhe)
SELECT id, ocorrido_em, evento, usuario, conta_id, ip, ator_id, detalhe FROM access_events;

DROP TABLE access_events;
ALTER TABLE access_events_nova RENAME TO access_events;

CREATE INDEX access_events_ocorrido ON access_events (ocorrido_em);

CREATE TRIGGER access_events_sem_alteracao
BEFORE UPDATE ON access_events
BEGIN
  SELECT RAISE(ABORT, 'Os eventos de acesso não podem ser alterados');
END;

CREATE TRIGGER access_events_sem_exclusao
BEFORE DELETE ON access_events
BEGIN
  SELECT RAISE(ABORT, 'Os eventos de acesso não podem ser apagados');
END;
`,
}
