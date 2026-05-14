CREATE DATABASE IF NOT EXISTS agenda_estudos 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE agenda_estudos;
 
CREATE TABLE usuarios (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    token     TEXT     NOT NULL,
    expira_em DATETIME NOT NULL,
    user_id   INT,
    CONSTRAINT fk_rt_usuario FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE TABLE materias (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(150) NOT NULL,
    status        ENUM('ativo','inativo') DEFAULT 'ativo',
    professor     VARCHAR(100) DEFAULT NULL,
    cor           VARCHAR(20)  DEFAULT '#7C3AED',  -- CORRIGIDO: era '#7C3AEDv'
    carga_hor     INT          DEFAULT NULL,
    criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id       INT,
    CONSTRAINT fk_materia_usuario FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE TABLE atividades (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    titulo        VARCHAR(150) NOT NULL,
    descricao     TEXT         DEFAULT NULL,
    concluido     BOOLEAN      NOT NULL DEFAULT FALSE,
    status        ENUM('pendente','em_andamento','concluida','cancelada') DEFAULT 'pendente',
    tipo          ENUM('prova','trabalho','exercicio','projeto','outro')   NOT NULL DEFAULT 'outro',
    nota          DECIMAL(4,2) DEFAULT NULL,
    peso          DECIMAL(4,2) DEFAULT 1.00,
    data_entrega  DATETIME     DEFAULT NULL,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id       INT,
    materia_id    INT,
    CONSTRAINT fk_atividade_usuario FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_atividade_materia FOREIGN KEY (materia_id)
        REFERENCES materias (id) ON DELETE CASCADE
);

CREATE TABLE eventos (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    titulo        VARCHAR(150) NOT NULL,
    data_inicio   DATETIME     NOT NULL,              -- NOT NULL: obrigatório na API
    data_fim      DATETIME     DEFAULT NULL,
    dia_inteiro   BOOLEAN      DEFAULT FALSE,
    tipo          ENUM('prova','trabalho','aula','outro') NOT NULL DEFAULT 'outro',
    cor           VARCHAR(20)  DEFAULT NULL,
    descricao     TEXT         DEFAULT NULL,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id       INT,
    CONSTRAINT fk_evento_usuario FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE TABLE lembretes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    titulo          VARCHAR(150) NOT NULL,
    descricao       TEXT         DEFAULT NULL,
    data_vencimento DATETIME     DEFAULT NULL,
    prioridade      ENUM('baixa','media','alta') DEFAULT 'media',
    concluido       BOOLEAN      NOT NULL DEFAULT FALSE,
    concluido_em    DATETIME     DEFAULT NULL,
    criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    materia_id      INT DEFAULT NULL,
    user_id         INT,
    CONSTRAINT fk_lembrete_materia  FOREIGN KEY (materia_id)
        REFERENCES materias (id) ON DELETE CASCADE,
    CONSTRAINT fk_lembrete_usuario  FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE SET NULL
);

CREATE TABLE tbl_registro_pomodoro (
    id_pomodoro    INT AUTO_INCREMENT PRIMARY KEY,
    tipo_sessao    ENUM('foco','pausa_curta','pausa_longa') NOT NULL DEFAULT 'foco',
    tempo_previsto INT      DEFAULT 25,
    iniciado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
    finalizado_em  DATETIME,
    tempo_real     INT,
    concluido      BOOLEAN  DEFAULT FALSE,
    user_id        INT,
    CONSTRAINT fk_pomodoro_usuario FOREIGN KEY (user_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
);
