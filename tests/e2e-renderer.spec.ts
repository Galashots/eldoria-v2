import { expect, test } from '@playwright/test';
import { CANVAS } from './support/canvas';

/**
 * Playwright sets __ELDORIA_E2E__ before the app bundle executes. Keep this
 * contract pinned so the reload-heavy suite cannot silently fall back to
 * Phaser.AUTO/WebGL and reintroduce Chromium context-loss flakes.
 */
test('E2E boot uses Phaser Canvas renderer', async ({ page }) => {
  const webglContextWarnings: string[] = [];

  page.on('console', (message) => {
    if (message.text().includes('WebGL Context lost')) {
      webglContextWarnings.push(message.text());
    }
  });

  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;
  });
  await page.goto('/');
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.renderer));

  const rendererType = await page.evaluate(() => window.__ELDORIA_GAME__?.renderer.type);

  // Phaser.CANVAS is renderer type 1. Importing Phaser into the browser-side
  // callback would bundle test-only code, so pin the public numeric contract.
  expect(rendererType).toBe(1);
  expect(webglContextWarnings).toEqual([]);
});
