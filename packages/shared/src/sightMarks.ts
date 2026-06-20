/**
 * Cálculo de marcas de mira para arco compuesto a partir de marcas medidas.
 *   - Interpolación (dentro del rango medido): spline cúbico monótono (PCHIP).
 *     Pasa EXACTO por las marcas, es suave y monótono (nunca baja, sin overshoot).
 *   - Extrapolación (fuera del rango): parábola de mínimos cuadrados.
 *   - Control de calidad: residuos de la parábola para detectar una marca mal medida.
 *
 * Math puro, sin dependencias de framework (mismo enfoque que ruler.ts): lo consumen
 * la UI y los tests.
 */

import { INDOOR_DISTANCE_M } from './constants';

export interface SightPoint {
  /** Distancia en metros. */
  distance: number;
  /** Posición de la marca en la mira a esa distancia (valor de escala). */
  mark: number;
}

export interface QuadFit {
  a: number;
  b: number;
  c: number;
  /** medido - ajustado en cada punto (ordenado por distancia). */
  residuals: number[];
  /** mayor residuo absoluto: útil para detectar una marca mal medida. */
  maxAbsResidual: number;
}

export interface SightMark {
  mark: number;
  /** true => interpolación (PCHIP); false => extrapolación (parábola). */
  interpolated: boolean;
}

export interface SightModel {
  /** Devuelve la marca para cualquier distancia. */
  markAt(distance: number): SightMark;
  /** Parábola de mejor ajuste + residuos (control de calidad). */
  quad: QuadFit;
  /** Rango medido (metros). */
  min: number;
  max: number;
}

const sign = (x: number): number => (x > 0 ? 1 : x < 0 ? -1 : 0);

/** Acceso a un índice que sabemos válido por construcción (invariante de los algoritmos). */
function at(arr: number[], i: number): number {
  const v = arr[i];
  if (v === undefined) throw new Error(`sightMarks: índice fuera de rango (${i}).`);
  return v;
}

/**
 * Parábola de mínimos cuadrados: mark = a·d² + b·d + c. Necesita >= 3 puntos.
 * Resuelve las ecuaciones normales 3x3 por regla de Cramer (sin matrices indexadas).
 */
export function fitQuadratic(points: SightPoint[]): QuadFit {
  if (points.length < 3) throw new Error('fitQuadratic: se necesitan al menos 3 marcas.');

  const s0 = points.length;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let sy = 0;
  let sxy = 0;
  let sx2y = 0;
  for (const { distance: x, mark: y } of points) {
    const x2 = x * x;
    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }

  // Sistema:
  //   [s4 s3 s2][a]   [sx2y]
  //   [s3 s2 s1][b] = [sxy ]
  //   [s2 s1 s0][c]   [sy  ]
  const det = s4 * (s2 * s0 - s1 * s1) - s3 * (s3 * s0 - s1 * s2) + s2 * (s3 * s1 - s2 * s2);
  if (Math.abs(det) < 1e-12) throw new Error('fitQuadratic: puntos degenerados.');

  const detA = sx2y * (s2 * s0 - s1 * s1) - s3 * (sxy * s0 - s1 * sy) + s2 * (sxy * s1 - s2 * sy);
  const detB = s4 * (sxy * s0 - s1 * sy) - sx2y * (s3 * s0 - s1 * s2) + s2 * (s3 * sy - sxy * s2);
  const detC = s4 * (s2 * sy - s1 * sxy) - s3 * (s3 * sy - sxy * s2) + sx2y * (s3 * s1 - s2 * s2);

  const a = detA / det;
  const b = detB / det;
  const c = detC / det;

  const residuals = points.map((p) => p.mark - (a * p.distance * p.distance + b * p.distance + c));
  const maxAbsResidual = residuals.reduce((m, r) => Math.max(m, Math.abs(r)), 0);
  return { a, b, c, residuals, maxAbsResidual };
}

/** Tangente en un extremo, con recorte para no sobrepasar (estilo SciPy pchip). */
function endpointSlope(h0: number, h1: number, d0: number, d1: number): number {
  const m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (sign(m) !== sign(d0)) return 0;
  if (sign(d0) !== sign(d1) && Math.abs(m) > 3 * Math.abs(d0)) return 3 * d0;
  return m;
}

/** Tangentes monótonas (Fritsch–Carlson) para el spline PCHIP. */
function pchipSlopes(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = at(xs, i + 1) - at(xs, i);
    d[i] = (at(ys, i + 1) - at(ys, i)) / at(h, i);
  }

  const m = new Array<number>(n);
  for (let i = 1; i < n - 1; i++) {
    const dPrev = at(d, i - 1);
    const dCur = at(d, i);
    if (dPrev * dCur <= 0) {
      m[i] = 0; // extremo local => tangente nula (evita overshoot)
    } else {
      const w1 = 2 * at(h, i) + at(h, i - 1);
      const w2 = at(h, i) + 2 * at(h, i - 1);
      m[i] = (w1 + w2) / (w1 / dPrev + w2 / dCur); // media armónica ponderada
    }
  }
  m[0] = endpointSlope(at(h, 0), at(h, 1), at(d, 0), at(d, 1));
  m[n - 1] = endpointSlope(at(h, n - 2), at(h, n - 3), at(d, n - 2), at(d, n - 3));
  return m;
}

/** Evalúa el spline PCHIP en x (x dentro de [xs[0], xs[n-1]]). */
function pchipEval(xs: number[], ys: number[], m: number[], x: number): number {
  const n = xs.length;
  let i = 0;
  while (i < n - 2 && x > at(xs, i + 1)) i++;
  const h = at(xs, i + 1) - at(xs, i);
  const t = (x - at(xs, i)) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * at(ys, i) + h10 * h * at(m, i) + h01 * at(ys, i + 1) + h11 * h * at(m, i + 1);
}

/**
 * Construye el modelo de marcas a partir de las marcas medidas.
 * Dentro del rango: PCHIP (respeta las marcas). Fuera: parábola de mínimos cuadrados.
 * Ordena por distancia y deduplica distancias repetidas (promediando) para que PCHIP
 * no divida por h = 0.
 */
export function createSightModel(input: SightPoint[]): SightModel {
  const sorted = [...input].sort((p, q) => p.distance - q.distance);
  const points: SightPoint[] = [];
  for (const p of sorted) {
    const last = points[points.length - 1];
    if (last && last.distance === p.distance) {
      last.mark = (last.mark + p.mark) / 2; // colapsa duplicados
    } else {
      points.push({ distance: p.distance, mark: p.mark });
    }
  }

  const xs = points.map((p) => p.distance);
  const ys = points.map((p) => p.mark);
  const quad = fitQuadratic(points);
  const min = at(xs, 0);
  const max = at(xs, xs.length - 1);
  const useSpline = xs.length >= 3;
  const slopes = useSpline ? pchipSlopes(xs, ys) : [];

  return {
    quad,
    min,
    max,
    markAt(distance: number): SightMark {
      if (useSpline && distance >= min && distance <= max) {
        return { mark: pchipEval(xs, ys, slopes, distance), interpolated: true };
      }
      const mark = quad.a * distance * distance + quad.b * distance + quad.c;
      return { mark, interpolated: false };
    },
  };
}

/** Punto medio (distancia media) entre cada par de marcas consecutivas, ordenadas. */
export function intermediateDistances(distances: number[]): number[] {
  const sorted = [...distances].sort((a, b) => a - b);
  const mids: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    mids.push((at(sorted, i) + at(sorted, i + 1)) / 2);
  }
  return mids;
}

export interface ComputedSightMark {
  distanceM: number;
  scaleValue: number;
  /** true => interpolación (PCHIP); false => extrapolación (parábola, ej. la de sala). */
  interpolated: boolean;
}

/**
 * Marcas calculadas a mostrar además de las del usuario: las distancias medias entre
 * marcas consecutivas + la de sala (`indoor`, 18 m por defecto). Excluye distancias ya
 * cargadas y las que caen fuera de la escala `[scaleMin, scaleMax]` de la mira.
 */
export function computeSightMarks(
  model: SightModel,
  userDistances: number[],
  opts: { indoor?: number; scaleMin: number; scaleMax: number },
): ComputedSightMark[] {
  const { indoor = INDOOR_DISTANCE_M, scaleMin, scaleMax } = opts;
  const userSet = new Set(userDistances);
  const targets = new Set<number>(intermediateDistances(userDistances));
  targets.add(indoor);

  const out: ComputedSightMark[] = [];
  for (const d of targets) {
    if (userSet.has(d)) continue;
    const { mark, interpolated } = model.markAt(d);
    if (mark < scaleMin || mark > scaleMax) continue;
    out.push({ distanceM: d, scaleValue: mark, interpolated });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}
