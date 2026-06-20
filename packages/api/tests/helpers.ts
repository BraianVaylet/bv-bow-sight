import { createApp } from '../src/app';
import { createDb } from '../src/db/connection';

export type Jar = Map<string, string>;

/** App fresca con DB en memoria por test. */
export function makeApp() {
  const db = createDb(':memory:');
  return createApp(db);
}

export function newJar(): Jar {
  return new Map();
}

function absorb(res: Response, jar: Jar): void {
  for (const sc of res.headers.getSetCookie()) {
    const pair = sc.split(';')[0] ?? '';
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    if (value === '') jar.delete(key);
    else jar.set(key, value);
  }
}

function cookieHeader(jar: Jar): string {
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
}

type App = ReturnType<typeof makeApp>;

interface ReqOpts {
  jar?: Jar;
  body?: unknown;
  csrf?: boolean; // default true para mutaciones
}

/** Request contra la app gestionando cookies + CSRF automáticamente. */
export async function req(
  app: App,
  method: string,
  path: string,
  opts: ReqOpts = {},
): Promise<Response> {
  const jar = opts.jar;
  const headers: Record<string, string> = {};
  const isMutation = method !== 'GET';

  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (jar) headers.cookie = cookieHeader(jar);
  if (jar && isMutation && opts.csrf !== false) {
    const token = jar.get('bv_csrf');
    if (token) headers['x-csrf-token'] = token;
  }

  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  const res = await app.request(path, init);
  if (jar) absorb(res, jar);
  return res;
}

/** Body de registro válido (alias + password + pregunta de seguridad). */
export function registerBody(alias: string, password = 'password123') {
  return { alias, password, securityQuestionId: 1, securityAnswer: 'mi respuesta' };
}

/** Registra un usuario y devuelve un jar con sesión + CSRF listos. */
export async function registerAndLogin(
  app: App,
  alias = 'tester',
  password = 'password123',
): Promise<Jar> {
  const jar = newJar();
  const res = await req(app, 'POST', '/api/auth/register', {
    jar,
    body: registerBody(alias, password),
  });
  if (res.status !== 201) throw new Error(`register falló: ${res.status}`);
  return jar;
}
