/**
 * Contas e trilha de auditoria. Regras garantidas pelo próprio banco, além do serviço:
 * usuário único (sem diferenciar maiúsculas) e imutável, papéis e situações válidos,
 * contas nunca excluídas e auditoria só de inserção.
 *
 * Nunca edite uma migração já commitada: crie a próxima.
 */
export const migration0001 = {
  version: 1,
  name: 'contas_e_auditoria',
  sql: `
CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,
  usuario       TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(usuario) BETWEEN 3 AND 32),
  nome          TEXT NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 120),
  email         TEXT UNIQUE COLLATE NOCASE CHECK (email IS NULL OR length(email) <= 254),
  papel         TEXT NOT NULL CHECK (papel IN ('administrador', 'analista')),
  situacao      TEXT NOT NULL CHECK (situacao IN ('ativa', 'inativa')),
  criada_em     TEXT NOT NULL,
  atualizada_em TEXT NOT NULL,
  desativada_em TEXT,
  versao        INTEGER NOT NULL DEFAULT 1 CHECK (versao >= 1)
);

CREATE INDEX accounts_nome ON accounts (nome COLLATE NOCASE);
CREATE INDEX accounts_papel_situacao ON accounts (papel, situacao);

CREATE TRIGGER accounts_usuario_imutavel
BEFORE UPDATE OF usuario ON accounts
WHEN NEW.usuario IS NOT OLD.usuario
BEGIN
  SELECT RAISE(ABORT, 'O usuário de uma conta não pode ser alterado');
END;

CREATE TRIGGER accounts_sem_exclusao
BEFORE DELETE ON accounts
BEGIN
  SELECT RAISE(ABORT, 'Contas não são excluídas; desative a conta');
END;

CREATE TABLE audit_events (
  id          TEXT PRIMARY KEY,
  ocorrido_em TEXT NOT NULL,
  ator_id     TEXT REFERENCES accounts (id),
  ator_rotulo TEXT NOT NULL,
  ator_origem TEXT NOT NULL CHECK (ator_origem IN ('dev', 'real', 'sistema')),
  acao        TEXT NOT NULL CHECK (acao IN ('conta.criada', 'conta.editada', 'conta.papel_alterado', 'conta.desativada', 'conta.reativada')),
  alvo_tipo   TEXT NOT NULL CHECK (alvo_tipo IN ('conta')),
  alvo_id     TEXT NOT NULL,
  alvo_rotulo TEXT NOT NULL,
  detalhes    TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(detalhes))
);

CREATE INDEX audit_events_alvo ON audit_events (alvo_id, ocorrido_em);
CREATE INDEX audit_events_ocorrido ON audit_events (ocorrido_em);

CREATE TRIGGER audit_events_sem_alteracao
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'A auditoria não pode ser alterada');
END;

CREATE TRIGGER audit_events_sem_exclusao
BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'A auditoria não pode ser apagada');
END;
`,
}
