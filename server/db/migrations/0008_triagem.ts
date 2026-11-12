/**
 * Persistência da triagem documental experimental (E7). Regras garantidas pelo próprio banco:
 * - processo com id estável e autoria imutável; nunca excluído;
 * - cada anexo com SHA-256 e metadados imutáveis; o conteúdo cifrado só pode passar de
 *   "armazenado" a "expurgado";
 * - cada análise numerada, ligada à versão do catálogo e do motor e aos hashes dos anexos; depois de
 *   encerrada, não muda mais;
 * - leituras, classificações, campos, avaliações, evidências, confirmações, revisões e eventos são
 *   só de inserção: correção gera registro novo, nada é apagado.
 *
 * Nunca edite uma migração já commitada: crie a próxima.
 */

const SO_INSERCAO = (tabela: string, nome: string) => `
CREATE TRIGGER ${tabela}_sem_alteracao BEFORE UPDATE ON ${tabela}
BEGIN SELECT RAISE(ABORT, '${nome} não pode ser alterado: registre uma correção nova'); END;
CREATE TRIGGER ${tabela}_sem_exclusao BEFORE DELETE ON ${tabela}
BEGIN SELECT RAISE(ABORT, '${nome} não pode ser apagado'); END;
`

export const migration0008 = {
  version: 8,
  name: 'triagem',
  sql: `
CREATE TABLE triagem_versoes (
  id              TEXT PRIMARY KEY,
  motor_versao    TEXT NOT NULL,
  catalogo_versao TEXT NOT NULL,
  catalogo_sha256 TEXT NOT NULL CHECK (length(catalogo_sha256) = 64),
  registrada_em   TEXT NOT NULL,
  UNIQUE (motor_versao, catalogo_versao, catalogo_sha256)
);
${SO_INSERCAO('triagem_versoes', 'A versão do motor e do catálogo')}

CREATE TABLE triagens (
  id                  TEXT PRIMARY KEY,
  referencia          TEXT CHECK (referencia IS NULL OR length(referencia) <= 100),
  modo                TEXT NOT NULL CHECK (modo IN ('experimental-sintetico')),
  protocolado_em      TEXT NOT NULL,
  criada_por          TEXT NOT NULL REFERENCES accounts (id),
  criada_em           TEXT NOT NULL,
  chave_idempotencia  TEXT CHECK (chave_idempotencia IS NULL OR length(chave_idempotencia) BETWEEN 8 AND 100),
  situacao            TEXT NOT NULL CHECK (situacao IN ('recebido', 'processando', 'aguardando-revisao', 'revisado', 'falhou')),
  analise_atual       INTEGER,
  versao              INTEGER NOT NULL DEFAULT 1 CHECK (versao >= 1),
  atualizada_em       TEXT NOT NULL,
  retencao_ate        TEXT NOT NULL,
  UNIQUE (criada_por, chave_idempotencia)
);
CREATE INDEX triagens_criada_por ON triagens (criada_por, criada_em);
CREATE INDEX triagens_situacao ON triagens (situacao);

CREATE TRIGGER triagens_identidade_imutavel
BEFORE UPDATE OF id, referencia, modo, protocolado_em, criada_por, criada_em, chave_idempotencia, retencao_ate ON triagens
BEGIN SELECT RAISE(ABORT, 'A identificação de um processo de triagem não pode ser alterada'); END;
CREATE TRIGGER triagens_versao_crescente
BEFORE UPDATE OF versao ON triagens WHEN NEW.versao <> OLD.versao + 1
BEGIN SELECT RAISE(ABORT, 'A versão do processo só avança de um em um'); END;
CREATE TRIGGER triagens_sem_exclusao BEFORE DELETE ON triagens
BEGIN SELECT RAISE(ABORT, 'Processos de triagem não são excluídos'); END;

CREATE TABLE triagem_anexos (
  id               TEXT PRIMARY KEY,
  triagem_id       TEXT NOT NULL REFERENCES triagens (id),
  ordem            INTEGER NOT NULL CHECK (ordem >= 1),
  nome             TEXT NOT NULL CHECK (length(nome) BETWEEN 1 AND 255),
  sha256           TEXT NOT NULL CHECK (length(sha256) = 64),
  bytes            INTEGER NOT NULL CHECK (bytes >= 0),
  recebido_em      TEXT NOT NULL,
  conteudo         TEXT NOT NULL CHECK (conteudo IN ('nao-armazenado', 'armazenado', 'expurgado')),
  conteudo_ref     TEXT,
  expurgado_em     TEXT,
  UNIQUE (triagem_id, ordem)
);
CREATE INDEX triagem_anexos_conteudo ON triagem_anexos (conteudo);
CREATE TRIGGER triagem_anexos_metadados_imutaveis
BEFORE UPDATE OF id, triagem_id, ordem, nome, sha256, bytes, recebido_em ON triagem_anexos
BEGIN SELECT RAISE(ABORT, 'Os metadados de um anexo não podem ser alterados'); END;
CREATE TRIGGER triagem_anexos_so_expurgo
BEFORE UPDATE OF conteudo ON triagem_anexos
WHEN NOT (OLD.conteudo = 'armazenado' AND NEW.conteudo = 'expurgado')
BEGIN SELECT RAISE(ABORT, 'O conteúdo de um anexo só pode passar de armazenado a expurgado'); END;
CREATE TRIGGER triagem_anexos_sem_exclusao BEFORE DELETE ON triagem_anexos
BEGIN SELECT RAISE(ABORT, 'Anexos não são excluídos; o conteúdo é expurgado'); END;

CREATE TABLE triagem_analises (
  id               TEXT PRIMARY KEY,
  triagem_id       TEXT NOT NULL REFERENCES triagens (id),
  numero           INTEGER NOT NULL CHECK (numero >= 1),
  motivo           TEXT NOT NULL CHECK (motivo IN ('inicial', 'reprocessamento', 'retomada')),
  situacao         TEXT NOT NULL CHECK (situacao IN ('processando', 'concluida', 'falhou', 'interrompida')),
  versao_id        TEXT NOT NULL REFERENCES triagem_versoes (id),
  anexos_sha256    TEXT NOT NULL CHECK (json_valid(anexos_sha256)),
  entrada          TEXT NOT NULL CHECK (json_valid(entrada)),
  base_analise     INTEGER,
  iniciada_por     TEXT NOT NULL REFERENCES accounts (id),
  iniciada_em      TEXT NOT NULL,
  encerrada_em     TEXT,
  falha            TEXT,
  resultado        TEXT CHECK (resultado IS NULL OR json_valid(resultado)),
  UNIQUE (triagem_id, numero)
);
CREATE TRIGGER triagem_analises_encerrada_imutavel
BEFORE UPDATE ON triagem_analises WHEN OLD.situacao <> 'processando'
BEGIN SELECT RAISE(ABORT, 'Uma análise encerrada não pode ser alterada: reprocesse para gerar outra'); END;
CREATE TRIGGER triagem_analises_identidade_imutavel
BEFORE UPDATE OF id, triagem_id, numero, motivo, versao_id, anexos_sha256, entrada, base_analise, iniciada_por, iniciada_em ON triagem_analises
BEGIN SELECT RAISE(ABORT, 'A identificação de uma análise não pode ser alterada'); END;
CREATE TRIGGER triagem_analises_sem_exclusao BEFORE DELETE ON triagem_analises
BEGIN SELECT RAISE(ABORT, 'Análises não são apagadas'); END;

CREATE TABLE triagem_leituras (
  analise_id  TEXT NOT NULL REFERENCES triagem_analises (id),
  anexo_id    TEXT NOT NULL REFERENCES triagem_anexos (id),
  estado      TEXT NOT NULL CHECK (json_valid(estado)),
  PRIMARY KEY (analise_id, anexo_id)
);
${SO_INSERCAO('triagem_leituras', 'A leitura de um anexo')}

CREATE TABLE triagem_classificacoes (
  analise_id    TEXT NOT NULL REFERENCES triagem_analises (id),
  anexo_id      TEXT NOT NULL REFERENCES triagem_anexos (id),
  classe        TEXT NOT NULL,
  confianca     TEXT NOT NULL CHECK (confianca IN ('alta', 'media', 'baixa')),
  metodo        TEXT NOT NULL,
  alternativas  TEXT NOT NULL CHECK (json_valid(alternativas)),
  justificativa TEXT NOT NULL,
  composto      INTEGER NOT NULL CHECK (composto IN (0, 1)),
  PRIMARY KEY (analise_id, anexo_id)
);
${SO_INSERCAO('triagem_classificacoes', 'A classificação')}

CREATE TABLE triagem_campos (
  analise_id        TEXT NOT NULL REFERENCES triagem_analises (id),
  campo_id          TEXT NOT NULL,
  anexo_id          TEXT NOT NULL REFERENCES triagem_anexos (id),
  campo             TEXT NOT NULL,
  estado            TEXT NOT NULL CHECK (estado IN ('encontrado', 'nao-encontrado', 'ilegivel', 'varios-valores', 'nao-aplicavel')),
  valor_bruto       TEXT,
  valor_normalizado TEXT CHECK (valor_normalizado IS NULL OR json_valid(valor_normalizado)),
  unidade           TEXT,
  alternativas      TEXT CHECK (alternativas IS NULL OR json_valid(alternativas)),
  confianca         REAL NOT NULL CHECK (confianca BETWEEN 0 AND 1),
  metodo            TEXT NOT NULL,
  corrigido_por     TEXT,
  PRIMARY KEY (analise_id, campo_id)
);
${SO_INSERCAO('triagem_campos', 'O campo extraído')}

CREATE TABLE triagem_avaliacoes (
  analise_id          TEXT NOT NULL REFERENCES triagem_analises (id),
  regra_id            TEXT NOT NULL,
  regra_versao        TEXT NOT NULL,
  resultado           TEXT NOT NULL CHECK (resultado IN ('sem-achado', 'achado', 'nao-avaliavel', 'condicao-pendente', 'nao-aplicavel')),
  tipo                TEXT,
  severidade          TEXT NOT NULL,
  confianca           TEXT NOT NULL,
  rascunho            TEXT NOT NULL,
  motivo              TEXT,
  conteudo            TEXT NOT NULL CHECK (json_valid(conteudo)),
  recalculada         INTEGER NOT NULL CHECK (recalculada IN (0, 1)),
  origem_analise      INTEGER,
  PRIMARY KEY (analise_id, regra_id)
);
${SO_INSERCAO('triagem_avaliacoes', 'A avaliação de regra')}

CREATE TABLE triagem_evidencias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  analise_id  TEXT NOT NULL REFERENCES triagem_analises (id),
  dono_tipo   TEXT NOT NULL CHECK (dono_tipo IN ('classificacao', 'campo', 'avaliacao')),
  dono_id     TEXT NOT NULL,
  anexo_id    TEXT NOT NULL,
  sha256      TEXT NOT NULL CHECK (length(sha256) = 64),
  pagina      INTEGER,
  regioes     TEXT CHECK (regioes IS NULL OR json_valid(regioes)),
  trecho      TEXT CHECK (trecho IS NULL OR length(trecho) <= 500),
  origem      TEXT NOT NULL
);
CREATE INDEX triagem_evidencias_dono ON triagem_evidencias (analise_id, dono_tipo, dono_id);
${SO_INSERCAO('triagem_evidencias', 'A evidência')}

CREATE TABLE triagem_confirmacoes (
  id             TEXT PRIMARY KEY,
  triagem_id     TEXT NOT NULL REFERENCES triagens (id),
  tipo           TEXT NOT NULL CHECK (tipo IN ('modalidade', 'etapa', 'integridade', 'condicao')),
  chave          TEXT NOT NULL,
  valor          TEXT NOT NULL CHECK (json_valid(valor)),
  justificativa  TEXT NOT NULL CHECK (length(justificativa) <= 2000),
  autor_id       TEXT NOT NULL REFERENCES accounts (id),
  autor_rotulo   TEXT NOT NULL,
  em             TEXT NOT NULL,
  CHECK (tipo <> 'integridade' OR length(trim(justificativa)) >= 5)
);
CREATE INDEX triagem_confirmacoes_triagem ON triagem_confirmacoes (triagem_id, em);
${SO_INSERCAO('triagem_confirmacoes', 'A confirmação de servidor')}

CREATE TABLE triagem_revisoes (
  id                 TEXT PRIMARY KEY,
  triagem_id         TEXT NOT NULL REFERENCES triagens (id),
  analise_id         TEXT NOT NULL REFERENCES triagem_analises (id),
  regra_id           TEXT,
  campo_id           TEXT,
  decisao            TEXT NOT NULL CHECK (decisao IN ('confirmado', 'descartado', 'corrigido', 'encaminhado')),
  justificativa      TEXT NOT NULL CHECK (length(justificativa) <= 2000),
  correcao           TEXT CHECK (correcao IS NULL OR json_valid(correcao)),
  revisor_id         TEXT NOT NULL REFERENCES accounts (id),
  revisor_rotulo     TEXT NOT NULL,
  em                 TEXT NOT NULL,
  CHECK (decisao NOT IN ('descartado', 'corrigido') OR length(trim(justificativa)) >= 5),
  CHECK ((decisao = 'corrigido') = (campo_id IS NOT NULL AND correcao IS NOT NULL)),
  CHECK (decisao = 'corrigido' OR regra_id IS NOT NULL)
);
CREATE INDEX triagem_revisoes_triagem ON triagem_revisoes (triagem_id, em);
${SO_INSERCAO('triagem_revisoes', 'A revisão humana')}

CREATE TABLE triagem_eventos (
  id           TEXT PRIMARY KEY,
  ocorrido_em  TEXT NOT NULL,
  triagem_id   TEXT REFERENCES triagens (id),
  ator_id      TEXT REFERENCES accounts (id),
  ator_rotulo  TEXT NOT NULL,
  acao         TEXT NOT NULL CHECK (acao IN (
    'triagem.criada', 'analise.iniciada', 'analise.concluida', 'analise.falhou', 'analise.interrompida',
    'confirmacao.registrada', 'revisao.registrada', 'reprocessamento.solicitado',
    'conteudo.acessado', 'conteudo.expurgado', 'acesso.negado'
  )),
  detalhes     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(detalhes))
);
CREATE INDEX triagem_eventos_triagem ON triagem_eventos (triagem_id, ocorrido_em);
${SO_INSERCAO('triagem_eventos', 'O evento de auditoria da triagem')}
`,
}
