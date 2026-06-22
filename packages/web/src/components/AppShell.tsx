import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useAuth';
import { ACCENTS, useTheme } from '../theme';
import { ConnectionNotice, OfflineChip } from './ConnectionNotice';
import { LogoutIcon, MoonIcon, PaletteIcon, SunIcon } from './Icons';
import { InstallButton } from './InstallButton';

/** Selector de color base de la app (popover con muestras). */
function AccentPicker() {
  const { accent, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Cambiar color de la app"
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2"
      >
        <PaletteIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg">
          <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted">Color de la app</p>
          <div className="flex flex-col gap-0.5">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setAccent(a.id);
                  setOpen(false);
                }}
                aria-pressed={accent === a.id}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-2 text-left text-sm text-fg hover:bg-surface-2 ${
                  accent === a.id ? 'bg-surface-2 font-medium' : ''
                }`}
              >
                <span
                  className="h-6 w-6 shrink-0 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: a.base }}
                />
                <span className="flex-1">{a.label}</span>
                {accent === a.id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const isHome = location.pathname === '/';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg/90 px-3 py-2 backdrop-blur">
        {!isHome && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="BV bow sight"
          className="mr-auto flex items-baseline gap-1 rounded-lg transition-opacity hover:opacity-80"
        >
          <span
            className="text-2xl leading-none text-primary"
            style={{ fontFamily: 'Chewy, system-ui, sans-serif' }}
          >
            BV
          </span>
          <span className="font-bold text-fg text-lg tracking-tight">bow sight</span>
        </button>

        <OfflineChip />

        <InstallButton />

        <AccentPicker />

        <button
          type="button"
          onClick={toggle}
          aria-label="Cambiar tema"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2"
        >
          {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => logout.mutate()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2"
        >
          <LogoutIcon className="h-5 w-5" />
        </button>
      </header>

      <ConnectionNotice />

      <main className="flex flex-1 flex-col px-3 py-4">
        <Outlet />
      </main>

      <footer className="px-3 pb-2 text-center text-[10px] text-muted/60">
        v{__APP_VERSION__}
      </footer>
    </div>
  );
}
