import { describe, expect, it } from 'vitest';
import {
  computeSightMarks,
  createSightModel,
  fitQuadratic,
  intermediateDistances,
} from '../src/sightMarks.js';

// Marcas medidas de ejemplo (las del chat de referencia).
const POINTS = [
  { distance: 20, mark: 0.5 },
  { distance: 30, mark: 1.0 },
  { distance: 40, mark: 1.72 },
  { distance: 50, mark: 2.7 },
  { distance: 60, mark: 3.9 },
];

describe('createSightModel — PCHIP dentro del rango', () => {
  it('pasa EXACTO por cada marca medida y la marca como interpolada', () => {
    const model = createSightModel(POINTS);
    for (const p of POINTS) {
      const r = model.markAt(p.distance);
      expect(r.mark).toBeCloseTo(p.mark, 6);
      expect(r.interpolated).toBe(true);
    }
  });

  it('es monótono creciente entre marcas (nunca baja)', () => {
    const model = createSightModel(POINTS);
    let prev = Number.NEGATIVE_INFINITY;
    for (let d = 20; d <= 60; d += 0.5) {
      const { mark } = model.markAt(d);
      expect(mark).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = mark;
    }
  });

  it('expone el rango medido', () => {
    const model = createSightModel(POINTS);
    expect(model.min).toBe(20);
    expect(model.max).toBe(60);
  });
});

describe('createSightModel — extrapolación con la parábola', () => {
  it('fuera del rango usa la parábola e indica interpolated:false', () => {
    const model = createSightModel(POINTS);
    const indoor = model.markAt(18);
    expect(indoor.interpolated).toBe(false);
    expect(indoor.mark).toBeLessThan(0.5); // menos que la marca de 20 m
    expect(model.markAt(65).interpolated).toBe(false);
  });
});

describe('createSightModel — robustez', () => {
  it('deduplica distancias repetidas sin producir NaN', () => {
    const model = createSightModel([
      { distance: 20, mark: 0.5 },
      { distance: 20, mark: 0.6 }, // duplicada
      { distance: 30, mark: 1.0 },
      { distance: 40, mark: 1.7 },
    ]);
    const r = model.markAt(20);
    expect(Number.isNaN(r.mark)).toBe(false);
    expect(r.mark).toBeCloseTo(0.55, 6); // promedio de las duplicadas
  });
});

describe('fitQuadratic', () => {
  it('recupera datos perfectamente parabólicos con residuo ~0', () => {
    const f = (x: number) => 0.001 * x * x + 0.01 * x + 0.1;
    const pts = [20, 30, 40, 50, 60].map((x) => ({ distance: x, mark: f(x) }));
    const fit = fitQuadratic(pts);
    expect(fit.a).toBeCloseTo(0.001, 6);
    expect(fit.b).toBeCloseTo(0.01, 6);
    expect(fit.c).toBeCloseTo(0.1, 6);
    expect(fit.maxAbsResidual).toBeLessThan(1e-6);
  });

  it('exige al menos 3 puntos', () => {
    expect(() => fitQuadratic([{ distance: 1, mark: 1 }])).toThrow();
  });
});

describe('intermediateDistances', () => {
  it('devuelve la distancia media entre marcas consecutivas', () => {
    expect(intermediateDistances([20, 30, 40, 50, 60])).toEqual([25, 35, 45, 55]);
  });

  it('ordena antes de calcular', () => {
    expect(intermediateDistances([40, 20, 60])).toEqual([30, 50]);
  });
});

describe('computeSightMarks', () => {
  it('genera las intermedias + la de sala (18) y excluye las del usuario', () => {
    const model = createSightModel(POINTS);
    const marks = computeSightMarks(
      model,
      POINTS.map((p) => p.distance),
      { scaleMin: 0, scaleMax: 6 },
    );
    const distances = marks.map((m) => m.distanceM);
    expect(distances).toEqual([18, 25, 35, 45, 55]);

    // 18 es extrapolada; las intermedias son interpoladas.
    expect(marks.find((m) => m.distanceM === 18)?.interpolated).toBe(false);
    expect(marks.find((m) => m.distanceM === 25)?.interpolated).toBe(true);

    // Ninguna coincide con una distancia ya cargada.
    for (const d of [20, 30, 40, 50, 60]) expect(distances).not.toContain(d);
  });

  it('descarta marcas calculadas fuera de la escala de la mira', () => {
    const model = createSightModel(POINTS);
    const marks = computeSightMarks(
      model,
      POINTS.map((p) => p.distance),
      { scaleMin: 0, scaleMax: 1 }, // recorta: solo entran marcas <= 1.0
    );
    for (const m of marks) expect(m.scaleValue).toBeLessThanOrEqual(1);
  });
});
