import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useAuth';
import { useTheme } from '../theme';
import { LogoMini } from './Logo';
import { Button } from './ui';

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
          className="mr-auto flex items-center rounded-lg text-fg transition-opacity hover:opacity-80"
        >
          <LogoMini className="h-7 w-auto" />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label="Cambiar tema"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-fg hover:bg-surface-2"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <Button variant="ghost" className="px-2" onClick={() => logout.mutate()}>
          Salir
        </Button>
      </header>

      <main className="flex flex-1 flex-col px-3 py-4">
        <Outlet />
      </main>
    </div>
  );
}
