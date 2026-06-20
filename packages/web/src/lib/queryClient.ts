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
      refetchOnWindowFocus: false,
    },
  },
});
