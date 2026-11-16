DROP TABLE IF EXISTS load_function_images;

CREATE TABLE load_function_import_rows (
  id TEXT PRIMARY KEY NOT NULL,
  overview_id TEXT NOT NULL REFERENCES load_overviews(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'basico', 'sensores', 'estados', 'atuadores', 'ajustes', 'parametrizacoes', 'funcao_avancada'
  )),
  position INTEGER NOT NULL CHECK (position > 0),
  version_ontime TEXT NOT NULL DEFAULT '',
  function_type TEXT NOT NULL,
  function_dieseldiag TEXT NOT NULL DEFAULT '',
  equipment_base TEXT NOT NULL DEFAULT '',
  developed TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (overview_id, category, position)
);

CREATE INDEX idx_load_function_import_rows_overview
  ON load_function_import_rows(overview_id, category, position);
