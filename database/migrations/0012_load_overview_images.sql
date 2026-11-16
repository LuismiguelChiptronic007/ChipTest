CREATE TABLE load_overview_images (
  id TEXT PRIMARY KEY NOT NULL,
  overview_id TEXT NOT NULL REFERENCES load_overviews(id) ON DELETE CASCADE,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE CASCADE,
  field TEXT NOT NULL CHECK (field IN ('sga_print_url', 'system_info_url')),
  chave_storage TEXT NOT NULL UNIQUE,
  tipo_mime TEXT NOT NULL CHECK (tipo_mime IN ('image/png', 'image/jpeg', 'image/webp')),
  tamanho_bytes INTEGER NOT NULL CHECK (tamanho_bytes BETWEEN 1 AND 10485760),
  total_partes INTEGER NOT NULL CHECK (total_partes BETWEEN 1 AND 10),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_load_overview_images_overview
  ON load_overview_images(overview_id, field);

CREATE TRIGGER trg_load_overview_image_cleanup
AFTER DELETE ON load_overview_images
BEGIN
  DELETE FROM arquivo_partes WHERE chave_storage = OLD.chave_storage;
END;
