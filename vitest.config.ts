import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Restricted so this never collides with the Playwright specs in
    // tests/*.spec.ts (see playwright.config.ts's `testMatch`).
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: false
  }
});
