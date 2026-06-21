import {
  SIGHT_CALC_MIN_MARKS,
  type SightConfigDetail,
  computeSightMarks,
  createSightModel,
} from '@bv/shared';
import type { Distance } from '@bv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { friendlyError } from '../lib/errorMessage';

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
  const [query, setQuery] = useState('');
  const online = useOnlineStatus();

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
            <Ruler
              scaleMin={data.scaleMin}
              scaleMax={data.scaleMax}
              markers={rulerMarkers}
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
              <h2 className="text-sm font-semibold text-fg">Distancias calculadas</h2>
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
    </div>
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
