import { type MarkerInput, generateTicks, layoutMarkers } from '@bv/shared';
import { useEffect, useRef, useState } from 'react';

const PAD = 18; // margen vertical para no recortar mín/máx
const TRACK_X = 58; // x del riel (deja lugar a los números de cm a la izquierda)
const MARKER_X = TRACK_X + 44; // x donde arranca el chip del marcador
const LABEL_H = 38; // alto estimado del chip (anti-solape)

/** Recorta a 2 decimales sin ceros sobrantes (1.5 → "1.5", 0.72 → "0.72"). */
function fmtScale(v: number): string {
  return Number(v.toFixed(2)).toString();
}

export interface RulerMarker extends MarkerInput {
  notes?: string | null;
  /** 'user' = cargada por el arquero; 'computed' = calculada (intermedia/sala). */
  variant?: 'user' | 'computed';
  /** Solo para calculadas: true = interpolada (PCHIP); false = extrapolada (estimada). */
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
            const computed = src?.variant === 'computed';
            const estimated = computed && src?.interpolated === false;
            const pushed = Math.abs(m.labelY - m.anchorY) > 0.5;
            const dotColor = computed ? 'var(--color-muted)' : 'var(--color-primary)';
            return (
              <g key={m.id} className={computed ? undefined : 'cursor-pointer'}>
                {/* Línea guía si la etiqueta se corrió */}
                {pushed && (
                  <path
                    d={`M ${TRACK_X + 2} ${m.anchorY} C ${MARKER_X - 12} ${m.anchorY}, ${MARKER_X - 12} ${m.labelY}, ${MARKER_X} ${m.labelY}`}
                    fill="none"
                    stroke={dotColor}
                    strokeOpacity={0.5}
                    strokeWidth={1.5}
                  />
                )}
                {/* Punto sobre el riel (posición real): lleno = usuario, hueco = calculada */}
                <circle
                  cx={TRACK_X}
                  cy={m.anchorY}
                  r={4.5}
                  fill={computed ? 'var(--color-surface)' : 'var(--color-primary)'}
                  stroke={dotColor}
                  strokeWidth={computed ? 2 : 0}
                />

                {/* Chip de distancia */}
                <g transform={`translate(${MARKER_X} ${m.labelY})`}>
                  <rect
                    x={0}
                    y={-LABEL_H / 2}
                    width={size.w - MARKER_X - 6}
                    height={LABEL_H}
                    rx={9}
                    fill={computed ? 'transparent' : 'var(--color-surface-2)'}
                    stroke={computed ? dotColor : 'var(--color-border)'}
                    strokeDasharray={computed ? '4 3' : undefined}
                  />
                  <text
                    x={12}
                    y={-3}
                    fontSize={15}
                    fontWeight={700}
                    fill={computed ? 'var(--color-muted)' : 'var(--color-fg)'}
                  >
                    <tspan className="tnum">
                      {estimated ? '≈' : ''}
                      {m.distanceM}
                    </tspan>
                    <tspan fontSize={11} fontWeight={500} fill="var(--color-muted)">
                      {' '}
                      m
                    </tspan>
                  </text>
                  <text
                    x={12}
                    y={13}
                    fontSize={11}
                    className="tnum"
                    fill={computed ? 'var(--color-muted)' : 'var(--color-primary-ink)'}
                  >
                    escala {fmtScale(m.scaleValue)}
                    {estimated ? ' · estimada' : ''}
                  </text>
                  {/* Hit area para tap (solo marcas del usuario) */}
                  {!computed && (
                    <rect
                      x={0}
                      y={-LABEL_H / 2}
                      width={size.w - MARKER_X - 6}
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
