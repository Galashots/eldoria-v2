import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

/**
 * Visual evidence inherited from the pre-migration beautification baseline.
 *
 * These screenshots are not pixel-regression assertions; they keep the same
 * named review states available after the 960x640 migration so CI artifacts
 * provide a direct before/after comparison. Coordinates use the current game
 * space and the shared canvas helper rather than legacy hardcoded divisors.
 */

async function holdKey(page: Page, key: string, ms = 100): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function freshBoot(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
}

async function enterFarmDirectly(page: Page, profileId: 'grade2-mage' | 'grade5-adventurer'): Promise<void> {
  // Skip the one-time Waking Gate (captured by opening-scene.spec.ts) so this
  // evidence spec can focus on farm, HUD, prompt, and Stats presentation.
  await page.goto('/');
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${id}`, 'true');
  }, profileId);
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
  await clickGame(page, 480, profileId === 'grade2-mage' ? 232 : 368);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function setPlayerPosition(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([nextX, nextY]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
    };
    scene.player.setPosition(nextX, nextY);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, [x, y]);
  await page.waitForTimeout(150);
}

test('baseline comparison: title screen', async ({ page }) => {
  await freshBoot(page);
  await page.screenshot({ path: 'test-results/baseline-title.png', fullPage: true });
});

test('baseline comparison: Ranger farm arrival', async ({ page }) => {
  await enterFarmDirectly(page, 'grade5-adventurer');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/baseline-ranger-farm-arrival.png', fullPage: true });
});

test('baseline comparison: Mage farm arrival', async ({ page }) => {
  await enterFarmDirectly(page, 'grade2-mage');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/baseline-mage-farm-arrival.png', fullPage: true });
});

test('baseline comparison: Mira interaction area', async ({ page }) => {
  await enterFarmDirectly(page, 'grade5-adventurer');
  await setPlayerPosition(page, 832, 512);
  await page.screenshot({ path: 'test-results/baseline-mira-interaction.png', fullPage: true });
});

test('baseline comparison: crop-bonus optional-learning prompt', async ({ page }) => {
  await enterFarmDirectly(page, 'grade5-adventurer');
  await setPlayerPosition(page, 480, 832);
  await clickGame(page, 852, 536);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/baseline-crop-bonus-prompt.png', fullPage: true });
});

test('baseline comparison: Stats & Mastery panel', async ({ page }) => {
  await enterFarmDirectly(page, 'grade5-adventurer');
  await holdKey(page, 'KeyI', 100);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/baseline-stats-panel.png', fullPage: true });
});
