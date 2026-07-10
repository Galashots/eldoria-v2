import { expect, test, type Page } from '@playwright/test';

const CANVAS = 'canvas';

async function clickGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error('Canvas was not visible.');

  await page.mouse.click(
    box.x + (gameX / 480) * box.width,
    box.y + (gameY / 320) * box.height
  );
}

test('a fresh Mage profile gets a skippable playable magic hook before the farm', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));

  await clickGame(page, 240, 116);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('OpeningScene'));

  const openingState = async (): Promise<{ completed: boolean; profileId: string; remainingHits: number }> => (
    page.evaluate(() => {
      const scene = window.__ELDORIA_GAME__?.scene.getScene('OpeningScene') as unknown as {
        completed: boolean;
        profileId: string;
        remainingHits: number;
      };
      return {
        completed: scene.completed,
        profileId: scene.profileId,
        remainingHits: scene.remainingHits
      };
    })
  );

  await expect.poll(async () => openingState()).toEqual({
    completed: false,
    profileId: 'grade2-mage',
    remainingHits: 3
  });
  await page.screenshot({ path: 'test-results/opening-mage-start.png', fullPage: true });

  // Use the same large ACTION target the child sees; tapping the gate and
  // pressing Space/E route through the identical scene method.
  for (const expectedRemaining of [2, 1, 0]) {
    await clickGame(page, 426, 272);
    await expect.poll(async () => (await openingState()).remainingHits).toBe(expectedRemaining);
    await page.waitForTimeout(420);
    if (expectedRemaining === 2) {
      await page.screenshot({ path: 'test-results/opening-mage-first-hit.png', fullPage: true });
    }
  }

  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  expect(await page.evaluate(() => localStorage.getItem('eldoria_v2_opening_seen_grade2-mage'))).toBe('true');
  await page.screenshot({ path: 'test-results/opening-mage-world-entry.png', fullPage: true });

  // The opening is a one-time first-run beat and never blocks returning players.
  await page.reload();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 240, 116);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  expect(await page.evaluate(() => window.__ELDORIA_GAME__?.scene.isActive('OpeningScene'))).toBe(false);
});
