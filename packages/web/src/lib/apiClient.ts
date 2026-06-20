import type { ApiError, ErrorCode } from '@bv/shared';

const BASE = '/api';

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode | 'NETWORK',
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] as string) : undefined;
}

/** Garantiza que exista el token CSRF (lo pide si falta la cookie). */
async function ensureCsrf(): Promise<void> {
  if (getCookie('bv_csrf')) return;
  await fetch(`${BASE}/auth/csrf`, { credentials: 'include' });
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isMutation = method !== 'GET';
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';

  if (isMutation) {
    await ensureCsrf();
    const token = getCookie('bv_csrf');
    if (token) headers['x-csrf-token'] = token;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK', 'No se pudo conectar con el servidor.');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err = (data as ApiError | undefined)?.error;
    throw new ApiClientError(
      res.status,
      err?.code ?? 'INTERNAL',
      err?.message ?? 'Ocurrió un error.',
      err?.details,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
