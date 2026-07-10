import { expect, test, type Page } from '@playwright/test';

/**
 * Baseline visual evidence for docs/beautification/BEAUTIFICATION_BASELINE_2026-07.md.
 *
 * These screenshots are not regression assertions (see the other specs for
 * that); they exist so the pre-migration look is captured once, on an
 * unmodified build, for later before/after comparison. Coordinates below are
 * expressed in the *current* 480x320 game-canvas space and will need
 * updating alongside the other specs' clickGame helpers once the canvas
 * resolution migration lands.
 */

const CANVAS = 'canvas';

async function clickGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error('Canvas was not visible.');

  await page.mouse.click(
    box.x + (gameX / 480) * box.width,
    box.y + (gameY / 320) * box.height
  );
}

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
  // Skip the one-time Waking Gate (already captured by opening-scene.spec.ts)
  // so this spec can focus on the farm/HUD/prompt screens.
  await page.goto('/');
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${id}`, 'true');
  }, profileId);
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__ELDORIA_GAME__?.scene.getScene('TitleScene')));
  await clickGame(page, 240, profileId === 'grade2-mage' ? 116 : 184);
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

test('baseline: title screen', async ({ page }) => {
  await freshBoot(page);
  await page.screenshot({ path: 'test-results/baseline-title.png', fullPage: true });
});

test('baseline: Ranger farm arrival', async ({ page }) => {
  await enterFarmDirectly(page, 'grade5-adventurer');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/baseline-ranger-farm-arrival.png', fullPage: true });
});

test('baseline: Mage farm arrival', async ({ page }) => {
  await enterFarmDirectly(page, 'grade2-mage');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/baseline-mage-farm-arrival.png', fullPage: true });
});

test('baseline: Mira interaction area', async ({ page }) => {
  await enterFarmDirectly(page, 'grade5-adventurer');
  await setPlayerPosition(page, 416, 256);
  await page.screenshot({ path: 'test-results/baseline-mira-interaction.png', fullPage: true });
});

test('baseline: crop-bonus optional-learning prompt', async ({ page }) => {
  await enterFarmDirectly(page, 'grade5-adventurer');
  await setPlayerPosition(page, 240, 416);
  await clickGame(page, 426, 268);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/baseline-crop-bonus-prompt.png', fullPage: true });
});

test('baseline: Stats & Mastery panel', async ({ page }) => {
  await enterFarmDirectly(page, 'grade5-adventurer');
  await holdKey(page, 'KeyI', 100);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/baseline-stats-panel.png', fullPage: true });
});
