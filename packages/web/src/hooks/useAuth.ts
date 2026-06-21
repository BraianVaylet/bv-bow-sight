import type { LoginInput, PublicUser, RegisterInput } from '@bv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api/auth';
import { ApiClientError } from '../lib/apiClient';
import { clearEnteredThisSession } from '../lib/preferences';

const ME_KEY = ['me'];

/** Sesión actual. `null` cuando no hay sesión (401). */
export function useMe() {
  return useQuery<PublicUser | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        const { user } = await authApi.me();
        return user;
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginInput) => authApi.login(body),
    onSuccess: ({ user }) => qc.setQueryData(ME_KEY, user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterInput) => authApi.register(body),
    onSuccess: ({ user }) => qc.setQueryData(ME_KEY, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearEnteredThisSession();
      qc.setQueryData(ME_KEY, null);
      qc.clear();
    },
  });
}
