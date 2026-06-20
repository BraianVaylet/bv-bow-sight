import type { PublicUser } from '@bv/shared';
import type { DB } from '../db/connection';
import { now } from '../lib/time';

export interface UserRow {
  id: number;
  alias: string;
  password_hash: string;
  security_question_id: number;
  security_answer_hash: string;
  failed_attempts: number;
  locked_until: number | null;
}

export interface CreateUserInput {
  alias: string;
  passwordHash: string;
  securityQuestionId: number;
  securityAnswerHash: string;
}

export function createUserRepo(db: DB) {
  const findByAlias = db.prepare<[string], UserRow>('SELECT * FROM users WHERE alias = ?');
  const insert = db.prepare(
    `INSERT INTO users (alias, password_hash, security_question_id, security_answer_hash, created_at)
     VALUES (?, ?, ?, ?, ?) RETURNING id, alias`,
  );
  const setAttempts = db.prepare(
    'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
  );
  const updatePassword = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  const findPublicById = db.prepare<[number], PublicUser>(
    'SELECT id, alias FROM users WHERE id = ?',
  );

  return {
    findByAlias(alias: string): UserRow | undefined {
      return findByAlias.get(alias);
    },
    findPublicById(id: number): PublicUser | undefined {
      return findPublicById.get(id);
    },
    create(input: CreateUserInput): PublicUser {
      return insert.get(
        input.alias,
        input.passwordHash,
        input.securityQuestionId,
        input.securityAnswerHash,
        now(),
      ) as PublicUser;
    },
    setAttempts(id: number, failedAttempts: number, lockedUntil: number | null): void {
      setAttempts.run(failedAttempts, lockedUntil, id);
    },
    updatePassword(id: number, passwordHash: string): void {
      updatePassword.run(passwordHash, id);
    },
  };
}

export type UserRepo = ReturnType<typeof createUserRepo>;
