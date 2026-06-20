# 11 · Hosting — BV bow sight

Opciones para desplegar el **servicio único** (Hono que sirve API + SPA) con **SQLite**. Incluye configuración, pros/contras y recomendación.

---

## ⚠️ La regla que define todo: SQLite necesita disco persistente

SQLite es un **archivo**. Si el sistema de archivos del hosting es **efímero** (se resetea en cada deploy/reinicio, como pasa por defecto en la mayoría de PaaS), **se pierden todos los datos** en cada despliegue.

> **Obligatorio:** montar un **volumen persistente** y apuntar `DATABASE_PATH` a él (ej. `/data/bv-bow-sight.db`). Esto descarta de plano cualquier plataforma sin almacenamiento persistente, y también los runtimes *edge/serverless* sin filesystem (que además **no** soportan `better-sqlite3` nativo).

Consecuencia adicional: con SQLite + WAL conviene **una sola instancia** (single-writer). No escalar a múltiples réplicas. Para este proyecto (pocos usuarios) es exactamente lo que se necesita.

---

## Comparación

| Servicio | Volumen persistente | Precio aprox (entrada) | Build Docker / Node nativo | Veredicto |
|----------|--------------------|------------------------|----------------------------|-----------|
| **Railway** | Sí (Volumes) | ~5 USD/mes crédito + uso | Sí | ✅ **Recomendado** (ya lo usás) |
| **Fly.io** | Sí (Volumes / LiteFS) | Free allowance + uso bajo | Sí | ✅ Mejor alternativa |
| **Render** | Sí, pero **solo en planes pagos** (Disk) | Disk desde ~7 USD/mes | Sí | ⚠️ Ok si ya pagás |
| **Koyeb** | Sí (Volumes, regiones limitadas) | Free/!low | Sí | ⚠️ Alternativa |
| **VPS (Hetzner/otros)** | Sí (disco propio) | ~4–6 USD/mes | Sí (vos gestionás todo) | 💪 Más barato a escala, más ops |
| **Cloudflare Workers** | ❌ (no FS; usa D1) | — | ❌ no corre better-sqlite3 | ❌ No compatible sin reescribir DB |
| Vercel / Netlify (functions) | ❌ efímero | — | ❌ para este modelo | ❌ No apto |

---

## Opción recomendada — Railway

Ya lo usás (BV Cross está ahí), tiene volúmenes y el deploy es directo.

**Pasos:**
1. Nuevo proyecto desde el repo (deploy por Dockerfile, ya incluido en `09`).
2. **Agregar un Volume** y montarlo en `/data`.
3. Variables: `NODE_ENV=production`, `DATABASE_PATH=/data/bv-bow-sight.db`, `SESSION_SECRET` (`openssl rand -hex 32`), `PORT` (Railway lo inyecta; el server debe leer `process.env.PORT`), `COOKIE_SECURE=true`.
4. Deploy. Verificar que tras un **redeploy** los datos siguen ahí (prueba clave del volumen).

**Pros:** simple, lo conocés, TLS incluido, volúmenes, buen DX.
**Contras:** el volumen tiene costo; una sola región; atención a no correr múltiples réplicas con SQLite.

---

## Alternativa fuerte — Fly.io

Muy buena historia para SQLite (volúmenes y, si algún día hace falta, LiteFS para réplicas de lectura). Económico.

**Pasos:**
1. `fly launch` (detecta el Dockerfile).
2. `fly volumes create data --size 1` y montarlo en `/data` (en `fly.toml` → `[mounts] source="data" destination="/data"`).
3. Secrets: `fly secrets set SESSION_SECRET=...`; setear `DATABASE_PATH=/data/bv-bow-sight.db`, `NODE_ENV=production`, `COOKIE_SECURE=true`.
4. Mantener **1 instancia** (sin auto-scale a múltiples máquinas escribiendo el mismo SQLite).

**Pros:** barato, volúmenes, TLS, global, camino claro a crecer.
**Contras:** un poco más de configuración (`fly.toml`); el volumen es por región/máquina.

---

## Si querés mínimo costo y control — VPS (Hetzner)

Para pocos usuarios, un VPS chico alcanza y sobra; SQLite en disco es trivial.

**Esquema:**
1. VPS pequeño (1 vCPU / 1–2 GB).
2. Docker + el contenedor del proyecto; bind-mount de un directorio del host a `/data`.
3. **Reverse proxy con TLS:** Caddy (HTTPS automático) o Nginx + Let's Encrypt delante del contenedor.
4. Backups del archivo SQLite (cron + copia off-site).

**Pros:** lo más barato a largo plazo, control total, sin límites de plataforma.
**Contras:** vos gestionás TLS, actualizaciones, monitoreo y backups (más trabajo operativo).

---

## Backups (cualquier opción)

SQLite hace fácil el backup: copiar el archivo de forma consistente (idealmente con la API de backup de SQLite / `.backup`, o snapshot del volumen). Programar copias periódicas off-site. Esto no es opcional si los datos importan.

---

## Recomendación final

- **Empezá en Railway** con un Volume montado en `/data` → es lo que ya manejás y el deploy es inmediato.
- **Fly.io** es la alternativa si querés algo aún más barato o pensás en crecer/replicar.
- **VPS (Hetzner)** si priorizás costo mínimo y no te molesta el trabajo de ops.
- **Evitá** plataformas sin disco persistente y runtimes edge: con `better-sqlite3` no son una opción sin reescribir la capa de datos.
