import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { cookieSecure } from '../env';
import { randomToken, safeEqual } from './tokens';

export const CSRF_COOKIE = 'bv_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Emite un token CSRF en cookie (no httpOnly) y lo devuelve para el header. */
export function issueCsrfToken(c: Context): string {
  const token = randomToken(24);
  setCookie(c, CSRF_COOKIE, token, {
    httpOnly: false, // el front lo lee para mandarlo en el header
    secure: cookieSecure,
    sameSite: 'Strict',
    path: '/',
  });
  return token;
}

/** Valida double-submit: header === cookie (en tiempo constante). */
export function isCsrfValid(c: Context): boolean {
  const cookie = getCookie(c, CSRF_COOKIE);
  const header = c.req.header(CSRF_HEADER);
  if (!cookie || !header) return false;
  return safeEqual(cookie, header);
}
