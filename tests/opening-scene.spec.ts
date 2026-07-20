import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';

type OpeningState = {
  completed: boolean;
  heroTexture: string;
  profileId: string;
  remainingHits: number;
};

async function readOpeningState(page: Page): Promise<OpeningState> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('OpeningScene') as unknown as {
      completed: boolean;
      heroSprite?: { texture: { key: string } };
      profileId: string;
      remainingHits: number;
    };
    return {
      completed: scene.completed,
      heroTexture: scene.heroSprite?.texture.key ?? '',
      profileId: scene.profileId,
      remainingHits: scene.remainingHits
    };
  });
}

async function enterFreshOpening(page: Page, profileY: number): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, profileY);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('OpeningScene'));
}

test('a fresh Mage profile gets a polished skippable magic hook before the farm', async ({ page }) => {
  // This full boot+reload flow measures ~25.6s standalone on BOTH main and
  // this branch in the current container (pre-existing environment slowness,
  // not a game-feel regression), so it needs headroom past the 30s default.
  test.setTimeout(60_000);
  await enterFreshOpening(page, 232);

  await expect.poll(async () => readOpeningState(page)).toEqual({
    completed: false,
    heroTexture: 'grade2-mage-idle-v001',
    profileId: 'grade2-mage',
    remainingHits: 3
  });
  await page.screenshot({ path: 'test-results/opening-mage-start.png', fullPage: true });

  // Use the same large ACTION target the child sees; tapping the gate and
  // pressing Space/E route through the identical scene method.
  for (const expectedRemaining of [2, 1, 0]) {
    await clickGame(page, 852, 544);
    await expect.poll(async () => (await readOpeningState(page)).remainingHits).toBe(expectedRemaining);
    await page.waitForTimeout(440);
    if (expectedRemaining === 2) {
      await page.screenshot({ path: 'test-results/opening-mage-first-hit.png', fullPage: true });
    }
    if (expectedRemaining === 1) {
      await page.screenshot({ path: 'test-results/opening-mage-second-hit.png', fullPage: true });
    }
  }

  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  expect(await page.evaluate(() => localStorage.getItem('eldoria_v2_opening_seen_grade2-mage'))).toBe('true');
  await page.screenshot({ path: 'test-results/opening-mage-world-entry.png', fullPage: true });

  // The opening is a one-time first-run beat and never blocks returning players.
  await page.reload();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, 480, 232);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  expect(await page.evaluate(() => window.__ELDORIA_GAME__?.scene.isActive('OpeningScene'))).toBe(false);
});

test('a fresh Ranger profile uses the polished temporary hero proxy and tracking-shot palette', async ({ page }) => {
  await enterFreshOpening(page, 368);

  await expect.poll(async () => readOpeningState(page)).toEqual({
    completed: false,
    heroTexture: 'grade2-mage-idle-v001',
    profileId: 'grade5-adventurer',
    remainingHits: 3
  });
  await page.screenshot({ path: 'test-results/opening-ranger-start.png', fullPage: true });

  await clickGame(page, 852, 544);
  await expect.poll(async () => (await readOpeningState(page)).remainingHits).toBe(2);
  await page.waitForTimeout(440);
  await page.screenshot({ path: 'test-results/opening-ranger-first-hit.png', fullPage: true });
});
