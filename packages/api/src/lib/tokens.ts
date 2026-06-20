import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token aleatorio opaco (hex). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** SHA-256 (hex) — para guardar el hash del token de sesión, nunca el token en claro. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Comparación en tiempo constante de dos strings. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
