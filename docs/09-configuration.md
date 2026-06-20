# 09 · Configuración — BV bow sight

Variables de entorno, archivos de configuración, setup local y scripts.

---

## 1. Variables de entorno

Todas se cargan y **validan con Zod** en `packages/api/src/env.ts` (si falta una requerida en prod, el server no arranca).

| Variable | Requerida | Default (dev) | Descripción |
|----------|-----------|---------------|-------------|
| `NODE_ENV` | sí | `development` | `development` \| `production` \| `test`. Activa cookie `Secure`, HSTS, errores genéricos en prod. |
| `PORT` | no | `3000` | Puerto del servicio (API + SPA). |
| `DATABASE_PATH` | sí (prod) | `./data/dev.db` | Ruta al archivo SQLite. **En prod debe apuntar al volumen** (ej. `/data/bv-bow-sight.db`). |
| `SESSION_SECRET` | sí (prod) | dev fijo | Secreto para firmar/HMAC (CSRF y/o cookie). Generar con `openssl rand -hex 32`. |
| `SESSION_TTL_DAYS` | no | `30` | Vida de la sesión. |
| `COOKIE_SECURE` | no | `false` | Forzar `Secure` en la cookie. En prod efectivo = `true`. |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Solo dev (origen del Vite dev server). En prod no se usa (mismo origen). |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Ventana del rate limit global. |
| `RATE_LIMIT_MAX` | no | `120` | Máx requests por ventana (global). |
| `AUTH_RATE_LIMIT_MAX` | no | `10` | Máx requests por ventana en endpoints de auth. |
| `LOGIN_MAX_ATTEMPTS` | no | `8` | Intentos fallidos antes de bloquear. |
| `LOGIN_LOCK_MINUTES` | no | `15` | Duración del bloqueo por intentos. |
| `LOG_LEVEL` | no | `info` | `debug`\|`info`\|`warn`\|`error`. |

### `.env.example`
```dotenv
NODE_ENV=development
PORT=3000
DATABASE_PATH=./data/dev.db
SESSION_SECRET=change-me-with-openssl-rand-hex-32
SESSION_TTL_DAYS=30
COOKIE_SECURE=false
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
AUTH_RATE_LIMIT_MAX=10
LOGIN_MAX_ATTEMPTS=8
LOGIN_LOCK_MINUTES=15
LOG_LEVEL=info
```

> `.env` va en `.gitignore`. Nunca commitear secretos reales.

---

## 2. Archivos de configuración

### `pnpm-workspace.yaml`
```yaml
packages:
  - "packages/*"
```

### `tsconfig.base.json` (extendido por cada paquete)
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "paths": { "@bv/shared": ["./packages/shared/src/index.ts"] }
  }
}
```

### `packages/web/vite.config.ts` (esquema)
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@bv/shared': path.resolve(__dirname, '../shared/src') } },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },   // dev: front → api
  },
  build: { outDir: 'dist', sourcemap: false },
});
```

### Tailwind v4 — config en CSS (`packages/web/src/styles/index.css`)
Tailwind v4 **no** usa `tailwind.config.js`. Los tokens de `05-ui-design-system.md` van acá:
```css
@import "tailwindcss";

@theme {
  --color-primary: #E3CB0D;
  --color-primary-strong: #C9B40B;
  --color-on-primary: #18181B;
  --color-primary-ink: #8A7A06;
  /* ...resto de tokens (oscuro como default; claro via [data-theme="light"]) */
  --radius-md: 10px;
}

/* Tema claro: override de variables bajo un selector */
[data-theme="light"] {
  --color-bg: #FAFAFA;
  --color-surface: #FFFFFF;
  /* ... */
}
```

### `biome.json` (esquema)
```jsonc
{
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true, "a11y": { "recommended": true } }
  },
  "organizeImports": { "enabled": true }
}
```

### Vitest / Playwright
- `vitest.config.ts` por paquete (entorno `node` en api/shared, `jsdom` en web). Cobertura con `v8`.
- `playwright.config.ts` en web: viewport mobile por defecto, baseURL al server de preview/prod local, retries en CI.

---

## 3. Setup local (primera vez)

```bash
# requisitos: Node 20 LTS, pnpm ≥ 9
pnpm install
cp .env.example .env            # ajustar SESSION_SECRET
pnpm db:seed                    # crea ./data/dev.db con datos de prueba
pnpm dev                        # api (3000) + web (5173) en paralelo
# abrir http://localhost:5173
```

Usuario de prueba sembrado por `seed` (documentar alias/clave en el README; solo para dev).

---

## 4. Scripts raíz (`package.json`)

| Script | Acción |
|--------|--------|
| `pnpm dev` | Levanta api (watch) + web (Vite) en paralelo (concurrently). |
| `pnpm build` | shared → web (`vite build`) → api; deja `web/dist` listo para servir. |
| `pnpm start` | Corre el api compilado (sirve API + SPA) en `PORT`. |
| `pnpm test` | Unit + integración + componentes (Vitest). |
| `pnpm test:e2e` | Playwright (headless). |
| `pnpm typecheck` | `tsc --noEmit` en todos los paquetes. |
| `pnpm lint` | Biome check. |
| `pnpm format` | Biome format (write). |
| `pnpm db:seed` | Aplica esquema + datos de dev. |
| `pnpm db:reset` | Borra y recrea la DB de dev. |

---

## 5. Dockerfile (multi-stage, esquema)

```dockerfile
# ---- build ----
FROM node:20-slim AS build
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*          # toolchain para better-sqlite3
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod                        # deja solo deps de runtime

# ---- runtime ----
FROM node:20-slim AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
EXPOSE 3000
CMD ["node", "packages/api/dist/index.js"]
```

Notas:
- La **DB no va en la imagen**: vive en el volumen montado en `DATABASE_PATH` (ver `11-hosting.md`).
- `.dockerignore`: `node_modules`, `**/dist`, `data`, `.env`, `docs`, `tests`.
- `better-sqlite3` necesita el toolchain en la etapa de build (ya incluido).
