/**
 * Revisão que mantém, numa análise nova, a decisão humana tomada numa análise anterior sobre um
 * achado idêntico. É uma revisão nova (feita por uma pessoa, com autor e data); `base_revisao_id`
 * só registra de onde ela veio. A revisão original continua intacta na análise em que foi feita.
 * A coluna nasce nula para todas as revisões existentes; as tabelas continuam só de inserção.
 */
export const migration0009 = {
  version: 9,
  name: 'revisao_mantida',
  sql: `
ALTER TABLE triagem_revisoes ADD COLUMN base_revisao_id TEXT REFERENCES triagem_revisoes (id);
CREATE INDEX triagem_revisoes_base ON triagem_revisoes (base_revisao_id);
`,
}
