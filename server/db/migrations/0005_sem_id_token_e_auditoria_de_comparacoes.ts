/**
 * 1) O `id_token` deixa de ser guardado: sessões antigas (com token) são apagadas e a coluna removida.
 *    O encerramento no Keycloak passa a ser feito pelo backend com a credencial de serviço.
 * 2) Auditoria das comparações de PDF: quem comparou, quando, quais arquivos (só os nomes, nunca o
 *    conteúdo) e o resultado. Só inserção, como a auditoria de contas.
 */
export const migration0005 = {
  version: 5,
  name: 'sem_id_token_e_auditoria_de_comparacoes',
  sql: `
DELETE FROM sessions;
ALTER TABLE sessions DROP COLUMN id_token;

CREATE TABLE comparison_events (
  id                  TEXT PRIMARY KEY,
  ocorrido_em         TEXT NOT NULL,
  evento              TEXT NOT NULL CHECK (evento IN ('comparacao.enviada', 'comparacao.concluida', 'comparacao.falhou')),
  conta_id            TEXT REFERENCES accounts (id),
  usuario             TEXT,
  comparacao_id       TEXT NOT NULL,
  arquivo_original    TEXT,
  arquivo_atualizado  TEXT,
  diferencas          INTEGER,
  detalhe             TEXT
);

CREATE INDEX comparison_events_ocorrido ON comparison_events (ocorrido_em);
CREATE INDEX comparison_events_conta ON comparison_events (conta_id, ocorrido_em);

CREATE TRIGGER comparison_events_sem_alteracao
BEFORE UPDATE ON comparison_events
BEGIN
  SELECT RAISE(ABORT, 'A auditoria das comparações não pode ser alterada');
END;

CREATE TRIGGER comparison_events_sem_exclusao
BEFORE DELETE ON comparison_events
BEGIN
  SELECT RAISE(ABORT, 'A auditoria das comparações não pode ser apagada');
END;
`,
}
