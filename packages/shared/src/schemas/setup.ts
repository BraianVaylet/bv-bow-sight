import { z } from 'zod';
import { LIMITS } from '../constants';

/** Schemas compartidos por setups de arco y de flechas (misma forma). */
export const setupCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(LIMITS.setupName.min, 'El nombre es obligatorio.')
    .max(LIMITS.setupName.max, `Máximo ${LIMITS.setupName.max} caracteres.`),
  notes: z
    .string()
    .trim()
    .min(LIMITS.setupNotes.min, 'Las observaciones son obligatorias.')
    .max(LIMITS.setupNotes.max, `Máximo ${LIMITS.setupNotes.max} caracteres.`),
});

export const setupUpdateSchema = setupCreateSchema.partial();

export type SetupCreateInput = z.infer<typeof setupCreateSchema>;
export type SetupUpdateInput = z.infer<typeof setupUpdateSchema>;
