import { defineConfig, devices } from '@playwright/test';

// iPad Pro 11" profile, forced onto Chromium so CDP CPU/network throttling is
// available (WebKit can't drive it). Defined inline here rather than imported
// from tests-emulation/support so the config never transitively imports a
// module that the spec files also import — Playwright forbids that. The spec
// helpers re-declare the same profile in support/emulation.ts for their own
// use; keep the two in sync. This is emulation, not physical iPad Safari.
const IPAD_PRO_11 = {
  viewport: { width: 1194, height: 834 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  defaultBrowserType: 'chromium' as const
};

/**
 * Separate Playwright config for the offline-PWA and iPad-emulation suites.
 *
 * These run against the PRODUCTION build served by `vite preview` (not the dev
 * server the default suite uses) because the service worker only registers in
 * production and the emulation harness should measure the shipped bundle. It's
 * a distinct config — not extra projects bolted onto playwright.config.ts — so
 * it can never slow the default `npm run smoke` suite: that suite never builds
 * or starts a preview server, and this one is only invoked by `test:emulation`.
 */
export default defineConfig({
  testDir: './tests-emulation',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  // Perf numbers must not contend for CPU with a parallel worker.
  workers: 1,
  timeout: 150_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'pwa-offline',
      testMatch: /offline-pwa\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'ipad-emulation',
      testMatch: /ipad-emulation\.spec\.ts$/,
      use: { ...IPAD_PRO_11 }
    }
  ],
  webServer: {
    // Build the production bundle (which emits dist/sw.js) then serve it. The
    // preview server pins 127.0.0.1:4173 so the service worker gets a stable,
    // secure (localhost) origin.
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
