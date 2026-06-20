import { describe, expect, it } from 'vitest';
import { makeApp, registerAndLogin, req } from './helpers';

async function json(res: Response) {
  return res.json() as Promise<any>;
}

describe('setups CRUD', () => {
  it('crea, lista, obtiene, edita y elimina un setup de arco', async () => {
    const app = makeApp();
    const jar = await registerAndLogin(app);

    const created = await json(
      await req(app, 'POST', '/api/bow-setups', { jar, body: { name: 'Evo NXT', notes: '60lbs' } }),
    );
    expect(created.id).toBeGreaterThan(0);

    const list = await json(await req(app, 'GET', '/api/bow-setups', { jar }));
    expect(list).toHaveLength(1);

    const patched = await json(
      await req(app, 'PATCH', `/api/bow-setups/${created.id}`, {
        jar,
        body: { name: 'Evo NXT 35' },
      }),
    );
    expect(patched.name).toBe('Evo NXT 35');
    expect(patched.notes).toBe('60lbs');

    const del = await req(app, 'DELETE', `/api/bow-setups/${created.id}`, { jar });
    expect(del.status).toBe(204);
    expect(await json(await req(app, 'GET', '/api/bow-setups', { jar }))).toHaveLength(0);
  });

  it('no permite borrar un set de flechas con distancias (409)', async () => {
    const app = makeApp();
    const jar = await registerAndLogin(app);
    const arrow = await json(
      await req(app, 'POST', '/api/arrow-setups', { jar, body: { name: 'VAP', notes: 'sp400' } }),
    );
    const sight = await json(
      await req(app, 'POST', '/api/sight-configs', {
        jar,
        body: { name: 'Mira', defaultArrowSetupId: arrow.id, scaleMin: 0, scaleMax: 6 },
      }),
    );
    await req(app, 'POST', `/api/sight-configs/${sight.id}/distances`, {
      jar,
      body: { arrowSetupId: arrow.id, scaleValue: 2.0, distanceM: 30 },
    });

    const del = await req(app, 'DELETE', `/api/arrow-setups/${arrow.id}`, { jar });
    expect(del.status).toBe(409);
  });
});

describe('sight configs + distances', () => {
  it('compone el detalle con botonera de 2 sets y valida rango', async () => {
    const app = makeApp();
    const jar = await registerAndLogin(app);

    const bow = await json(
      await req(app, 'POST', '/api/bow-setups', { jar, body: { name: 'Evo', notes: 'x' } }),
    );
    const vap = await json(
      await req(app, 'POST', '/api/arrow-setups', { jar, body: { name: 'VAP', notes: 'x' } }),
    );
    const hunter = await json(
      await req(app, 'POST', '/api/arrow-setups', { jar, body: { name: 'Hunter', notes: 'x' } }),
    );
    const sight = await json(
      await req(app, 'POST', '/api/sight-configs', {
        jar,
        body: {
          name: 'Ultraview',
          bowSetupId: bow.id,
          defaultArrowSetupId: vap.id,
          scaleMin: 0,
          scaleMax: 6,
        },
      }),
    );
    expect(sight.bowSetupName).toBe('Evo');

    await req(app, 'POST', `/api/sight-configs/${sight.id}/distances`, {
      jar,
      body: { arrowSetupId: vap.id, scaleValue: 1.2, distanceM: 18 },
    });
    await req(app, 'POST', `/api/sight-configs/${sight.id}/distances`, {
      jar,
      body: { arrowSetupId: hunter.id, scaleValue: 2.9, distanceM: 30 },
    });

    const detail = await json(await req(app, 'GET', `/api/sight-configs/${sight.id}`, { jar }));
    expect(detail.distances).toHaveLength(2);
    expect(detail.arrowSets).toHaveLength(2); // botonera con 2 sets

    // fuera de rango -> 400
    const bad = await req(app, 'POST', `/api/sight-configs/${sight.id}/distances`, {
      jar,
      body: { arrowSetupId: vap.id, scaleValue: 99, distanceM: 70 },
    });
    expect(bad.status).toBe(400);

    // cambiar el rango dejando distancias afuera -> 409
    const shrink = await req(app, 'PATCH', `/api/sight-configs/${sight.id}`, {
      jar,
      body: { scaleMax: 2 },
    });
    expect(shrink.status).toBe(409);
  });
});

describe('ownership (anti-IDOR → 404)', () => {
  it('un usuario no puede ver la mira de otro', async () => {
    const app = makeApp();
    const jarA = await registerAndLogin(app, 'alice', 'password123');
    const jarB = await registerAndLogin(app, 'bob', 'password123');

    const sightA = await json(
      await req(app, 'POST', '/api/sight-configs', {
        jar: jarA,
        body: { name: 'A', scaleMin: 0, scaleMax: 5 },
      }),
    );

    const asB = await req(app, 'GET', `/api/sight-configs/${sightA.id}`, { jar: jarB });
    expect(asB.status).toBe(404);

    const delB = await req(app, 'DELETE', `/api/sight-configs/${sightA.id}`, { jar: jarB });
    expect(delB.status).toBe(404);
  });
});
