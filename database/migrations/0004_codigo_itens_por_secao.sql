CREATE TABLE codigo_secoes_nova (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE CASCADE,
  tipo_secao TEXT NOT NULL CHECK (tipo_secao IN (
    'dados_central', 'sensores', 'estados', 'falhas', 'atuadores',
    'ajuste', 'parametrizacao', 'funcao_avancada'
  )),
  conteudo TEXT NOT NULL DEFAULT '',
  versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (codigo_id, tipo_secao)
);

INSERT INTO codigo_secoes_nova (id, codigo_id, tipo_secao, conteudo, versao, atualizado_em)
SELECT id, codigo_id,
  CASE tipo_secao
    WHEN 'dados_informacao_central' THEN 'dados_central'
    WHEN 'sensores_estados' THEN 'sensores'
    ELSE tipo_secao
  END,
  conteudo, versao, atualizado_em
FROM codigo_secoes;

CREATE TABLE codigo_secoes_versoes_nova (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_secao_id TEXT NOT NULL REFERENCES codigo_secoes_nova(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL CHECK (versao > 0),
  conteudo TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  importacao_id TEXT REFERENCES importacoes(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (codigo_secao_id, versao)
);

INSERT INTO codigo_secoes_versoes_nova
  (id, codigo_secao_id, versao, conteudo, atualizado_em, importacao_id, criado_em)
SELECT id, codigo_secao_id, versao, conteudo, atualizado_em, importacao_id, criado_em
FROM codigo_secoes_versoes;

DROP TABLE codigo_secoes_versoes;
DROP TABLE codigo_secoes;
ALTER TABLE codigo_secoes_nova RENAME TO codigo_secoes;
ALTER TABLE codigo_secoes_versoes_nova RENAME TO codigo_secoes_versoes;

CREATE INDEX idx_codigo_secoes_codigo_id ON codigo_secoes(codigo_id);
CREATE INDEX idx_codigo_secoes_versoes_secao ON codigo_secoes_versoes(codigo_secao_id, versao DESC);

CREATE TABLE teste_itens_nova (
  id TEXT PRIMARY KEY NOT NULL,
  teste_id TEXT NOT NULL REFERENCES testes(id) ON DELETE CASCADE,
  tipo_secao TEXT NOT NULL CHECK (tipo_secao IN (
    'dados_central', 'sensores', 'estados', 'falhas', 'atuadores',
    'ajuste', 'parametrizacao', 'funcao_avancada'
  )),
  resultado TEXT NOT NULL DEFAULT 'nao_testado'
    CHECK (resultado IN ('aprovado', 'reprovado', 'nao_testado')),
  observacao TEXT,
  UNIQUE (teste_id, tipo_secao)
);

INSERT INTO teste_itens_nova (id, teste_id, tipo_secao, resultado, observacao)
SELECT id, teste_id,
  CASE tipo_secao
    WHEN 'dados_informacao_central' THEN 'dados_central'
    WHEN 'sensores_estados' THEN 'sensores'
    ELSE tipo_secao
  END,
  resultado, observacao
FROM teste_itens;

DROP TABLE teste_itens;
ALTER TABLE teste_itens_nova RENAME TO teste_itens;
CREATE INDEX idx_teste_itens_teste_id ON teste_itens(teste_id);

CREATE TABLE codigo_itens (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE CASCADE,
  tipo_secao TEXT NOT NULL CHECK (tipo_secao IN (
    'dados_central', 'sensores', 'estados', 'falhas', 'atuadores',
    'ajuste', 'parametrizacao', 'funcao_avancada'
  )),
  nome_completo TEXT NOT NULL CHECK (length(trim(nome_completo)) > 0),
  nome_original TEXT NOT NULL CHECK (length(trim(nome_original)) > 0),
  nome_pt TEXT,
  ordem INTEGER NOT NULL CHECK (ordem > 0),
  versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
  importacao_id TEXT REFERENCES importacoes(id) ON DELETE SET NULL,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_codigo_itens_codigo_secao_ativo_ordem
  ON codigo_itens(codigo_id, tipo_secao, ativo, ordem);
CREATE INDEX idx_codigo_itens_importacao
  ON codigo_itens(importacao_id) WHERE importacao_id IS NOT NULL;
