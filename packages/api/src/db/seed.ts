import { createServices } from '../services';
import { getDb } from './connection';

/** Datos de desarrollo. Idempotente: recrea el usuario demo desde cero. */
async function seed(): Promise<void> {
  const db = getDb();
  const services = createServices(db);

  // Limpiar usuario demo previo (cascade borra todo lo suyo)
  db.prepare('DELETE FROM users WHERE alias = ?').run('brai');

  const { user } = await services.auth.register({
    alias: 'brai',
    password: 'archery123',
    securityQuestionId: 3,
    securityAnswer: 'Firulais',
  });
  const uid = user.id;

  const bow = services.bow.create(uid, {
    name: 'PSE Evo NXT 35',
    notes: 'Ultraview slide monopin · UV Button trigger · 60 lbs · draw 28"',
  });

  const vap = services.arrow.create(uid, {
    name: 'VAP V1 400',
    notes: 'Victory VAP V1 · Spine 400 · 28" · punta 100gr',
  });
  const hunter = services.arrow.create(uid, {
    name: 'Gold Tip Hunter 400',
    notes: 'Gold Tip Hunter · Spine 400 · 28" · nock fluo',
  });

  const sight = services.sight.create(uid, {
    name: 'Ultraview / Evo NXT',
    bowSetupId: bow.id,
    defaultArrowSetupId: vap.id,
    scaleMin: 0,
    scaleMax: 6,
  });

  const dist = (arrowSetupId: number, scaleValue: number, distanceM: number, notes?: string) =>
    services.distance.create(uid, sight.id, { arrowSetupId, scaleValue, distanceM, notes });

  // VAP V1 (set por defecto)
  dist(vap.id, 1.2, 18, 'Indoor');
  dist(vap.id, 2.6, 30);
  dist(vap.id, 3.5, 40);
  dist(vap.id, 4.4, 50, 'Viento leve');

  // Gold Tip Hunter (segundo set → activa la botonera)
  dist(hunter.id, 1.4, 18);
  dist(hunter.id, 2.9, 30);
  dist(hunter.id, 4.8, 50);

  console.log('🌱 Seed listo.');
  console.log('   Usuario:  brai');
  console.log('   Password: archery123  (solo desarrollo)');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed falló:', err);
    process.exit(1);
  });
