import { existsSync, unlinkSync } from 'node:fs';
import { env } from '../env';
import { createDb } from './connection';

/** Borra la DB de desarrollo y recrea el esquema vacío. */
function reset(): void {
  if (env.DATABASE_PATH === ':memory:') return;
  for (const suffix of ['', '-wal', '-shm']) {
    const file = env.DATABASE_PATH + suffix;
    if (existsSync(file)) unlinkSync(file);
  }
  const db = createDb();
  db.close();
  console.log(`🗑️  DB reiniciada en ${env.DATABASE_PATH}`);
}

reset();
