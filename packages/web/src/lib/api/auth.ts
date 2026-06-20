import type {
  LoginInput,
  PublicUser,
  RecoveryInput,
  RegisterInput,
  SecurityQuestion,
} from '@bv/shared';
import { api } from '../apiClient';

export const authApi = {
  register: (body: RegisterInput) => api.post<{ user: PublicUser }>('/auth/register', body),
  login: (body: LoginInput) => api.post<{ user: PublicUser }>('/auth/login', body),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<{ user: PublicUser }>('/auth/me'),
  questions: () => api.get<{ questions: SecurityQuestion[] }>('/auth/questions'),
  aliasAvailable: (alias: string) =>
    api.get<{ available: boolean; valid: boolean }>(
      `/auth/alias-available?alias=${encodeURIComponent(alias)}`,
    ),
  recoveryQuestion: (alias: string) =>
    api.get<{ question: SecurityQuestion }>(`/auth/recovery/${encodeURIComponent(alias)}`),
  recoveryReset: (body: RecoveryInput) => api.post<{ ok: true }>('/auth/recovery', body),
};
