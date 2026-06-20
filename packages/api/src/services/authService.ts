import {
  type LoginInput,
  type PublicUser,
  type RecoveryInput,
  type RegisterInput,
  type SecurityQuestion,
  normalizeAnswer,
  questionById,
} from '@bv/shared';
import type { DB } from '../db/connection';
import { env } from '../env';
import { conflict, notFound, rateLimited, unauthenticated, validationError } from '../lib/errors';
import { getDummyHash, hashPassword, verifyPassword } from '../lib/hash';
import { createSession, deleteSession, deleteUserSessions } from '../lib/session';
import { now } from '../lib/time';
import type { UserRepo } from '../repositories/userRepo';

export function createAuthService(db: DB, users: UserRepo) {
  return {
    async register({
      alias,
      password,
      securityQuestionId,
      securityAnswer,
    }: RegisterInput): Promise<{ user: PublicUser; token: string }> {
      if (!questionById(securityQuestionId)) {
        throw validationError('Elegí una pregunta de seguridad válida.', [
          { path: 'securityQuestionId', message: 'Pregunta inválida.' },
        ]);
      }
      if (users.findByAlias(alias)) {
        throw conflict('Ese alias ya está en uso.');
      }
      const [passwordHash, securityAnswerHash] = await Promise.all([
        hashPassword(password),
        hashPassword(normalizeAnswer(securityAnswer)),
      ]);
      const user = users.create({ alias, passwordHash, securityQuestionId, securityAnswerHash });
      const token = createSession(db, user.id);
      return { user, token };
    },

    async login({ alias, password }: LoginInput): Promise<{ user: PublicUser; token: string }> {
      const row = users.findByAlias(alias);

      // Bloqueo activo por intentos fallidos
      if (row?.locked_until && row.locked_until > now()) {
        throw rateLimited();
      }

      // Alias inexistente: igualar tiempo verificando contra un hash dummy
      if (!row) {
        await verifyPassword(await getDummyHash(), password);
        throw unauthenticated('Alias o contraseña incorrectos.');
      }

      const ok = await verifyPassword(row.password_hash, password);
      if (!ok) {
        const failed = row.failed_attempts + 1;
        const lockUntil =
          failed >= env.LOGIN_MAX_ATTEMPTS ? now() + env.LOGIN_LOCK_MINUTES * 60 * 1000 : null;
        users.setAttempts(row.id, failed, lockUntil);
        throw unauthenticated('Alias o contraseña incorrectos.');
      }

      // Login correcto: resetear contador
      users.setAttempts(row.id, 0, null);
      const token = createSession(db, row.id);
      return { user: { id: row.id, alias: row.alias }, token };
    },

    logout(token: string): void {
      deleteSession(db, token);
    },

    me(userId: number): PublicUser | undefined {
      return users.findPublicById(userId);
    },

    /** ¿Está libre el alias? (para feedback en el registro). */
    aliasAvailable(alias: string): boolean {
      return !users.findByAlias(alias);
    },

    /** Paso 1 de recuperación: la pregunta de seguridad del alias. */
    recoveryQuestion(alias: string): SecurityQuestion {
      const row = users.findByAlias(alias);
      if (!row) throw notFound('No encontramos una cuenta con ese alias.');
      const question = questionById(row.security_question_id);
      return { id: question?.id ?? 0, text: question?.text ?? '' };
    },

    /** Paso 2: responde la pregunta y define una nueva contraseña. */
    async recoveryReset({ alias, answer, newPassword }: RecoveryInput): Promise<void> {
      const row = users.findByAlias(alias);
      const ok = await verifyPassword(
        row?.security_answer_hash ?? (await getDummyHash()),
        normalizeAnswer(answer),
      );
      if (!row || !ok) {
        throw unauthenticated('La respuesta no es correcta.');
      }
      const newHash = await hashPassword(newPassword);
      users.updatePassword(row.id, newHash);
      // Invalida cualquier sesión previa por seguridad.
      deleteUserSessions(db, row.id);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
