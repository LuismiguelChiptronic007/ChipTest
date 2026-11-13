CREATE TABLE ocorrencia_testes (
  id TEXT PRIMARY KEY NOT NULL,
  ocorrencia_id TEXT NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('bancada', 'campo')),
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'aprovado', 'reprovado')),
  tested_at TEXT NOT NULL DEFAULT (datetime('now')),
  responsible_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  result TEXT CHECK (result IS NULL OR length(result) <= 2000),
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 10000),
  created_by TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ocorrencia_id, kind, sequence)
);

CREATE TABLE ocorrencia_teste_anexos (
  id TEXT PRIMARY KEY NOT NULL,
  test_id TEXT NOT NULL REFERENCES ocorrencia_testes(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) BETWEEN 1 AND 255),
  tipo_mime TEXT NOT NULL CHECK (tipo_mime IN (
    'image/png', 'image/jpeg', 'image/webp', 'application/pdf',
    'video/mp4', 'text/plain'
  )),
  tamanho_bytes INTEGER NOT NULL CHECK (tamanho_bytes BETWEEN 1 AND 10485760),
  total_partes INTEGER NOT NULL CHECK (total_partes BETWEEN 1 AND 10),
  status_upload TEXT NOT NULL DEFAULT 'enviando'
    CHECK (status_upload IN ('enviando', 'pronto')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ocorrencia_testes_ocorrencia_kind_recent
  ON ocorrencia_testes(ocorrencia_id, kind, tested_at DESC, sequence DESC);
CREATE INDEX idx_ocorrencia_testes_responsible
  ON ocorrencia_testes(responsible_id) WHERE responsible_id IS NOT NULL;
CREATE INDEX idx_ocorrencia_teste_anexos_test
  ON ocorrencia_teste_anexos(test_id, created_at);
