import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './apiClient';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => {
        // No reintentar errores de auth/validación
        if (error instanceof ApiClientError && error.status < 500) return false;
        return count < 2;
      },
      staleTime: 30_000,
      // Necesario para persistir la caché (offline): que no se recolecte sola.
      gcTime: 1000 * 60 * 60 * 24 * 30,
      refetchOnWindowFocus: false,
    },
  },
});
