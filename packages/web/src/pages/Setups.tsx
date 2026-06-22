import type { Setup } from '@bv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { ArrowIcon, BowIcon } from '../components/Icons';
import {
  Button,
  Card,
  EmptyState,
  FieldError,
  FieldHint,
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

  const description =
    kind === 'bow-setups'
      ? 'Registrá la configuración de cada arco con sus características. Después vas a poder asociarla a tus miras.'
      : 'Registrá cada juego de flechas con sus características. Después vas a poder asociarlo a las marcas de tus miras.';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-fg">
        {kind === 'bow-setups' ? (
          <BowIcon className="h-5 w-5 text-primary-ink" />
        ) : (
          <ArrowIcon className="h-5 w-5 text-primary-ink" />
        )}
        {title}
      </h1>
      <p className="text-sm text-muted">{description}</p>
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

/** Colores de vanes permitidos (se guardan como emoji al inicio del nombre). */
const VANE_EMOJIS = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪'];

/** Separa el emoji de vanes (si el nombre empieza con uno) del resto del nombre. */
function splitVane(fullName: string): { vane: string | null; base: string } {
  for (const e of VANE_EMOJIS) {
    if (fullName.startsWith(e)) return { vane: e, base: fullName.slice(e.length) };
  }
  return { vane: null, base: fullName };
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
  const isBow = kind === 'bow-setups';
  // En sets de flechas el nombre puede venir con un emoji de vanes al inicio.
  const [name, setName] = useState(() =>
    isBow ? (setup?.name ?? '') : splitVane(setup?.name ?? '').base,
  );
  const [vane, setVane] = useState<string | null>(() =>
    isBow ? null : splitVane(setup?.name ?? '').vane,
  );
  const [notes, setNotes] = useState(setup?.notes ?? '');

  const namePlaceholder = isBow
    ? 'Ingresá un nombre para tu setup de arco'
    : 'Ingresá un nombre para tu set de flechas';
  const notesPlaceholder = isBow
    ? 'Ingresá los datos de tu configuración actual (ATA, Brace Height, Draw Length, Draw Weight, Let-Off, etc.)'
    : 'Ingresá los datos de tu flecha (spine, puntas, vanes, largo, etc.)';

  const mut = useMutation({
    mutationFn: () => {
      const finalName = !isBow && vane ? `${vane}${name.trim()}` : name.trim();
      return setup
        ? apiForKind.update(setup.id, { name: finalName, notes })
        : apiForKind.create({ name: finalName, notes });
    },
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
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={namePlaceholder}
            required
          />
        </div>
        {!isBow && (
          <div>
            <Label>Color de vanes (opcional)</Label>
            <div className="grid w-fit grid-cols-4 gap-1.5">
              {VANE_EMOJIS.map((e) => {
                const active = vane === e;
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setVane(active ? null : e)}
                    aria-pressed={active}
                    aria-label={`Vanes ${e}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${
                      active ? 'bg-surface-2 ring-2 ring-primary' : 'hover:bg-surface-2'
                    }`}
                  >
                    {e}
                  </button>
                );
              })}
            </div>
            <FieldHint>Se agrega adelante del nombre. Tocá de nuevo para quitarlo.</FieldHint>
          </div>
        )}
        <div>
          <Label htmlFor="notes">Observaciones</Label>
          <TextArea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={notesPlaceholder}
            required
          />
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
