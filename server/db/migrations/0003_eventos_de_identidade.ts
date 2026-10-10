/**
 * Eventos de acesso passam a registrar também o provisionamento de identidades no Keycloak
 * (criação, convite, redefinição de senha, bloqueio, reativação, sincronização) e quem os
 * provocou. A tabela é refeita porque o SQLite não altera restrições CHECK; os dados são copiados.
 */
export const migration0003 = {
  version: 3,
  name: 'eventos_de_identidade',
  sql: `
CREATE TABLE access_events_nova (
  id          TEXT PRIMARY KEY,
  ocorrido_em TEXT NOT NULL,
  evento      TEXT NOT NULL CHECK (evento IN (
    'login.ok', 'login.sem_conta', 'login.conta_inativa', 'login.falha', 'logout',
    'identidade.criada', 'identidade.convite_enviado', 'identidade.senha_redefinicao_enviada',
    'identidade.bloqueada', 'identidade.reativada', 'identidade.sincronizada', 'identidade.falha'
  )),
  usuario     TEXT,
  conta_id    TEXT REFERENCES accounts (id),
  ip          TEXT,
  ator_id     TEXT REFERENCES accounts (id),
  detalhe     TEXT
);

INSERT INTO access_events_nova (id, ocorrido_em, evento, usuario, conta_id, ip)
SELECT id, ocorrido_em, evento, usuario, conta_id, ip FROM access_events;

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
