import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

// ── Button ──
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong font-semibold',
  secondary: 'bg-surface-2 text-fg border border-border hover:border-primary',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90 font-semibold',
};

export function Button({
  variant = 'primary',
  className,
  loading,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className,
      )}
      type={type}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

// ── Card ──
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-4', className)}>
      {children}
    </div>
  );
}

// ── Label + Field error ──
export function Label({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode;
  htmlFor?: string;
  /** Marca el campo como obligatorio con un asterisco. */
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
      {children}
      {required && (
        <span className="text-danger-ink" title="Obligatorio" aria-hidden>
          {' '}
          *
        </span>
      )}
    </label>
  );
}

/** Subtítulo de ayuda para un campo de formulario. */
export function FieldHint({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-sm text-danger-ink">{children}</p>;
}

// ── Inputs ──
const fieldBase =
  'w-full rounded-xl border border-border bg-surface px-3 text-fg placeholder:text-muted focus:border-primary';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, 'h-11', className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'min-h-24 py-2', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, 'h-11', className)} {...props}>
      {children}
    </select>
  );
}

// ── Spinner (diana) ──
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Empty state ──
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <div className="font-display text-lg font-semibold text-fg">{title}</div>
      {description && <p className="max-w-xs text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
