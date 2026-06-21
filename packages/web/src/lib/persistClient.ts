import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

/**
 * Persiste la caché de TanStack Query en localStorage para que los datos del
 * usuario (miras, marcas, setups) estén disponibles al instante en un arranque
 * en frío sin conexión. El `buster` invalida la caché vieja al publicar versiones.
 */
export const PERSIST_BUSTER = 'v1';

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'bv-query-cache',
});
