# 01 · Documentación funcional — BV bow sight

Define **qué** hace la app, sus pantallas, flujos y reglas de negocio. No define el *cómo* técnico (eso está en `06-technical-spec.md`).

---

## 1. Contexto y objetivo

Un arquero de arco compuesto configura su mira para distintas distancias útiles (20, 30, 40, 50, 60 m, etc.). Cada **set de flechas** distinto cambia por completo la calibración. Hoy eso se anota en un papel pegado a la mira.

**BV bow sight** permite consultar de forma rápida y clara en qué punto de la escala colocar la mira para una distancia y un set de flechas dados. La consulta tiene que ser **instantánea**: la app no debe entorpecer el entrenamiento.

### Glosario de dominio

| Término | Significado |
|---------|-------------|
| **Setup de arco** | Configuración del arco (mira, estabilizadores, gatillo, etc.). Es un texto descriptivo con nombre. |
| **Setup de flechas** | Configuración de flechas (puntas, tubos, banes, nocks). Texto descriptivo con nombre. Es lo que más cambia la calibración. |
| **Configuración de mira** | Una mira concreta del arquero, con su escala (mín/máx) y sus distancias cargadas. Un arquero puede tener más de una. |
| **Escala** | Posición sobre la regla de la mira (ej: `0.8`, `1.5`). Medida en **centímetros**. |
| **Distancia** | El registro que vincula una posición de escala con los metros que representa, para un set de flechas (ej: escala `1.5` → `30 m` con flechas X). |
| **Ruler** | La regla vertical en pantalla que imita la escala física de la mira. Pantalla estrella. |

---

## 2. Entidades (vista funcional)

```
Usuario ──< Setup de arco
        ──< Setup de flechas
        ──< Configuración de mira ──< Distancia
```

- **Usuario:** alias + password.
- **Setup de arco:** `nombre`, `observaciones`.
- **Setup de flechas:** `nombre`, `observaciones`.
- **Configuración de mira:** `nombre`, `setup de arco` (opcional), `setup de flechas por defecto` (opcional), `escala mínima`, `escala máxima`.
- **Distancia** (pertenece a una config de mira): `escala`, `distancia (m)`, `setup de flechas`, `observaciones` (opcional).

> El campo "setup de flechas por defecto" de la config de mira **no limita** qué distancias se cargan; solo determina qué set aparece **preseleccionado** en la botonera al abrir la mira. Cada distancia indica su propio set de flechas. Ver detalle en §5.5.

Detalle de tipos, longitudes y restricciones: `02-data-model.md`.

---

## 3. Mapa de pantallas

| Pantalla | Ruta sugerida | Acceso |
|----------|---------------|--------|
| Login / inicio | `/login` | Pública |
| Crear cuenta | `/register` | Pública |
| Principal (lista de miras) | `/` | Privada |
| Setups de arco (lista) | `/bow-setups` | Privada |
| Crear setup de arco | `/bow-setups/new` | Privada |
| Setups de flechas (lista) | `/arrow-setups` | Privada |
| Crear setup de flechas | `/arrow-setups/new` | Privada |
| Crear config de mira | `/sights/new` | Privada |
| **Config de mira (ruler)** | `/sights/:id` | Privada |
| Nueva distancia | `/sights/:id/distances/new` | Privada |

Edición/eliminación de cada entidad se resuelve dentro de su pantalla (modal o pantalla de edición; ver §6).

---

## 4. Flujo principal del usuario

```
Registro/Login
   └─ Principal (mis miras)
        ├─ (primera vez) → crear Setup de arco / Setup de flechas
        ├─ → Crear configuración de mira  (elige escala mín/máx)
        └─ → Abrir una mira  →  VISTA RULER
                                  ├─ ver distancias sobre la regla
                                  ├─ cambiar set de flechas (botonera)
                                  └─ + Nueva distancia / editar / eliminar
```

Camino feliz mínimo: registrarse → crear 1 setup de flechas → crear 1 mira → cargar distancias → consultarlas sobre el ruler.

---

## 5. Especificación por pantalla

### 5.1 Login / inicio

- Campos: **alias**, **password**.
- Acción **Entrar**. Link a **Crear cuenta**.
- Errores con mensaje genérico ("Alias o contraseña incorrectos") — no revelar si el alias existe.
- Tras login exitoso → Principal.
- Si hay demasiados intentos fallidos, la cuenta se bloquea temporalmente y se informa ("Demasiados intentos. Probá de nuevo en unos minutos.").

### 5.2 Crear cuenta

- Campos: **alias** (único), **password**.
- Reglas: alias 3–30 caracteres; password mínimo 8. Validación en vivo + al enviar.
- Si el alias ya existe → mensaje claro ("Ese alias ya está en uso").
- Tras crear → queda logueado y va a Principal.
- *(2da instancia, fuera de alcance del MVP: servicio de autenticación externo.)*

### 5.3 Principal

- Lista de **configuraciones de mira** del usuario (cards). Cada card muestra nombre de la mira y, si tiene, nombre del setup de arco asociado.
- Tap en una mira → Vista ruler.
- Acciones de navegación visibles: **Crear mira**, **Setups de arco**, **Setups de flechas**.
- **Estado vacío:** si no hay miras, invitar a crear la primera ("Todavía no tenés miras. Creá una para empezar a cargar distancias.").

### 5.4 Setups de arco / flechas (listas y creación)

**Lista:** listado de los setups del usuario; botón para crear uno nuevo; cada item permite editar/eliminar.

**Creación de setup de arco:**
- `nombre del setup` — requerido (texto).
- `observaciones` — requerido (textarea): arco, mira, estabilizadores, gatillo, etc.

**Creación de setup de flechas:**
- `nombre del setup` — requerido (texto).
- `observaciones` — requerido (textarea): puntas, tubos, banes, nocks, etc.

> Eliminar un setup de **arco** referenciado por una mira: la mira simplemente queda sin setup de arco asociado (no se borra).
> Eliminar un setup de **flechas** que tiene **distancias cargadas**: se bloquea con un mensaje claro ("Este set de flechas tiene distancias cargadas. Eliminá o reasigná esas distancias antes."). Evita pérdida silenciosa de datos.

### 5.5 Config de mira — Vista ruler ⭐ (prioridad)

Es la pantalla central. Detalle visual completo en `05-ui-design-system.md` §Ruler.

Muestra:
1. **Encabezado:** nombre de la configuración y, si tiene, nombre del setup de arco. Botón volver.
2. **Botonera de sets de flechas:** si hay distancias cargadas para más de un set de flechas, una botonera (segmented control) permite elegir cuál ver sobre la regla. Preselección = setup de flechas por defecto de la mira, o el primero disponible.
3. **Regla vertical (ruler):** ocupa el alto disponible, sobre el lado **izquierdo**. Imita la escala de una mira real:
   - Valor mínimo arriba, máximo abajo (la escala **crece hacia abajo**).
   - Marcas tipo regla: **1 mm** (rayita chica), **5 mm** (mediana), **1 cm** (grande, con número).
4. **Distancias** cargadas (del set seleccionado): cada una se ubica en su posición exacta de la escala, mostrando en un chip de **una línea** los **metros** y su **valor de escala** (este último en el color base). Se ven **todas al mismo tiempo**.
5. **Distancias calculadas** (cuando se desbloquea, ver §5.7): intermedias, de sala y la consultada, con estilo visual distinto al de las medidas.
6. **Botón "+ Nueva distancia".**

Interacciones:
- Cambiar set en la botonera → se actualizan las distancias visibles sobre la misma regla.
- Tap en una distancia **medida** → editar / eliminar. Las calculadas no son editables.

Reglas:
- Si la mira no tiene distancias → estado vacío con CTA para cargar la primera.
- Las distancias cuyo valor de escala cae fuera de `[mín, máx]` no pueden crearse (validación, §5.6).

### 5.6 Nueva distancia

Campos:
- `escala` — requerido. Posición en la escala de la mira (ej: `0.8`, `1.5`). Debe estar dentro de `[escala mínima, escala máxima]` de la mira.
- `distancia (m)` — requerido. Metros que representa (ej: `20`, `30`, `50`).
- `setup de flechas` — requerido. Se elige de los setups de flechas del usuario.
- `observaciones` — opcional (texto).

Se pueden crear todas las distancias que se quieran. **Editar** y **eliminar** disponibles. Todas se ven a la vez en la vista ruler (filtradas por set de flechas vía botonera).

### 5.7 Cálculo de distancias intermedias ⭐

A partir de las marcas que el arquero **midió tirando**, la app calcula la posición de la
mira para distancias que no disparó. El alcance es **por set de flechas seleccionado** (cada
set tiene su propia balística).

**Desbloqueo:** mientras el set seleccionado tenga **menos de 5** marcas, se muestra un aviso
con el progreso (`X/5`). Al llegar a **5 o más** aparece un botón **"Calcular distancias
intermedias"** que activa la sección de cálculo.

**Qué se muestra al activarlo:**
- Sobre el ruler, las **distancias intermedias** (la distancia media entre cada par de marcas
  consecutivas; ej. con 20/30/40/50/60 → 25/35/45/55) más la de **sala (18 m)**, todas con un
  estilo distinto al de las medidas (chip punteado/gris). Las **extrapoladas** (fuera del rango
  medido, p. ej. la de 18) se marcan con `≈` y la etiqueta "estimada".
- Un **gráfico** de la curva escala ↔ distancia debajo del ruler: la interpolación medida
  (sólida) y la extrapolación (punteada), con un indicador de calidad del ajuste.
- Una **calculadora**: el arquero ingresa **cualquier** distancia y obtiene su valor de escala
  al instante, indicando si es *medido* (interpolado) o *estimado* (extrapolado). Esa distancia
  se resalta sobre el ruler con un **color propio**, distinto de las medidas y las intermedias.

**Modelo (ver `04-architecture.md` §4.5):** spline cúbico monótono **PCHIP** dentro del rango
medido (pasa exacto por las marcas, nunca decrece) y **parábola de mínimos cuadrados** para
extrapolar fuera del rango. Las marcas calculadas que caen fuera de `[escala mín, máx]` no se
muestran.

---

## 6. Reglas de negocio (transversales)

- **Aislamiento por usuario:** cada usuario ve y modifica **solo** sus datos. Nunca los de otro.
- **CRUD completo** en todas las entidades (no solo distancias): listar, crear, ver, editar, eliminar.
- **Validación de escala:** `escala máxima` > `escala mínima`; cada `escala` de distancia dentro del rango de su mira.
- **Unidad de escala:** centímetros, con precisión de milímetro.
- **Confirmación destructiva:** eliminar mira, setup o distancia pide confirmación. Eliminar una mira borra sus distancias.
- **Sensación de instantáneo:** las acciones sobre distancias usan *optimistic updates* (se reflejan en pantalla antes de confirmar el server). Es clave para no frenar el entrenamiento.

---

## 7. Estados de UI a contemplar (todas las pantallas)

Para cada listado/recurso, contemplar: **cargando**, **vacío**, **error** (con acción para reintentar), **éxito**. Los mensajes de error explican qué pasó y cómo seguir, en la voz de la interfaz (ver guía de copy en `05-ui-design-system.md`).

---

## 8. Fuera de alcance (MVP)

- Servicio de autenticación externo (queda para 2da instancia).
- **Offline de escritura / sincronización** con cola y resolución de conflictos. (La app **sí** es PWA instalable y funciona **offline en solo lectura** —consultar miras y calcular distancias—; ver `04-architecture.md` §8.)
- Compartir miras entre usuarios; roles; multi-idioma.
- Importación/exportación de datos, fotos, gráficos de agrupación.
- Inversión de orientación del ruler configurable por el usuario (se deja preparado el código, pero la UI del MVP usa mín-arriba fijo).

---

## 9. Criterios de aceptación (alto nivel)

1. Un usuario nuevo puede registrarse e ingresar solo con alias + password.
2. Puede crear, editar y eliminar setups de arco y de flechas.
3. Puede crear una mira definiendo escala mín/máx y (opcional) setups asociados.
4. Puede cargar, editar y eliminar distancias dentro de una mira, asociándolas a un set de flechas.
5. En la vista ruler ve una regla vertical con marcas de 1 mm / 5 mm / 1 cm, mín arriba y máx abajo, con todas las distancias del set seleccionado ubicadas correctamente y mostrando los metros.
6. Si tiene distancias para más de un set de flechas en una mira, puede alternar el set visible con una botonera.
7. No puede ver ni modificar datos de otro usuario.
8. La app responde de forma fluida en un celular de gama media.
