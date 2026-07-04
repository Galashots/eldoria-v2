import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Explicit instead of Playwright's default `**/*.@(spec|test).?(c|m)[jt]s`
  // so the Vitest unit layer under tests/unit/**/*.test.ts is never picked
  // up here (and vice versa — see vitest.config.ts's `include`).
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 }
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
