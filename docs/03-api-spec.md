# 03 · Especificación de la API — BV bow sight

API REST/JSON servida por Hono bajo el prefijo **`/api`**. La misma instancia de Hono sirve también la SPA (estáticos) en producción.

---

## 1. Convenciones generales

- **Base:** `/api`. Content-Type `application/json` (excepto respuestas vacías).
- **Auth:** sesión opaca en **cookie httpOnly** (`Secure` en prod, `SameSite=Strict`). No se usa `Authorization: Bearer`.
- **CSRF:** las mutaciones (`POST`/`PATCH`/`DELETE`) requieren el header **`X-CSRF-Token`** (double-submit; ver `07-security.md`).
- **IDs en URL:** enteros. Si el recurso no pertenece al usuario autenticado → `404` (no `403`), para no filtrar existencia.
- **Casing:** JSON en `camelCase`. La DB usa `snake_case`; el mapeo se hace en la capa de repositorio.
- **Validación:** todo body se valida con Zod (`@bv/shared`). Error de validación → `400` con detalle por campo.
- **Fechas:** epoch ms (number) en las respuestas.

### Formato de error (uniforme)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisá los campos marcados.",
    "details": [
      { "path": "scaleValue", "message": "Debe estar entre 0 y 3." }
    ]
  }
}
```

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `VALIDATION_ERROR` | Body/query inválido. |
| 401 | `UNAUTHENTICATED` | Falta sesión o expiró. |
| 403 | `CSRF_INVALID` | Falta o no coincide el token CSRF. |
| 404 | `NOT_FOUND` | Recurso inexistente **o no pertenece al usuario**. |
| 409 | `CONFLICT` | Alias en uso · borrar set de flechas con distancias. |
| 429 | `RATE_LIMITED` | Demasiados intentos (login) o requests. |
| 500 | `INTERNAL` | Error no controlado (mensaje genérico, sin stack al cliente). |

---

## 2. Auth

### `GET /api/auth/questions`
Lista las preguntas de seguridad disponibles (para poblar el `<select>` en el registro). No requiere sesión.
- 200 → `{ "questions": [ { "id": 1, "text": "¿Cuál es el nombre de tu madre?" }, … ] }`.

### `GET /api/auth/alias-available?alias=...`
Chequeo de disponibilidad de alias (feedback en vivo durante el registro). No requiere sesión.
- 200 → `{ "available": true, "valid": true }`.
- Si el alias no cumple el formato/longitud → `{ "available": false, "valid": false }` (no es un error HTTP; `valid: false` indica que ni siquiera se consultó).

### `POST /api/auth/register`
Body: `{ "alias": "brai", "password": "********", "securityQuestionId": 1, "securityAnswer": "rosa" }`
- `securityQuestionId` (number, entero) debe corresponder a una pregunta de `GET /api/auth/questions`.
- `securityAnswer` (string, 2–100): se normaliza y se hashea con argon2id (ver `07-security.md`).
- 201 → setea cookie de sesión + devuelve `{ "user": { "id": 1, "alias": "brai" } }`.
- 409 `CONFLICT` si el alias ya existe.
- 400 si no cumple validación (incluye pregunta de seguridad inválida).

### `POST /api/auth/login`
Body: `{ "alias": "brai", "password": "********" }`
- 200 → setea cookie + `{ "user": { ... } }`.
- 401 `UNAUTHENTICATED` (mensaje genérico) si credenciales inválidas.
- 429 `RATE_LIMITED` si la cuenta está bloqueada por intentos fallidos o se superó el rate limit.

### `POST /api/auth/logout`
- 204 → borra la sesión (server) y limpia la cookie. Requiere CSRF.

### `GET /api/auth/me`
- 200 → `{ "user": { "id": 1, "alias": "brai" } }`.
- 401 si no hay sesión válida. (El front lo usa para hidratar el estado de auth al cargar.)

### `GET /api/auth/csrf`
- 200 → `{ "csrfToken": "..." }` y setea la cookie del par CSRF. El front lo llama al iniciar y guarda el token en memoria para mandarlo en el header.

### Recuperación de contraseña (sin email, por pregunta de seguridad)

Flujo de dos pasos: primero se obtiene la pregunta del alias, luego se la responde para definir una nueva contraseña.

#### `GET /api/auth/recovery/:alias`
Paso 1: devuelve la pregunta de seguridad asociada al alias. No requiere sesión.
- 200 → `{ "question": { "id": 1, "text": "¿Cuál es el nombre de tu madre?" } }`.
- 404 `NOT_FOUND` si el alias no existe (o no cumple el formato).

#### `POST /api/auth/recovery`
Paso 2: responde la pregunta y define la nueva contraseña. No requiere sesión.
Body: `{ "alias": "brai", "answer": "rosa", "newPassword": "********" }`
- La respuesta se normaliza y se compara contra el hash guardado (argon2id).
- 200 → `{ "ok": true }`. **Invalida todas las sesiones previas del usuario** (ver `07-security.md`).
- 401 `UNAUTHENTICATED` ("La respuesta no es correcta.") si el alias no existe o la respuesta es incorrecta (respuesta genérica, no revela cuál falló).
- 400 si `newPassword`/`answer` no cumplen validación.

---

## 3. Setups de arco — `/api/bow-setups`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/bow-setups` | Lista los del usuario (orden `updatedAt` desc). |
| POST | `/api/bow-setups` | Crea. Body: `{ name, notes }`. → 201 con el recurso. |
| GET | `/api/bow-setups/:id` | Devuelve uno (ownership). |
| PATCH | `/api/bow-setups/:id` | Edita. Body parcial: `{ name?, notes? }`. |
| DELETE | `/api/bow-setups/:id` | Borra (las miras quedan con `bowSetupId: null`). → 204. |

Forma del recurso:
```json
{ "id": 3, "name": "PSE Evo NXT 35", "notes": "Mira UV slide, gatillo UV Button…",
  "createdAt": 1718800000000, "updatedAt": 1718800000000 }
```

## 4. Setups de flechas — `/api/arrow-setups`

Idéntica forma y endpoints que bow-setups, bajo `/api/arrow-setups`.
- **Diferencia:** `DELETE` responde **409 `CONFLICT`** si el set tiene distancias asociadas, con `message` explicativo. No borra nada.

---

## 5. Configuraciones de mira — `/api/sight-configs`

### `GET /api/sight-configs`
Lista del usuario. Cada item:
```json
{ "id": 5, "name": "Mira competencia", "bowSetupId": 3, "bowSetupName": "PSE Evo NXT 35",
  "defaultArrowSetupId": 8, "scaleMin": 0, "scaleMax": 3,
  "distanceCount": 6, "createdAt": 0, "updatedAt": 0 }
```

### `POST /api/sight-configs`
Body:
```json
{ "name": "Mira competencia", "bowSetupId": 3, "defaultArrowSetupId": 8,
  "scaleMin": 0, "scaleMax": 3 }
```
- `bowSetupId` y `defaultArrowSetupId` opcionales (pueden ser `null`); si vienen, deben pertenecer al usuario (si no → 400/404).
- Valida `scaleMax > scaleMin`.
- → 201 con el recurso.

### `GET /api/sight-configs/:id`  ⭐ (alimenta la Vista ruler en 1 llamada)
```json
{
  "id": 5, "name": "Mira competencia",
  "bowSetupId": 3, "bowSetupName": "PSE Evo NXT 35",
  "defaultArrowSetupId": 8,
  "scaleMin": 0, "scaleMax": 3,
  "arrowSets": [
    { "id": 8, "name": "VAP V1 250" },
    { "id": 9, "name": "Gold Tip Hunter 400" }
  ],
  "distances": [
    { "id": 21, "arrowSetupId": 8, "scaleValue": 0.8, "distanceM": 20, "notes": null,
      "createdAt": 0, "updatedAt": 0 },
    { "id": 22, "arrowSetupId": 8, "scaleValue": 1.5, "distanceM": 30, "notes": "viento" }
  ]
}
```
- `arrowSets` = sets de flechas que **tienen distancias** en esta mira (para la botonera).
- `distances` = todas; el front filtra por set en cliente (son pocas).

### `PATCH /api/sight-configs/:id`
Body parcial: `{ name?, bowSetupId?, defaultArrowSetupId?, scaleMin?, scaleMax? }`.
- Si cambia el rango y quedaran distancias fuera de `[min,max]` → 409 `CONFLICT` con detalle (cuántas y cuáles), para que el usuario las ajuste antes. (Alternativa de UX: avisar en el front antes de enviar.)

### `DELETE /api/sight-configs/:id`
- 204. CASCADE borra sus distancias. Requiere confirmación en UI.

---

## 6. Distancias — anidadas en la mira

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sight-configs/:id/distances` | Crea una distancia en la mira. |
| PATCH | `/api/sight-configs/:id/distances/:distanceId` | Edita. |
| DELETE | `/api/sight-configs/:id/distances/:distanceId` | Borra. → 204. |

Body de creación:
```json
{ "scaleValue": 1.5, "distanceM": 30, "arrowSetupId": 8, "notes": "con viento" }
```
Validaciones server-side:
- La mira (`:id`) pertenece al usuario (si no → 404).
- `arrowSetupId` pertenece al usuario (si no → 400/404).
- `scaleValue ∈ [scaleMin, scaleMax]` de la mira (si no → 400 `VALIDATION_ERROR`).
- `distanceM > 0`.

> No hay endpoint `GET` separado de distancias: vienen embebidas en `GET /api/sight-configs/:id`. (Se puede agregar `GET /api/sight-configs/:id/distances?arrowSetupId=` si en el futuro crecen mucho.)

---

## 7. Resumen de rutas

```
GET    /api/auth/questions             # preguntas de seguridad (registro)
GET    /api/auth/alias-available        # ?alias=… → disponibilidad
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/csrf
GET    /api/auth/recovery/:alias        # paso 1: pregunta del alias
POST   /api/auth/recovery               # paso 2: responder + nueva contraseña

GET    /api/bow-setups
POST   /api/bow-setups
GET    /api/bow-setups/:id
PATCH  /api/bow-setups/:id
DELETE /api/bow-setups/:id

GET    /api/arrow-setups
POST   /api/arrow-setups
GET    /api/arrow-setups/:id
PATCH  /api/arrow-setups/:id
DELETE /api/arrow-setups/:id        # 409 si tiene distancias

GET    /api/sight-configs
POST   /api/sight-configs
GET    /api/sight-configs/:id        # incluye arrowSets + distances
PATCH  /api/sight-configs/:id
DELETE /api/sight-configs/:id

POST   /api/sight-configs/:id/distances
PATCH  /api/sight-configs/:id/distances/:distanceId
DELETE /api/sight-configs/:id/distances/:distanceId

GET    /api/health                   # liveness
GET    /*                            # SPA fallback (prod) → index.html
```

Todas las rutas `/api/*` salvo `auth/*` y `health` exigen sesión válida (middleware `requireAuth`).
