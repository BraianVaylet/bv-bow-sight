import { z } from 'zod';
import { LIMITS } from '../constants';

const scale = z.number().finite().min(LIMITS.scale.min).max(LIMITS.scale.max);

const optionalId = z.number().int().positive().nullable().optional();

export const sightConfigCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio.').max(60),
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
