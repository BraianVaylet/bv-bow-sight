import { ApiClientError } from './apiClient';

/**
 * Convierte cualquier error en un mensaje claro para el usuario.
 *
 * Si el server ya devolvió un mensaje específico y útil (p. ej. «Alias o
 * contraseña incorrectos.») lo respetamos. Para errores técnicos o genéricos
 * usamos un texto por código que explica qué pasó y qué puede hacer.
 */
const FALLBACK =
  'Tuvimos un problema inesperado de nuestro lado. Probá de nuevo en unos instantes.';

const CODE_FALLBACKS: Record<string, string> = {
  NETWORK: 'No pudimos conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo.',
  CSRF_INVALID: 'Tu sesión caducó por seguridad. Recargá la página e intentá de nuevo.',
  RATE_LIMITED: 'Demasiados intentos seguidos. Esperá unos minutos antes de volver a probar.',
  UNAUTHENTICATED: 'Tu sesión expiró. Iniciá sesión de nuevo para continuar.',
  NOT_FOUND: 'No encontramos lo que buscabas. Es posible que se haya eliminado.',
  CONFLICT: 'Ese dato ya existe o entra en conflicto con otro. Revisalo e intentá de nuevo.',
  VALIDATION_ERROR: 'Algunos datos no son válidos. Revisá los campos marcados e intentá de nuevo.',
  INTERNAL: FALLBACK,
};

/** Mensajes genéricos/técnicos del server que conviene reemplazar por algo más claro. */
const GENERIC_SERVER_MESSAGES = new Set([
  'Ocurrió un error.',
  'Ocurrió un error inesperado.',
  'Token CSRF inválido.',
]);

export function friendlyError(err: unknown): string {
  if (err instanceof ApiClientError) {
    // El server ya dio un mensaje específico y útil → lo usamos tal cual.
    if (err.code !== 'NETWORK' && err.message && !GENERIC_SERVER_MESSAGES.has(err.message)) {
      return err.message;
    }
    return CODE_FALLBACKS[err.code] ?? FALLBACK;
  }
  return FALLBACK;
}
