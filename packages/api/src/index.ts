import { serve } from '@hono/node-server';
import { createApp } from './app';
import { getDb } from './db/connection';
import { env, isProd } from './env';
import { sweepExpiredSessions } from './lib/session';
import { mountStatic } from './static';

const db = getDb();
sweepExpiredSessions(db);

const app = createApp(db);

// En producción, esta misma app sirve la SPA buildeada.
if (isProd) {
  mountStatic(app);
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🎯 BV bow sight API escuchando en http://localhost:${info.port} (${env.NODE_ENV})`);
});
