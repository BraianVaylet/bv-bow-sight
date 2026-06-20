import type { Setup } from '@bv/shared';
import { conflict, notFound } from '../lib/errors';
import type { SetupRepo } from '../repositories/setupRepo';

interface SetupServiceOpts {
  notFoundMsg: string;
  deleteConflictMsg: string;
}

function isForeignKeyError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; message?: string };
  // SQLite reporta una violación RESTRICT como SQLITE_CONSTRAINT_TRIGGER
  // (mensaje "FOREIGN KEY constraint failed"), no siempre como _FOREIGNKEY.
  return (
    e.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
    e.code === 'SQLITE_CONSTRAINT_TRIGGER' ||
    (typeof e.message === 'string' && e.message.includes('FOREIGN KEY constraint failed'))
  );
}

/** Service genérico para setups de arco y de flechas. */
export function createSetupService(repo: SetupRepo, opts: SetupServiceOpts) {
  return {
    list(userId: number): Setup[] {
      return repo.list(userId);
    },
    get(userId: number, id: number): Setup {
      const s = repo.findOwned(userId, id);
      if (!s) throw notFound(opts.notFoundMsg);
      return s;
    },
    create(userId: number, data: { name: string; notes: string }): Setup {
      return repo.create(userId, data);
    },
    update(userId: number, id: number, patch: { name?: string; notes?: string }): Setup {
      const updated = repo.update(userId, id, patch);
      if (!updated) throw notFound(opts.notFoundMsg);
      return updated;
    },
    remove(userId: number, id: number): void {
      if (!repo.findOwned(userId, id)) throw notFound(opts.notFoundMsg);
      try {
        repo.remove(userId, id);
      } catch (err) {
        if (isForeignKeyError(err)) throw conflict(opts.deleteConflictMsg);
        throw err;
      }
    },
  };
}

export type SetupService = ReturnType<typeof createSetupService>;
