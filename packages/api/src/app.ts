import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { DB } from './db/connection';
import { env, isProd } from './env';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { rateLimit } from './middleware/rateLimit';
import { bodyLimit, securityHeaders } from './middleware/security';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { setupRoutes } from './routes/setups';
import { sightConfigRoutes } from './routes/sightConfigs';
import { createServices } from './services';
import type { AppEnv } from './types';

/** Construye la app Hono. Recibe la DB para permitir inyección en tests. */
export function createApp(db: DB) {
  const services = createServices(db);
  const app = new Hono<AppEnv>();

  app.onError(errorHandler);

  // Seguridad global
  app.use('*', securityHeaders);
  app.use('*', bodyLimit());
  app.use('*', rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX }));

  // CORS solo en dev (en prod el front se sirve del mismo origen)
  if (!isProd) {
    app.use('/api/*', cors({ origin: env.CORS_ORIGIN, credentials: true }));
  }

  // ── API pública ──
  const api = new Hono<AppEnv>();
  api.use(
    '/auth/*',
    rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX, prefix: 'auth' }),
  );
  api.route('/auth', authRoutes(db, services));
  api.route('/health', healthRoutes);

  // ── API protegida (requiere sesión) ──
  const protectedApi = new Hono<AppEnv>();
  protectedApi.use('*', requireAuth(db));
  protectedApi.route('/bow-setups', setupRoutes(services.bow));
  protectedApi.route('/arrow-setups', setupRoutes(services.arrow));
  protectedApi.route('/sight-configs', sightConfigRoutes(services));
  api.route('/', protectedApi);

  app.route('/api', api);

  return app;
}
