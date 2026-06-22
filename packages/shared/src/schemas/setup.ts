import { z } from 'zod';
import { LIMITS } from '../constants';

/** Schemas compartidos por setups de arco y de flechas (misma forma). */
export const setupCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(LIMITS.setupName.min, 'El nombre es obligatorio.')
    .max(LIMITS.setupName.max, `Máximo ${LIMITS.setupName.max} caracteres.`),
  // Observaciones opcionales: se admite vacío (la columna es NOT NULL → '').
  notes: z
    .string()
    .trim()
    .max(LIMITS.setupNotes.max, `Máximo ${LIMITS.setupNotes.max} caracteres.`)
    .default(''),
});

export const setupUpdateSchema = setupCreateSchema.partial();

export type SetupCreateInput = z.infer<typeof setupCreateSchema>;
export type SetupUpdateInput = z.infer<typeof setupUpdateSchema>;
