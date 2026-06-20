/** Esquema SQL embebido (ver docs/02-data-model.md). Embebido como string para
 * evitar problemas de rutas de archivos entre dev (tsx) y producción. */

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  alias                 TEXT    NOT NULL COLLATE NOCASE,
  password_hash         TEXT    NOT NULL,
  security_question_id  INTEGER NOT NULL,
  security_answer_hash  TEXT    NOT NULL,
  failed_attempts       INTEGER NOT NULL DEFAULT 0,
  locked_until          INTEGER,
  created_at            INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_alias ON users (alias);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS bow_setups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  notes      TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bow_setups_user ON bow_setups (user_id);

CREATE TABLE IF NOT EXISTS arrow_setups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  notes      TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_arrow_setups_user ON arrow_setups (user_id);

CREATE TABLE IF NOT EXISTS sight_configs (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                INTEGER NOT NULL,
  name                   TEXT    NOT NULL,
  bow_setup_id           INTEGER,
  default_arrow_setup_id INTEGER,
  scale_min              REAL    NOT NULL,
  scale_max              REAL    NOT NULL,
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL,
  FOREIGN KEY (user_id)                REFERENCES users        (id) ON DELETE CASCADE,
  FOREIGN KEY (bow_setup_id)           REFERENCES bow_setups   (id) ON DELETE SET NULL,
  FOREIGN KEY (default_arrow_setup_id) REFERENCES arrow_setups (id) ON DELETE SET NULL,
  CHECK (scale_max > scale_min)
);
CREATE INDEX IF NOT EXISTS idx_sight_configs_user ON sight_configs (user_id);

CREATE TABLE IF NOT EXISTS distances (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sight_config_id INTEGER NOT NULL,
  arrow_setup_id  INTEGER NOT NULL,
  scale_value     REAL    NOT NULL,
  distance_m      REAL    NOT NULL,
  notes           TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  FOREIGN KEY (sight_config_id) REFERENCES sight_configs (id) ON DELETE CASCADE,
  FOREIGN KEY (arrow_setup_id)  REFERENCES arrow_setups  (id) ON DELETE RESTRICT,
  CHECK (distance_m > 0)
);
CREATE INDEX IF NOT EXISTS idx_distances_config       ON distances (sight_config_id);
CREATE INDEX IF NOT EXISTS idx_distances_arrow        ON distances (arrow_setup_id);
CREATE INDEX IF NOT EXISTS idx_distances_config_arrow ON distances (sight_config_id, arrow_setup_id);
`;
