import type { MiddlewareHandler } from 'hono';
import type { DB } from '../db/connection';
import { isCsrfValid } from '../lib/csrf';
import { csrfInvalid, unauthenticated } from '../lib/errors';
import { getSessionToken, getUserIdByToken } from '../lib/session';
import type { AppEnv } from '../types';

/** Exige sesión válida; expone userId en el contexto. */
export function requireAuth(db: DB): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = getSessionToken(c);
    if (!token) throw unauthenticated();
    const userId = getUserIdByToken(db, token);
    if (!userId) throw unauthenticated();
    c.set('userId', userId);
    await next();
  };
}

/** Exige token CSRF válido en mutaciones (double-submit). */
export const requireCsrf: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!isCsrfValid(c)) throw csrfInvalid();
  await next();
};
