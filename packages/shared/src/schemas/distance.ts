import { z } from 'zod';
import { LIMITS } from '../constants';

const notes = z.string().trim().max(LIMITS.distanceNotes.max).nullable().optional();

export const distanceCreateSchema = z.object({
  scaleValue: z.number().finite().min(LIMITS.scale.min).max(LIMITS.scale.max),
  distanceM: z
    .number()
    .finite()
    .gt(LIMITS.distanceM.min, 'La distancia debe ser mayor a 0.')
    .max(LIMITS.distanceM.max),
  arrowSetupId: z.number().int().positive(),
  notes,
});

export const distanceUpdateSchema = distanceCreateSchema.partial();

export type DistanceCreateInput = z.infer<typeof distanceCreateSchema>;
export type DistanceUpdateInput = z.infer<typeof distanceUpdateSchema>;
