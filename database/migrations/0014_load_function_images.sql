CREATE TABLE load_function_images (
  function_id TEXT PRIMARY KEY NOT NULL REFERENCES load_functions(id) ON DELETE CASCADE,
  chave_storage TEXT NOT NULL UNIQUE,
  tipo_mime TEXT NOT NULL CHECK (tipo_mime IN ('image/png', 'image/jpeg', 'image/webp')),
  tamanho_bytes INTEGER NOT NULL CHECK (tamanho_bytes BETWEEN 1 AND 10485760),
  total_partes INTEGER NOT NULL CHECK (total_partes BETWEEN 1 AND 10),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER trg_load_function_image_cleanup
AFTER DELETE ON load_function_images
BEGIN
  DELETE FROM arquivo_partes WHERE chave_storage = OLD.chave_storage;
END;
