PRAGMA defer_foreign_keys = ON;

CREATE TABLE ocorrencias_nova (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE RESTRICT,
  teste_id TEXT REFERENCES testes(id) ON DELETE RESTRICT,
  teste_item_id TEXT REFERENCES teste_itens(id) ON DELETE SET NULL,
  codigo_item_id TEXT REFERENCES codigo_itens(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 180),
  descricao TEXT NOT NULL CHECK (length(trim(descricao)) BETWEEN 3 AND 10000),
  gravidade TEXT NOT NULL DEFAULT 'baixa'
    CHECK (gravidade IN ('baixa', 'media', 'alta', 'critica')),
  status TEXT NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'em_analise', 'resolvida', 'descartada')),
  relatado_por TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  responsavel_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  resolucao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  resolvido_em TEXT
);

INSERT INTO ocorrencias_nova (
  id, codigo_id, teste_id, teste_item_id, codigo_item_id, titulo, descricao,
  gravidade, status, relatado_por, responsavel_id, resolucao, criado_em,
  atualizado_em, resolvido_em
)
SELECT
  id, codigo_id, teste_id, NULL, NULL, titulo, descricao, gravidade, status,
  relatado_por, NULL, NULL, criado_em, criado_em,
  CASE WHEN status = 'resolvida' THEN criado_em ELSE NULL END
FROM ocorrencias;

CREATE TABLE anexos_legados AS SELECT * FROM anexos;
DROP TABLE anexos;
DROP TABLE ocorrencias;
ALTER TABLE ocorrencias_nova RENAME TO ocorrencias;

CREATE TABLE anexos (
  id TEXT PRIMARY KEY NOT NULL,
  ocorrencia_id TEXT NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  nome_original TEXT NOT NULL CHECK (length(trim(nome_original)) BETWEEN 1 AND 255),
  chave_storage TEXT NOT NULL UNIQUE CHECK (length(trim(chave_storage)) BETWEEN 1 AND 128),
  tipo_mime TEXT NOT NULL CHECK (tipo_mime IN (
    'image/png', 'image/jpeg', 'image/webp', 'application/pdf',
    'video/mp4', 'text/plain'
  )),
  tamanho_bytes INTEGER NOT NULL CHECK (tamanho_bytes BETWEEN 1 AND 10485760),
  enviado_por TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  total_partes INTEGER NOT NULL CHECK (total_partes BETWEEN 1 AND 10),
  status_upload TEXT NOT NULL DEFAULT 'enviando'
    CHECK (status_upload IN ('enviando', 'pronto')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE arquivo_partes (
  chave_storage TEXT NOT NULL CHECK (length(trim(chave_storage)) BETWEEN 1 AND 128),
  numero_parte INTEGER NOT NULL CHECK (numero_parte BETWEEN 0 AND 9),
  conteudo_base64 TEXT NOT NULL,
  PRIMARY KEY (chave_storage, numero_parte)
);

CREATE TABLE ocorrencia_comentarios (
  id TEXT PRIMARY KEY NOT NULL,
  ocorrencia_id TEXT NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  texto TEXT NOT NULL CHECK (length(trim(texto)) BETWEEN 1 AND 4000),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ocorrencias_codigo_id ON ocorrencias(codigo_id, criado_em DESC);
CREATE INDEX idx_ocorrencias_status ON ocorrencias(status, criado_em DESC);
CREATE INDEX idx_ocorrencias_gravidade ON ocorrencias(gravidade, criado_em DESC);
CREATE INDEX idx_ocorrencias_teste_id ON ocorrencias(teste_id) WHERE teste_id IS NOT NULL;
CREATE INDEX idx_ocorrencias_responsavel_id ON ocorrencias(responsavel_id) WHERE responsavel_id IS NOT NULL;
CREATE INDEX idx_ocorrencia_comentarios_timeline
  ON ocorrencia_comentarios(ocorrencia_id, criado_em, id);
CREATE INDEX idx_anexos_ocorrencia_id ON anexos(ocorrencia_id, criado_em);
CREATE INDEX idx_arquivo_partes_storage ON arquivo_partes(chave_storage, numero_parte);
