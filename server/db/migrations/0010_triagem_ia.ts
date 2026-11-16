/**
 * IA documental experimental (E11.0): execuções do provedor e sugestões verificadas, separadas
 * dos campos extraídos pelo motor e das correções humanas. Só inserção (nada é alterado nem
 * apagado), uma execução por análise, e o banco garante que nenhuma sugestão tem efeito sobre o
 * resultado nesta etapa (`efeito = 'nenhum'`). A saída bruta do modelo não é guardada, só o hash.
 */
const SO_INSERCAO = (tabela: string, nome: string) => `
CREATE TRIGGER ${tabela}_sem_alteracao BEFORE UPDATE ON ${tabela}
BEGIN SELECT RAISE(ABORT, '${nome} não pode ser alterado'); END;
CREATE TRIGGER ${tabela}_sem_exclusao BEFORE DELETE ON ${tabela}
BEGIN SELECT RAISE(ABORT, '${nome} não pode ser apagado'); END;
`

export const migration0010 = {
  version: 10,
  name: 'triagem_ia',
  sql: `
CREATE TABLE triagem_ia_execucoes (
  id                             TEXT PRIMARY KEY,
  triagem_id                     TEXT NOT NULL REFERENCES triagens (id),
  analise_id                     TEXT NOT NULL UNIQUE REFERENCES triagem_analises (id),
  provedor                       TEXT NOT NULL CHECK (provedor IN ('simulado')),
  modelo_id                      TEXT NOT NULL,
  modelo_versao                  TEXT NOT NULL,
  pesos_sha256                   TEXT,
  prompt_sha256                  TEXT NOT NULL,
  configuracao_versao            TEXT NOT NULL,
  situacao                       TEXT NOT NULL CHECK (situacao IN ('concluida', 'tempo-esgotado', 'memoria-ou-falha', 'saida-invalida', 'indisponivel')),
  iniciada_em                    TEXT NOT NULL,
  encerrada_em                   TEXT NOT NULL,
  duracao_ms                     INTEGER NOT NULL CHECK (duracao_ms >= 0),
  propostas_recebidas            INTEGER NOT NULL CHECK (propostas_recebidas >= 0),
  propostas_invalidas            INTEGER NOT NULL CHECK (propostas_invalidas >= 0),
  propostas_descartadas_limite   INTEGER NOT NULL CHECK (propostas_descartadas_limite >= 0),
  memoria_mb                     INTEGER,
  saida_sha256                   TEXT
);
${SO_INSERCAO('triagem_ia_execucoes', 'A execução da IA')}

CREATE TABLE triagem_ia_sugestoes (
  id                    TEXT PRIMARY KEY,
  execucao_id           TEXT NOT NULL REFERENCES triagem_ia_execucoes (id),
  analise_id            TEXT NOT NULL REFERENCES triagem_analises (id),
  ordem                 INTEGER NOT NULL,
  anexo_id              TEXT REFERENCES triagem_anexos (id),
  anexo_sha256          TEXT NOT NULL,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('classe', 'campo')),
  classe                TEXT,
  campo                 TEXT,
  valor_bruto           TEXT CHECK (valor_bruto IS NULL OR length(valor_bruto) <= 200),
  pagina                INTEGER,
  regioes               TEXT NOT NULL CHECK (json_valid(regioes)),
  trecho                TEXT CHECK (trecho IS NULL OR length(trecho) <= 300),
  fundamento            TEXT CHECK (fundamento IS NULL OR fundamento IN ('texto', 'visual')),
  metodo                TEXT NOT NULL CHECK (metodo = 'modelo-local'),
  confianca_declarada   REAL,
  nivel                 TEXT CHECK (nivel IS NULL OR nivel IN ('A', 'B')),
  situacao              TEXT NOT NULL CHECK (situacao IN ('verificada', 'hipotese-visual', 'recusada')),
  motivo                TEXT NOT NULL,
  relacao_motor         TEXT CHECK (relacao_motor IS NULL OR relacao_motor IN ('preencheria-lacuna', 'confirma-motor', 'diverge-do-motor', 'sem-relacao')),
  efeito                TEXT NOT NULL CHECK (efeito = 'nenhum'),
  CHECK ((situacao = 'verificada') = (nivel IS NOT NULL AND nivel = 'A')),
  CHECK ((situacao = 'hipotese-visual') = (nivel IS NOT NULL AND nivel = 'B')),
  CHECK ((tipo = 'campo') = (campo IS NOT NULL AND classe IS NULL))
);
CREATE INDEX triagem_ia_sugestoes_analise ON triagem_ia_sugestoes (analise_id, ordem);
${SO_INSERCAO('triagem_ia_sugestoes', 'A sugestão da IA')}
`,
}
