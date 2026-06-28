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

  // Archivos estáticos (js, css, imágenes, etc.) con Cache-Control explícito
  // para que el CDN de Railway cachee lo correcto sin romper despliegues.
  app.use(
    '/*',
    serveStatic({
      root: WEB_DIST,
      onFound: (path, c) => {
        if (path.includes('/assets/')) {
          // Vite hashea estos nombres → contenido inmutable, cache larga.
          c.header('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (
          path.endsWith('sw.js') ||
          path.endsWith('index.html') ||
          path.endsWith('manifest.webmanifest')
        ) {
          // Service worker / shell / manifest: siempre revalidar para que un
          // deploy nuevo se vea sin servir versiones viejas cacheadas en el borde.
          c.header('Cache-Control', 'no-cache');
        } else {
          // Iconos, favicon, fuentes locales: cache moderada.
          c.header('Cache-Control', 'public, max-age=86400');
        }
      },
    }),
  );

  // Fallback SPA: cualquier ruta no-API devuelve index.html (nunca cachear
  // en el borde, así apunta siempre a los assets hasheados del último build).
  app.get('*', async (c) => {
    const html = await readFile(join(WEB_DIST, 'index.html'), 'utf-8');
    c.header('Cache-Control', 'no-cache');
    return c.html(html);
  });
}
