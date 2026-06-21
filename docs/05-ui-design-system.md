# 05 · Sistema de diseño y UI — BV bow sight

Guía visual de la app. La estrella es la **vista de mira (ruler)**: ese componente es la firma del producto y donde se concentra la personalidad. Todo lo demás es limpio y silencioso para que el ruler se luzca.

---

## 1. Concepto

El mundo del producto es la **precisión instrumental**: la mira, la diana, la escala milimetrada. La app se siente como un instrumento de calibración, no como un dashboard genérico. Superficie oscura por defecto (como mirar a través de la mira), dorado como único acento (el color de la marca y del "pin"), y una regla vertical de verdad como pieza central.

**Mobile-first siempre.** Se diseña primero para ~390px de ancho y una mano. Desktop es una mejora, no el caso base.

---

## 2. Marca y assets

Logos provistos en `assets/` (usarlos como SVG directos; no hace falta cargar la fuente Chewy en runtime):

| Archivo | Uso |
|---------|-----|
| `bv-bowsight-svg.svg` | Logo completo — splash / login / header amplio |
| `bv-bowsight-mini-svg.svg` | "BV" + diana — header compacto |
| `bv-bowsight-favicon-svg.svg` | Solo diana — favicon, app icon, loaders |

El ícono de **diana con retícula** es el motivo recurrente: favicon, indicador de carga (puede rotar sutilmente), y marca de las distancias sobre el ruler.

---

## 3. Tokens de color

Paleta derivada de la marca (`#E3CB0D` dorado, `#18181B` zinc). Se definen como CSS custom properties y se exponen a Tailwind v4 vía `@theme`.

### Primario (marca)
| Token | Hex | Uso |
|-------|-----|-----|
| `--color-primary` | `#E3CB0D` | Acento, fills, pin de distancia, estado activo |
| `--color-primary-strong` | `#C9B40B` | Hover/pressed sobre primario |
| `--color-on-primary` | `#18181B` | Texto/iconos **sobre** dorado (siempre oscuro) |
| `--color-primary-ink` | `#8A7A06` | Dorado oscuro para **texto/links sobre fondo claro** (ver contraste §3.3) |

### Tema oscuro (default)
| Token | Hex |
|-------|-----|
| `--color-bg` | `#18181B` |
| `--color-surface` | `#27272A` |
| `--color-surface-2` | `#3F3F46` |
| `--color-border` | `#3F3F46` |
| `--color-text` | `#FAFAFA` |
| `--color-text-muted` | `#A1A1AA` |
| `--color-ruler-line` | `#52525B` |
| `--color-ruler-label` | `#D4D4D8` |

### Tema claro
| Token | Hex |
|-------|-----|
| `--color-bg` | `#FAFAFA` |
| `--color-surface` | `#FFFFFF` |
| `--color-surface-2` | `#F4F4F5` |
| `--color-border` | `#E4E4E7` |
| `--color-text` | `#18181B` |
| `--color-text-muted` | `#71717A` |
| `--color-ruler-line` | `#A1A1AA` |
| `--color-ruler-label` | `#3F3F46` |

### Semánticos (ambos temas)
| Token | Hex |
|-------|-----|
| `--color-danger` | `#EF4444` |
| `--color-danger-ink` | `#B91C1C` |
| `--color-success` | `#22C55E` |
| `--color-warning` | `#F59E0B` |

### 3.3 Contraste (importante)
El dorado `#E3CB0D` **no** tiene contraste suficiente para texto chico sobre blanco. Reglas:
- Sobre **dorado** → texto/iconos en `--color-on-primary` (`#18181B`). ✔ contraste alto.
- Dorado como **texto/link sobre fondo claro** → usar `--color-primary-ink` (`#8A7A06`).
- Dorado sobre fondo **oscuro** (`#18181B`) → ✔ pasa para títulos y números grandes; para texto chico verificar y, si hace falta, subir luminancia.
- Objetivo: WCAG AA (4.5:1 texto normal, 3:1 texto grande/UI).

---

## 4. Tipografía

- **Display (solo wordmark):** *Chewy* — vive dentro de los SVG del logo. No se usa en la UI.
- **UI / body:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Cero descarga → arranque instantáneo (alineado con el requisito de performance).
- **Números (escala y distancias):** la misma sans con `font-variant-numeric: tabular-nums` para que los dígitos alineen en la regla.

Escala tipográfica (mobile):
| Rol | Tamaño / peso |
|-----|---------------|
| Título pantalla | 20px / 700 |
| Subtítulo | 16px / 600 |
| Cuerpo | 15px / 400 |
| Label / caption | 13px / 500 |
| Número distancia (ruler) | 18px / 700, tabular |
| Número de escala (ticks) | 12px / 500, tabular |

---

## 5. Tokens de layout

- **Radios:** `--radius-sm` 6px, `--radius-md` 10px, `--radius-lg` 16px (cards). El logo usa `rx=8`; mantener esa familia redondeada.
- **Spacing:** escala 4/8/12/16/24/32.
- **Touch targets:** mínimo **44×44px** (uso con guantes/dedos en el campo).
- **Anchos:** contenedor app máx ~560px centrado en desktop; full-width en mobile.
- **Sombras:** sutiles; en tema oscuro casi nulas (preferir borde `--color-border`).
- **Safe areas:** respetar `env(safe-area-inset-*)` (notch / barra inferior).

---

## 6. Componentes (UI kit)

Primitivos, accesibles, temáticos, mobile-first:

- **Button** — variantes `primary` (fondo dorado, texto oscuro), `secondary` (borde), `ghost`, `danger`. Estados hover/active/disabled/loading. Foco visible.
- **Input / TextArea / Select** — label asociado, mensaje de error debajo (`--color-danger-ink`), estados de foco con anillo dorado.
- **Card** — superficie + borde, usada en listas (miras, setups).
- **Chip / SegmentedControl** — base de la **botonera de sets de flechas**. El activo va en dorado con texto oscuro.
- **Dialog/Modal** — confirmaciones destructivas y edición rápida de distancias.
- **Toast** — feedback de acciones (creado/editado/eliminado/error).
- **EmptyState** — ícono diana + texto + CTA. Para listas vacías.
- **Spinner / Skeleton** — carga. El spinner puede ser la diana girando lento.
- **AppBar** — logo (mini) + título + acciones (volver, toggle de tema).
- **BottomNav o menú** — acceso a Principal / Setups arco / Setups flechas.

Tono de la UI: **modo oscuro por defecto**, toggle claro/oscuro persistente, respeto de `prefers-color-scheme` en la primera visita.

---

## 7. ⭐ Especificación del Ruler (vista de mira)

La pantalla más importante. La lógica de cálculo está en `@bv/shared` (ver `04-architecture.md` §4); acá va el **render**.

### 7.1 Layout de la pantalla (mobile)

```
┌─────────────────────────────────────┐
│ ‹  Mira competencia        ☾  (bar) │   AppBar: volver, nombre, toggle tema
│    Arco: PSE Evo NXT 35             │   subtítulo (si hay setup de arco)
├─────────────────────────────────────┤
│ [ VAP V1 250 ]  Gold Tip Hunter 400 │   Botonera de sets (activo = dorado)
├─────────────────────────────────────┤
│  0 ┤———                              │
│    ┤                                 │
│    ┤——          ● 20 m   (0.8)       │   ← regla a la IZQUIERDA,
│  1 ┤———————                          │     distancias a la derecha
│    ┤——          ● 30 m   (1.5)       │
│    ┤                                 │
│  2 ┤———————                          │
│    ┤——          ● 50 m   (2.3)       │
│  3 ┤———————                          │
│                                      │
│            [ + Nueva distancia ]     │   botón fijo abajo
└─────────────────────────────────────┘
```

### 7.2 La regla (SVG)

- **Orientación:** mínimo arriba (`scaleMin`), máximo abajo (`scaleMax`). La escala **crece hacia abajo**. *(Configurable a futuro; en el MVP es fijo.)*
- Se ancla al lado **izquierdo** y ocupa el **alto disponible** entre la botonera y el botón inferior. No scrollea: se ajusta al alto.
- **Marcas** (largos sugeridos): 1 mm = 8px, 5 mm = 14px, 1 cm = 22px. Color `--color-ruler-line`. Grosor 1–1.5px (usar `shape-rendering: crispEdges` o alinear a medio píxel).
- **Números** de cada cm a la izquierda de la línea vertical, `--color-ruler-label`, tabular, 12px.
- Línea vertical de la regla en `--color-ruler-line`, sobre el borde derecho de la columna de marcas.
- Guarda de densidad: si las marcas de 1 mm caen a <4px entre sí, se omiten (luego las de 5 mm). La función `generateTicks` ya lo resuelve.

### 7.3 Marcadores de distancia

Por cada distancia del set seleccionado:
- **Pin** sobre la regla en la posición exacta (`anchorY`): un círculo en `--color-primary` (eco del favicon) con una pequeña línea horizontal que entra hacia la etiqueta.
- **Etiqueta** a la derecha: chip de **una sola línea** `"{distanceM} m · esc {scaleValue}"` para ahorrar espacio; los metros en `--color-fg` y el valor de escala en el **color base** (`--color-primary-ink`). Números tabulares.
- **Tres estilos según `variant`** (ver §7.3.1).
- **Anti-solape:** si dos quedan muy cerca, la etiqueta se corre hacia abajo y se dibuja una **leader line** desde el pin real (`anchorY`) hasta la etiqueta (`labelY`). Lógica en `layoutMarkers`.
- **Tap** en un marcador **medido** → abre acciones (editar / eliminar). Las marcas calculadas/consultadas no son interactivas.

#### 7.3.1 Tipos de marca (variants)

Cuando se desbloquea el cálculo de distancias intermedias (`01-functional-spec.md` §5.7) conviven tres estilos, claramente diferenciables:

| variant | Origen | Pin | Chip | Texto |
|---------|--------|-----|------|-------|
| `user` | Marca medida por el arquero | Lleno, color base | Relleno `--color-surface-2`, borde sólido | Distancia en `--color-fg`, escala en color base |
| `computed` | Intermedia / sala (calculada) | Hueco, `--color-muted` | Transparente, borde **punteado** gris | Todo en `--color-muted`; prefijo `≈` si es **extrapolada** |
| `query` | Distancia consultada en la calculadora | Lleno, `--color-fg` | **Invertido** (relleno `--color-fg`) | Texto en `--color-bg` para máximo contraste |

El estilo `query` está pensado para que la distancia que el arquero consulta "salte a la vista" sobre el resto sin depender del color base (que ya usan las medidas).

### 7.4 Botonera de sets de flechas

- Solo aparece si la mira tiene distancias para **más de un** set (`arrowSets.length > 1`). Con uno solo, se oculta o se muestra como etiqueta no interactiva.
- Segmented control horizontal scrolleable si hay muchos. Activo en dorado (texto oscuro), inactivos con borde.
- Preselección: `defaultArrowSetupId` de la mira, o el primero de `arrowSets`.
- Cambiar set → re-render instantáneo de los marcadores (filtrado en cliente, sin ir al server).

### 7.5 Estados
- **Sin distancias:** EmptyState con diana + "Cargá tu primera distancia para esta mira" + CTA. La regla se muestra vacía (solo marcas) para dar contexto.
- **Cargando:** skeleton de la regla + spinner diana.
- **Error:** mensaje + reintentar (la regla no se rompe).

### 7.6 Sección de cálculo (distancias intermedias)

Aparece debajo de la regla al desbloquearse (`01-functional-spec.md` §5.7):
- **Pre-desbloqueo:** card punteada con el progreso `X/5` y qué falta. Al llegar a 5, botón secundario "Calcular distancias intermedias".
- **Curva escala ↔ distancia:** gráfico SVG con la interpolación medida (línea sólida en color base) y la extrapolación (línea **punteada** gris), los puntos medidos y un indicador `ajuste ±Δ` (residuo máximo). Resalta la distancia consultada con una guía en `--color-fg`.
- **Calculadora:** input de distancia (con sufijo "m") y un recuadro de resultado `"{d} m → {escala}"` que indica *medido* / *estimado*. El cálculo es inmediato (sin botón).
- Con el cálculo activo, la regla pasa a una altura mínima y el contenido se vuelve **scrolleable**; el botón "+ Nueva distancia" queda fijo abajo.

### 7.7 Responsive
- Mobile: regla ocupa ~30–40% del ancho a la izquierda; etiquetas a la derecha.
- Desktop: mismo patrón centrado, máx ~560px; la regla puede ser un poco más alta. No cambiar la orientación.
- Respetar `prefers-reduced-motion`: sin animación de la diana ni transiciones llamativas.

---

## 8. Copy (microtexto)

Siguiendo buenas prácticas de redacción de interfaz:
- **Voz de la interfaz, no de una persona.** Verbos en activa: "Guardar mira", no "Enviar". El botón "Guardar" produce un toast "Mira guardada".
- **Consistencia:** una acción mantiene su nombre en todo el flujo.
- **Errores con dirección:** qué pasó y cómo seguir. Ej: "El valor de escala tiene que estar entre 0 y 3.", no "Valor inválido".
- **Estados vacíos como invitación:** "Todavía no tenés miras. Creá una para empezar."
- **Términos del dominio del arquero** (mira, escala, set de flechas, distancia), no jerga técnica.
- Sentence case en botones y labels. Sin signos de exclamación de relleno.

---

## 9. Accesibilidad (piso de calidad)
- Foco de teclado visible en todo control.
- Labels asociados a inputs; errores anunciables.
- Contraste AA (ver §3.3).
- Touch targets ≥ 44px.
- `prefers-reduced-motion` y `prefers-color-scheme` respetados.
- El SVG del ruler con `role="img"` y `aria-label` descriptivo; las distancias también accesibles como lista textual alternativa para lectores de pantalla.
