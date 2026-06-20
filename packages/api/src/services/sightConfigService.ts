import type { SightConfigCreateInput, SightConfigDetail, SightConfigUpdateInput } from '@bv/shared';
import { conflict, notFound, validationError } from '../lib/errors';
import type { DistanceRepo } from '../repositories/distanceRepo';
import type { SetupRepo } from '../repositories/setupRepo';
import type { SightConfigOwned, SightConfigRepo } from '../repositories/sightConfigRepo';

interface Deps {
  repo: SightConfigRepo;
  bowRepo: SetupRepo;
  arrowRepo: SetupRepo;
  distanceRepo: DistanceRepo;
}

export function createSightConfigService({ repo, bowRepo, arrowRepo, distanceRepo }: Deps) {
  function assertRefsOwned(userId: number, bowId?: number | null, arrowId?: number | null): void {
    if (bowId != null && !bowRepo.findOwned(userId, bowId)) {
      throw validationError('El setup de arco seleccionado no existe.', [
        { path: 'bowSetupId', message: 'No encontrado.' },
      ]);
    }
    if (arrowId != null && !arrowRepo.findOwned(userId, arrowId)) {
      throw validationError('El set de flechas por defecto no existe.', [
        { path: 'defaultArrowSetupId', message: 'No encontrado.' },
      ]);
    }
  }

  function detailFrom(userId: number, config: SightConfigOwned): SightConfigDetail {
    return {
      id: config.id,
      name: config.name,
      bowSetupId: config.bowSetupId,
      bowSetupName: repo.bowSetupName(userId, config.bowSetupId),
      defaultArrowSetupId: config.defaultArrowSetupId,
      scaleMin: config.scaleMin,
      scaleMax: config.scaleMax,
      arrowSets: repo.arrowSetsWithDistances(config.id),
      distances: distanceRepo.listByConfig(config.id),
    };
  }

  return {
    list: (userId: number) => repo.list(userId),

    detail(userId: number, id: number): SightConfigDetail {
      const config = repo.findOwned(userId, id);
      if (!config) throw notFound('La mira no existe.');
      return detailFrom(userId, config);
    },

    create(userId: number, input: SightConfigCreateInput): SightConfigDetail {
      assertRefsOwned(userId, input.bowSetupId, input.defaultArrowSetupId);
      const config = repo.create(userId, {
        name: input.name,
        bowSetupId: input.bowSetupId ?? null,
        defaultArrowSetupId: input.defaultArrowSetupId ?? null,
        scaleMin: input.scaleMin,
        scaleMax: input.scaleMax,
      });
      return detailFrom(userId, config);
    },

    update(userId: number, id: number, patch: SightConfigUpdateInput): SightConfigDetail {
      const current = repo.findOwned(userId, id);
      if (!current) throw notFound('La mira no existe.');
      assertRefsOwned(
        userId,
        patch.bowSetupId ?? undefined,
        patch.defaultArrowSetupId ?? undefined,
      );

      const nextMin = patch.scaleMin ?? current.scaleMin;
      const nextMax = patch.scaleMax ?? current.scaleMax;
      if (nextMax <= nextMin) {
        throw validationError('La escala máxima debe ser mayor que la mínima.', [
          { path: 'scaleMax', message: 'Debe ser mayor que la mínima.' },
        ]);
      }
      // Si el nuevo rango dejaría distancias afuera, bloquear.
      if (patch.scaleMin !== undefined || patch.scaleMax !== undefined) {
        const outside = repo.countOutsideRange(id, nextMin, nextMax);
        if (outside > 0) {
          throw conflict(
            `Hay ${outside} distancia(s) fuera del nuevo rango. Ajustalas o eliminalas antes de cambiar la escala.`,
          );
        }
      }

      const updated = repo.update(userId, id, patch);
      if (!updated) throw notFound('La mira no existe.');
      return detailFrom(userId, updated);
    },

    remove(userId: number, id: number): void {
      if (!repo.findOwned(userId, id)) throw notFound('La mira no existe.');
      repo.remove(userId, id);
    },
  };
}

export type SightConfigService = ReturnType<typeof createSightConfigService>;
