/**
 * Login real: sessões que sobrevivem a reinício do servidor e registro de acessos.
 * O identificador da sessão nunca é guardado em claro (só o hash SHA-256), para que uma cópia do
 * banco não permita assumir sessões. Os eventos de acesso são só de inserção, como a auditoria.
 */
export const migration0002 = {
  version: 2,
  name: 'sessoes_e_eventos_de_acesso',
  sql: `
CREATE TABLE sessions (
  id_hash    TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id),
  id_token   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX sessions_expires ON sessions (expires_at);

CREATE TABLE access_events (
  id          TEXT PRIMARY KEY,
  ocorrido_em TEXT NOT NULL,
  evento      TEXT NOT NULL CHECK (evento IN ('login.ok', 'login.sem_conta', 'login.conta_inativa', 'login.falha', 'logout')),
  usuario     TEXT,
  conta_id    TEXT REFERENCES accounts (id),
  ip          TEXT
);

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
