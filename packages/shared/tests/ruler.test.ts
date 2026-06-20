import { describe, expect, it } from 'vitest';
import { generateTicks, layoutMarkers, scaleToY } from '../src/ruler.js';

describe('scaleToY (mínimo arriba, crece hacia abajo)', () => {
  it('mapea el mínimo a 0 (arriba)', () => {
    expect(scaleToY(0, 0, 3, 600)).toBe(0);
  });

  it('mapea el máximo a height (abajo)', () => {
    expect(scaleToY(3, 0, 3, 600)).toBe(600);
  });

  it('mapea el punto medio a height/2', () => {
    expect(scaleToY(1.5, 0, 3, 600)).toBe(300);
  });

  it('es monótona creciente (mayor valor => mayor y)', () => {
    const a = scaleToY(1, 0, 3, 600);
    const b = scaleToY(2, 0, 3, 600);
    expect(b).toBeGreaterThan(a);
  });

  it('es robusto ante rango inválido o height 0', () => {
    expect(scaleToY(1, 3, 3, 600)).toBe(0);
    expect(scaleToY(1, 0, 3, 0)).toBe(0);
  });
});

describe('generateTicks', () => {
  it('genera una marca lg con label por cada centímetro', () => {
    const ticks = generateTicks(0, 3, 900);
    const lg = ticks.filter((t) => t.size === 'lg');
    expect(lg).toHaveLength(4); // 0,1,2,3 cm
    expect(lg.map((t) => t.label)).toEqual(['0', '1', '2', '3']);
  });

  it('clasifica 5mm como md y 1mm como sm', () => {
    const ticks = generateTicks(0, 1, 900); // 9px/mm => muestra todo
    const atHalf = ticks.find((t) => Math.abs(t.y - 450) < 1);
    expect(atHalf?.size).toBe('md'); // 0.5 cm
    const at1mm = ticks.find((t) => Math.abs(t.y - 90) < 1);
    expect(at1mm?.size).toBe('sm'); // 0.1 cm
  });

  it('no produce errores de float (trabaja en mm enteros)', () => {
    const ticks = generateTicks(0, 2.5, 750);
    expect(ticks.some((t) => t.size === 'lg' && t.label === '2')).toBe(true);
    // todas las y son finitas
    expect(ticks.every((t) => Number.isFinite(t.y))).toBe(true);
  });

  it('guarda de densidad: omite marcas finas cuando quedan muy juntas', () => {
    // rango grande (0..30 cm = 300 mm) en poca altura => 1mm caería < 4px
    const dense = generateTicks(0, 30, 300); // 1px/mm
    expect(dense.some((t) => t.size === 'sm')).toBe(false); // sin 1mm
    // con mucha altura sí aparecen
    const sparse = generateTicks(0, 30, 3000); // 10px/mm
    expect(sparse.some((t) => t.size === 'sm')).toBe(true);
  });

  it('devuelve vacío ante rango inválido', () => {
    expect(generateTicks(3, 3, 600)).toEqual([]);
    expect(generateTicks(0, 3, 0)).toEqual([]);
  });
});

describe('layoutMarkers (anti-solape)', () => {
  it('ordena por posición vertical', () => {
    const out = layoutMarkers(
      [
        { id: 1, scaleValue: 2.5, distanceM: 50 },
        { id: 2, scaleValue: 0.8, distanceM: 20 },
      ],
      0,
      3,
      600,
    );
    expect(out.map((m) => m.id)).toEqual([2, 1]);
  });

  it('conserva anchorY real y separa las labels que se pisarían', () => {
    const out = layoutMarkers(
      [
        { id: 1, scaleValue: 1.0, distanceM: 25 },
        { id: 2, scaleValue: 1.02, distanceM: 26 }, // casi pegada
      ],
      0,
      3,
      600,
      22,
    );
    // anchorY refleja la posición real (no se toca)
    expect(out[0]?.anchorY).toBeCloseTo(scaleToY(1.0, 0, 3, 600));
    expect(out[1]?.anchorY).toBeCloseTo(scaleToY(1.02, 0, 3, 600));
    // las labels quedan separadas al menos labelHeight
    const gap = (out[1]?.labelY ?? 0) - (out[0]?.labelY ?? 0);
    expect(gap).toBeGreaterThanOrEqual(22);
  });

  it('no separa labels que no se pisan', () => {
    const out = layoutMarkers(
      [
        { id: 1, scaleValue: 0.5, distanceM: 18 },
        { id: 2, scaleValue: 2.5, distanceM: 60 },
      ],
      0,
      3,
      600,
      22,
    );
    expect(out[0]?.labelY).toBe(out[0]?.anchorY);
    expect(out[1]?.labelY).toBe(out[1]?.anchorY);
  });
});
