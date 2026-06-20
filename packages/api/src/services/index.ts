import type { DB } from '../db/connection';
import { createDistanceRepo } from '../repositories/distanceRepo';
import { createSetupRepo } from '../repositories/setupRepo';
import { createSightConfigRepo } from '../repositories/sightConfigRepo';
import { createUserRepo } from '../repositories/userRepo';
import { createAuthService } from './authService';
import { createDistanceService } from './distanceService';
import { createSetupService } from './setupService';
import { createSightConfigService } from './sightConfigService';

/** Construye repos + services a partir de una conexión. Facilita la inyección en tests. */
export function createServices(db: DB) {
  const userRepo = createUserRepo(db);
  const bowRepo = createSetupRepo(db, 'bow_setups');
  const arrowRepo = createSetupRepo(db, 'arrow_setups');
  const sightConfigRepo = createSightConfigRepo(db);
  const distanceRepo = createDistanceRepo(db);

  return {
    auth: createAuthService(db, userRepo),
    bow: createSetupService(bowRepo, {
      notFoundMsg: 'El setup de arco no existe.',
      deleteConflictMsg: 'No se puede eliminar este setup de arco.',
    }),
    arrow: createSetupService(arrowRepo, {
      notFoundMsg: 'El set de flechas no existe.',
      deleteConflictMsg:
        'Este set de flechas tiene distancias cargadas. Eliminá o reasigná esas distancias antes.',
    }),
    sight: createSightConfigService({ repo: sightConfigRepo, bowRepo, arrowRepo, distanceRepo }),
    distance: createDistanceService({ sightRepo: sightConfigRepo, arrowRepo, distanceRepo }),
  };
}

export type Services = ReturnType<typeof createServices>;
