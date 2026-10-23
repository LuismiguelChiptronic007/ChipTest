PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS setores (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL UNIQUE CHECK (length(trim(nome)) > 0),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO setores (id, nome) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Administração'),
  ('22222222-2222-4222-8222-222222222222', 'Engenharia'),
  ('33333333-3333-4333-8333-333333333333', 'Bancada'),
  ('44444444-4444-4444-8444-444444444444', 'Campo');

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL CHECK (length(trim(nome)) BETWEEN 2 AND 120),
  email TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(email)) BETWEEN 3 AND 254),
  setor_id TEXT NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
  papel TEXT NOT NULL DEFAULT 'campo'
    CHECK (papel IN ('admin', 'engenharia', 'bancada', 'campo')),
  ativo INTEGER NOT NULL DEFAULT 0 CHECK (ativo IN (0, 1)),
  senha_hash TEXT NOT NULL,
  token_redefinicao_hash TEXT,
  token_redefinicao_expira_em INTEGER,
  versao_sessao INTEGER NOT NULL DEFAULT 0 CHECK (versao_sessao >= 0),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS codigos (
  id TEXT PRIMARY KEY NOT NULL,
  codigo TEXT NOT NULL UNIQUE CHECK (length(trim(codigo)) > 0),
  marca TEXT NOT NULL CHECK (length(trim(marca)) > 0),
  modelo TEXT NOT NULL CHECK (length(trim(modelo)) > 0),
  motor TEXT,
  ano INTEGER CHECK (ano IS NULL OR ano BETWEEN 1886 AND 2200),
  observacoes TEXT,
  criado_por TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS codigo_secoes (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE CASCADE,
  tipo_secao TEXT NOT NULL CHECK (tipo_secao IN (
    'dados_informacao_central', 'sensores_estados', 'falhas', 'atuadores',
    'ajuste', 'parametrizacao', 'funcao_avancada'
  )),
  conteudo TEXT NOT NULL DEFAULT '',
  versao INTEGER NOT NULL DEFAULT 1 CHECK (versao > 0),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (codigo_id, tipo_secao)
);

CREATE TABLE IF NOT EXISTS testes (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('bancada', 'campo')),
  numero INTEGER NOT NULL CHECK (numero > 0),
  responsavel_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  data TEXT NOT NULL DEFAULT (date('now')),
  status TEXT NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento', 'aprovado', 'reprovado')),
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (codigo_id, tipo, numero)
);

CREATE TABLE IF NOT EXISTS teste_itens (
  id TEXT PRIMARY KEY NOT NULL,
  teste_id TEXT NOT NULL REFERENCES testes(id) ON DELETE CASCADE,
  tipo_secao TEXT NOT NULL CHECK (tipo_secao IN (
    'dados_informacao_central', 'sensores_estados', 'falhas', 'atuadores',
    'ajuste', 'parametrizacao', 'funcao_avancada'
  )),
  resultado TEXT NOT NULL DEFAULT 'nao_testado'
    CHECK (resultado IN ('aprovado', 'reprovado', 'nao_testado')),
  observacao TEXT,
  UNIQUE (teste_id, tipo_secao)
);

CREATE TABLE IF NOT EXISTS ocorrencias (
  id TEXT PRIMARY KEY NOT NULL,
  codigo_id TEXT NOT NULL REFERENCES codigos(id) ON DELETE RESTRICT,
  teste_id TEXT REFERENCES testes(id) ON DELETE RESTRICT,
  titulo TEXT NOT NULL CHECK (length(trim(titulo)) > 0),
  descricao TEXT NOT NULL CHECK (length(trim(descricao)) > 0),
  gravidade TEXT NOT NULL DEFAULT 'baixa' CHECK (gravidade IN ('baixa', 'media', 'alta')),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'resolvida')),
  relatado_por TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anexos (
  id TEXT PRIMARY KEY NOT NULL,
  ocorrencia_id TEXT REFERENCES ocorrencias(id) ON DELETE CASCADE,
  teste_id TEXT REFERENCES testes(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (length(trim(url)) > 0),
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((ocorrencia_id IS NOT NULL AND teste_id IS NULL) OR
         (ocorrencia_id IS NULL AND teste_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS historico_alteracoes (
  id TEXT PRIMARY KEY NOT NULL,
  tabela TEXT NOT NULL CHECK (length(trim(tabela)) > 0),
  registro_id TEXT NOT NULL,
  usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  antes TEXT CHECK (antes IS NULL OR json_valid(antes)),
  depois TEXT CHECK (depois IS NULL OR json_valid(depois)),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_setor_id ON usuarios(setor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_papel_ativo ON usuarios(papel, ativo);
CREATE INDEX IF NOT EXISTS idx_codigos_marca_modelo ON codigos(marca, modelo);
CREATE INDEX IF NOT EXISTS idx_codigos_criado_em ON codigos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_codigo_secoes_codigo_id ON codigo_secoes(codigo_id);
CREATE INDEX IF NOT EXISTS idx_testes_codigo_tipo_data ON testes(codigo_id, tipo, data DESC);
CREATE INDEX IF NOT EXISTS idx_testes_responsavel_id ON testes(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_testes_status ON testes(status);
CREATE INDEX IF NOT EXISTS idx_teste_itens_teste_id ON teste_itens(teste_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_codigo_criado_em ON ocorrencias(codigo_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status_gravidade ON ocorrencias(status, gravidade);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_teste_id ON ocorrencias(teste_id) WHERE teste_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anexos_ocorrencia_id ON anexos(ocorrencia_id) WHERE ocorrencia_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anexos_teste_id ON anexos(teste_id) WHERE teste_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_historico_registro_criado_em ON historico_alteracoes(tabela, registro_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_historico_usuario_criado_em ON historico_alteracoes(usuario_id, criado_em DESC);
