import { z } from 'zod';
import { LIMITS } from '../constants';

const scale = z
  .number({ invalid_type_error: 'Ingresá un número.' })
  .finite('Ingresá un número válido.')
  .min(LIMITS.scale.min, `El valor mínimo es ${LIMITS.scale.min}.`)
  .max(LIMITS.scale.max, `El valor máximo es ${LIMITS.scale.max}.`);

const optionalId = z.number().int().positive().nullable().optional();

export const sightConfigCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio.').max(60, 'Máximo 60 caracteres.'),
    bowSetupId: optionalId,
    defaultArrowSetupId: optionalId,
    scaleMin: scale,
    scaleMax: scale,
  })
  .refine((d) => d.scaleMax > d.scaleMin, {
    message: 'La escala máxima debe ser mayor que la mínima.',
    path: ['scaleMax'],
  });

export const sightConfigUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  bowSetupId: optionalId,
  defaultArrowSetupId: optionalId,
  scaleMin: scale.optional(),
  scaleMax: scale.optional(),
});

export type SightConfigCreateInput = z.infer<typeof sightConfigCreateSchema>;
export type SightConfigUpdateInput = z.infer<typeof sightConfigUpdateSchema>;
