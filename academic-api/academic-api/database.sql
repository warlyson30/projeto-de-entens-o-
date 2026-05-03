

CREATE DATABASE IF NOT EXISTS academic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE academic_db;

-- ============================================================
-- TABELA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100)        NOT NULL,
  email       VARCHAR(150)        NOT NULL UNIQUE,
  senha       VARCHAR(255)        NOT NULL,
  criado_em   DATETIME            DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME          DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT           NOT NULL,
  nome          VARCHAR(100)  NOT NULL,
  professor     VARCHAR(100),
  cor           VARCHAR(7)    DEFAULT '#6366f1',
  criado_em     DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS atividades (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT             NOT NULL,
  materia_id    INT,
  titulo        VARCHAR(150)    NOT NULL,
  descricao     TEXT,
  tipo          ENUM('prova','trabalho','exercicio','outro') DEFAULT 'outro',
  status        ENUM('pendente','em_andamento','concluida')  DEFAULT 'pendente',
  prazo         DATETIME,
  nota          DECIMAL(4,2),
  criado_em     DATETIME        DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
  FOREIGN KEY (materia_id)  REFERENCES materias(id)  ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lembretes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT             NOT NULL,
  titulo        VARCHAR(150)    NOT NULL,
  descricao     TEXT,
  data_hora     DATETIME        NOT NULL,
  concluido     BOOLEAN         DEFAULT FALSE,
  criado_em     DATETIME        DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS sessoes_pomodoro (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT     NOT NULL,
  materia_id      INT,
  duracao_minutos INT     DEFAULT 25,
  tipo            ENUM('foco','pausa_curta','pausa_longa') DEFAULT 'foco',
  concluida       BOOLEAN DEFAULT FALSE,
  iniciado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE SET NULL
);
