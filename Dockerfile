# syntax=docker/dockerfile:1

# ── Builder: instala todo y buildea el frontend ──
FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# Instalación cacheable: primero los manifiestos
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# Código y build del frontend
COPY . .
RUN pnpm --filter @bv/web build

# ── Runner: imagen final ──
FROM node:22-slim AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

# Reutiliza node_modules ya resueltos (better-sqlite3 compilado para esta base)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/api ./packages/api
# Solo el build del frontend (no el código fuente del front)
COPY --from=builder /app/packages/web/package.json ./packages/web/package.json
COPY --from=builder /app/packages/web/dist ./packages/web/dist

# La DB vive en /data: montá un volumen del hosting ahí para persistirla.
# No usamos la instrucción VOLUME: Railway (y otros PaaS) la rechazan; el
# volumen se monta desde el panel del hosting apuntando a /data.
ENV DATABASE_PATH=/data/bv-bow-sight.db

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# El API (tsx) sirve API + SPA en el mismo puerto
CMD ["pnpm", "--filter", "@bv/api", "start"]
