import type { Context } from 'hono';
import { type ZodTypeAny, z } from 'zod';
import { validationError } from '../lib/errors';

/** Parsea y valida el body JSON con un schema Zod; arma 400 uniforme. */
export async function parseBody<T extends ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw validationError('El cuerpo debe ser JSON válido.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw validationError('Revisá los campos marcados.', details);
  }
  return result.data;
}

/** Valida un id de path (entero positivo). */
export function parseId(value: string | undefined): number {
  const n = z.coerce.number().int().positive().safeParse(value);
  if (!n.success) throw validationError('Id inválido.');
  return n.data;
}
