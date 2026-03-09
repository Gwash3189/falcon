import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { createApiKeysController } from './controller.js';

const uuidParam = z.object({ keyId: z.string().uuid() });

export function createApiKeysRouter() {
  const router = new Hono();
  const ctrl = createApiKeysController();

  router.get('/', ctrl.list);
  router.post('/', ctrl.create);
  router.delete('/:keyId', zValidator('param', uuidParam), ctrl.remove);

  return router;
}
