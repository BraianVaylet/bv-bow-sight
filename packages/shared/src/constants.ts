/**
 * Constantes compartidas: límites de validación y códigos de error.
 * Fuente única para cliente y servidor (ver docs/02-data-model.md §5).
 */

export const LIMITS = {
  alias: { min: 3, max: 30, pattern: /^[a-zA-Z0-9._-]+$/ },
  password: { min: 8, max: 128 },
  securityAnswer: { min: 2, max: 100 },
  setupName: { min: 1, max: 60 },
  setupNotes: { min: 1, max: 2000 },
  distanceNotes: { max: 500 },
  scale: { min: 0, max: 100 },
  distanceM: { min: 0, max: 300 }, // min es exclusivo (> 0)
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  CSRF_INVALID: 'CSRF_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Marcas del ruler: largos en px por tipo de tick. */
export const TICK_LENGTH_PX = { sm: 8, md: 14, lg: 22 } as const;

/** Umbral mínimo (px) entre marcas para seguir dibujándolas. */
export const TICK_MIN_GAP_PX = 4;
