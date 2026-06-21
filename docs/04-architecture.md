# 04 · Arquitectura — BV bow sight

Forma del sistema, capas, decisiones y topología de despliegue.

---

## 1. Vista general

Aplicación de **un solo servicio**: un proceso Node corriendo Hono que expone la API y, en producción, sirve la SPA de React ya compilada como archivos estáticos. Una sola base SQLite en un archivo sobre un **volumen persistente**.

```
                          ┌──────────────────────────────────────┐
   Navegador móvil        │            Servicio Node               │
  ┌───────────────┐       │  ┌────────────────────────────────┐   │
  │  SPA React     │  HTTPS│  │            Hono 4              │   │
  │  (Vite build)  │◄─────►│  │  ├─ /api/*  → rutas + lógica   │   │
  │  TanStack Query│       │  │  └─ /*      → estáticos SPA    │   │
  └───────────────┘       │  └───────────────┬────────────────┘   │
                          │                  │ better-sqlite3      │
                          │            ┌─────▼─────┐               │
                          │            │  SQLite   │ (volumen)     │
                          │            └───────────┘               │
                          └──────────────────────────────────────┘
```

¿Por qué un solo servicio? Menos costo, menos superficie de ataque, deploy trivial, sin CORS en prod (mismo origen). Encaja con "pocos usuarios, rápido, barato".

---

## 2. Monorepo y capas

`pnpm` workspaces con tres paquetes (detalle en `06-technical-spec.md`):

- **`@bv/shared`** — Zod schemas, tipos inferidos, constantes de validación, **math puro del ruler** y el **cálculo de marcas de mira** (PCHIP + parábola, §4.5). Sin dependencias de framework. Lo consumen api, web y los tests.
- **`@bv/api`** — Hono + better-sqlite3. Capas internas:
  ```
  routes/        Hono routers (parseo, status, llaman a services)
  middleware/    auth, csrf, security headers, rate-limit, error handler, validación
  services/      reglas de negocio (validación cruzada, orquestación)
  repositories/  acceso a datos (prepared statements, mapeo snake→camel)
  db/            conexión, schema.sql, migraciones, seed
  lib/           hashing, sesiones, tokens, env
  ```
- **`@bv/web`** — React + Vite. Capas:
  ```
  pages/         una por pantalla (ver mapa funcional)
  components/    UI kit + componentes de dominio (Ruler, DistanceMarker, ArrowSetSwitcher)
  features/      hooks de datos por dominio (useSightConfig, useDistances…) sobre TanStack Query
  lib/           apiClient, csrf, theme, formato de números
  ```

**Regla de dependencias:** `routes → services → repositories`. Las rutas no tocan la DB directo; los services no conocen Hono. Esto mantiene la lógica testeable sin HTTP.

---

## 3. Ciclo de un request (mutación, ej. crear distancia)

```
POST /api/sight-configs/5/distances
  │
  ├─ securityHeaders         (CSP, etc.)
  ├─ rateLimit               (ventana por IP)
  ├─ requireAuth             → resuelve sesión por cookie → userId (o 401)
  ├─ requireCsrf             → compara header X-CSRF-Token vs cookie (o 403)
  ├─ validate(body, Zod)     → DistanceCreateSchema (o 400)
  ├─ route handler
  │     └─ distanceService.create(userId, sightId, dto)
  │           ├─ sightRepo.findOwned(userId, sightId)      → 404 si no
  │           ├─ arrowRepo.findOwned(userId, dto.arrowId)  → 400/404 si no
  │           ├─ assert dto.scaleValue ∈ [min,max]          → 400 si no
  │           └─ distanceRepo.insert(...)                   (prepared stmt, tx si aplica)
  │
  └─ 201 { distancia } + errorHandler envuelve cualquier throw
```

Los `GET` saltan CSRF. El `errorHandler` global traduce errores de dominio a la forma de `03-api-spec.md` y nunca filtra stack al cliente.

---

## 4. Algoritmo del Ruler (canónico) ⭐

Vive en **`@bv/shared`** como funciones puras (testeables, reutilizables por UI y tests). La UI solo dibuja lo que estas funciones calculan.

### 4.1 Mapeo escala → píxel

Orientación: **mínimo arriba, la escala crece hacia abajo**.

```ts
// height = alto útil del ruler en px; min/max en cm
function scaleToY(value: number, min: number, max: number, height: number): number {
  return ((value - min) / (max - min)) * height;   // min→0 (arriba), max→height (abajo)
}
```

### 4.2 Generación de marcas (ticks)

Se trabaja en **milímetros enteros** para evitar errores de punto flotante.

```ts
type Tick = { y: number; size: 'sm' | 'md' | 'lg'; label?: string };

function generateTicks(min: number, max: number, height: number): Tick[] {
  const mmMin = Math.round(min * 10);
  const mmMax = Math.round(max * 10);
  const pxPerMm = height / (mmMax - mmMin);

  // Guarda de rendimiento/legibilidad: si las marcas de 1mm quedan muy juntas, se omiten.
  const showMm   = pxPerMm >= 4;        // ~4px mínimo entre rayitas de 1mm
  const showHalf = pxPerMm * 5 >= 4;    // marcas de 5mm

  const ticks: Tick[] = [];
  for (let mm = mmMin; mm <= mmMax; mm++) {
    const isCm   = mm % 10 === 0;
    const isHalf = mm % 5 === 0;
    if (!isCm && !isHalf && !showMm) continue;
    if (!isCm && isHalf && !showHalf) continue;

    const size: Tick['size'] = isCm ? 'lg' : isHalf ? 'md' : 'sm';
    const y = ((mm - mmMin) / (mmMax - mmMin)) * height;
    ticks.push({ y, size, label: isCm ? String(mm / 10) : undefined });
  }
  return ticks;
}
```

- Marcas: `lg` = cada 1 cm (con número), `md` = cada 5 mm, `sm` = cada 1 mm.
- Largos de rayita sugeridos (px): `sm` 8, `md` 14, `lg` 22 (escalables; ver `05-ui-design-system.md`).
- El ruler **se ajusta al alto disponible** (no scrollea); si el rango es grande, la guarda omite las marcas más finas para que siga legible y liviano.

### 4.3 Ubicación de distancias y anti-solape

```ts
function layoutMarkers(distances, min, max, height, labelHeight = 22) {
  const points = distances
    .map(d => ({ ...d, y: scaleToY(d.scaleValue, min, max, height) }))
    .sort((a, b) => a.y - b.y);

  // empuje greedy hacia abajo si dos labels se pisarían; se dibuja leader line al y real
  let lastBottom = -Infinity;
  for (const p of points) {
    const labelY = Math.max(p.y, lastBottom + labelHeight);
    p.labelY = labelY;            // posición visual del label
    p.anchorY = p.y;              // posición real sobre la regla (para la línea guía)
    lastBottom = labelY;
  }
  return points;
}
```

El render (SVG) dibuja, por cada distancia: una marca/línea en `anchorY` sobre la regla y, a la derecha, un chip de **una línea** `"{distanceM} m · esc {scaleValue}"` en `labelY` (el valor de escala en el color base), unidos por una leader line si difieren. El chip tiene tres estilos según el origen de la marca (`variant`): **medida** (color base), **calculada** (gris punteado, con `≈` si es extrapolada) y **consultada** (invertida, color propio). Detalle visual en `05-ui-design-system.md`.

### 4.4 Por qué SVG

Líneas nítidas a cualquier densidad, posicionamiento por coordenadas exacto, texto fácil de ubicar, escala sin pérdida y costo de render bajo (decenas de nodos). Encaja con el requisito de performance.

### 4.5 Cálculo de marcas de mira (PCHIP + parábola) ⭐

Vive en **`@bv/shared`** (`sightMarks.ts`) como funciones puras. A partir de las marcas
medidas de un set de flechas construye un modelo `escala = f(distancia)`:

- **Interpolación (dentro del rango medido):** spline cúbico monótono **PCHIP**
  (Fritsch–Carlson). Pasa **exacto** por las marcas, es suave y **monótono** (nunca decrece,
  sin overshoot) → honra lo que el arquero realmente tiró.
- **Extrapolación (fuera del rango):** **parábola de mínimos cuadrados** (`a·d² + b·d + c`,
  resuelta por Cramer). Sirve para la de sala (18 m) y distancias por encima del máximo.
- **Control de calidad:** los **residuos** de la parábola (`maxAbsResidual`) indican qué tan
  "parabólicos" son los datos; un residuo grande delata una marca probablemente mal medida.

```ts
const model = createSightModel(points);   // points: { distance, mark }[]  (>= 5 en la práctica)
model.markAt(25);   // { mark, interpolated: true }   -> PCHIP (dentro del rango)
model.markAt(18);   // { mark, interpolated: false }  -> parábola (extrapolación, sala)
```

Helpers asociados: `intermediateDistances` (distancia media entre marcas consecutivas) y
`computeSightMarks` (genera las intermedias + sala, filtrando las ya cargadas y las que caen
fuera de `[escala mín, máx]`). El gate de desbloqueo es `SIGHT_CALC_MIN_MARKS` (5) marcas por
set; la de sala usa `INDOOR_DISTANCE_M` (18). El módulo es framework-agnóstico y está cubierto
por tests en `packages/shared/tests/sightMarks.test.ts`.

---

## 5. Estado del frontend

- **Estado servidor:** TanStack Query v5 (cache, revalidación, *optimistic updates* en distancias). Es la fuente de los datos remotos.
- **Estado UI local:** `useState`/`useReducer` (set de flechas seleccionado en la botonera, formularios, toggle de cálculo y distancia consultada en la vista ruler). Sin Redux ni store global pesado.
- **Auth:** query `useMe` (sobre `GET /api/auth/me`) + guard de rutas.
- **Tema:** contexto liviano + `localStorage`: modo claro/oscuro y **color base** elegible (verde por defecto + paleta), con el texto sobre el color calculado por contraste. Esto es una app real en navegador; aplica sin restricciones.

---

## 6. Decisiones de arquitectura (ADRs)

| # | Decisión | Motivo | Alternativa descartada |
|---|----------|--------|------------------------|
| ADR-1 | Servicio único (Hono sirve API + SPA) | Costo, simplicidad, sin CORS en prod, menos superficie | Front y back separados (más infra/costo) |
| ADR-2 | SQLite + better-sqlite3 | Pocos usuarios, latencia sub-ms, cero ops de DB | Postgres (overkill y más caro) |
| ADR-3 | Sesión opaca en cookie httpOnly | Revocable, no expuesta a XSS, simple | JWT en localStorage (riesgo XSS) |
| ADR-4 | Math del ruler en `@bv/shared` puro | Testeable y reutilizable; UI tonta | Lógica dentro del componente React |
| ADR-5 | Monorepo pnpm con `shared` | Tipos y validación únicos entre front/back | Duplicar tipos/schemas |
| ADR-6 | Sin PWA/offline | Decisión del cliente; simplifica todo | Offline-first (sync, conflictos) |
| ADR-7 | "No es tuyo" → 404 | No filtra existencia de recursos | 403 (revela que el id existe) |
| ADR-8 | PCHIP dentro del rango + parábola fuera (§4.5) | Honra las marcas medidas (interpolación exacta y monótona) y permite extrapolar (sala, lejanas) | Solo parábola (no pasa por las marcas) o solo spline (no extrapola) |

---

## 7. Topología de despliegue

```
Internet ──HTTPS──► [Plataforma: Railway/Fly] ──► contenedor Node (Hono)
                                                       │
                                                  /data (volumen)
                                                       │
                                                  bv-bow-sight.db
```

- **TLS** lo termina la plataforma.
- La imagen Docker **no** contiene la DB: el archivo vive en el volumen montado (`DATABASE_PATH=/data/...`). Sin volumen persistente, los datos se pierden en cada deploy (ver `11-hosting.md`).
- Variables sensibles por entorno (ver `09-configuration.md`).
- Escalado: pensado para **una instancia** (SQLite con WAL es single-writer). Para crecer, primero VPS más grande; recién después migrar de motor — no es el caso de este proyecto.
