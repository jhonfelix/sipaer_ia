-- ─────────────────────────────────────────────────────────────────────────────
-- SIPAER-IA — Schema completo (migrations 001 + 002 + 003)
-- Executado automaticamente pelo MySQL na primeira inicialização do container.
-- Migrações futuras via: docker-compose exec backend alembic upgrade head
-- ─────────────────────────────────────────────────────────────────────────────

ALTER DATABASE sipaer_db CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

USE sipaer_db;

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id               INT          NOT NULL AUTO_INCREMENT,
    name             VARCHAR(100) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    hashed_password  VARCHAR(255) NOT NULL,
    role             VARCHAR(50)  NOT NULL DEFAULT 'investigator',
    posto_graduacao  VARCHAR(100)     NULL,
    unit             VARCHAR(100) NOT NULL,
    avatar           VARCHAR(500)     NULL,
    is_active        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY ix_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── reports ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id              INT          NOT NULL AUTO_INCREMENT,
    status          VARCHAR(50)  NOT NULL DEFAULT 'draft',
    version         INT          NOT NULL DEFAULT 1,
    occurrence      JSON         NOT NULL,
    created_by      INT          NOT NULL,
    last_edited_by  INT          NOT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_reports_created_by     FOREIGN KEY (created_by)     REFERENCES users (id),
    CONSTRAINT fk_reports_last_edited_by FOREIGN KEY (last_edited_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── report_sections ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_sections (
    id           VARCHAR(50)  NOT NULL,
    report_id    INT          NOT NULL,
    title        VARCHAR(255) NOT NULL,
    `order`      INT          NOT NULL,
    content      TEXT             NULL,
    is_completed TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_sections_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── report_subsections ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_subsections (
    id           VARCHAR(50)  NOT NULL,
    section_id   VARCHAR(50)  NOT NULL,
    title        VARCHAR(255) NOT NULL,
    `order`      INT          NOT NULL,
    content      LONGTEXT         NULL,
    is_completed TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_subsections_section FOREIGN KEY (section_id) REFERENCES report_sections (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── conversations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id         INT         NOT NULL AUTO_INCREMENT,
    user_id    INT         NOT NULL,
    report_id  INT             NULL,
    session_id VARCHAR(36)     NULL,
    role       VARCHAR(20) NOT NULL,
    content    TEXT            NULL,
    sources    JSON        NOT NULL,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_conversations_user_session (user_id, session_id),
    CONSTRAINT fk_conversations_user   FOREIGN KEY (user_id)   REFERENCES users   (id),
    CONSTRAINT fk_conversations_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── media_files ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_files (
    id            INT          NOT NULL AUTO_INCREMENT,
    url           VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    subfolder     VARCHAR(50)  NOT NULL,
    mime_type     VARCHAR(100) NOT NULL,
    size_bytes    INT          NOT NULL,
    report_id     INT              NULL,
    uploaded_by   INT          NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_media_files_report_id (report_id),
    CONSTRAINT fk_media_files_report FOREIGN KEY (report_id)   REFERENCES reports (id) ON DELETE SET NULL,
    CONSTRAINT fk_media_files_user   FOREIGN KEY (uploaded_by) REFERENCES users   (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── alembic_version ───────────────────────────────────────────────────────────
-- Registra que o schema completo já foi aplicado (migrations 001-003).
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    PRIMARY KEY (version_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO alembic_version (version_num) VALUES ('004');
