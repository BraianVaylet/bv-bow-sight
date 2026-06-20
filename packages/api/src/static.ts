import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';
import type { AppEnv } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Carpeta del build del frontend (packages/web/dist). */
const WEB_DIST = resolve(__dirname, '../../web/dist');

/**
 * Sirve la SPA en producción: assets estáticos + fallback a index.html
 * para que el routing del cliente funcione en recargas / deep links.
 */
export function mountStatic(app: Hono<AppEnv>): void {
  if (!existsSync(WEB_DIST)) {
    console.warn(`⚠️  No existe ${WEB_DIST}. Corré "pnpm build" para generar el frontend.`);
    return;
  }

  // Archivos estáticos (js, css, imágenes, etc.)
  app.use('/*', serveStatic({ root: WEB_DIST }));

  // Fallback SPA: cualquier ruta no-API devuelve index.html
  app.get('*', async (c) => {
    const html = await readFile(join(WEB_DIST, 'index.html'), 'utf-8');
    return c.html(html);
  });
}
