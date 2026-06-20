import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, FieldError, Input, Label, Select, Spinner } from '../components/ui';
import { arrowApi, bowApi } from '../lib/api/setups';
import { sightApi } from '../lib/api/sightConfigs';
import { friendlyError } from '../lib/errorMessage';

export function SightEdit() {
  const { id } = useParams();
  const configId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sight', configId],
    queryFn: () => sightApi.detail(configId),
  });
  const { data: bows } = useQuery({ queryKey: ['setups', 'bow-setups'], queryFn: bowApi.list });
  const { data: arrows } = useQuery({
    queryKey: ['setups', 'arrow-setups'],
    queryFn: arrowApi.list,
  });

  const [name, setName] = useState('');
  const [bowSetupId, setBowSetupId] = useState('');
  const [defaultArrowSetupId, setDefaultArrowSetupId] = useState('');
  const [scaleMin, setScaleMin] = useState('');
  const [scaleMax, setScaleMax] = useState('');

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setBowSetupId(data.bowSetupId ? String(data.bowSetupId) : '');
    setDefaultArrowSetupId(data.defaultArrowSetupId ? String(data.defaultArrowSetupId) : '');
    setScaleMin(String(data.scaleMin));
    setScaleMax(String(data.scaleMax));
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      sightApi.update(configId, {
        name,
        bowSetupId: bowSetupId ? Number(bowSetupId) : null,
        defaultArrowSetupId: defaultArrowSetupId ? Number(defaultArrowSetupId) : null,
        scaleMin: Number(scaleMin),
        scaleMax: Number(scaleMax),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sight', configId] });
      qc.invalidateQueries({ queryKey: ['sights'] });
      navigate(`/sight/${configId}`);
    },
  });

  const remove = useMutation({
    mutationFn: () => sightApi.remove(configId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sights'] });
      navigate('/');
    },
  });

  const error = save.error ? friendlyError(save.error) : null;
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="text-lg font-semibold text-fg">Editar mira</h1>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="bow">Setup de arco</Label>
            <Select id="bow" value={bowSetupId} onChange={(e) => setBowSetupId(e.target.value)}>
              <option value="">— Ninguno —</option>
              {bows?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="arrow">Set por defecto</Label>
            <Select
              id="arrow"
              value={defaultArrowSetupId}
              onChange={(e) => setDefaultArrowSetupId(e.target.value)}
            >
              <option value="">— Ninguno —</option>
              {arrows?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="min">Escala mín.</Label>
              <Input
                id="min"
                type="number"
                step="0.1"
                value={scaleMin}
                onChange={(e) => setScaleMin(e.target.value)}
                className="tnum"
                required
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="max">Escala máx.</Label>
              <Input
                id="max"
                type="number"
                step="0.1"
                value={scaleMax}
                onChange={(e) => setScaleMax(e.target.value)}
                className="tnum"
                required
              />
            </div>
          </div>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" loading={save.isPending}>
            Guardar cambios
          </Button>
        </form>
      </Card>

      <Button
        variant="ghost"
        className="text-danger-ink"
        onClick={() => confirm('¿Eliminar la mira y todas sus distancias?') && remove.mutate()}
      >
        Eliminar mira
      </Button>
    </div>
  );
}
