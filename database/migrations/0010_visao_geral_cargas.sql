ALTER TABLE ocorrencia_testes ADD COLUMN segment TEXT;
ALTER TABLE ocorrencia_testes ADD COLUMN model TEXT;
ALTER TABLE ocorrencia_testes ADD COLUMN version TEXT;
ALTER TABLE ocorrencia_testes ADD COLUMN load_status TEXT
  CHECK (load_status IS NULL OR load_status IN ('aprovada', 'reprovada'));
ALTER TABLE ocorrencia_testes ADD COLUMN structure_status TEXT
  CHECK (structure_status IS NULL OR structure_status IN ('aprovada', 'reprovada'));
ALTER TABLE ocorrencia_testes ADD COLUMN needs_bench INTEGER
  CHECK (needs_bench IS NULL OR needs_bench IN (0, 1));
ALTER TABLE ocorrencia_testes ADD COLUMN needs_field INTEGER
  CHECK (needs_field IS NULL OR needs_field IN (0, 1));
ALTER TABLE ocorrencia_testes ADD COLUMN bench_solves INTEGER
  CHECK (bench_solves IS NULL OR bench_solves IN (0, 1));

CREATE TABLE ocorrencia_teste_responsaveis (
  test_id TEXT NOT NULL REFERENCES ocorrencia_testes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  PRIMARY KEY (test_id, user_id)
);

INSERT INTO ocorrencia_teste_responsaveis (test_id, user_id)
SELECT id, responsible_id FROM ocorrencia_testes WHERE responsible_id IS NOT NULL;

CREATE INDEX idx_ocorrencia_teste_responsaveis_user
  ON ocorrencia_teste_responsaveis(user_id, test_id);

CREATE TABLE load_overviews (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL UNIQUE REFERENCES codigos(id) ON DELETE CASCADE,
  request_number INTEGER NOT NULL DEFAULT 1 CHECK (request_number > 0),
  launched_on TEXT,
  responsible_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  demand_type TEXT NOT NULL DEFAULT 'novo_sistema'
    CHECK (demand_type IN ('novo_sistema', 'nova_funcao')),
  demand_status TEXT NOT NULL DEFAULT 'campo_com_programador'
    CHECK (demand_status IN ('campo_com_programador', 'campo_sem_programador')),
  sga_print_url TEXT,
  system_info_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE load_overview_docs (
  id TEXT PRIMARY KEY NOT NULL,
  overview_id TEXT NOT NULL REFERENCES load_overviews(id) ON DELETE CASCADE,
  key TEXT NOT NULL CHECK (key IN ('simulacao', 'interpretacao', 'codigo_falhas', 'rg_dsd_12')),
  checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
  UNIQUE (overview_id, key)
);

CREATE TABLE load_functions (
  id TEXT PRIMARY KEY NOT NULL,
  overview_id TEXT NOT NULL REFERENCES load_overviews(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('basico', 'sensores', 'estados', 'parametrizacoes')),
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  print_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (overview_id, category, sequence)
);

CREATE TABLE load_function_rows (
  id TEXT PRIMARY KEY NOT NULL,
  function_id TEXT NOT NULL REFERENCES load_functions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  item TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  value TEXT NOT NULL DEFAULT '',
  UNIQUE (function_id, position)
);

CREATE INDEX idx_load_functions_category
  ON load_functions(overview_id, category, sequence);
CREATE INDEX idx_load_function_rows_position
  ON load_function_rows(function_id, position);

INSERT INTO load_overviews (
  id, codigo_id, request_number, launched_on, demand_type, demand_status,
  sga_print_url, system_info_url
)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
  lower(hex(randomblob(6))), id, 1, NULL, 'novo_sistema', 'campo_com_programador',
  NULL, NULL
FROM codigos;

INSERT INTO load_overview_docs (id, overview_id, key, checked)
SELECT lower(hex(randomblob(16))), o.id, docs.key, 0
FROM load_overviews o
CROSS JOIN (
  SELECT 'simulacao' AS key
  UNION ALL SELECT 'interpretacao'
  UNION ALL SELECT 'codigo_falhas'
  UNION ALL SELECT 'rg_dsd_12'
) docs;

CREATE TRIGGER trg_load_overview_after_codigo_insert
AFTER INSERT ON codigos
BEGIN
  INSERT INTO load_overviews (id, codigo_id, request_number)
  VALUES (
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
      substr(lower(hex(randomblob(2))), 2) || '-' ||
      substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
      lower(hex(randomblob(6))),
    NEW.id,
    1
  );
  INSERT INTO load_overview_docs (id, overview_id, key, checked)
  SELECT lower(hex(randomblob(16))), overview_id, docs.key, 0
  FROM load_overviews
  CROSS JOIN (
    SELECT 'simulacao' AS key
    UNION ALL SELECT 'interpretacao'
    UNION ALL SELECT 'codigo_falhas'
    UNION ALL SELECT 'rg_dsd_12'
  ) docs
  WHERE codigo_id = NEW.id;
END;
