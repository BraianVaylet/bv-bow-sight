import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/** Ícono wifi tachado (Feather "wifi-off"). */
function WifiOff({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 1l22 22" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

/** Indicador compacto para el header: aparece solo cuando no hay conexión. */
export function OfflineChip() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <span
      title="Sin conexión a internet"
      aria-label="Sin conexión a internet"
      className="flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-1 font-medium text-danger-ink text-xs"
    >
      <WifiOff className="h-4 w-4" />
      <span className="hidden min-[420px]:inline">Sin conexión</span>
    </span>
  );
}

/**
 * Aviso flotante de estado de conexión: al quedar offline muestra un cartel
 * informativo (consultar sí, editar no) que se puede cerrar; al recuperar la
 * conexión muestra una confirmación que se oculta sola.
 */
export function ConnectionNotice() {
  const online = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const prev = useRef(online);

  useEffect(() => {
    if (prev.current === online) return;
    prev.current = online;
    if (online) {
      setReconnected(true);
      const t = setTimeout(() => setReconnected(false), 4000);
      return () => clearTimeout(t);
    }
    // Volvió a estar offline: reseteamos el cierre manual y la confirmación.
    setDismissed(false);
    setReconnected(false);
  }, [online]);

  const showOffline = !online && !dismissed;
  const showReconnected = online && reconnected;
  if (!showOffline && !showReconnected) return null;

  return (
    <div className="-translate-x-1/2 pointer-events-none fixed top-16 left-1/2 z-50 w-[min(92vw,28rem)]">
      {showOffline ? (
        <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-danger bg-surface p-3 shadow-lg">
          <WifiOff className="mt-0.5 shrink-0 text-danger-ink" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg text-sm">Estás sin conexión a internet</p>
            <p className="mt-0.5 text-muted text-sm">
              Podés <strong className="text-fg">consultar</strong> tus miras y calcular distancias,
              pero <strong className="text-fg">no vas a poder crear, editar ni borrar</strong> nada
              hasta que vuelva la conexión.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Cerrar aviso"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : (
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-primary bg-surface p-3 shadow-lg">
          <span className="font-semibold text-primary-ink text-sm">✓ Conexión recuperada</span>
          <span className="text-muted text-sm">Ya podés crear y editar de nuevo.</span>
        </div>
      )}
    </div>
  );
}
