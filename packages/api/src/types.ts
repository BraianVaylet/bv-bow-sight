import type { DB } from './db/connection';

/** Variables que viven en el contexto de Hono. */
export type Variables = {
  userId: number;
  db: DB;
};

/** Entorno tipado de Hono usado en toda la app (middlewares + routers). */
export type AppEnv = { Variables: Variables };
