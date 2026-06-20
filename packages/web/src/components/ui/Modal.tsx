import { type ReactNode, useEffect } from 'react';
import { Card } from './index';

/** Modal simple, centrado, con cierre por backdrop / Escape. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-md rounded-b-none sm:rounded-2xl">
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="mb-3 text-lg font-semibold text-fg">{title}</h2>
          {children}
        </div>
      </Card>
    </div>
  );
}
