import type { ErrorCode } from '@bv/shared';

export interface ErrorDetail {
  path: string;
  message: string;
}

/** Error de dominio con status HTTP + código de la API. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (msg = 'No encontrado.') => new AppError(404, 'NOT_FOUND', msg);
export const conflict = (msg: string) => new AppError(409, 'CONFLICT', msg);
export const unauthenticated = (msg = 'Iniciá sesión para continuar.') =>
  new AppError(401, 'UNAUTHENTICATED', msg);
export const validationError = (msg: string, details?: ErrorDetail[]) =>
  new AppError(400, 'VALIDATION_ERROR', msg, details);
export const csrfInvalid = () => new AppError(403, 'CSRF_INVALID', 'Token CSRF inválido.');
export const rateLimited = (msg = 'Demasiados intentos. Probá de nuevo en unos minutos.') =>
  new AppError(429, 'RATE_LIMITED', msg);
