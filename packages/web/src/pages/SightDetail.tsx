import type { Distance, SightConfigDetail } from '@bv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ruler } from '../components/Ruler';
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
import { distanceApi } from '../lib/api/distances';
import { arrowApi } from '../lib/api/setups';
import { sightApi } from '../lib/api/sightConfigs';
import { ApiClientError } from '../lib/apiClient';

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

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="py-8 text-center text-sm text-danger-ink">No se pudo cargar la mira.</p>;
  }

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

      {/* Regla */}
      <div className="min-h-0 flex-1">
        {data.distances.length === 0 ? (
          <EmptyState
            title="Sin distancias"
            description="Cargá la primera distancia para ver dónde ubicar la mira."
          />
        ) : (
          <Card className="h-full p-2">
            <Ruler
              scaleMin={data.scaleMin}
              scaleMax={data.scaleMax}
              markers={visibleDistances.map((d) => ({
                id: d.id,
                scaleValue: d.scaleValue,
                distanceM: d.distanceM,
                notes: d.notes,
              }))}
              onMarkerClick={(mid) => {
                const dist = data.distances.find((d) => d.id === mid) ?? null;
                setEditing(dist);
                setFormOpen(true);
              }}
            />
          </Card>
        )}
      </div>

      {/* Acción */}
      <Button
        className="w-full"
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        + Nueva distancia
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
      if (err instanceof ApiClientError) alert(err.message);
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
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(sightKey, ctx.prev),
    onSuccess: onClose,
    onSettled: reconcile,
  });

  const error = save.error instanceof ApiClientError ? save.error : null;
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} title={distance ? 'Editar distancia' : 'Nueva distancia'}>
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
              Escala ({config.scaleMin}–{config.scaleMax})
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

        {error && <FieldError>{error.message}</FieldError>}

        <div className="flex gap-2">
          {distance && (
            <Button
              type="button"
              variant="ghost"
              className="text-danger-ink"
              onClick={() => confirm('¿Eliminar esta distancia?') && remove.mutate()}
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
