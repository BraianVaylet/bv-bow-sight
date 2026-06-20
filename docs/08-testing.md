# 08 · Testing — BV bow sight

Los tests **no** son negociables. Validan funcionalidad, seguridad y el render del ruler. Toda tarea del plan termina con sus tests en verde.

---

## 1. Pirámide y herramientas

| Nivel | Qué cubre | Herramienta |
|-------|-----------|-------------|
| Unit | Math del ruler, validaciones Zod, utils | Vitest |
| Integración (API) | Endpoints sobre DB real (SQLite temporal) | Vitest + cliente de test de Hono |
| Componentes | UI kit, formularios, Ruler, botonera | Vitest + React Testing Library |
| E2E | Flujos completos en navegador | Playwright |

**Objetivo de cobertura:** 100% en caminos críticos (auth, ownership, math del ruler, validación de escala); ≥ 80% global. La cobertura es señal, no meta en sí.

---

## 2. Unit — `@bv/shared`

El math del ruler es puro → fácil de testear y de altísimo valor (alimenta la pantalla estrella).

- `scaleToY`:
  - `scaleToY(min, min, max, H) === 0` (mínimo arriba).
  - `scaleToY(max, min, max, H) === H` (máximo abajo).
  - punto medio → `H/2`.
  - monotonía: a mayor `value`, mayor `y` (crece hacia abajo).
- `generateTicks`:
  - cantidad correcta de marcas `lg`/`md`/`sm` para rangos conocidos (ej. min 0, max 3 → 4 marcas de cm con label "0".."3").
  - clasificación correcta (cada 10mm `lg`, cada 5mm `md`, resto `sm`).
  - guarda de densidad: con `height` chico y rango grande, se omiten `sm` (y luego `md`).
  - sin errores de float (trabajar en mm enteros): min 0.0, max 2.5 etc.
- `layoutMarkers`:
  - dos distancias muy cercanas → la segunda etiqueta se corre (`labelY` separado ≥ labelHeight) y conserva `anchorY` real.
  - orden por `y` ascendente.
- Schemas Zod: aceptan válidos y rechazan inválidos (alias corto, password < 8, `scaleMax ≤ scaleMin`, `distanceM ≤ 0`, notas demasiado largas).

## 3. Integración — `@bv/api`

**Harness:** cada test corre contra una SQLite **temporal** (archivo en `tmp` o `:memory:` con esquema aplicado), con `foreign_keys=ON`. Helpers: `registerAndLogin()` que devuelve cookies + token CSRF para usar en mutaciones.

Casos por área:

**Auth**
- register OK → 201 + cookie; `me` devuelve el usuario.
- register alias repetido → 409.
- register inválido (alias/password) → 400.
- login OK → 200; login mal → 401 genérico.
- bloqueo: N fallidos → 429; tras la ventana, vuelve a permitir.
- logout → 204; luego `me` → 401.
- rate limit en login → 429.

**CRUD (bow/arrow/sight/distances)**
- crear/listar/ver/editar/eliminar happy path.
- validaciones (campos faltantes/fuera de rango) → 400.
- `scaleMax ≤ scaleMin` → 400.
- distancia con `scaleValue` fuera de `[min,max]` → 400.
- borrar setup de flechas **con** distancias → 409; **sin** distancias → 204.
- borrar mira → CASCADE: sus distancias desaparecen.
- borrar setup de arco → la mira queda con `bowSetupId: null`.

**Seguridad / ownership (crítico)**
- usuario A intenta `GET/PATCH/DELETE` un recurso de B → **404** en todos.
- crear distancia referenciando un `arrowSetupId` de **otro** usuario → 400/404.
- rutas protegidas sin sesión → 401.
- mutación sin/with-wrong CSRF → 403.
- `GET /api/sight-configs/:id` de A no muestra distancias de B.

## 4. Componentes — `@bv/web`

- **Ruler:** dado `{scaleMin, scaleMax, distances}`, render y assert de:
  - cantidad de ticks y labels de cm correctos.
  - mínimo arriba / máximo abajo (posición del primer y último label).
  - cada distancia ubicada en su `y` esperado (usar el mismo math compartido).
  - leader line aparece cuando dos distancias se solapan.
- **ArrowSetSwitcher (botonera):** con `arrowSets.length > 1` aparece; click cambia el set y filtra los marcadores; con 1 set no es interactiva/oculta; preselección = `defaultArrowSetupId`.
- **Formularios:** errores de validación mostrados; submit deshabilitado/estado loading; mensajes de error con el copy correcto.
- **EmptyState / error / loading** de listas y de la vista ruler.
- **apiClient:** agrega `X-CSRF-Token`, `credentials: include`, parsea el error uniforme.

## 5. E2E — Playwright

Flujo principal (mobile viewport, ej. 390×844):
1. Registrarse con alias+password.
2. Crear un setup de arco y dos setups de flechas.
3. Crear una mira (escala 0–3, setup de arco + set por defecto).
4. Cargar varias distancias para el **set A** (20/30/50 m) y algunas para el **set B**.
5. En la vista ruler: verificar que se ven los marcadores del set A sobre la regla; cambiar a set B con la botonera y verificar el cambio.
6. Editar una distancia y verificar que se mueve; eliminar otra y verificar que desaparece (optimistic).
7. Logout → no se puede entrar a rutas privadas.

Extra recomendado: un flujo que intente acceder a `/sights/:id` de otro usuario y verifique el 404/redirect.

## 6. Integración continua (sugerido)

Pipeline mínimo en cada push/PR:
```
pnpm install
pnpm typecheck
pnpm lint
pnpm test          # unit + integración + componentes
pnpm test:e2e      # Playwright (headless)
```
Bloquear merge si algo falla. Reportar cobertura.

## 7. Datos de prueba

Reusar el `seed` de dev (`packages/api/src/db/seed.ts`) como base de fixtures: un usuario, setups, una mira con distancias en dos sets. Mantenerlo alineado con el esquema.
