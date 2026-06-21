import { type MarkerInput, generateTicks, layoutMarkers } from '@bv/shared';
import { useEffect, useRef, useState } from 'react';

const PAD = 18; // margen vertical para no recortar mín/máx
const TRACK_X = 58; // x del riel (deja lugar a los números de cm a la izquierda)
const MARKER_X = TRACK_X + 44; // x donde arranca el chip del marcador
const LABEL_H = 26; // alto del chip de una línea (anti-solape)

/** Recorta a 2 decimales sin ceros sobrantes (1.5 → "1.5", 0.72 → "0.72"). */
function fmtScale(v: number): string {
  return Number(v.toFixed(2)).toString();
}

export type MarkerVariant = 'user' | 'computed' | 'query';

/** Estilos por tipo de marca: medida (color base), intermedia (gris), consultada (invertida). */
const STYLES: Record<
  MarkerVariant,
  {
    dot: string;
    hollowDot: boolean;
    chipFill: string;
    chipStroke: string;
    dashed: boolean;
    dist: string;
    scale: string;
    muted: string;
  }
> = {
  user: {
    dot: 'var(--color-primary)',
    hollowDot: false,
    chipFill: 'var(--color-surface-2)',
    chipStroke: 'var(--color-border)',
    dashed: false,
    dist: 'var(--color-fg)',
    scale: 'var(--color-primary-ink)',
    muted: 'var(--color-muted)',
  },
  computed: {
    dot: 'var(--color-muted)',
    hollowDot: true,
    chipFill: 'transparent',
    chipStroke: 'var(--color-muted)',
    dashed: true,
    dist: 'var(--color-muted)',
    scale: 'var(--color-muted)',
    muted: 'var(--color-muted)',
  },
  // Consultada: chip lleno en color de texto (invertido) para que resalte sobre el resto.
  query: {
    dot: 'var(--color-fg)',
    hollowDot: false,
    chipFill: 'var(--color-fg)',
    chipStroke: 'var(--color-fg)',
    dashed: false,
    dist: 'var(--color-bg)',
    scale: 'var(--color-bg)',
    muted: 'var(--color-bg)',
  },
};

export interface RulerMarker extends MarkerInput {
  notes?: string | null;
  /** 'user' = cargada; 'computed' = calculada; 'query' = consultada en la calculadora. */
  variant?: MarkerVariant;
  /** Solo para calculadas/consultada: true = interpolada (PCHIP); false = extrapolada. */
  interpolated?: boolean;
}

interface RulerProps {
  scaleMin: number;
  scaleMax: number;
  markers: RulerMarker[];
  onMarkerClick?: (id: number) => void;
}

/** Regla vertical de calibración. El valor mínimo va arriba y crece hacia abajo. */
export function Ruler({ scaleMin, scaleMax, markers, onMarkerClick }: RulerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 320, h: 480 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: Math.max(r.width, 240), h: Math.max(r.height, 320) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const drawH = size.h - PAD * 2;
  const ticks = generateTicks(scaleMin, scaleMax, drawH);
  const laid = layoutMarkers(markers, scaleMin, scaleMax, drawH, LABEL_H);
  // layoutMarkers preserva el id pero no los campos extra: los recuperamos por id.
  const byId = new Map(markers.map((m) => [m.id, m]));
  const chipW = size.w - MARKER_X - 6;

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        role="img"
        aria-label={`Escala de ${scaleMin} a ${scaleMax} con ${markers.length} marcas`}
      >
        <g transform={`translate(0 ${PAD})`}>
          {/* Riel */}
          <line
            x1={TRACK_X}
            y1={0}
            x2={TRACK_X}
            y2={drawH}
            stroke="var(--ruler-track)"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Marcas */}
          {ticks.map((t) => {
            const strong = t.size === 'lg';
            return (
              <g key={`${t.size}-${t.y}`}>
                <line
                  x1={TRACK_X}
                  y1={t.y}
                  x2={TRACK_X + t.length}
                  y2={t.y}
                  stroke={strong ? 'var(--ruler-tick-strong)' : 'var(--ruler-tick)'}
                  strokeWidth={strong ? 2 : 1}
                />
                {t.label !== undefined && (
                  <text
                    x={TRACK_X - 8}
                    y={t.y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="tnum"
                    fontSize={12}
                    fill="var(--color-muted)"
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Marcadores de distancia */}
          {laid.map((m) => {
            const src = byId.get(m.id);
            const variant: MarkerVariant = src?.variant ?? 'user';
            const s = STYLES[variant];
            const isUser = variant === 'user';
            const estimated = !isUser && src?.interpolated === false;
            const pushed = Math.abs(m.labelY - m.anchorY) > 0.5;
            return (
              <g key={m.id} className={isUser ? 'cursor-pointer' : undefined}>
                {/* Línea guía si la etiqueta se corrió */}
                {pushed && (
                  <path
                    d={`M ${TRACK_X + 2} ${m.anchorY} C ${MARKER_X - 12} ${m.anchorY}, ${MARKER_X - 12} ${m.labelY}, ${MARKER_X} ${m.labelY}`}
                    fill="none"
                    stroke={s.dot}
                    strokeOpacity={0.5}
                    strokeWidth={1.5}
                  />
                )}
                {/* Punto sobre el riel (posición real) */}
                <circle
                  cx={TRACK_X}
                  cy={m.anchorY}
                  r={4.5}
                  fill={s.hollowDot ? 'var(--color-surface)' : s.dot}
                  stroke={s.dot}
                  strokeWidth={s.hollowDot ? 2 : 0}
                />

                {/* Chip de una línea: "20 m · esc 0.4" */}
                <g transform={`translate(${MARKER_X} ${m.labelY})`}>
                  <rect
                    x={0}
                    y={-LABEL_H / 2}
                    width={chipW}
                    height={LABEL_H}
                    rx={8}
                    fill={s.chipFill}
                    stroke={s.chipStroke}
                    strokeDasharray={s.dashed ? '4 3' : undefined}
                  />
                  <text x={10} y={1} dominantBaseline="middle" fontSize={13}>
                    <tspan className="tnum" fontWeight={700} fill={s.dist}>
                      {estimated ? '≈' : ''}
                      {m.distanceM}
                    </tspan>
                    <tspan fontSize={10} fontWeight={500} fill={s.muted}>
                      {' '}
                      m ·{' '}
                    </tspan>
                    <tspan fontSize={11} fill={s.muted}>
                      esc{' '}
                    </tspan>
                    <tspan className="tnum" fontWeight={600} fill={s.scale}>
                      {fmtScale(m.scaleValue)}
                    </tspan>
                  </text>
                  {/* Hit area para tap (solo marcas del usuario) */}
                  {isUser && (
                    <rect
                      x={0}
                      y={-LABEL_H / 2}
                      width={chipW}
                      height={LABEL_H}
                      fill="transparent"
                      onClick={() => onMarkerClick?.(m.id)}
                    >
                      <title>{`${m.distanceM} m · escala ${fmtScale(m.scaleValue)}`}</title>
                    </rect>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
