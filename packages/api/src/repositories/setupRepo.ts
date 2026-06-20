import type { Setup } from '@bv/shared';
import type { DB } from '../db/connection';
import { now } from '../lib/time';

interface SetupRow {
  id: number;
  name: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

const toSetup = (r: SetupRow): Setup => ({
  id: r.id,
  name: r.name,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Factory reutilizado por bow_setups y arrow_setups (misma estructura). */
export function createSetupRepo(db: DB, table: 'bow_setups' | 'arrow_setups') {
  const list = db.prepare<[number], SetupRow>(
    `SELECT * FROM ${table} WHERE user_id = ? ORDER BY updated_at DESC`,
  );
  const findOwned = db.prepare<[number, number], SetupRow>(
    `SELECT * FROM ${table} WHERE id = ? AND user_id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO ${table} (user_id, name, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?) RETURNING *`,
  );
  const remove = db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`);

  return {
    list(userId: number): Setup[] {
      return list.all(userId).map(toSetup);
    },
    findOwned(userId: number, id: number): Setup | undefined {
      const r = findOwned.get(id, userId);
      return r ? toSetup(r) : undefined;
    },
    create(userId: number, data: { name: string; notes: string }): Setup {
      const ts = now();
      return toSetup(insert.get(userId, data.name, data.notes, ts, ts) as SetupRow);
    },
    update(
      userId: number,
      id: number,
      patch: { name?: string; notes?: string },
    ): Setup | undefined {
      const current = findOwned.get(id, userId);
      if (!current) return undefined;
      const name = patch.name ?? current.name;
      const notes = patch.notes ?? current.notes;
      db.prepare(
        `UPDATE ${table} SET name = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      ).run(name, notes, now(), id, userId);
      return this.findOwned(userId, id);
    },
    /** Devuelve true si borró. Puede lanzar SQLITE_CONSTRAINT_FOREIGNKEY (RESTRICT). */
    remove(userId: number, id: number): boolean {
      return remove.run(id, userId).changes > 0;
    },
  };
}

export type SetupRepo = ReturnType<typeof createSetupRepo>;
