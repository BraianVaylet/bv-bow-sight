import type { MiddlewareHandler } from 'hono';
import { rateLimited } from '../lib/errors';
import { now } from '../lib/time';
import type { AppEnv } from '../types';

interface Bucket {
  count: number;
  resetAt: number;
}

/** Rate limiter en memoria (ventana fija por IP). Suficiente para una instancia. */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  prefix?: string;
}): MiddlewareHandler<AppEnv> {
  const buckets = new Map<string, Bucket>();
  const prefix = opts.prefix ?? 'g';

  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'local';
    const key = `${prefix}:${ip}`;
    const ts = now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < ts) {
      buckets.set(key, { count: 1, resetAt: ts + opts.windowMs });
    } else {
      bucket.count++;
      if (bucket.count > opts.max) {
        const retry = Math.ceil((bucket.resetAt - ts) / 1000);
        c.header('Retry-After', String(Math.max(retry, 1)));
        throw rateLimited();
      }
    }
    await next();
  };
}
