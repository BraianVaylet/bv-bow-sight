import { z } from 'zod';
import type { ErrorCode } from '../constants';

/** Param de id en URL (entero positivo). */
export const idParamSchema = z.coerce.number().int().positive();

/** Forma uniforme de error de la API (ver docs/03-api-spec.md §1). */
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: { path: string; message: string }[];
  };
}
