import {
  INDOOR_DISTANCE_M,
  SIGHT_CALC_MIN_MARKS,
  type SightConfigDetail,
  computeSightMarks,
  createSightModel,
} from '@bv/shared';
import type { Distance } from '@bv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InfoIcon, StarFilledIcon, StarIcon } from '../components/Icons';
import { MarkZoomControl } from '../components/MarkZoomControl';
import { Ruler, type RulerMarker } from '../components/Ruler';
import { SightCurveChart } from '../components/SightCurveChart';
import {
  Button,
  Card,
  EmptyState,
  FieldError,
  Input,
  Label,
  Select,
  Spinner,
} from '../components/ui';
import { Modal } from '../components/ui/Modal';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { distanceApi } from '../lib/api/distances';
import { arrowApi } from '../lib/api/setups';
import { sightApi } from '../lib/api/sightConfigs';
import { formatDateTime } from '../lib/datetime';
import { friendlyError } from '../lib/errorMessage';
import { getDefaultSightId, getMarkZoom, setDefaultSightId, setMarkZoom } from '../lib/preferences';

export function SightDetail() {
  const { id } = useParams();
  const configId = Number(id);
  const navigate = useNavigate();
  const sightKey = ['sight', configId];

  const { data, isLoading, isError } = useQuery({
    queryKey: sightKey,
    queryFn: () => sightApi.detail(configId),
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Distance | null>(null);
  const [showComputed, setShowComputed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState('');
  const online = useOnlineStatus();

  // Zoom de las marcas (preferencia local, persistida).
  const [zoom, setZoom] = useState(getMarkZoom);
  useEffect(() => {
    setMarkZoom(zoom);
  }, [zoom]);

  // Mira por defecto: al abrir la app se entra directo a ella (ver Home).
  const [isDefault, setIsDefault] = useState(() => getDefaultSightId() === configId);
  useEffect(() => {
    setIsDefault(getDefaultSightId() === configId);
  }, [configId]);
  const toggleDefault = () => {
    const next = !isDefault;
    setDefaultSightId(next ? configId : null);
    setIsDefault(next);
  };

  // Preselección de la botonera (set por defecto o el primero con distancias)
  useEffect(() => {
    if (!data) return;
    const ids = data.arrowSets.map((a) => a.id);
    setSelected((cur) => {
      if (cur && ids.includes(cur)) return cur;
      if (data.defaultArrowSetupId && ids.includes(data.defaultArrowSetupId)) {
        return data.defaultArrowSetupId;
      }
      return ids[0] ?? null;
    });
  }, [data]);

  const visibleDistances = useMemo(() => {
    if (!data) return [];
    if (data.arrowSets.length <= 1 || selected == null) return data.distances;
    return data.distances.filter((d) => d.arrowSetupId === selected);
  }, [data, selected]);

  // ── Cálculo de distancias intermedias (por set de flechas seleccionado) ──
  const canCompute = visibleDistances.length >= SIGHT_CALC_MIN_MARKS;

  const model = useMemo(
    () =>
      canCompute
        ? createSightModel(
            visibleDistances.map((d) => ({ distance: d.distanceM, mark: d.scaleValue })),
          )
        : null,
    [visibleDistances, canCompute],
  );

  const computedMarks = useMemo(() => {
    if (!model || !showComputed || !data) return [];
    return computeSightMarks(
      model,
      visibleDistances.map((d) => d.distanceM),
      { scaleMin: data.scaleMin, scaleMax: data.scaleMax },
    );
  }, [model, showComputed, visibleDistances, data]);

  // Cuando el set seleccionado no llega a 5 marcas, se oculta el cálculo.
  useEffect(() => {
    if (!canCompute) setShowComputed(false);
  }, [canCompute]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <p className="py-8 text-center text-sm text-danger-ink">
        No pudimos cargar esta mira. Revisá tu conexión y volvé a intentar.
      </p>
    );
  }

  // Distancia consultada en la calculadora.
  const queryNum = query.trim() !== '' && Number.isFinite(Number(query)) ? Number(query) : null;
  const queryResult = model && queryNum != null ? model.markAt(queryNum) : null;

  // Marcadores del ruler: del usuario + calculadas + la consultada (temporal).
  const COMPUTED_ID = -1_000_000;
  const QUERY_ID = -2_000_000;
  const userMarkers: RulerMarker[] = visibleDistances.map((d) => ({
    id: d.id,
    scaleValue: d.scaleValue,
    distanceM: d.distanceM,
    notes: d.notes,
    variant: 'user',
  }));
  const autoMarkers: RulerMarker[] = computedMarks.map((m, i) => ({
    id: COMPUTED_ID - i,
    scaleValue: m.scaleValue,
    distanceM: m.distanceM,
    variant: 'computed',
    interpolated: m.interpolated,
  }));
  const queryMarkers: RulerMarker[] =
    showComputed &&
    queryResult &&
    queryNum != null &&
    queryResult.mark >= data.scaleMin &&
    queryResult.mark <= data.scaleMax
      ? [
          {
            id: QUERY_ID,
            scaleValue: queryResult.mark,
            distanceM: queryNum,
            variant: 'query',
            interpolated: queryResult.interpolated,
          },
        ]
      : [];
  const rulerMarkers = [...userMarkers, ...autoMarkers, ...queryMarkers];
  const missing = SIGHT_CALC_MIN_MARKS - visibleDistances.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Encabezado */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-fg">{data.name}</h1>
          <p className="truncate text-sm text-muted">
            {data.bowSetupName ?? 'Sin arco'} · escala {data.scaleMin}–{data.scaleMax}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleDefault}
          aria-pressed={isDefault}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-surface-2 ${
            isDefault ? 'text-primary-ink' : 'text-muted'
          }`}
          title={
            isDefault
              ? 'Mira predeterminada: entrás directo acá al abrir la app. Tocá para quitar.'
              : 'Marcar como predeterminada: entrar directo a esta mira al abrir la app.'
          }
        >
          {isDefault ? <StarFilledIcon className="h-5 w-5" /> : <StarIcon className="h-5 w-5" />}
        </button>
        <Button
          variant="ghost"
          className="px-2 text-xs"
          disabled={!online}
          title={online ? undefined : 'Necesitás conexión para editar la mira'}
          onClick={() => navigate(`/sight/${configId}/edit`)}
        >
          Editar mira
        </Button>
      </div>

      {/* Botonera de sets (si hay más de uno con distancias) */}
      {data.arrowSets.length > 1 && selected != null && (
        <SegmentedControl
          options={data.arrowSets.map((a) => ({ value: a.id, label: a.name }))}
          value={selected}
          onChange={setSelected}
        />
      )}

      {/* Regla + cálculo (con scroll cuando se desbloquea) */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {data.distances.length === 0 ? (
          <EmptyState
            title="Sin marcas todavía"
            description="Cargá tu primera marca de mira para saber a qué distancia apuntar."
          />
        ) : (
          <Card className="min-h-[360px] flex-1 p-2">
            <div className="flex h-full gap-2">
              <div className="min-w-0 flex-1">
                <Ruler
                  scaleMin={data.scaleMin}
                  scaleMax={data.scaleMax}
                  markers={rulerMarkers}
                  zoom={zoom}
                  onMarkerClick={
                    online
                      ? (mid) => {
                          const dist = data.distances.find((d) => d.id === mid) ?? null;
                          setEditing(dist);
                          setFormOpen(true);
                        }
                      : undefined
                  }
                />
              </div>
              <MarkZoomControl value={zoom} onChange={setZoom} />
            </div>
          </Card>
        )}

        {/* Aviso: faltan marcas para desbloquear el cálculo */}
        {visibleDistances.length > 0 && !canCompute && (
          <Card className="border-dashed">
            <p className="text-sm text-fg">
              Cargá {missing} marca{missing === 1 ? '' : 's'} más para desbloquear el cálculo de
              distancias intermedias y de sala.
            </p>
            <p className="mt-1 text-xs text-muted">
              Llevás {visibleDistances.length}/{SIGHT_CALC_MIN_MARKS} en este set de flechas.
            </p>
          </Card>
        )}

        {/* Botón de desbloqueo */}
        {canCompute && !showComputed && (
          <Button variant="secondary" onClick={() => setShowComputed(true)}>
            Calcular distancias intermedias
          </Button>
        )}

        {/* Distancias calculadas: curva + calculadora */}
        {showComputed && model && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <h2 className="text-sm font-semibold text-fg">Distancias calculadas</h2>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  aria-label="Cómo se calculan las distancias"
                  title="Cómo se calculan las distancias"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <InfoIcon className="h-4 w-4" />
                </button>
              </div>
              <Button
                variant="ghost"
                className="px-2 text-xs"
                onClick={() => setShowComputed(false)}
              >
                Ocultar
              </Button>
            </div>

            <Card className="p-3">
              <SightCurveChart
                model={model}
                userPoints={visibleDistances.map((d) => ({
                  distanceM: d.distanceM,
                  scaleValue: d.scaleValue,
                }))}
                query={queryNum}
              />
            </Card>

            <Card className="p-3">
              <Label htmlFor="q">Calcular una distancia</Label>
              <div className="relative">
                <Input
                  id="q"
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej: 37"
                  className="tnum pr-9"
                />
                <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 text-sm text-muted">
                  m
                </span>
              </div>

              <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                {queryNum == null ? (
                  <span className="text-muted">
                    Ingresá los metros para ver en qué escala poner la mira.
                  </span>
                ) : queryResult ? (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="tnum text-muted">{queryNum} m →</span>
                    <span className="flex items-baseline gap-2">
                      <span className="tnum font-semibold text-lg text-primary-ink">
                        {Number(queryResult.mark.toFixed(2))}
                      </span>
                      <span className="text-muted text-xs">
                        {queryResult.interpolated ? 'medido' : 'estimado'}
                      </span>
                    </span>
                  </div>
                ) : null}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Acción */}
      <Button
        className="w-full"
        disabled={!online}
        title={online ? undefined : 'Necesitás conexión para cargar una marca'}
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        {online ? '+ Nueva marca' : '+ Nueva marca (sin conexión)'}
      </Button>

      {formOpen && (
        <DistanceFormModal
          config={data}
          distance={editing}
          defaultArrowSetupId={selected ?? data.defaultArrowSetupId ?? undefined}
          onClose={() => setFormOpen(false)}
        />
      )}

      {helpOpen && <CalcHelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

// ── Modal de ayuda: cómo se calculan las distancias ──
function CalcHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Cómo se calculan las distancias">
      <div className="flex flex-col gap-3 text-sm text-fg">
        <p>
          Las marcas que cargás son los puntos de referencia. Con ellas la app completa la mira para
          el resto de las distancias de dos formas:
        </p>

        <div>
          <p className="font-semibold">Dentro del rango que mediste</p>
          <p className="text-muted">
            Traza una curva suave que pasa <span className="font-medium text-fg">exactamente</span>{' '}
            por cada marca cargada, sin saltos ni rebotes (spline monótono PCHIP). En la calculadora
            figuran como <span className="font-medium text-fg">«medido»</span>.
          </p>
        </div>

        <div>
          <p className="font-semibold">Fuera de ese rango</p>
          <p className="text-muted">
            Ajusta una <span className="font-medium text-fg">parábola</span> a todas tus marcas y la
            prolonga. Así estima, por ejemplo, la marca de{' '}
            <span className="font-medium text-fg">sala (18 m)</span> si te queda fuera de lo medido.
            Figuran como <span className="font-medium text-fg">«estimado»</span>.
          </p>
        </div>

        <p className="text-muted">
          En el gráfico, la curva es esa parábola de mejor ajuste y los puntos son tus marcas.
          Cuantas más marcas cargues y mejor repartidas, más precisa es la estimación (se necesitan
          al menos {SIGHT_CALC_MIN_MARKS}).
        </p>

        <p className="text-muted">
          La app calcula sola las distancias intermedias (el punto medio entre cada par de marcas
          consecutivas) y la de sala ({INDOOR_DISTANCE_M} m).
        </p>

        <div className="rounded-xl bg-surface-2 px-3 py-2 text-muted text-xs">
          Las estimaciones son una ayuda: verificá siempre en el campo antes de competir.
        </div>

        <Button className="mt-1 w-full" onClick={onClose}>
          Entendido
        </Button>
      </div>
    </Modal>
  );
}

// ── Modal de alta/edición/eliminación de distancia (optimista) ──
function DistanceFormModal({
  config,
  distance,
  defaultArrowSetupId,
  onClose,
}: {
  config: SightConfigDetail;
  distance: Distance | null;
  defaultArrowSetupId?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const sightKey = ['sight', config.id];

  const { data: arrowSetups } = useQuery({
    queryKey: ['setups', 'arrow-setups'],
    queryFn: arrowApi.list,
  });

  const [scaleValue, setScaleValue] = useState(distance ? String(distance.scaleValue) : '');
  const [distanceM, setDistanceM] = useState(distance ? String(distance.distanceM) : '');
  const [arrowSetupId, setArrowSetupId] = useState(
    String(distance?.arrowSetupId ?? defaultArrowSetupId ?? ''),
  );
  const [notes, setNotes] = useState(distance?.notes ?? '');

  const reconcile = () => qc.invalidateQueries({ queryKey: sightKey });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        scaleValue: Number(scaleValue),
        distanceM: Number(distanceM),
        arrowSetupId: Number(arrowSetupId),
        notes: notes.trim() ? notes.trim() : null,
      };
      return distance
        ? distanceApi.update(config.id, distance.id, body)
        : distanceApi.create(config.id, body);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: sightKey });
      const prev = qc.getQueryData<SightConfigDetail>(sightKey);
      if (prev) {
        const optimistic: Distance = {
          id: distance?.id ?? -Date.now(),
          arrowSetupId: Number(arrowSetupId),
          scaleValue: Number(scaleValue),
          distanceM: Number(distanceM),
          notes: notes.trim() ? notes.trim() : null,
          createdAt: distance?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        };
        const distances = distance
          ? prev.distances.map((d) => (d.id === distance.id ? optimistic : d))
          : [...prev.distances, optimistic];
        qc.setQueryData<SightConfigDetail>(sightKey, { ...prev, distances });
      }
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(sightKey, ctx.prev);
      alert(friendlyError(err));
    },
    onSuccess: onClose,
    onSettled: reconcile,
  });

  const remove = useMutation({
    mutationFn: () => {
      if (!distance) throw new Error('Sin distancia');
      return distanceApi.remove(config.id, distance.id);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: sightKey });
      const prev = qc.getQueryData<SightConfigDetail>(sightKey);
      if (prev && distance) {
        qc.setQueryData<SightConfigDetail>(sightKey, {
          ...prev,
          distances: prev.distances.filter((d) => d.id !== distance.id),
        });
      }
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(sightKey, ctx.prev);
      alert(friendlyError(err));
    },
    onSuccess: onClose,
    onSettled: reconcile,
  });

  const error = save.error ? friendlyError(save.error) : null;
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} title={distance ? 'Editar marca' : 'Nueva marca de mira'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="dm">Distancia (m)</Label>
            <Input
              id="dm"
              type="number"
              step="0.5"
              value={distanceM}
              onChange={(e) => setDistanceM(e.target.value)}
              className="tnum"
              required
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="sv">
              Marca de mira ({config.scaleMin}–{config.scaleMax})
            </Label>
            <Input
              id="sv"
              type="number"
              step="0.1"
              value={scaleValue}
              onChange={(e) => setScaleValue(e.target.value)}
              className="tnum"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="as">Set de flechas</Label>
          <Select
            id="as"
            value={arrowSetupId}
            onChange={(e) => setArrowSetupId(e.target.value)}
            required
          >
            <option value="" disabled>
              Elegí un set…
            </option>
            {arrowSetups?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Viento, indoor, etc."
          />
        </div>

        {distance && (
          <p className="text-xs text-muted">
            Última actualización: {formatDateTime(distance.updatedAt)}
          </p>
        )}

        {error && <FieldError>{error}</FieldError>}

        <div className="flex gap-2">
          {distance && (
            <Button
              type="button"
              variant="ghost"
              className="text-danger-ink"
              onClick={() => confirm('¿Eliminar esta marca de mira?') && remove.mutate()}
            >
              Eliminar
            </Button>
          )}
          <Button type="button" variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
