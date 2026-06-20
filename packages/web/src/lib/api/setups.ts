import type { Setup, SetupCreateInput, SetupUpdateInput } from '@bv/shared';
import { api } from '../apiClient';

export type SetupKind = 'bow-setups' | 'arrow-setups';

/** API de setups, parametrizada por tipo (arco / flechas). */
export function setupsApi(kind: SetupKind) {
  const base = `/${kind}`;
  return {
    list: () => api.get<Setup[]>(base),
    get: (id: number) => api.get<Setup>(`${base}/${id}`),
    create: (body: SetupCreateInput) => api.post<Setup>(base, body),
    update: (id: number, body: SetupUpdateInput) => api.patch<Setup>(`${base}/${id}`, body),
    remove: (id: number) => api.delete<void>(`${base}/${id}`),
  };
}

export const bowApi = setupsApi('bow-setups');
export const arrowApi = setupsApi('arrow-setups');
