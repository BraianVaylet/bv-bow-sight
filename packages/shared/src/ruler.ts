/**
 * Math puro del Ruler (ver docs/04-architecture.md §4).
 * Sin dependencias de framework: lo consumen la UI y los tests.
 *
 * Orientación: el valor MÍNIMO va arriba (y=0) y la escala crece hacia abajo
 * (el MÁXIMO queda en y=height).
 */

import { TICK_LENGTH_PX, TICK_MIN_GAP_PX } from './constants';

export type TickSize = 'sm' | 'md' | 'lg';

export interface Tick {
  /** Posición vertical en px (0 = arriba). */
  y: number;
  size: TickSize;
  /** Largo de la rayita en px. */
  length: number;
  /** Etiqueta numérica (solo en marcas de 1 cm). */
  label?: string;
}

export interface MarkerInput {
  id: number;
  scaleValue: number;
  distanceM: number;
}

export interface MarkerLayout extends MarkerInput {
  /** Posición real sobre la regla (para la línea guía). */
  anchorY: number;
  /** Posición visual de la etiqueta (puede correrse por anti-solape). */
  labelY: number;
}

/**
 * Mapea un valor de escala (cm) a una coordenada Y en px.
 * min -> 0 (arriba), max -> height (abajo).
 */
export function scaleToY(value: number, min: number, max: number, height: number): number {
  if (max <= min || height <= 0) return 0;
  return ((value - min) / (max - min)) * height;
}

/**
 * Genera las marcas de la regla trabajando en milímetros enteros
 * para evitar errores de punto flotante.
 * - cada 1 cm  -> 'lg' (con número)
 * - cada 5 mm  -> 'md'
 * - cada 1 mm  -> 'sm'
 * Guarda de densidad: omite marcas finas cuando quedan a < TICK_MIN_GAP_PX entre sí.
 */
export function generateTicks(min: number, max: number, height: number): Tick[] {
  const mmMin = Math.round(min * 10);
  const mmMax = Math.round(max * 10);
  if (mmMax <= mmMin || height <= 0) return [];

  const span = mmMax - mmMin;
  const pxPerMm = height / span;

  const showMm = pxPerMm >= TICK_MIN_GAP_PX;
  const showHalf = pxPerMm * 5 >= TICK_MIN_GAP_PX;

  const ticks: Tick[] = [];
  for (let mm = mmMin; mm <= mmMax; mm++) {
    const isCm = mm % 10 === 0;
    const isHalf = mm % 5 === 0;

    if (!isCm && !isHalf && !showMm) continue;
    if (!isCm && isHalf && !showHalf) continue;

    const size: TickSize = isCm ? 'lg' : isHalf ? 'md' : 'sm';
    const y = ((mm - mmMin) / span) * height;
    const tick: Tick = { y, size, length: TICK_LENGTH_PX[size] };
    if (isCm) tick.label = String(mm / 10);
    ticks.push(tick);
  }
  return ticks;
}

/**
 * Ubica los marcadores de distancia sobre la regla y resuelve solapes:
 * si dos etiquetas se pisarían, la siguiente se empuja hacia abajo (labelY),
 * conservando su posición real (anchorY) para dibujar la línea guía.
 */
export function layoutMarkers(
  markers: MarkerInput[],
  min: number,
  max: number,
  height: number,
  labelHeight = 22,
): MarkerLayout[] {
  const laid = markers
    .map((m) => {
      const y = scaleToY(m.scaleValue, min, max, height);
      return { ...m, anchorY: y, labelY: y };
    })
    .sort((a, b) => a.anchorY - b.anchorY);

  let lastBottom = Number.NEGATIVE_INFINITY;
  for (const m of laid) {
    const labelY = Math.max(m.anchorY, lastBottom + labelHeight);
    m.labelY = labelY;
    lastBottom = labelY;
  }
  return laid;
}
