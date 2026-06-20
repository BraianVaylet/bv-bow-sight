import type { Distance, DistanceCreateInput, DistanceUpdateInput } from '@bv/shared';
import { api } from '../apiClient';

export const distanceApi = {
  create: (configId: number, body: DistanceCreateInput) =>
    api.post<Distance>(`/sight-configs/${configId}/distances`, body),
  update: (configId: number, distanceId: number, body: DistanceUpdateInput) =>
    api.patch<Distance>(`/sight-configs/${configId}/distances/${distanceId}`, body),
  remove: (configId: number, distanceId: number) =>
    api.delete<void>(`/sight-configs/${configId}/distances/${distanceId}`),
};
