import type { MiddlewareHandler } from 'hono';
import { isProd } from '../env';
import type { AppEnv } from '../types';

/** Cabeceras de seguridad en todas las respuestas (ver docs/07-security.md §7). */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Frame-Options', 'DENY');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join('; '),
  );
  if (isProd) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  c.res.headers.delete('X-Powered-By');
  await next();
};

/**
 * Evita que el CDN (Railway Edge) cachee respuestas de la API.
 * Los datos son por-usuario (cookie de sesión): cachearlos en el borde
 * filtraría datos entre usuarios. `no-store` + `Vary: Cookie` lo previenen.
 */
export const apiCacheControl: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store, private');
  c.header('Vary', 'Cookie');
};

/** Límite de tamaño de body (anti-payloads abusivos). */
export function bodyLimit(maxBytes = 16 * 1024): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const len = c.req.header('content-length');
    if (len && Number(len) > maxBytes) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Cuerpo demasiado grande.' } },
        413,
      );
    }
    await next();
  };
}
