ALTER TABLE codigos ADD COLUMN atualizado_em TEXT;
ALTER TABLE codigos ADD COLUMN excluido_em TEXT;

UPDATE codigos
SET atualizado_em = criado_em
WHERE atualizado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_codigos_excluido_criado_em
  ON codigos(excluido_em, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_codigos_criado_por
  ON codigos(criado_por);

CREATE TABLE IF NOT EXISTS codigos_demo_seed (
  codigo_id TEXT PRIMARY KEY NOT NULL REFERENCES codigos(id) ON DELETE CASCADE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
