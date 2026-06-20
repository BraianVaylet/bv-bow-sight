# 10 · Plan de acción — BV bow sight

Plan de construcción por **fases** y **tareas chicas**, pensado para que un modelo de IA (Cursor / Claude Code) ejecute **una tarea por vez**. Cada tarea tiene objetivo, entregables, criterios de aceptación y dependencias.

---

## Cómo trabajar (reglas para el agente)

1. **Una tarea por vez.** No saltar fases ni adelantar trabajo de tareas futuras.
2. **Definition of Done por tarea** (todas deben cumplirse antes de continuar):
   - Compila: `pnpm typecheck` sin errores.
   - Lint/format: `pnpm lint` sin errores.
   - Tests de la tarea en verde (y los previos siguen pasando).
   - No se debilitó ninguna regla de `07-security.md`.
   - Mobile-first respetado en lo que sea UI.
3. **Consultar siempre** el doc correspondiente: modelo de datos (`02`), API (`03`), arquitectura (`04`), UI (`05`), seguridad (`07`).
4. **No inventar** endpoints, campos ni libs fuera de lo especificado. Si algo falta, marcarlo como pregunta, no improvisar.
5. **Commits** chicos y descriptivos por tarea (ej. `P3-T5: login con lockout`).

Nomenclatura de tareas: `P{fase}-T{n}`.

---

## Fase P0 · Repo y tooling
**Meta:** monorepo vacío que compila, lintea y corre scripts.

- **P0-T1 — Init monorepo.** `pnpm-workspace.yaml`, `package.json` raíz, `.gitignore`, `.nvmrc` (Node 20), `.dockerignore`, carpeta `packages/`. *Acept.:* `pnpm install` corre; estructura creada.
- **P0-T2 — TS base.** `tsconfig.base.json` (strict, paths a `@bv/shared`) + `tsconfig.json` por paquete que extiende. *Acept.:* `pnpm typecheck` pasa (vacío).
- **P0-T3 — Biome.** `biome.json` + scripts `lint`/`format`. *Acept.:* `pnpm lint` corre limpio.
- **P0-T4 — Scripts raíz.** `dev`/`build`/`start`/`test`/`typecheck` con `concurrently` para dev. *Acept.:* `pnpm dev` levanta (aunque los paquetes estén casi vacíos).
- **P0-T5 — Env util.** `packages/api/src/env.ts` que carga y valida env con Zod + `.env.example`. *Acept.:* arranca con `.env`; falla claro si falta una requerida en prod.

## Fase P1 · `@bv/shared`
**Meta:** contratos y math compartidos. *(Dep: P0)*

- **P1-T1 — Schemas Zod + tipos.** Para User(auth), BowSetup, ArrowSetup, SightConfig, Distance: schemas de create/update + tipos inferidos, según `02`/`03`. *Acept.:* tests que aceptan válidos y rechazan inválidos.
- **P1-T2 — Constantes.** Bounds de validación y códigos de error (`02` §5, `03` §1). *Acept.:* usados por los schemas.
- **P1-T3 — Math del ruler.** `scaleToY`, `generateTicks`, `layoutMarkers` puros (`04` §4). *Acept.:* tests unit completos (mín-arriba, conteo de ticks, guarda de densidad, anti-solape) en verde.

## Fase P2 · Backend — base
**Meta:** Hono levantado con DB, middlewares de seguridad y validación. *(Dep: P1)*

- **P2-T1 — Conexión SQLite.** `db/connection.ts` con better-sqlite3 + `PRAGMA foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout`. Ruta desde `DATABASE_PATH`. *Acept.:* abre/crea la DB.
- **P2-T2 — Esquema + migración.** `db/schema.sql` (de `02`) + `migrate.ts` idempotente que lo aplica al boot. *Acept.:* corre dos veces sin romper; tablas e índices creados.
- **P2-T3 — Bootstrap Hono.** `index.ts` + `GET /api/health`, errorHandler global (forma de `03` §1), logger sin datos sensibles. *Acept.:* `health` responde 200; un throw se traduce a la forma de error.
- **P2-T4 — Cabeceras + CORS + body limit.** Middleware `securityHeaders` (CSP, nosniff, frame, HSTS prod, etc., `07` §7), CORS dev acotado, límite de body. *Acept.:* headers presentes en respuestas.
- **P2-T5 — Validación.** Helper/middleware `validate(schema)` que parsea body/params/query y arma `400` uniforme. *Acept.:* input inválido → 400 con `details`.
- **P2-T6 — Rate limit.** Middleware en memoria (global + estricto en auth), `429` al exceder (`07` §10). *Acept.:* test que supera el límite → 429.

## Fase P3 · Auth
**Meta:** registro/login/logout/me seguros. *(Dep: P2)*

- **P3-T1 — Hashing.** `lib/hash.ts` argon2id (hash + verify) + hash dummy para timing. *Acept.:* verify correcto/incorrecto.
- **P3-T2 — Sesiones.** `lib/session.ts`: crear token (`randomBytes`), guardar **hash** en `sessions`, set cookie httpOnly/Secure/SameSite=Strict, lookup, revoke, expiración (`07` §3). *Acept.:* crear→leer→revocar funciona; expiradas se rechazan.
- **P3-T3 — CSRF.** `GET /api/auth/csrf` + middleware `requireCsrf` (double-submit, `07` §8). *Acept.:* mutación sin/with-wrong token → 403.
- **P3-T4 — Register.** Valida, alias único (NOCASE), hashea, crea user+sesión en transacción. *Acept.:* 201 + cookie; alias repetido → 409.
- **P3-T5 — Login + lockout.** Verifica, cuenta intentos, bloquea (`429`) tras N, error genérico (`401`). *Acept.:* OK→200; mal→401; N fallidos→429; reset al loguear bien.
- **P3-T6 — Logout / me / requireAuth.** `requireAuth` resuelve `userId` por cookie (o 401); `GET /me`; `logout` borra sesión. *Acept.:* `me` 200 logueado / 401 sin sesión; logout invalida.

## Fase P4 · Backend — recursos
**Meta:** CRUD con ownership y validación cruzada. *(Dep: P3)*

- **P4-T1 — Ownership helper.** `findOwned(table, id, userId)` → recurso o `null` (que la ruta traduce a 404). Patrón anti-IDOR (`07` §4). *Acept.:* usado por todos los recursos.
- **P4-T2 — Bow setups.** Repo + service + rutas (`/api/bow-setups`, `03` §3). *Acept.:* CRUD + ownership 404; al borrar, miras quedan con `bowSetupId: null` (FK SET NULL).
- **P4-T3 — Arrow setups.** Igual, con `DELETE` → 409 si tiene distancias (RESTRICT) con mensaje (`03` §4). *Acept.:* 409 con/204 sin distancias.
- **P4-T4 — Sight configs.** CRUD; valida `scaleMax>scaleMin`; refs (`bowSetupId`,`defaultArrowSetupId`) del usuario; `GET /:id` embebe `arrowSets` + `distances` (`03` §5). *Acept.:* detalle arma la botonera; cambio de rango que deja distancias afuera → 409.
- **P4-T5 — Distances.** CRUD anidado; valida `scaleValue∈[min,max]` y `arrowSetupId` del usuario; cascade al borrar mira (`03` §6). *Acept.:* fuera de rango → 400; ref ajena → 400/404.

## Fase P5 · Backend — tests
**Meta:** cubrir API y seguridad. *(Dep: P4)*

- **P5-T1 — Harness.** SQLite temporal por test + `registerAndLogin()` (cookies + CSRF). *Acept.:* utilidades reutilizables.
- **P5-T2 — Auth tests.** register/login/logout/me, dup alias, mala clave, lockout, rate limit, CSRF (`08` §3). *Acept.:* todos verdes.
- **P5-T3 — CRUD tests.** Happy + validaciones de cada recurso; borrados (CASCADE / SET NULL / RESTRICT). *Acept.:* verdes.
- **P5-T4 — Ownership/seguridad.** A no accede a B (404 en GET/PATCH/DELETE), refs ajenas, rutas protegidas sin sesión (401). *Acept.:* verdes.

## Fase P6 · Frontend — base
**Meta:** SPA con tokens, router, cliente API y UI kit. *(Dep: P1; puede ir en paralelo a P3–P5 contra contratos)*

- **P6-T1 — Vite + Tailwind v4.** App React+TS, `styles/index.css` con `@import "tailwindcss"` + `@theme` (tokens de `05`/`09`), `system-ui`, `tabular-nums`, reset. *Acept.:* app corre; tokens aplican.
- **P6-T2 — Tema.** Provider claro/oscuro, default oscuro, respeta `prefers-color-scheme`, toggle persistente en `localStorage`. *Acept.:* alterna y persiste.
- **P6-T3 — Router + guard.** React Router 6, layout, `ProtectedRoute`, rutas del mapa funcional (`01` §3). *Acept.:* navegación; privadas redirigen sin sesión.
- **P6-T4 — apiClient + Query.** `fetch` centralizado (`/api`, `credentials:'include'`, `X-CSRF-Token`, parseo de error) + `QueryClient`/providers. *Acept.:* una query real contra `/api/health` o `/me`.
- **P6-T5 — UI kit.** Button, Input, TextArea, Select, Card, Chip/SegmentedControl, Dialog, Toast, EmptyState, Spinner(diana), FieldError (`05` §6). *Acept.:* render + foco visible + temas + touch ≥44px.
- **P6-T6 — App shell.** AppBar (logo mini + título + toggle + volver) + nav + favicon. *Acept.:* navegación entre secciones; logos SVG integrados.

## Fase P7 · Auth (frontend)
**Meta:** pantallas de acceso. *(Dep: P6, P3)*

- **P7-T1 — Login.** Form alias+password, validación, estados error/loading, redirect. *Acept.:* loguea y entra; errores con copy correcto.
- **P7-T2 — Register.** Form + validación (alias/password), 409 alias en uso. *Acept.:* crea y entra.
- **P7-T3 — Estado auth.** `useMe` + guard + logout en la barra. *Acept.:* refresca sesión al cargar; logout vuelve a login.

## Fase P8 · Setups (frontend)
**Meta:** gestionar setups. *(Dep: P6, P4)*

- **P8-T1 — Setups de arco.** Lista + crear + editar + eliminar (`01` §5.4). *Acept.:* CRUD desde UI; estado vacío.
- **P8-T2 — Setups de flechas.** Igual; manejar 409 al borrar con distancias (mensaje claro). *Acept.:* CRUD; 409 explicado.

## Fase P9 · Principal + alta de mira
**Meta:** crear y listar miras. *(Dep: P6, P4)*

- **P9-T1 — Principal.** Lista de miras (cards) + navegación a la vista + accesos a setups/crear; estado vacío (`01` §5.3). *Acept.:* lista y navega.
- **P9-T2 — Crear mira.** Form: nombre, select setup de arco (opcional), select set por defecto (opcional), `scaleMin`, `scaleMax` con validación `max>min` (`01` §5.5 alta). *Acept.:* crea y redirige a la vista.
- **P9-T3 — Editar/eliminar mira.** Edición de campos; eliminar con confirmación (cascade distancias). *Acept.:* edita y borra.

## Fase P10 · Vista ruler ⭐ (prioridad)
**Meta:** la pantalla estrella. *(Dep: P1 math, P6, P4)*

- **P10-T1 — Componente Ruler (SVG).** Consume el math de `@bv/shared`; dibuja ticks 1mm/5mm/1cm + números, mín arriba, ajusta al alto, guarda de densidad (`05` §7.2). *Acept.:* tests de componente: conteo de ticks y posiciones correctas; orientación correcta.
- **P10-T2 — Marcadores de distancia.** Capa de pins + etiquetas `"{m} m"` (+escala) desde las distancias filtradas; anti-solape con leader line; tap→acciones (`05` §7.3). *Acept.:* posiciones correctas; leader line al solapar; tap abre acciones.
- **P10-T3 — Botonera de sets.** SegmentedControl de `arrowSets` con distancias; aparece si >1; preselección `defaultArrowSetupId`; cambiar filtra en cliente (`05` §7.4). *Acept.:* filtra al instante; preselección correcta.
- **P10-T4 — Ensamble de la pantalla.** Header (nombre + setup de arco), botonera, ruler+marcadores a alto completo, botón "+ Nueva distancia", estados loading/empty/error (`05` §7.1/7.5). Una sola llamada a `GET /api/sight-configs/:id`. *Acept.:* pantalla completa y fluida en viewport mobile.

## Fase P11 · Distancias (frontend)
**Meta:** cargar/editar/borrar distancias con sensación instantánea. *(Dep: P10)*

- **P11-T1 — Nueva distancia.** Form: escala, distancia, select set, notas; valida escala dentro del rango; **optimistic add** + rollback (`01` §5.6, `06` §4). *Acept.:* aparece al instante; rollback si falla.
- **P11-T2 — Editar distancia.** Form prellenado; optimistic update. *Acept.:* se mueve en el ruler al editar.
- **P11-T3 — Eliminar distancia.** Confirmación + optimistic remove. *Acept.:* desaparece al instante; rollback si falla.

## Fase P12 · Tests, pulido y deploy
**Meta:** cerrar calidad y publicar. *(Dep: todo)*

- **P12-T1 — Tests de componentes.** Ruler, botonera, formularios, estados, apiClient (`08` §4). *Acept.:* cobertura de caminos críticos.
- **P12-T2 — E2E Playwright.** Flujo completo registro→setups→mira→distancias (2 sets)→ruler→editar/borrar→logout, + intento de acceso ajeno (`08` §5). *Acept.:* verde en headless.
- **P12-T3 — A11y + pulido.** Foco, `prefers-reduced-motion`, contraste dorado (`05` §3.3/§9), copy de errores/vacíos. *Acept.:* checklist de a11y cumplido.
- **P12-T4 — Prod build.** `static.ts` sirve `web/dist` + SPA fallback; gzip/brotli; `pnpm build && pnpm start` sirve todo en un puerto (`06` §6). *Acept.:* API + SPA en mismo origen.
- **P12-T5 — Docker + deploy.** Dockerfile (`09` §5) + volumen + `DATABASE_PATH` + runbook de Railway/Fly (`11`). *Acept.:* deploy con datos persistentes tras redeploy.
- **P12-T6 — Seed + README.** `seed.ts` (usuario, setups, mira con distancias en 2 sets) + README final con instrucciones. *Acept.:* `pnpm db:seed` deja la app usable en dev.

---

## Mapa de dependencias (resumen)

```
P0 → P1 → P2 → P3 → P4 → P5
                 │
                 └── P6 (puede arrancar tras P1, contra contratos) → P7 → P8/P9 → P10 → P11
                                                                                         │
                                                              todo ───────────────────► P12
```

**Hitos:**
- *M1 — API segura:* P0–P5 completos (backend testeado).
- *M2 — App navegable:* P6–P9 (login, setups, alta de miras).
- *M3 — Ruler funcionando:* P10–P11 (la pantalla estrella + distancias).
- *M4 — Listo para producción:* P12 (tests E2E, deploy con volumen).
