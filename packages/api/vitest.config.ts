import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
      SESSION_SECRET: 'test-secret-0123456789abcdef',
      AUTH_RATE_LIMIT_MAX: '100000',
      RATE_LIMIT_MAX: '100000',
      LOG_LEVEL: 'error',
    },
  },
});
