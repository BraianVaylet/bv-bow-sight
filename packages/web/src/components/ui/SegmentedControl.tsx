import { cn } from '../../lib/cn';

export interface SegmentOption {
  value: number;
  label: string;
}

/** Botonera horizontal para elegir el set de flechas activo. */
export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: SegmentOption[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Set de flechas"
      className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-h-9 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors',
              active ? 'bg-primary text-on-primary' : 'text-muted hover:text-fg',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
