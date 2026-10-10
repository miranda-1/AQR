/**
 * 1) Sessão por inatividade: `last_seen_at` guarda o último uso (ms). A sessão cai depois de 30 min
 *    sem uso e, em qualquer caso, 8 h depois do login (`expires_at`). Sessões abertas contam a partir de agora.
 * 2) Comparações: nada do conteúdo nem os nomes dos arquivos ficam guardados; o registro diz só quem
 *    comparou, quando e o resultado. Os nomes já gravados são apagados com as colunas.
 * 3) Retenção: o registro das comparações só pode ser apagado depois de 1 ano (o servidor apaga
 *    sozinho); antes disso continua só de inserção.
 */
export const migration0006 = {
  version: 6,
  name: 'inatividade_e_comparacoes_sem_nomes',
  sql: `
ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0;
UPDATE sessions SET last_seen_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000;

ALTER TABLE comparison_events DROP COLUMN arquivo_original;
ALTER TABLE comparison_events DROP COLUMN arquivo_atualizado;

DROP TRIGGER comparison_events_sem_exclusao;
CREATE TRIGGER comparison_events_sem_exclusao
BEFORE DELETE ON comparison_events
WHEN OLD.ocorrido_em >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')
BEGIN
  SELECT RAISE(ABORT, 'A auditoria das comparações só pode ser apagada depois de 1 ano');
END;
`,
}
