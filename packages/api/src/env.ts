import { z } from 'zod';

/** Carga y valida variables de entorno. Si falta una requerida en prod, no arranca. */

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const num = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : Number(v)))
    .pipe(z.number().finite());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: num(3000),
    DATABASE_PATH: z.string().default('./data/dev.db'),
    SESSION_SECRET: z.string().default('dev-insecure-secret-change-me'),
    SESSION_TTL_DAYS: num(30),
    COOKIE_SECURE: bool(false),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    RATE_LIMIT_WINDOW_MS: num(60_000),
    RATE_LIMIT_MAX: num(120),
    AUTH_RATE_LIMIT_MAX: num(10),
    LOGIN_MAX_ATTEMPTS: num(8),
    LOGIN_LOCK_MINUTES: num(15),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (
        env.SESSION_SECRET === 'dev-insecure-secret-change-me' ||
        env.SESSION_SECRET.length < 16
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_SECRET'],
          message: 'SESSION_SECRET es obligatorio y seguro en producción.',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Configuración inválida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const cookieSecure = env.COOKIE_SECURE || isProd;
