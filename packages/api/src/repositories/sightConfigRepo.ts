import type { ArrowSetRef, SightConfigListItem } from '@bv/shared';
import type { DB } from '../db/connection';
import { now } from '../lib/time';

export interface SightConfigRow {
  id: number;
  user_id: number;
  name: string;
  bow_setup_id: number | null;
  default_arrow_setup_id: number | null;
  scale_min: number;
  scale_max: number;
  created_at: number;
  updated_at: number;
}

export interface SightConfigOwned {
  id: number;
  name: string;
  bowSetupId: number | null;
  defaultArrowSetupId: number | null;
  scaleMin: number;
  scaleMax: number;
}

const toOwned = (r: SightConfigRow): SightConfigOwned => ({
  id: r.id,
  name: r.name,
  bowSetupId: r.bow_setup_id,
  defaultArrowSetupId: r.default_arrow_setup_id,
  scaleMin: r.scale_min,
  scaleMax: r.scale_max,
});

export interface SightConfigInsert {
  name: string;
  bowSetupId: number | null;
  defaultArrowSetupId: number | null;
  scaleMin: number;
  scaleMax: number;
}

export function createSightConfigRepo(db: DB) {
  const findOwned = db.prepare<[number, number], SightConfigRow>(
    'SELECT * FROM sight_configs WHERE id = ? AND user_id = ?',
  );

  return {
    list(userId: number): SightConfigListItem[] {
      const rows = db
        .prepare(`
          SELECT sc.*, b.name AS bow_setup_name,
                 (SELECT COUNT(*) FROM distances d WHERE d.sight_config_id = sc.id) AS distance_count
          FROM sight_configs sc
          LEFT JOIN bow_setups b ON b.id = sc.bow_setup_id
          WHERE sc.user_id = ?
          ORDER BY sc.updated_at DESC
        `)
        .all(userId) as (SightConfigRow & {
        bow_setup_name: string | null;
        distance_count: number;
      })[];
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        bowSetupId: r.bow_setup_id,
        bowSetupName: r.bow_setup_name,
        defaultArrowSetupId: r.default_arrow_setup_id,
        scaleMin: r.scale_min,
        scaleMax: r.scale_max,
        distanceCount: r.distance_count,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },

    findOwned(userId: number, id: number): SightConfigOwned | undefined {
      const r = findOwned.get(id, userId);
      return r ? toOwned(r) : undefined;
    },

    bowSetupName(userId: number, bowSetupId: number | null): string | null {
      if (bowSetupId == null) return null;
      const r = db
        .prepare('SELECT name FROM bow_setups WHERE id = ? AND user_id = ?')
        .get(bowSetupId, userId) as { name: string } | undefined;
      return r?.name ?? null;
    },

    create(userId: number, data: SightConfigInsert): SightConfigOwned {
      const ts = now();
      const r = db
        .prepare(`
          INSERT INTO sight_configs
            (user_id, name, bow_setup_id, default_arrow_setup_id, scale_min, scale_max, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
        `)
        .get(
          userId,
          data.name,
          data.bowSetupId,
          data.defaultArrowSetupId,
          data.scaleMin,
          data.scaleMax,
          ts,
          ts,
        ) as SightConfigRow;
      return toOwned(r);
    },

    update(
      userId: number,
      id: number,
      patch: Partial<SightConfigInsert>,
    ): SightConfigOwned | undefined {
      const current = findOwned.get(id, userId);
      if (!current) return undefined;
      const merged: SightConfigInsert = {
        name: patch.name ?? current.name,
        bowSetupId: patch.bowSetupId !== undefined ? patch.bowSetupId : current.bow_setup_id,
        defaultArrowSetupId:
          patch.defaultArrowSetupId !== undefined
            ? patch.defaultArrowSetupId
            : current.default_arrow_setup_id,
        scaleMin: patch.scaleMin ?? current.scale_min,
        scaleMax: patch.scaleMax ?? current.scale_max,
      };
      db.prepare(`
        UPDATE sight_configs
        SET name = ?, bow_setup_id = ?, default_arrow_setup_id = ?, scale_min = ?, scale_max = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        merged.name,
        merged.bowSetupId,
        merged.defaultArrowSetupId,
        merged.scaleMin,
        merged.scaleMax,
        now(),
        id,
        userId,
      );
      return this.findOwned(userId, id);
    },

    remove(userId: number, id: number): boolean {
      return (
        db.prepare('DELETE FROM sight_configs WHERE id = ? AND user_id = ?').run(id, userId)
          .changes > 0
      );
    },

    /** Cantidad de distancias cuyo scale_value cae fuera del rango dado. */
    countOutsideRange(configId: number, min: number, max: number): number {
      const r = db
        .prepare(
          'SELECT COUNT(*) AS n FROM distances WHERE sight_config_id = ? AND (scale_value < ? OR scale_value > ?)',
        )
        .get(configId, min, max) as { n: number };
      return r.n;
    },

    /** Sets de flechas con distancias en esta mira (para la botonera). */
    arrowSetsWithDistances(configId: number): ArrowSetRef[] {
      return db
        .prepare(`
          SELECT DISTINCT a.id AS id, a.name AS name
          FROM distances d
          JOIN arrow_setups a ON a.id = d.arrow_setup_id
          WHERE d.sight_config_id = ?
          ORDER BY a.name COLLATE NOCASE
        `)
        .all(configId) as ArrowSetRef[];
    },
  };
}

export type SightConfigRepo = ReturnType<typeof createSightConfigRepo>;
