import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, api } from './apiClient';

function makeRes(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

const fetchMock = vi.fn();
const setCsrf = (v: string) => {
  document.cookie = `bv_csrf=${v}`;
};
const clearCsrf = () => {
  document.cookie = 'bv_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  clearCsrf();
});

describe('apiClient', () => {
  it('GET parsea JSON y no envía x-csrf-token', async () => {
    setCsrf('tok');
    fetchMock.mockResolvedValueOnce(makeRes(200, { hello: 'world' }));

    const data = await api.get<{ hello: string }>('/x');
    expect(data).toEqual({ hello: 'world' });

    const [url, init] = (fetchMock.mock.calls[0] ?? []) as [string, any];
    expect(url).toBe('/api/x');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
    expect(init.headers['x-csrf-token']).toBeUndefined();
  });

  it('las mutaciones adjuntan el token CSRF desde la cookie', async () => {
    setCsrf('tok-123');
    fetchMock.mockResolvedValueOnce(makeRes(200, { ok: true }));

    await api.post('/y', { a: 1 });

    const [url, init] = (fetchMock.mock.calls.at(-1) ?? []) as [string, any];
    expect(url).toBe('/api/y');
    expect(init.method).toBe('POST');
    expect(init.headers['x-csrf-token']).toBe('tok-123');
    expect(init.headers['content-type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('si falta la cookie CSRF, primero pide /auth/csrf', async () => {
    clearCsrf();
    fetchMock
      .mockResolvedValueOnce(makeRes(200)) // GET /auth/csrf
      .mockResolvedValueOnce(makeRes(201, { id: 1 })); // POST real

    await api.post('/z', {});
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/csrf');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/z');
  });

  it('204 devuelve undefined', async () => {
    setCsrf('tok');
    fetchMock.mockResolvedValueOnce(makeRes(204));
    const res = await api.delete('/d');
    expect(res).toBeUndefined();
  });

  it('mapea errores de la API a ApiClientError (code/status/details)', async () => {
    setCsrf('tok');
    fetchMock.mockResolvedValueOnce(
      makeRes(409, {
        error: {
          code: 'CONFLICT',
          message: 'Duplicado',
          details: [{ path: 'alias', message: 'x' }],
        },
      }),
    );

    await expect(api.post('/r', {})).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 409,
      code: 'CONFLICT',
    });
  });

  it('convierte fallas de red en ApiClientError NETWORK', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    const err = (await api.get('/x').catch((e) => e)) as ApiClientError;
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.code).toBe('NETWORK');
  });
});
