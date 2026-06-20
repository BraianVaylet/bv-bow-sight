import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, Spinner } from '../components/ui';
import { sightApi } from '../lib/api/sightConfigs';

export function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sights'],
    queryFn: sightApi.list,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold text-fg">Mis miras</h1>
        <Link to="/setups/bow-setups">
          <Button variant="secondary" className="px-3 text-xs">
            Setups de arco
          </Button>
        </Link>
        <Link to="/setups/arrow-setups">
          <Button variant="secondary" className="px-3 text-xs">
            Sets de flechas
          </Button>
        </Link>
      </div>

      <Link to="/sight/new">
        <Button className="w-full">+ Nueva mira</Button>
      </Link>

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
                    <div className="truncate font-semibold text-fg">{s.name}</div>
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
