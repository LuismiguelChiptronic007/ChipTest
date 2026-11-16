PRAGMA defer_foreign_keys = ON;

CREATE TABLE load_functions_new (
  id TEXT PRIMARY KEY NOT NULL,
  overview_id TEXT NOT NULL REFERENCES load_overviews(id) ON DELETE CASCADE,
  category TEXT NOT NULL
    CHECK (category IN ('basico', 'sensores', 'atuadores', 'estados', 'ajustes', 'parametrizacoes')),
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  print_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (overview_id, category, sequence)
);

INSERT INTO load_functions_new (id, overview_id, category, sequence, title, print_url, created_at)
SELECT id, overview_id, category, sequence, title, print_url, created_at
FROM load_functions;

CREATE TABLE load_function_rows_new (
  id TEXT PRIMARY KEY NOT NULL,
  function_id TEXT NOT NULL REFERENCES load_functions_new(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  item TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  value TEXT NOT NULL DEFAULT '',
  UNIQUE (function_id, position)
);

INSERT INTO load_function_rows_new (id, function_id, position, item, description, value)
SELECT id, function_id, position, item, description, value
FROM load_function_rows;

DROP TABLE load_function_rows;
DROP TABLE load_functions;

ALTER TABLE load_functions_new RENAME TO load_functions;
ALTER TABLE load_function_rows_new RENAME TO load_function_rows;

CREATE INDEX idx_load_functions_category
  ON load_functions(overview_id, category, sequence);
CREATE INDEX idx_load_function_rows_position
  ON load_function_rows(function_id, position);
