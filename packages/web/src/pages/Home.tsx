import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowIcon, BowIcon, StarFilledIcon } from '../components/Icons';
import { Button, Card, EmptyState, Spinner } from '../components/ui';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { sightApi } from '../lib/api/sightConfigs';
import {
  getDefaultSightId,
  hasEnteredThisSession,
  markEnteredThisSession,
  setDefaultSightId,
} from '../lib/preferences';

export function Home() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sights'],
    queryFn: sightApi.list,
  });

  // Si hay una mira por defecto, al abrir la app (una vez por sesión) se entra
  // directo a ella sin pasar por Home. Si la mira ya no existe, se limpia.
  // Marcamos la sesión como "entrada" en la primera carga, redirija o no, para
  // que marcar una mira por defecto a mitad de sesión no rebote al usuario.
  useEffect(() => {
    if (!data || hasEnteredThisSession()) return;
    const defaultId = getDefaultSightId();
    if (defaultId != null && data.some((s) => s.id === defaultId)) {
      markEnteredThisSession();
      navigate(`/sight/${defaultId}`, { replace: true });
      return;
    }
    if (defaultId != null) setDefaultSightId(null); // mira borrada o de otra cuenta
    markEnteredThisSession();
  }, [data, navigate]);

  const defaultSightId = getDefaultSightId();

  // Con conexión, precargamos el detalle de cada mira para poder verlas offline.
  // (La persistencia solo guarda lo ya pedido; el detalle nunca se pide desde Home.)
  useEffect(() => {
    if (!online || !data) return;
    for (const s of data) {
      qc.prefetchQuery({
        queryKey: ['sight', s.id],
        queryFn: () => sightApi.detail(s.id),
        staleTime: 60_000,
      });
    }
  }, [online, data, qc]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold text-fg">Mis miras</h1>
        <Link to="/setups/bow-setups">
          <Button variant="secondary" className="px-3 text-xs">
            <BowIcon className="h-4 w-4" />
            Setups de arco
          </Button>
        </Link>
        <Link to="/setups/arrow-setups">
          <Button variant="secondary" className="px-3 text-xs">
            <ArrowIcon className="h-4 w-4" />
            Sets de flechas
          </Button>
        </Link>
      </div>

      {online ? (
        <Link to="/sight/new">
          <Button className="w-full">+ Nueva mira</Button>
        </Link>
      ) : (
        <Button className="w-full" disabled title="Necesitás conexión para crear una mira">
          + Nueva mira (sin conexión)
        </Button>
      )}

      {isLoading && (
        <div className="flex justify-center py-12 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-danger-ink">
          No pudimos cargar tus miras. Revisá tu conexión y volvé a intentar.
        </p>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="Aún no tenés miras"
          description="Creá tu primera mira y registrá las marcas para cada distancia."
        />
      )}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((s) => (
            <li key={s.id}>
              <Link to={`/sight/${s.id}`}>
                <Card className="flex items-center gap-3 transition-colors hover:border-primary">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {s.id === defaultSightId && (
                        <StarFilledIcon
                          className="h-4 w-4 shrink-0 text-primary-ink"
                          aria-label="Mira predeterminada"
                        />
                      )}
                      <span className="min-w-0 truncate font-semibold text-fg">{s.name}</span>
                    </div>
                    <div className="truncate text-sm text-muted">
                      {s.bowSetupName ?? 'Sin arco asignado'} · escala {s.scaleMin}–{s.scaleMax}
                    </div>
                  </div>
                  <span className="tnum shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
                    {s.distanceCount} {s.distanceCount === 1 ? 'marca' : 'marcas'}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
