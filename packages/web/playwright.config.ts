import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 5173;
const API_PORT = 3000;

/**
 * E2E contra el modo dev (Vite + API con proxy), donde las cookies no son Secure
 * y funcionan sobre http. Playwright levanta ambos servidores.
 *
 * Requiere navegadores instalados una vez: `pnpm exec playwright install chromium`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    ...devices['Pixel 5'], // viewport mobile
  },
  webServer: [
    {
      command: 'pnpm --filter @bv/api dev',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        DATABASE_PATH: './data/e2e.db',
        SESSION_SECRET: 'e2e-secret-0123456789abcdef',
        PORT: String(API_PORT),
      },
    },
    {
      command: 'pnpm --filter @bv/web dev',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
