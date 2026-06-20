import type { Distance } from '@bv/shared';
import type { DB } from '../db/connection';
import { now } from '../lib/time';

interface DistanceRow {
  id: number;
  arrow_setup_id: number;
  scale_value: number;
  distance_m: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

const toDistance = (r: DistanceRow): Distance => ({
  id: r.id,
  arrowSetupId: r.arrow_setup_id,
  scaleValue: r.scale_value,
  distanceM: r.distance_m,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface DistanceInsert {
  arrowSetupId: number;
  scaleValue: number;
  distanceM: number;
  notes: string | null;
}

export function createDistanceRepo(db: DB) {
  return {
    listByConfig(configId: number): Distance[] {
      return (
        db
          .prepare('SELECT * FROM distances WHERE sight_config_id = ? ORDER BY scale_value')
          .all(configId) as DistanceRow[]
      ).map(toDistance);
    },

    findOwned(userId: number, configId: number, distanceId: number): Distance | undefined {
      const r = db
        .prepare(`
          SELECT d.* FROM distances d
          JOIN sight_configs sc ON sc.id = d.sight_config_id
          WHERE d.id = ? AND d.sight_config_id = ? AND sc.user_id = ?
        `)
        .get(distanceId, configId, userId) as DistanceRow | undefined;
      return r ? toDistance(r) : undefined;
    },

    create(configId: number, data: DistanceInsert): Distance {
      const ts = now();
      const r = db
        .prepare(`
          INSERT INTO distances
            (sight_config_id, arrow_setup_id, scale_value, distance_m, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
        `)
        .get(
          configId,
          data.arrowSetupId,
          data.scaleValue,
          data.distanceM,
          data.notes,
          ts,
          ts,
        ) as DistanceRow;
      return toDistance(r);
    },

    update(configId: number, distanceId: number, patch: Partial<DistanceInsert>): Distance {
      const current = db
        .prepare('SELECT * FROM distances WHERE id = ? AND sight_config_id = ?')
        .get(distanceId, configId) as DistanceRow;
      const next: DistanceInsert = {
        arrowSetupId: patch.arrowSetupId ?? current.arrow_setup_id,
        scaleValue: patch.scaleValue ?? current.scale_value,
        distanceM: patch.distanceM ?? current.distance_m,
        notes: patch.notes !== undefined ? patch.notes : current.notes,
      };
      const r = db
        .prepare(`
          UPDATE distances
          SET arrow_setup_id = ?, scale_value = ?, distance_m = ?, notes = ?, updated_at = ?
          WHERE id = ? AND sight_config_id = ? RETURNING *
        `)
        .get(
          next.arrowSetupId,
          next.scaleValue,
          next.distanceM,
          next.notes,
          now(),
          distanceId,
          configId,
        ) as DistanceRow;
      return toDistance(r);
    },

    remove(configId: number, distanceId: number): boolean {
      return (
        db
          .prepare('DELETE FROM distances WHERE id = ? AND sight_config_id = ?')
          .run(distanceId, configId).changes > 0
      );
    },
  };
}

export type DistanceRepo = ReturnType<typeof createDistanceRepo>;
