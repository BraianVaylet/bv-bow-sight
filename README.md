# BV bow sight 🎯

App web para registrar la **calibración de miras de arcos compuestos**: el arquero carga, para cada mira y cada set de flechas, en qué punto de la escala va la mira a una determinada distancia. Reemplaza el papelito pegado a la mira por una consulta rápida durante el entrenamiento.

> **Estado de este repositorio:** documentación funcional, técnica, de arquitectura y plan de acción. **El código todavía no está escrito.** Esta carpeta es el contexto que deben seguir los modelos de IA (Cursor / Claude Code) para construir la app tarea por tarea.

---

## 🧭 Cómo usar esta documentación

Leé los documentos en este orden. Cada uno cumple un rol distinto y se referencian entre sí.

| # | Documento | Para qué sirve |
|---|-----------|----------------|
| 01 | [`docs/01-functional-spec.md`](docs/01-functional-spec.md) | Qué hace la app: pantallas, flujos, reglas de negocio, criterios de aceptación. |
| 02 | [`docs/02-data-model.md`](docs/02-data-model.md) | Entidades, esquema SQL, relaciones, índices, integridad. |
| 03 | [`docs/03-api-spec.md`](docs/03-api-spec.md) | Contrato REST: endpoints, payloads, validaciones, errores, auth. |
| 04 | [`docs/04-architecture.md`](docs/04-architecture.md) | Forma del sistema, capas, decisiones (ADRs), ciclo de request, algoritmo del *ruler*. |
| 05 | [`docs/05-ui-design-system.md`](docs/05-ui-design-system.md) | Marca, tokens, temas claro/oscuro, componentes y **especificación del ruler** (la pantalla estrella). |
| 06 | [`docs/06-technical-spec.md`](docs/06-technical-spec.md) | Stack, estructura del monorepo, librerías + versiones, convenciones de código. |
| 07 | [`docs/07-security.md`](docs/07-security.md) | Prácticas de seguridad obligatorias (no negociable). |
| 08 | [`docs/08-testing.md`](docs/08-testing.md) | Estrategia y batería de tests. |
| 09 | [`docs/09-configuration.md`](docs/09-configuration.md) | Variables de entorno, archivos de config, scripts, setup local. |
| 10 | [`docs/10-action-plan.md`](docs/10-action-plan.md) | **Plan de acción por fases y tareas chicas** para que la IA desarrolle paso a paso. |
| 11 | [`docs/11-hosting.md`](docs/11-hosting.md) | Servicios de hosting aptos, configuración, pros y contras. |

**Si sos un modelo de IA que va a construir esta app:** empezá por `10-action-plan.md` y ejecutá **una tarea por vez**, respetando la *Definition of Done* de cada una. Antes de marcar una tarea como hecha, corré `typecheck` + tests. **Nunca** debilites las reglas de seguridad de `07-security.md` para que algo "ande más rápido".

---

## 📌 Resumen ejecutivo

- **Audiencia:** pocos usuarios (arqueros de un club). La app tiene que ser **rápida y ágil** para no entorpecer el entrenamiento.
- **Mobile-first:** se usa principalmente desde el celular, en el campo de tiro.
- **Online, sin PWA / sin offline** (decisión tomada con el cliente). Server único que sirve la SPA + la API.
- **Pantalla prioritaria:** la *vista de configuración de mira*, con una **regla vertical** que imita la escala real de una mira de arquería, mostrando las distancias cargadas sobre ella.

## 🧱 Stack (resumen)

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 6 + TypeScript (strict) + Tailwind v4 + React Router 6 + TanStack Query v5 |
| Backend | Node 20 LTS + Hono 4 + better-sqlite3 + Zod |
| DB | SQLite (archivo en **volumen persistente**) |
| Auth | Alias + password (argon2id), sesión opaca en cookie httpOnly |
| Tests | Vitest + React Testing Library + Playwright |
| Monorepo | pnpm workspaces (`@bv/shared`, `@bv/api`, `@bv/web`) |
| Deploy | Servicio único (Hono sirve la SPA estática). Railway / Fly.io |

> Stack **espejo de BV Cross** para máxima consistencia con lo que ya tenés desplegado.

## 🎨 Marca

- **Primario:** `#E3CB0D` (dorado de la diana / wordmark "BV")
- **Superficie oscura:** `#18181B`
- **Blanco:** `#FFFFFF`
- **Ícono:** diana con retícula (mira de arquería) → favicon
- **Tipografía display:** *Chewy* (solo en el wordmark del logo) · **UI:** `system-ui`

Los logos están en [`assets/`](assets/): `bv-bowsight-svg.svg` (completo), `bv-bowsight-mini-svg.svg` (BV + diana), `bv-bowsight-favicon-svg.svg` (solo diana).

---

## 🗂️ Estructura objetivo del repo (cuando se construya)

```
bv-bow-sight/
├─ pnpm-workspace.yaml
├─ package.json                 # scripts raíz
├─ tsconfig.base.json
├─ biome.json                   # lint + format
├─ Dockerfile
├─ .env.example
├─ assets/                      # logos SVG
├─ docs/                        # esta documentación
└─ packages/
   ├─ shared/                   # @bv/shared — Zod schemas, tipos, math del ruler
   ├─ api/                      # @bv/api — Hono + better-sqlite3
   └─ web/                      # @bv/web — React + Vite (build → servido por api)
```

---

## 🚀 Deploy en Railway

Servicio único por **Dockerfile**: la API (Hono) sirve la SPA + la API en el mismo puerto, con **SQLite en un volumen persistente**. La config vive en [`railway.json`](railway.json) y el [`Dockerfile`](Dockerfile). Detalle y alternativas de hosting en [`docs/11-hosting.md`](docs/11-hosting.md).

1. **Nuevo proyecto** en Railway desde el repo → usa el `Dockerfile` (ya fijado en `railway.json`).
2. **Agregá un Volume** montado en **`/data`** — clave para que la base SQLite persista entre redeploys.
3. **Variables de entorno:**

   | Variable | Valor | Notas |
   |----------|-------|-------|
   | `SESSION_SECRET` | `openssl rand -hex 32` | **Obligatoria.** En producción la API no arranca si falta o es el default inseguro. |
   | `NODE_ENV` | `production` | |
   | `COOKIE_SECURE` | `true` | Cookies solo por HTTPS. |
   | `DATABASE_PATH` | `/data/bv-bow-sight.db` | Ya viene en el `Dockerfile`; fijala explícita si querés. |
   | `PORT` | _(lo inyecta Railway)_ | La API lee `process.env.PORT`; no la setees a mano. |

   `CORS_ORIGIN` no hace falta: en producción el mismo origen sirve SPA + API (CORS solo se habilita en dev).
4. **Deploy.** El esquema SQL se crea solo en el primer arranque (`CREATE TABLE IF NOT EXISTS`). Healthcheck en `/api/health`.
5. Tras un **redeploy**, verificá que los datos siguen ahí — es la prueba de que el volumen quedó bien montado.
