import type { SightModel } from '@bv/shared';
import { useEffect, useRef, useState } from 'react';

const H = 180; // alto fijo del gráfico
const PAD = { l: 30, r: 12, t: 12, b: 24 };

interface UserPoint {
  distanceM: number;
  scaleValue: number;
}

interface Props {
  model: SightModel;
  userPoints: UserPoint[];
  /** Distancia consultada a resaltar (calculadora), si la hay. */
  query?: number | null;
}

function fmt(v: number): string {
  return Number(v.toFixed(2)).toString();
}

/**
 * Curva escala ↔ distancia: PCHIP sólida dentro del rango medido y parábola punteada
 * extendida (extrapolación). Eje X = distancia (m), eje Y = escala.
 */
export function SightCurveChart({ model, userPoints, query }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setW(Math.max(r.width, 240));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { quad, min, max } = model;
  const parabola = (d: number) => quad.a * d * d + quad.b * d + quad.c;

  // Dominio X: desde un poco antes de la de sala (18) hasta un poco después del máximo.
  const xMin = Math.min(18, min) - 2;
  const xMax = max + 5;

  // Muestreo de ambas curvas.
  const STEPS = 64;
  const parabolaPts: [number, number][] = [];
  for (let i = 0; i <= STEPS; i++) {
    const d = xMin + ((xMax - xMin) * i) / STEPS;
    parabolaPts.push([d, parabola(d)]);
  }
  const pchipPts: [number, number][] = [];
  for (let i = 0; i <= STEPS; i++) {
    const d = min + ((max - min) * i) / STEPS;
    pchipPts.push([d, model.markAt(d).mark]);
  }

  // Dominio Y a partir de todo lo dibujado.
  const allY = [
    ...parabolaPts.map((p) => p[1]),
    ...pchipPts.map((p) => p[1]),
    ...userPoints.map((p) => p.scaleValue),
  ];
  const yLo = Math.min(...allY);
  const yHi = Math.max(...allY);
  const yPad = (yHi - yLo || 1) * 0.08;
  const yMin = yLo - yPad;
  const yMax = yHi + yPad;

  const plotW = w - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const sx = (d: number) => PAD.l + ((d - xMin) / (xMax - xMin)) * plotW;
  const sy = (s: number) => PAD.t + ((yMax - s) / (yMax - yMin)) * plotH;

  const toPath = (pts: [number, number][]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`)
      .join(' ');

  // Marcas del eje X: distancias del usuario + sala (18).
  const xTicks = Array.from(new Set([18, ...userPoints.map((p) => p.distanceM)])).sort(
    (a, b) => a - b,
  );

  const queryMark = query != null && Number.isFinite(query) ? model.markAt(query) : null;

  return (
    <div ref={wrapRef} className="w-full">
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Curva de la mira">
        {/* Marco */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--color-border)" />
        <line
          x1={PAD.l}
          y1={H - PAD.b}
          x2={w - PAD.r}
          y2={H - PAD.b}
          stroke="var(--color-border)"
        />

        {/* Ticks X */}
        {xTicks.map((d) => (
          <g key={d}>
            <line
              x1={sx(d)}
              y1={H - PAD.b}
              x2={sx(d)}
              y2={H - PAD.b + 4}
              stroke="var(--color-muted)"
            />
            <text
              x={sx(d)}
              y={H - PAD.b + 15}
              textAnchor="middle"
              fontSize={10}
              className="tnum"
              fill="var(--color-muted)"
            >
              {d}
            </text>
          </g>
        ))}

        {/* Parábola (extrapolación) punteada */}
        <path
          d={toPath(parabolaPts)}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />

        {/* PCHIP (interpolación) sólida */}
        <path d={toPath(pchipPts)} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} />

        {/* Puntos del usuario */}
        {userPoints.map((p) => (
          <circle
            key={p.distanceM}
            cx={sx(p.distanceM)}
            cy={sy(p.scaleValue)}
            r={3.5}
            fill="var(--color-primary)"
          />
        ))}

        {/* Distancia consultada */}
        {query != null && queryMark && (
          <g>
            <line
              x1={sx(query)}
              y1={PAD.t}
              x2={sx(query)}
              y2={H - PAD.b}
              stroke="var(--color-fg)"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
            />
            <circle
              cx={sx(query)}
              cy={sy(queryMark.mark)}
              r={4}
              fill="var(--color-fg)"
              stroke="var(--color-bg)"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      <p className="mt-1 px-1 text-xs text-muted">
        <span className="text-primary-ink">━</span> medido (PCHIP) ·{' '}
        <span className="text-muted">┄</span> estimado (parábola) · ajuste ±
        {fmt(quad.maxAbsResidual)}
      </p>
    </div>
  );
}
