CREATE TABLE IF NOT EXISTS importacoes (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE RESTRICT,
  nome_arquivo TEXT NOT NULL CHECK (length(trim(nome_arquivo)) BETWEEN 1 AND 255),
  arquivo_key TEXT NOT NULL UNIQUE CHECK (length(trim(arquivo_key)) BETWEEN 1 AND 512),
  usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  resumo TEXT NOT NULL CHECK (json_valid(resumo)),
  status TEXT NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida', 'falhou')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS codigo_secoes_versoes (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_secao_id TEXT NOT NULL REFERENCES codigo_secoes(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL CHECK (versao > 0),
  conteudo TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  importacao_id TEXT REFERENCES importacoes(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (codigo_secao_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_importacoes_codigo_criado
  ON importacoes(codigo_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_importacoes_usuario_criado
  ON importacoes(usuario_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_codigo_secoes_versoes_secao
  ON codigo_secoes_versoes(codigo_secao_id, versao DESC);
