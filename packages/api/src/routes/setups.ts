import { setupCreateSchema, setupUpdateSchema } from '@bv/shared';
import { Hono } from 'hono';
import { requireCsrf } from '../middleware/auth';
import { parseBody, parseId } from '../middleware/validate';
import type { SetupService } from '../services/setupService';
import type { AppEnv } from '../types';

/** Router reutilizado para /bow-setups y /arrow-setups. */
export function setupRoutes(service: SetupService) {
  const r = new Hono<AppEnv>();

  r.get('/', (c) => c.json(service.list(c.get('userId'))));

  r.post('/', requireCsrf, async (c) => {
    const data = await parseBody(c, setupCreateSchema);
    return c.json(service.create(c.get('userId'), data), 201);
  });

  r.get('/:id', (c) => {
    const id = parseId(c.req.param('id'));
    return c.json(service.get(c.get('userId'), id));
  });

  r.patch('/:id', requireCsrf, async (c) => {
    const id = parseId(c.req.param('id'));
    const patch = await parseBody(c, setupUpdateSchema);
    return c.json(service.update(c.get('userId'), id, patch));
  });

  r.delete('/:id', requireCsrf, (c) => {
    const id = parseId(c.req.param('id'));
    service.remove(c.get('userId'), id);
    return c.body(null, 204);
  });

  return r;
}
