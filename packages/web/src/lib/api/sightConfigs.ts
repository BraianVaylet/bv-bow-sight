import type {
  SightConfigCreateInput,
  SightConfigDetail,
  SightConfigListItem,
  SightConfigUpdateInput,
} from '@bv/shared';
import { api } from '../apiClient';

export const sightApi = {
  list: () => api.get<SightConfigListItem[]>('/sight-configs'),
  detail: (id: number) => api.get<SightConfigDetail>(`/sight-configs/${id}`),
  create: (body: SightConfigCreateInput) => api.post<SightConfigDetail>('/sight-configs', body),
  update: (id: number, body: SightConfigUpdateInput) =>
    api.patch<SightConfigDetail>(`/sight-configs/${id}`, body),
  remove: (id: number) => api.delete<void>(`/sight-configs/${id}`),
};
