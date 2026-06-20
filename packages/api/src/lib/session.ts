import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { DB } from '../db/connection';
import { cookieSecure, env } from '../env';
import { now } from './time';
import { randomToken, sha256 } from './tokens';

export const SESSION_COOKIE = 'bv_session';

const TTL_MS = () => env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Crea una sesión, guarda el HASH del token y devuelve el token en claro. */
export function createSession(db: DB, userId: number): string {
  const token = randomToken();
  const tokenHash = sha256(token);
  const ts = now();
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(tokenHash, userId, ts + TTL_MS(), ts);
  return token;
}

/** Resuelve el userId a partir del token de la cookie. Limpia si está expirada. */
export function getUserIdByToken(db: DB, token: string): number | null {
  const tokenHash = sha256(token);
  const row = db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
    .get(tokenHash) as { user_id: number; expires_at: number } | undefined;
  if (!row) return null;
  if (row.expires_at < now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  return row.user_id;
}

export function deleteSession(db: DB, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

/** Cierra todas las sesiones de un usuario (p. ej. tras recuperar la contraseña). */
export function deleteUserSessions(db: DB, userId: number): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/** Borra sesiones expiradas (housekeeping). */
export function sweepExpiredSessions(db: DB): void {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'Strict',
    path: '/',
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}
