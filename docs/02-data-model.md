# 02 · Modelo de datos — BV bow sight

Esquema relacional para **SQLite** (vía `better-sqlite3`). Fuente de verdad del backend.

---

## 1. Diagrama entidad-relación

```
┌──────────────┐
│    users     │
└──────┬───────┘
       │ 1
       │
  ┌────┼─────────────────────────┬──────────────────────┐
  │ N  │ N                        │ N                     │ N
┌─▼──────────┐  ┌────────────────▼─┐  ┌──────────────────▼─┐  ┌──────────┐
│ bow_setups │  │  arrow_setups    │  │   sight_configs    │  │ sessions │
└─────┬──────┘  └───────┬──────────┘  └─────────┬──────────┘  └──────────┘
      │ 0..1            │ 0..1                   │ 1
      │ (SET NULL)      │ (SET NULL/RESTRICT)    │ (CASCADE)
      └────────────►────┴──────◄────────┐       │
                                        │     ┌─▼──────────┐
                                        └─────┤ distances  │
                                       N      └────────────┘
                                  (RESTRICT)
```

Relaciones:
- `users` 1—N `bow_setups`, `arrow_setups`, `sight_configs`, `sessions`.
- `sight_configs` N—1 `bow_setups` (opcional, `bow_setup_id`).
- `sight_configs` N—1 `arrow_setups` (opcional, `default_arrow_setup_id`).
- `sight_configs` 1—N `distances`.
- `distances` N—1 `arrow_setups` (requerido, `arrow_setup_id`).

---

## 2. Decisiones de modelado

- **PKs:** `INTEGER PRIMARY KEY` (rowid) — más rápido y simple en SQLite. El aislamiento entre usuarios **no** depende de IDs no adivinables: **toda** consulta filtra por `user_id` y devuelve `404` si el recurso no es del usuario (ver `07-security.md`, anti-IDOR).
- **Timestamps:** `INTEGER` en **epoch milisegundos** (se setean en código con `Date.now()`). Sin ambigüedad de zona horaria ni parsing.
- **Alias único case-insensitive:** columna con `COLLATE NOCASE` + índice único. Se guarda en minúsculas normalizadas.
- **Sesiones opacas:** se guarda el **hash** del token (SHA-256), nunca el token en claro. Permite revocar y expirar.
- **Pregunta de seguridad (recuperación sin email):** cada usuario elige una de las preguntas predefinidas (`security_question_id`) y guarda el **hash** de su respuesta (`security_answer_hash`), nunca la respuesta en claro. La respuesta se hashea con `argon2id` igual que la contraseña, previa normalización (ver `07-security.md`). Las preguntas viven en `@bv/shared` (`SECURITY_QUESTIONS`); la columna solo guarda el `id`.
- **Foreign keys:** SQLite requiere activarlas por conexión → `PRAGMA foreign_keys = ON;` (obligatorio, ver `09-configuration.md`).
- **Escala en cm (REAL):** `scale_min`, `scale_max`, `scale_value`. Precisión de mm.

---

## 3. Esquema SQL (`schema.sql`)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ───────────── users ─────────────
CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  alias                TEXT    NOT NULL COLLATE NOCASE,
  password_hash        TEXT    NOT NULL,
  security_question_id INTEGER NOT NULL,              -- id de la pregunta (ver @bv/shared)
  security_answer_hash TEXT    NOT NULL,              -- argon2id de la respuesta normalizada
  failed_attempts      INTEGER NOT NULL DEFAULT 0,
  locked_until         INTEGER,                       -- epoch ms, NULL si no bloqueada
  created_at           INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_alias ON users (alias);

-- ───────────── sessions ─────────────
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT    PRIMARY KEY,               -- SHA-256 del token de sesión
  user_id     INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,                  -- epoch ms
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- ───────────── bow_setups ─────────────
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

-- ───────────── arrow_setups ─────────────
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

-- ───────────── sight_configs ─────────────
CREATE TABLE IF NOT EXISTS sight_configs (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                INTEGER NOT NULL,
  name                   TEXT    NOT NULL,
  bow_setup_id           INTEGER,               -- opcional
  default_arrow_setup_id INTEGER,               -- opcional (preselección de botonera)
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

-- ───────────── distances ─────────────
CREATE TABLE IF NOT EXISTS distances (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sight_config_id INTEGER NOT NULL,
  arrow_setup_id  INTEGER NOT NULL,             -- requerido
  scale_value     REAL    NOT NULL,
  distance_m      REAL    NOT NULL,
  notes           TEXT,                          -- opcional
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  FOREIGN KEY (sight_config_id) REFERENCES sight_configs (id) ON DELETE CASCADE,
  FOREIGN KEY (arrow_setup_id)  REFERENCES arrow_setups  (id) ON DELETE RESTRICT,
  CHECK (distance_m > 0)
);
CREATE INDEX IF NOT EXISTS idx_distances_config       ON distances (sight_config_id);
CREATE INDEX IF NOT EXISTS idx_distances_arrow        ON distances (arrow_setup_id);
CREATE INDEX IF NOT EXISTS idx_distances_config_arrow ON distances (sight_config_id, arrow_setup_id);
```

> El rango `scale_value ∈ [scale_min, scale_max]` **no** se valida con un `CHECK` (no puede cruzar tablas). Se valida en la capa de aplicación leyendo la mira padre antes de insertar/editar (ver `03-api-spec.md`).

---

## 4. Comportamiento de borrado (resumen)

| Acción | Efecto |
|--------|--------|
| Borrar usuario | CASCADE: borra sus sesiones, setups, miras y distancias. |
| Borrar setup de arco | Las miras que lo usaban quedan con `bow_setup_id = NULL`. |
| Borrar setup de flechas **sin** distancias | OK. Las miras con `default_arrow_setup_id` apuntando a él quedan en `NULL`. |
| Borrar setup de flechas **con** distancias | **Bloqueado** (RESTRICT) → la API responde `409`; la UI explica que primero hay que eliminar/reasignar esas distancias. |
| Borrar mira | CASCADE: borra sus distancias. |
| Borrar distancia | OK. |

---

## 5. Reglas de validación (bounds canónicos)

Estos límites viven en `@bv/shared` (constantes + Zod) y se aplican **en cliente y server** (el server manda).

| Campo | Tipo | Regla |
|-------|------|-------|
| `alias` | string | trim, 3–30, `^[a-zA-Z0-9._-]+$`, se normaliza a minúsculas |
| `password` | string | 8–128 |
| `securityQuestionId` | number | entero; debe corresponder a una pregunta de `@bv/shared` |
| `securityAnswer` | string | trim, 2–100; se normaliza (minúsculas + colapso de espacios) antes de hashear |
| setup `name` | string | trim, 1–60, no vacío |
| setup `notes` | string | trim, 1–2000 (requerido en setups) |
| `scaleMin` / `scaleMax` | number | finito, 0–100, `scaleMax > scaleMin` |
| `scaleValue` | number | finito, dentro de `[scaleMin, scaleMax]` de la mira |
| `distanceM` | number | finito, `> 0`, ≤ 300 |
| distance `notes` | string | trim, 0–500 (opcional) |

---

## 6. Consultas clave (rendimiento)

Todas usan *prepared statements* reutilizados (better-sqlite3) y filtran por `user_id`.

- **Lista de miras del usuario** (Principal): `SELECT ... FROM sight_configs WHERE user_id = ? ORDER BY updated_at DESC`, opcionalmente con `LEFT JOIN bow_setups` para el nombre.
- **Detalle de mira + distancias** (Vista ruler, 1 sola llamada): mira por `id`+`user_id`; luego `SELECT * FROM distances WHERE sight_config_id = ? ORDER BY scale_value`; y `SELECT DISTINCT arrow_setup_id` (con join a `arrow_setups` para nombres) para armar la **botonera**.
- **Distancias filtradas por set**: índice compuesto `(sight_config_id, arrow_setup_id)`.

Con pocos usuarios y SQLite (síncrono, en disco local), estas consultas son sub-milisegundo. No hace falta caché del lado server.
