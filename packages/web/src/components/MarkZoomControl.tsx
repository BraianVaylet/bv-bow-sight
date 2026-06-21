import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampZoom } from '../lib/preferences';
import { MinusIcon, PlusIcon } from './Icons';

/**
 * Control de zoom de las marcas de mira, pensado para usarse en paralelo a la
 * regla: botón + arriba, barra vertical en el medio, botón − abajo.
 */
export function MarkZoomControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (zoom: number) => void;
}) {
  const step = (dir: 1 | -1) => onChange(clampZoom(value + dir * ZOOM_STEP));
  const btn =
    'flex h-9 w-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div className="flex flex-col items-center gap-2 py-1" aria-label="Zoom de las marcas">
      <button
        type="button"
        className={btn}
        onClick={() => step(1)}
        disabled={value >= ZOOM_MAX}
        aria-label="Agrandar marcas"
        title="Agrandar marcas"
      >
        <PlusIcon className="h-5 w-5" />
      </button>

      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={value}
        onChange={(e) => onChange(clampZoom(Number(e.target.value)))}
        aria-label="Nivel de zoom de las marcas"
        className="my-1 flex-1 cursor-pointer"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          accentColor: 'var(--primary)',
          width: '1.25rem',
        }}
      />

      <button
        type="button"
        className={btn}
        onClick={() => step(-1)}
        disabled={value <= ZOOM_MIN}
        aria-label="Achicar marcas"
        title="Achicar marcas"
      >
        <MinusIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
