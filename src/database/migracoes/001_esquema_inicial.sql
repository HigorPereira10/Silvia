-- =====================================================================
-- Silvia · esquema inicial do banco de dados
-- Cada tabela está ligada a um requisito da ISO 14001 (ver docs/banco-de-dados.md)
-- =====================================================================

-- Setores da empresa: cada um tem linha de base, metas (6.2) e pontos do canteiro
CREATE TABLE setores (
  id                   TEXT PRIMARY KEY,
  nome                 TEXT NOT NULL UNIQUE,
  pontos               INTEGER NOT NULL DEFAULT 0 CHECK (pontos >= 0),
  base_energia_kwh     REAL NOT NULL CHECK (base_energia_kwh > 0),
  base_papel_folhas    REAL NOT NULL CHECK (base_papel_folhas > 0),
  meta_energia_pct     REAL NOT NULL DEFAULT 10,
  meta_papel_pct       REAL NOT NULL DEFAULT 15,
  meta_reciclavel_pct  REAL NOT NULL DEFAULT 70
);

-- Fornecedores (provedores externos, 8.1) e seus requisitos ambientais
CREATE TABLE fornecedores (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nome   TEXT NOT NULL UNIQUE,
  ramo   TEXT NOT NULL
);

CREATE TABLE requisitos_fornecedor (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  fornecedor_id  INTEGER NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  atendido       INTEGER NOT NULL DEFAULT 0 CHECK (atendido IN (0, 1)),
  UNIQUE (fornecedor_id, nome)
);

-- Usuários: colaboradores (com setor), gestor ambiental e fornecedores
CREATE TABLE usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  senha_hash     TEXT NOT NULL,
  perfil         TEXT NOT NULL CHECK (perfil IN ('colaborador', 'gestor', 'fornecedor')),
  setor_id       TEXT REFERENCES setores(id),
  fornecedor_id  INTEGER REFERENCES fornecedores(id),
  ferias         INTEGER NOT NULL DEFAULT 0 CHECK (ferias IN (0, 1)),
  criado_em      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (perfil = 'colaborador' AND setor_id IS NOT NULL) OR
    (perfil = 'fornecedor' AND fornecedor_id IS NOT NULL) OR
    (perfil = 'gestor')
  )
);

-- Planta virtual: uma por colaborador ou fornecedor
CREATE TABLE plantas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id     INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  especie        TEXT NOT NULL,
  estagio        INTEGER NOT NULL DEFAULT 0 CHECK (estagio BETWEEN 0 AND 4),
  xp             INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  agua           INTEGER NOT NULL DEFAULT 60 CHECK (agua BETWEEN 0 AND 100),
  adubo          INTEGER NOT NULL DEFAULT 50 CHECK (adubo BETWEEN 0 AND 100),
  galho_seco     INTEGER NOT NULL DEFAULT 0 CHECK (galho_seco IN (0, 1)),
  semente        INTEGER NOT NULL,
  atualizada_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Medições mensais reais por setor (9.1 monitoramento e medição)
CREATE TABLE medicoes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  setor_id        TEXT NOT NULL REFERENCES setores(id),
  mes             TEXT NOT NULL CHECK (mes GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  energia_kwh     REAL NOT NULL CHECK (energia_kwh > 0),
  papel_folhas    REAL NOT NULL CHECK (papel_folhas >= 0),
  reciclavel_pct  REAL NOT NULL CHECK (reciclavel_pct BETWEEN 0 AND 100),
  registrado_por  INTEGER REFERENCES usuarios(id),
  criado_em       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (setor_id, mes)
);

-- Ações ambientais com evidência (8.1 controle operacional, 7.5 informação documentada)
CREATE TABLE acoes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id         INTEGER NOT NULL REFERENCES usuarios(id),
  tipo               TEXT NOT NULL CHECK (tipo IN ('regar', 'fornecedor')),
  categoria          TEXT NOT NULL,
  descricao          TEXT,
  evidencia_nome     TEXT NOT NULL,
  evidencia_arquivo  TEXT,
  evidencia_mime     TEXT,
  requisito_id       INTEGER REFERENCES requisitos_fornecedor(id),
  status             TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  motivo             TEXT,
  pontos             INTEGER NOT NULL DEFAULT 0,
  avaliado_por       INTEGER REFERENCES usuarios(id),
  avaliado_em        TEXT,
  criado_em          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_acoes_status ON acoes (status);
CREATE INDEX idx_acoes_usuario ON acoes (usuario_id);

-- Não conformidades e ações corretivas (10.2)
CREATE TABLE nao_conformidades (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo          TEXT NOT NULL UNIQUE,
  tipo            TEXT NOT NULL,
  local           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_acao', 'fechada', 'improcedente')),
  reportado_por   INTEGER NOT NULL REFERENCES usuarios(id),
  responsavel     TEXT,
  acao_corretiva  TEXT,
  motivo          TEXT,
  aberta_em       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  fechada_em      TEXT
);
CREATE INDEX idx_ncs_status ON nao_conformidades (status);

-- Treinamentos (7.2 competência, 7.3 conscientização)
CREATE TABLE modulos_treinamento (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  descricao  TEXT NOT NULL,
  ordem      INTEGER NOT NULL
);

CREATE TABLE perguntas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  modulo_id   TEXT NOT NULL REFERENCES modulos_treinamento(id) ON DELETE CASCADE,
  ordem       INTEGER NOT NULL,
  enunciado   TEXT NOT NULL,
  opcoes      TEXT NOT NULL,          -- JSON: lista de textos
  correta     INTEGER NOT NULL,       -- índice da opção correta
  explicacao  TEXT NOT NULL,
  UNIQUE (modulo_id, ordem)
);

CREATE TABLE tentativas_treinamento (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo_id      TEXT NOT NULL REFERENCES modulos_treinamento(id),
  respostas      TEXT NOT NULL DEFAULT '[]', -- JSON: índices escolhidos
  acertos        INTEGER NOT NULL DEFAULT 0,
  finalizada     INTEGER NOT NULL DEFAULT 0 CHECK (finalizada IN (0, 1)),
  pontuou        INTEGER NOT NULL DEFAULT 0 CHECK (pontuou IN (0, 1)),
  iniciada_em    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finalizada_em  TEXT
);

CREATE TABLE conclusoes_treinamento (
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo_id     TEXT NOT NULL REFERENCES modulos_treinamento(id),
  acertos       INTEGER NOT NULL,
  concluido_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (usuario_id, modulo_id)
);

-- Árvores reais plantadas pela empresa (7.4 comunicação, 4.2 partes interessadas)
CREATE TABLE plantios (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  setor_id             TEXT NOT NULL REFERENCES setores(id),
  especie              TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'plantado')),
  local                TEXT,
  cep                  TEXT,
  endereco             TEXT,
  endereco_verificado  INTEGER NOT NULL DEFAULT 0 CHECK (endereco_verificado IN (0, 1)),
  registrado_por       INTEGER REFERENCES usuarios(id),
  agendado_em          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  plantado_em          TEXT
);

-- Avisos individuais
CREATE TABLE notificacoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensagem    TEXT NOT NULL,
  lida        INTEGER NOT NULL DEFAULT 0 CHECK (lida IN (0, 1)),
  criada_em   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_notificacoes_usuario ON notificacoes (usuario_id, lida);

-- Feed público interno ("Acontecendo agora")
CREATE TABLE feed (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ator       TEXT,
  texto      TEXT NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'geral' CHECK (tipo IN ('geral', 'agua', 'poda', 'marco')),
  criado_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Trilha de auditoria (9.2 auditoria interna)
CREATE TABLE auditoria (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ator       TEXT NOT NULL,
  acao       TEXT NOT NULL,
  detalhe    TEXT,
  criado_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
