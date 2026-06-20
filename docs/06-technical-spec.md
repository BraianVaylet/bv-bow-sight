# 06 · Especificación técnica — BV bow sight

El **cómo** técnico: stack, estructura del monorepo, librerías, convenciones y build. Decisiones de forma en `04-architecture.md`.

---

## 1. Stack y versiones objetivo

| Área | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node | 20 LTS (≥ 20.11) |
| Gestor | pnpm | ≥ 9 |
| Lenguaje | TypeScript | ≥ 5.5 (strict) |
| Backend HTTP | Hono | 4.x |
| DB driver | better-sqlite3 | 11.x |
| Validación | Zod | 3.x |
| Hash | @node-rs/argon2 | latest (argon2id) |
| Frontend | React | 18.x |
| Bundler/dev | Vite | 6.x |
| Estilos | Tailwind CSS | 4.x |
| Router | React Router | 6.x |
| Estado server | @tanstack/react-query | 5.x |
| Tests unit/integ | Vitest | 2.x |
| Tests componentes | @testing-library/react | 16.x |
| E2E | Playwright | 1.x |
| Lint + format | Biome | 1.x |

> Espejo del stack de **BV Cross** (Hono + better-sqlite3 + Zod / React + Vite + Tailwind v4 + React Router) → consistencia y curva cero.

### Notas de compatibilidad
- **better-sqlite3** es nativo (compila bindings). El Dockerfile debe incluir toolchain de build (`python3`, `make`, `g++`) en la etapa de build, o usar la imagen base adecuada. No funciona en runtimes edge (Cloudflare Workers) → ver `11-hosting.md`.
- **Tailwind v4** usa **config en CSS** (`@import "tailwindcss"` + `@theme { ... }`), no `tailwind.config.js`. Los tokens de `05-ui-design-system.md` se declaran ahí.
- **@node-rs/argon2** es nativo y precompilado para la mayoría de plataformas (evita el build de `argon2` clásico). Alternativa: `argon2`.

---

## 2. Estructura del monorepo

```
bv-bow-sight/
├─ pnpm-workspace.yaml          # packages/*
├─ package.json                 # scripts raíz (dev/build/start/test/lint/typecheck)
├─ tsconfig.base.json           # strict, paths
├─ biome.json
├─ Dockerfile
├─ .env.example
├─ .dockerignore  .gitignore  .nvmrc
├─ assets/                      # logos SVG (favicon, mini, completo)
├─ docs/
└─ packages/
   ├─ shared/                   # @bv/shared
   │  ├─ package.json
   │  ├─ tsconfig.json
   │  └─ src/
   │     ├─ schemas/            # Zod por entidad (auth, bowSetup, arrowSetup, sightConfig, distance)
   │     ├─ types.ts            # tipos inferidos de los schemas
   │     ├─ constants.ts        # bounds de validación, códigos de error
   │     ├─ ruler.ts            # scaleToY, generateTicks, layoutMarkers (puro)
   │     └─ index.ts
   │
   ├─ api/                      # @bv/api
   │  ├─ package.json
   │  ├─ tsconfig.json
   │  ├─ src/
   │  │  ├─ index.ts            # bootstrap Hono + serve
   │  │  ├─ env.ts              # carga + valida env con Zod
   │  │  ├─ db/
   │  │  │  ├─ connection.ts    # better-sqlite3 (PRAGMAs)
   │  │  │  ├─ schema.sql
   │  │  │  ├─ migrate.ts       # ejecuta schema/migraciones idempotentes
   │  │  │  └─ seed.ts          # datos de dev
   │  │  ├─ lib/                # hashing, sessions, csrf, tokens, time
   │  │  ├─ middleware/         # securityHeaders, rateLimit, requireAuth, requireCsrf, validate, errorHandler
   │  │  ├─ repositories/       # *.repo.ts (prepared statements, mapeo snake→camel)
   │  │  ├─ services/           # *.service.ts (reglas de negocio)
   │  │  ├─ routes/             # auth, bowSetups, arrowSetups, sightConfigs, distances, health
   │  │  └─ static.ts           # sirve dist de web + SPA fallback (prod)
   │  └─ tests/                 # integración (Vitest)
   │
   └─ web/                      # @bv/web
      ├─ package.json
      ├─ tsconfig.json
      ├─ vite.config.ts         # proxy /api en dev, build, alias @bv/shared
      ├─ index.html
      ├─ src/
      │  ├─ main.tsx
      │  ├─ app.tsx             # router + providers
      │  ├─ styles/index.css    # @import tailwindcss + @theme tokens
      │  ├─ lib/                # apiClient, csrf, theme, formatNumber
      │  ├─ components/         # UI kit + dominio (Ruler, DistanceMarker, ArrowSetSwitcher)
      │  ├─ features/           # hooks de datos (useAuth, useSightConfigs, useDistances…)
      │  └─ pages/              # una por pantalla
      └─ tests/                 # componentes (Vitest+RTL) + e2e/ (Playwright)
```

Alias TS: `@bv/shared` resoluble desde api y web (vía `tsconfig.base.json` paths + `vite` alias).

---

## 3. Backend — convenciones

- **Sin queries ad-hoc en rutas.** Las rutas parsean, validan (Zod), llaman a un *service* y devuelven status. Los services aplican reglas y usan *repositories*. Los repositories tienen los `prepared statements`.
- **Prepared statements** se preparan una vez (módulo) y se reutilizan. Nunca concatenar SQL con input → siempre placeholders `?` (anti-inyección).
- **Mapeo** snake_case (DB) ↔ camelCase (API) en el repository.
- **Transacciones** con `db.transaction(fn)` cuando una operación toca varias filas (ej. crear usuario + sesión).
- **Errores de dominio** como clases/objetos con `code` HTTP; el `errorHandler` los traduce a la forma de `03-api-spec.md`.
- **Tiempo** centralizado (`lib/time.ts` → `now()` = `Date.now()`), para poder mockear en tests.
- **Logs** estructurados (pino o el logger de Hono) sin datos sensibles (nunca password ni tokens).

## 4. Frontend — convenciones

- **Componentes funcionales + hooks.** Sin clases.
- **Datos remotos solo vía TanStack Query** (`features/*`): cada dominio expone hooks (`useSightConfig(id)`, `useCreateDistance(sightId)`…) con sus `queryKey` y, en mutaciones de distancias, *optimistic updates* + rollback.
- **`apiClient`** centraliza `fetch` (base `/api`, `credentials: 'include'`, header `X-CSRF-Token`, parseo de error uniforme). Nada de `fetch` suelto en componentes.
- **Formularios:** validación con los mismos schemas de `@bv/shared` (Zod) para feedback inmediato; el server revalida igual.
- **Sin `<form>` con submit nativo problemático**: usar handlers controlados (`onClick`/`onChange`) y `preventDefault` donde corresponda.
- **Números** siempre formateados con util compartida y `tabular-nums` en la UI.
- **Code splitting** por ruta (`React.lazy` + `Suspense`) para bundle chico.

## 5. Calidad y tipos

- `tsconfig.base.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes` recomendado.
- Biome para lint + format (rápido, una sola herramienta). Reglas de import order y a11y básicas activadas.
- `pnpm typecheck` (tsc `--noEmit` en todos los paquetes) corre en CI y antes de cada *Definition of Done*.

## 6. Build y arranque

- **Dev:** `pnpm dev` levanta api (watch) + web (Vite) en paralelo. Vite proxea `/api` → puerto del api. DB local en `./data/dev.db`.
- **Build:** `pnpm build` →
  1. compila `@bv/shared`,
  2. `vite build` en web → `packages/web/dist`,
  3. compila `@bv/api`,
  4. copia/expone `web/dist` para que `static.ts` lo sirva.
- **Start (prod):** `node packages/api/dist/index.js` sirve API + SPA en un puerto. Fallback SPA: cualquier ruta no-`/api` y no-archivo → `index.html`.
- **Compresión:** gzip/brotli de estáticos (la plataforma o middleware).

Detalle de variables y archivos de config: `09-configuration.md`.
