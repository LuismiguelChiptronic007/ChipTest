CREATE TABLE testes_nova (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('bancada', 'campo')),
  numero INTEGER NOT NULL CHECK (numero > 0),
  responsavel_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  veiculo_info TEXT,
  data_inicio TEXT NOT NULL DEFAULT (datetime('now')),
  data_fim TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento', 'aprovado', 'reprovado', 'cancelado')),
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (codigo_id, tipo, numero)
);

INSERT INTO testes_nova (
  id, codigo_id, tipo, numero, responsavel_id, veiculo_info,
  data_inicio, data_fim, status, observacoes, criado_em
)
SELECT
  id, codigo_id, tipo, numero, responsavel_id, NULL,
  COALESCE(criado_em, data || ' 00:00:00'),
  CASE WHEN status = 'em_andamento' THEN NULL ELSE criado_em END,
  status, observacoes, criado_em
FROM testes;

CREATE TABLE teste_itens_nova (
  id TEXT PRIMARY KEY NOT NULL,
  teste_id TEXT NOT NULL REFERENCES testes_nova(id) ON DELETE CASCADE,
  codigo_item_id TEXT REFERENCES codigo_itens(id) ON DELETE SET NULL,
  tipo_secao TEXT NOT NULL CHECK (tipo_secao IN (
    'dados_central', 'sensores', 'estados', 'falhas', 'atuadores',
    'ajuste', 'parametrizacao', 'funcao_avancada'
  )),
  nome_snapshot TEXT NOT NULL CHECK (length(trim(nome_snapshot)) > 0),
  ordem INTEGER NOT NULL CHECK (ordem > 0),
  resultado TEXT NOT NULL DEFAULT 'nao_testado'
    CHECK (resultado IN ('nao_testado', 'aprovado', 'reprovado', 'nao_se_aplica')),
  observacao TEXT,
  testado_por TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  testado_em TEXT
);

INSERT INTO teste_itens_nova (
  id, teste_id, codigo_item_id, tipo_secao, nome_snapshot, ordem,
  resultado, observacao, testado_por, testado_em
)
SELECT
  id, teste_id, NULL, tipo_secao,
  'Registro legado da seção: ' || tipo_secao,
  ROW_NUMBER() OVER (PARTITION BY teste_id ORDER BY tipo_secao, id),
  CASE resultado WHEN 'nao_testado' THEN 'nao_testado' ELSE resultado END,
  observacao, NULL, NULL
FROM teste_itens;

CREATE TABLE ocorrencias_nova (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE RESTRICT,
  teste_id TEXT REFERENCES testes_nova(id) ON DELETE RESTRICT,
  titulo TEXT NOT NULL CHECK (length(trim(titulo)) > 0),
  descricao TEXT NOT NULL CHECK (length(trim(descricao)) > 0),
  gravidade TEXT NOT NULL DEFAULT 'baixa' CHECK (gravidade IN ('baixa', 'media', 'alta')),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'resolvida')),
  relatado_por TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO ocorrencias_nova
  (id, codigo_id, teste_id, titulo, descricao, gravidade, status, relatado_por, criado_em)
SELECT id, codigo_id, teste_id, titulo, descricao, gravidade, status, relatado_por, criado_em
FROM ocorrencias;

CREATE TABLE anexos_nova (
  id TEXT PRIMARY KEY NOT NULL,
  ocorrencia_id TEXT REFERENCES ocorrencias_nova(id) ON DELETE CASCADE,
  teste_id TEXT REFERENCES testes_nova(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (length(trim(url)) > 0),
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((ocorrencia_id IS NOT NULL AND teste_id IS NULL) OR
         (ocorrencia_id IS NULL AND teste_id IS NOT NULL))
);

INSERT INTO anexos_nova (id, ocorrencia_id, teste_id, url, nome, criado_em)
SELECT id, ocorrencia_id, teste_id, url, nome, criado_em FROM anexos;

DROP TABLE anexos;
DROP TABLE ocorrencias;
DROP TABLE teste_itens;
DROP TABLE testes;

ALTER TABLE testes_nova RENAME TO testes;
ALTER TABLE ocorrencias_nova RENAME TO ocorrencias;
ALTER TABLE anexos_nova RENAME TO anexos;
ALTER TABLE teste_itens_nova RENAME TO teste_itens;

CREATE INDEX idx_testes_codigo_tipo_data ON testes(codigo_id, tipo, data_inicio DESC);
CREATE INDEX idx_testes_responsavel_id ON testes(responsavel_id);
CREATE INDEX idx_testes_status ON testes(status);
CREATE INDEX idx_teste_itens_teste_ordem ON teste_itens(teste_id, ordem, id);
CREATE INDEX idx_teste_itens_codigo_item ON teste_itens(codigo_item_id) WHERE codigo_item_id IS NOT NULL;
CREATE INDEX idx_ocorrencias_codigo_criado_em ON ocorrencias(codigo_id, criado_em DESC);
CREATE INDEX idx_ocorrencias_status_gravidade ON ocorrencias(status, gravidade);
CREATE INDEX idx_ocorrencias_teste_id ON ocorrencias(teste_id) WHERE teste_id IS NOT NULL;
CREATE INDEX idx_anexos_ocorrencia_id ON anexos(ocorrencia_id) WHERE ocorrencia_id IS NOT NULL;
CREATE INDEX idx_anexos_teste_id ON anexos(teste_id) WHERE teste_id IS NOT NULL;
