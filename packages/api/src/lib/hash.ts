import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

const OPTS = { algorithm: 2 /* argon2id */ } as const;

/** Hash de contraseña con argon2id. */
export function hashPassword(password: string): Promise<string> {
  return argonHash(password, OPTS);
}

/** Verifica una contraseña contra su hash. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(hash, password, OPTS);
  } catch {
    return false;
  }
}

/** Hash dummy para igualar el tiempo de respuesta cuando el alias no existe. */
let dummy: string | null = null;
export async function getDummyHash(): Promise<string> {
  if (!dummy) dummy = await hashPassword('timing-attack-mitigation-dummy');
  return dummy;
}
