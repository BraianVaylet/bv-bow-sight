import {
  distanceCreateSchema,
  distanceUpdateSchema,
  sightConfigCreateSchema,
  sightConfigUpdateSchema,
} from '@bv/shared';
import { Hono } from 'hono';
import { requireCsrf } from '../middleware/auth';
import { parseBody, parseId } from '../middleware/validate';
import type { Services } from '../services';
import type { AppEnv } from '../types';

export function sightConfigRoutes(services: Services) {
  const r = new Hono<AppEnv>();
  const { sight, distance } = services;

  // ── Miras ──
  r.get('/', (c) => c.json(sight.list(c.get('userId'))));

  r.post('/', requireCsrf, async (c) => {
    const input = await parseBody(c, sightConfigCreateSchema);
    return c.json(sight.create(c.get('userId'), input), 201);
  });

  r.get('/:id', (c) => {
    const id = parseId(c.req.param('id'));
    return c.json(sight.detail(c.get('userId'), id));
  });

  r.patch('/:id', requireCsrf, async (c) => {
    const id = parseId(c.req.param('id'));
    const patch = await parseBody(c, sightConfigUpdateSchema);
    return c.json(sight.update(c.get('userId'), id, patch));
  });

  r.delete('/:id', requireCsrf, (c) => {
    const id = parseId(c.req.param('id'));
    sight.remove(c.get('userId'), id);
    return c.body(null, 204);
  });

  // ── Distancias (anidadas) ──
  r.post('/:id/distances', requireCsrf, async (c) => {
    const configId = parseId(c.req.param('id'));
    const input = await parseBody(c, distanceCreateSchema);
    return c.json(distance.create(c.get('userId'), configId, input), 201);
  });

  r.patch('/:id/distances/:distanceId', requireCsrf, async (c) => {
    const configId = parseId(c.req.param('id'));
    const distanceId = parseId(c.req.param('distanceId'));
    const patch = await parseBody(c, distanceUpdateSchema);
    return c.json(distance.update(c.get('userId'), configId, distanceId, patch));
  });

  r.delete('/:id/distances/:distanceId', requireCsrf, (c) => {
    const configId = parseId(c.req.param('id'));
    const distanceId = parseId(c.req.param('distanceId'));
    distance.remove(c.get('userId'), configId, distanceId);
    return c.body(null, 204);
  });

  return r;
}
