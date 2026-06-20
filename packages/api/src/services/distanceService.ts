import type { Distance, DistanceCreateInput, DistanceUpdateInput } from '@bv/shared';
import { notFound, validationError } from '../lib/errors';
import type { DistanceRepo } from '../repositories/distanceRepo';
import type { SetupRepo } from '../repositories/setupRepo';
import type { SightConfigRepo } from '../repositories/sightConfigRepo';

interface Deps {
  sightRepo: SightConfigRepo;
  arrowRepo: SetupRepo;
  distanceRepo: DistanceRepo;
}

export function createDistanceService({ sightRepo, arrowRepo, distanceRepo }: Deps) {
  function assertArrowOwned(userId: number, arrowSetupId: number): void {
    if (!arrowRepo.findOwned(userId, arrowSetupId)) {
      throw validationError('El set de flechas seleccionado no existe.', [
        { path: 'arrowSetupId', message: 'No encontrado.' },
      ]);
    }
  }

  function assertInRange(scaleValue: number, min: number, max: number): void {
    if (scaleValue < min || scaleValue > max) {
      throw validationError(`El valor de escala debe estar entre ${min} y ${max}.`, [
        { path: 'scaleValue', message: `Entre ${min} y ${max}.` },
      ]);
    }
  }

  return {
    create(userId: number, configId: number, input: DistanceCreateInput): Distance {
      const config = sightRepo.findOwned(userId, configId);
      if (!config) throw notFound('La mira no existe.');
      assertArrowOwned(userId, input.arrowSetupId);
      assertInRange(input.scaleValue, config.scaleMin, config.scaleMax);
      return distanceRepo.create(configId, {
        arrowSetupId: input.arrowSetupId,
        scaleValue: input.scaleValue,
        distanceM: input.distanceM,
        notes: input.notes ?? null,
      });
    },

    update(
      userId: number,
      configId: number,
      distanceId: number,
      patch: DistanceUpdateInput,
    ): Distance {
      const config = sightRepo.findOwned(userId, configId);
      if (!config) throw notFound('La mira no existe.');
      const existing = distanceRepo.findOwned(userId, configId, distanceId);
      if (!existing) throw notFound('La distancia no existe.');

      if (patch.arrowSetupId !== undefined) assertArrowOwned(userId, patch.arrowSetupId);
      const nextScale = patch.scaleValue ?? existing.scaleValue;
      assertInRange(nextScale, config.scaleMin, config.scaleMax);

      return distanceRepo.update(configId, distanceId, {
        arrowSetupId: patch.arrowSetupId,
        scaleValue: patch.scaleValue,
        distanceM: patch.distanceM,
        notes: patch.notes,
      });
    },

    remove(userId: number, configId: number, distanceId: number): void {
      if (!sightRepo.findOwned(userId, configId)) throw notFound('La mira no existe.');
      if (!distanceRepo.findOwned(userId, configId, distanceId)) {
        throw notFound('La distancia no existe.');
      }
      distanceRepo.remove(configId, distanceId);
    },
  };
}

export type DistanceService = ReturnType<typeof createDistanceService>;
