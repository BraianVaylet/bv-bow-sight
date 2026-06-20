import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/', (c) =>
  c.json({ status: 'ok', uptime: Math.round(process.uptime()), ts: Date.now() }),
);
