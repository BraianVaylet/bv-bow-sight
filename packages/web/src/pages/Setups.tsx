import type { Setup } from '@bv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  FieldError,
  Input,
  Label,
  Spinner,
  TextArea,
} from '../components/ui';
import { Modal } from '../components/ui/Modal';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { type SetupKind, setupsApi } from '../lib/api/setups';
import { friendlyError } from '../lib/errorMessage';

export function Setups({ kind, title }: { kind: SetupKind; title: string }) {
  const apiForKind = setupsApi(kind);
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const key = ['setups', kind];

  const { data, isLoading } = useQuery({ queryKey: key, queryFn: apiForKind.list });

  const [editing, setEditing] = useState<Setup | null>(null);
  const [creating, setCreating] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const removeMut = useMutation({
    mutationFn: (id: number) => apiForKind.remove(id),
    onSuccess: invalidate,
    onError: (err) => alert(friendlyError(err)),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-fg">{title}</h1>
      <Button
        onClick={() => setCreating(true)}
        disabled={!online}
        title={online ? undefined : 'Necesitás conexión para agregar'}
      >
        {online ? '+ Agregar' : '+ Agregar (sin conexión)'}
      </Button>

      {isLoading && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {data && data.length === 0 && <EmptyState title="Nada cargado todavía" />}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((s) => (
            <li key={s.id}>
              <Card>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-fg">{s.name}</div>
                    <p className="whitespace-pre-wrap text-sm text-muted">{s.notes}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" className="px-2 text-xs" onClick={() => setEditing(s)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 text-xs text-danger-ink"
                      onClick={() => confirm(`¿Eliminar "${s.name}"?`) && removeMut.mutate(s.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <SetupFormModal
          kind={kind}
          setup={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SetupFormModal({
  kind,
  setup,
  onClose,
  onSaved,
}: {
  kind: SetupKind;
  setup: Setup | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiForKind = setupsApi(kind);
  const [name, setName] = useState(setup?.name ?? '');
  const [notes, setNotes] = useState(setup?.notes ?? '');

  const mut = useMutation({
    mutationFn: () =>
      setup ? apiForKind.update(setup.id, { name, notes }) : apiForKind.create({ name, notes }),
    onSuccess: onSaved,
  });
  const error = mut.error ? friendlyError(mut.error) : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mut.mutate();
  };

  return (
    <Modal open onClose={onClose} title={setup ? 'Editar' : 'Agregar'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="notes">Observaciones</Label>
          <TextArea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} required />
        </div>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" loading={mut.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
