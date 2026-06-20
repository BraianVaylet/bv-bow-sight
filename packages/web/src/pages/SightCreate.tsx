import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, FieldError, Input, Label, Select } from '../components/ui';
import { arrowApi, bowApi } from '../lib/api/setups';
import { sightApi } from '../lib/api/sightConfigs';
import { ApiClientError } from '../lib/apiClient';

export function SightCreate() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: bows } = useQuery({ queryKey: ['setups', 'bow-setups'], queryFn: bowApi.list });
  const { data: arrows } = useQuery({
    queryKey: ['setups', 'arrow-setups'],
    queryFn: arrowApi.list,
  });

  const [name, setName] = useState('');
  const [bowSetupId, setBowSetupId] = useState('');
  const [defaultArrowSetupId, setDefaultArrowSetupId] = useState('');
  const [scaleMin, setScaleMin] = useState('0');
  const [scaleMax, setScaleMax] = useState('6');

  const mut = useMutation({
    mutationFn: () =>
      sightApi.create({
        name,
        bowSetupId: bowSetupId ? Number(bowSetupId) : null,
        defaultArrowSetupId: defaultArrowSetupId ? Number(defaultArrowSetupId) : null,
        scaleMin: Number(scaleMin),
        scaleMax: Number(scaleMax),
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['sights'] });
      navigate(`/sight/${created.id}`);
    },
  });
  const error = mut.error instanceof ApiClientError ? mut.error : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mut.mutate();
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="text-lg font-semibold text-fg">Nueva mira</h1>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ultraview / Evo NXT"
              required
            />
          </div>

          <div>
            <Label htmlFor="bow">Setup de arco (opcional)</Label>
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
            <Label htmlFor="arrow">Set de flechas por defecto (opcional)</Label>
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

          {error && <FieldError>{error.message}</FieldError>}
          <Button type="submit" loading={mut.isPending}>
            Crear mira
          </Button>
        </form>
      </Card>
    </div>
  );
}
