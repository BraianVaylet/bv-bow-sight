import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../env';
import { SCHEMA_SQL } from './schema';

export type DB = Database.Database;

/** Crea una conexión SQLite con los PRAGMAs requeridos y aplica el esquema. */
export function createDb(path: string = env.DATABASE_PATH): DB {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA_SQL);
  return db;
}

let singleton: DB | null = null;

/** Conexión compartida del proceso. */
export function getDb(): DB {
  if (!singleton) singleton = createDb();
  return singleton;
}
