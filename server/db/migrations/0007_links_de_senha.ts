/**
 * Links para definir a senha, enviados pelo próprio AQR (o Keycloak fica escondido: a pessoa nunca
 * vê uma página dele). Só o hash do código do link é guardado; cada link vale uma vez e vence
 * (convite em 72 h, recuperação em 1 h). Um link novo invalida os anteriores da mesma conta.
 *
 * Os eventos de acesso ganham os passos da senha (tabela refeita: o SQLite não altera CHECK).
 */
export const migration0007 = {
  version: 7,
  name: 'links_de_senha',
  sql: `
CREATE TABLE password_links (
  token_hash  TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts (id),
  finalidade  TEXT NOT NULL CHECK (finalidade IN ('convite', 'recuperacao')),
  criado_em   TEXT NOT NULL,
  expira_em   INTEGER NOT NULL,
  usado_em    TEXT
);

CREATE INDEX password_links_conta ON password_links (account_id);

CREATE TABLE access_events_nova (
  id          TEXT PRIMARY KEY,
  ocorrido_em TEXT NOT NULL,
  evento      TEXT NOT NULL CHECK (evento IN (
    'login.ok', 'login.sem_conta', 'login.conta_inativa', 'login.falha', 'logout',
    'login.vinculo_pendente', 'login.vinculo_divergente',
    'identidade.criada', 'identidade.convite_enviado', 'identidade.senha_redefinicao_enviada',
    'identidade.bloqueada', 'identidade.reativada', 'identidade.sincronizada', 'identidade.vinculada',
    'identidade.falha',
    'senha.recuperacao_pedida', 'senha.definida'
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
