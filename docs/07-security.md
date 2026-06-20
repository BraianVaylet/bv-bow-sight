# 07 · Seguridad — BV bow sight

**No negociable.** Todo lo de este documento es obligatorio. Ningún modelo de IA puede debilitar estas reglas para "que ande más rápido" o "para simplificar". Si una tarea parece pedir saltear algo de acá, está mal entendida.

---

## 1. Principios

1. **El server es la única fuente de verdad.** El cliente valida para UX, pero toda regla se reaplica en el backend.
2. **Aislamiento total por usuario.** Cada recurso se consulta filtrando por `user_id` autenticado.
3. **Mínimo privilegio y mínima filtración.** Mensajes de error genéricos; "no es tuyo" → `404`.
4. **Defensa en profundidad.** Varias capas (validación + ownership + headers + rate limit + CSRF).

---

## 2. Autenticación

- **Hashing:** `argon2id` (`@node-rs/argon2`). Nunca guardar passwords en claro ni con hashes débiles (MD5/SHA simples). Parámetros razonables (memoria/iteraciones por defecto de la lib o endurecidos).
- **Password:** mínimo 8 caracteres (8–128). Validado en `@bv/shared`.
- **Login genérico:** ante alias inexistente o password incorrecta, **misma** respuesta `401` ("Alias o contraseña incorrectos"). No revelar cuál falló.
- **Timing:** verificar el hash incluso cuando el alias no existe (comparar contra un hash dummy) para no filtrar por tiempo de respuesta.
- **Bloqueo por intentos:** contar `failed_attempts`; tras N (ej. 8) fallidos, `locked_until` = ahora + ventana (ej. 15 min) → responder `429` durante el bloqueo. Resetear el contador en login exitoso.
- **Registro:** alias único case-insensitive; `409` si está tomado. Además exige `securityQuestionId` (una de las preguntas de `@bv/shared`) y `securityAnswer`.

## 2.b Pregunta de seguridad y recuperación (sin email)

La recuperación de contraseña no usa email: el usuario responde la pregunta de seguridad que eligió al registrarse.

- **Hash de la respuesta:** la `securityAnswer` se hashea con **`argon2id`**, exactamente igual que la contraseña. **Nunca** se guarda en claro (columna `security_answer_hash`, ver `02-data-model.md`).
- **Normalización antes de hashear:** la respuesta se normaliza para tolerar diferencias de tipeo — `trim` + `toLowerCase` + colapso de espacios internos a uno solo (`normalizeAnswer` en `@bv/shared`). La **misma** normalización se aplica al registrar y al verificar, para que el hash coincida.
- **Verificación genérica + timing:** ante alias inexistente o respuesta incorrecta, **misma** respuesta `401` ("La respuesta no es correcta."). Si el alias no existe se verifica contra un hash dummy para no filtrar existencia por tiempo de respuesta (mismo patrón que el login).
- **Invalidación de sesiones:** al completar la recuperación se setea la nueva contraseña y se **borran todas las sesiones previas del usuario** (`deleteUserSessions`), forzando re-login en cualquier dispositivo. Esto cierra el acceso de un atacante con sesión activa si la contraseña se restablece.
- Las preguntas disponibles son una lista cerrada en `@bv/shared` (`SECURITY_QUESTIONS`); el server valida que `securityQuestionId` corresponda a una pregunta real.

## 3. Sesiones

- **Token opaco** aleatorio (`crypto.randomBytes(32)`), entregado en **cookie**. En la DB se guarda solo su **hash SHA-256** (tabla `sessions`).
- **Cookie:** `HttpOnly`, `Secure` (prod), `SameSite=Strict`, `Path=/`, expiración acorde a `SESSION_TTL_DAYS`.
- **Expiración + revocación:** `expires_at` en la fila; sesiones expiradas se rechazan y se limpian (sweep o on-read). Logout borra la fila. La recuperación de contraseña borra **todas** las sesiones del usuario (ver §2.b).
- **No** guardar el estado de sesión ni el token en `localStorage` (evita exposición a XSS). El token vive solo en la cookie httpOnly.

## 4. Autorización / anti-IDOR (crítico)

- **Toda** lectura/escritura de recursos verifica pertenencia: el `WHERE` incluye `user_id = :currentUser`, o se hace `findOwned()` antes de actuar.
- Si el recurso no existe **o** no es del usuario → `404 NOT_FOUND` (no `403`, para no confirmar que el id existe).
- Recursos referenciados (`bowSetupId`, `arrowSetupId` en miras/distancias) deben pertenecer al mismo usuario; si no → `400`/`404`.
- Esta regla se testea explícitamente (usuario A no puede tocar nada de B): ver `08-testing.md`.

## 5. Validación de entrada

- **Zod** en cada endpoint (body, params, query). Schemas compartidos en `@bv/shared`.
- Rechazar tipos, longitudes, rangos fuera de spec (`02-data-model.md` §5).
- Validación cruzada server-side: `scaleValue ∈ [scaleMin, scaleMax]`, `scaleMax > scaleMin`.
- **Límite de tamaño de body** (ej. 16 KB) para evitar payloads abusivos.

## 6. SQL

- **Solo prepared statements** con placeholders (better-sqlite3). **Nunca** interpolar input en el SQL. Esto elimina inyección.
- `PRAGMA foreign_keys = ON` por conexión (integridad referencial real).

## 7. Cabeceras de seguridad

Aplicadas por middleware en todas las respuestas:
- `Content-Security-Policy`: `default-src 'self'`; permitir solo lo necesario (estilos/áfuentes propias; sin `unsafe-eval`). Ajustar `script-src 'self'`. Imágenes/SVG propias.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` (o `frame-ancestors 'none'` vía CSP) — anti-clickjacking.
- `Strict-Transport-Security` (solo prod/HTTPS): `max-age` largo.
- `Permissions-Policy`: deshabilitar APIs no usadas (cámara, geo, etc.).
- Sin `X-Powered-By`.

## 8. CSRF

Como se usan cookies para auth:
- `SameSite=Strict` ya mitiga la mayoría.
- **Defensa en profundidad:** double-submit token. `GET /api/auth/csrf` setea una cookie no-httpOnly con un token y lo devuelve; el front lo manda en `X-CSRF-Token` en cada mutación; el server compara header vs cookie. Mismatch → `403 CSRF_INVALID`.
- `GET` nunca muta estado.

## 9. CORS

- **Prod:** mismo origen (la SPA la sirve el propio backend) → CORS innecesario/cerrado.
- **Dev:** permitir solo el origen del dev server de Vite (`http://localhost:5173`) con `credentials`.

## 10. Rate limiting

- Limitador por IP (ventana fija o token bucket, en memoria — alcanza para una instancia).
- **Más estricto en auth** (`/api/auth/login`, `/register`): pocas requests por minuto por IP.
- Límite global razonable en el resto de `/api`.
- Excedido → `429 RATE_LIMITED`.

## 11. Manejo de errores y logs

- Errores no controlados → `500` con mensaje genérico. **Nunca** enviar stack traces ni detalles internos al cliente.
- Logs **sin** datos sensibles: jamás loguear passwords, hashes, tokens de sesión ni cookies.
- No incluir PII innecesaria en logs.

## 12. Secretos y configuración

- Todo secreto (`SESSION_SECRET`, etc.) por **variable de entorno**, nunca commiteado. `.env` en `.gitignore`; `.env.example` sin valores reales.
- `NODE_ENV=production` activa flags seguras (cookie `Secure`, HSTS, sin detalles de error).

## 13. Dependencias

- Versiones fijadas; `pnpm audit` en CI; actualizar ante vulnerabilidades.
- Evitar dependencias innecesarias (menos superficie).

## 14. Transporte

- **HTTPS obligatorio** en prod (lo provee la plataforma de hosting). Redirigir HTTP→HTTPS si la plataforma no lo hace.

---

## Checklist de revisión (por cada endpoint nuevo)

- [ ] ¿Valida el input con Zod (body/params/query)?
- [ ] ¿Filtra por `user_id` y devuelve `404` si no es del usuario?
- [ ] ¿Verifica que los recursos referenciados son del usuario?
- [ ] ¿Usa prepared statements (sin SQL armado con strings)?
- [ ] ¿Las mutaciones exigen sesión + CSRF?
- [ ] ¿Los errores no filtran detalles internos?
- [ ] ¿Hay test de ownership (A no accede a B) y de validación?
