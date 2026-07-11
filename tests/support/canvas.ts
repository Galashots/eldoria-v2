import type { Page } from '@playwright/test';
// From gameDimensions (not gameConfig): gameConfig.ts imports 'phaser',
// which throws ("window is not defined") when loaded outside a browser —
// this file runs in Playwright's Node-side test process, not the page.
import { GAME_HEIGHT, GAME_WIDTH } from '../../src/gameDimensions';

export const CANVAS = 'canvas';

/**
 * Maps a game-logical coordinate (0..GAME_WIDTH, 0..GAME_HEIGHT) to a CSS
 * pixel click on the actual canvas element, accounting for Phaser's
 * Scale.FIT letterboxing inside the Playwright viewport.
 *
 * Derives from the real GAME_WIDTH/GAME_HEIGHT constants (not hardcoded
 * 480/320) so this helper — and every test that uses it — automatically
 * tracks the game's logical canvas resolution.
 */
export async function clickGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error('Canvas was not visible.');

  await page.mouse.click(
    box.x + (gameX / GAME_WIDTH) * box.width,
    box.y + (gameY / GAME_HEIGHT) * box.height
  );
}
