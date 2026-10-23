PRAGMA defer_foreign_keys = ON;

CREATE TABLE importacoes_nova (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE RESTRICT,
  nome_arquivo TEXT NOT NULL CHECK (length(trim(nome_arquivo)) BETWEEN 1 AND 255),
  arquivo_key TEXT UNIQUE CHECK (
    arquivo_key IS NULL OR length(trim(arquivo_key)) BETWEEN 1 AND 512
  ),
  usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  resumo TEXT NOT NULL CHECK (json_valid(resumo)),
  status TEXT NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida', 'falhou')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO importacoes_nova
  (id, codigo_id, nome_arquivo, arquivo_key, usuario_id, resumo, status, criado_em)
SELECT id, codigo_id, nome_arquivo, arquivo_key, usuario_id, resumo, status, criado_em
FROM importacoes;

DROP TABLE importacoes;
ALTER TABLE importacoes_nova RENAME TO importacoes;

CREATE INDEX idx_importacoes_codigo_criado
  ON importacoes(codigo_id, criado_em DESC);

CREATE INDEX idx_importacoes_usuario_criado
  ON importacoes(usuario_id, criado_em DESC);
