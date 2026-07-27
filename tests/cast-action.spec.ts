import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from './support/canvas';
import { CAST_RANGE } from '../src/systems/castTargeting';

// ACTION used to do nothing at all unless the hero was standing within ~84 world
// px of an interactable: it played the cast animation in silence. These tests
// cover the ranged cast that replaced that dead press, and — more importantly —
// guard the walk-up path that was restructured to make room for it.

/** Farm world coordinates (Tiled x2). */
const SLIME = { x: 1408, y: 640 };
const MIRA = { x: 832, y: 512 };
/** nearestTarget()'s walk-up range, sx(42). */
const WALK_UP_RANGE = 84;

const PROFILES = [
  { label: 'Mage', profileId: 'grade2-mage', clickAt: [480, 232] as const },
  { label: 'Ranger Explorer', profileId: 'grade5-adventurer', clickAt: [480, 368] as const }
];

async function boot(page: Page, profileId: string, clickAt: readonly [number, number]): Promise<void> {
  await page.goto('/');
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem(`eldoria_v2_opening_seen_${id}`, 'true');
  }, profileId);
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  await clickGame(page, clickAt[0], clickAt[1]);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  await page.waitForTimeout(900);
}

async function placeAndFace(page: Page, x: number, y: number, key: string): Promise<void> {
  await page.evaluate(([nx, ny]) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
    };
    scene.player.setPosition(nx, ny);
    scene.player.setVelocity(0, 0);
  }, [x, y]);
  // A brief real key press sets the hero's facing the way play does.
  await page.keyboard.down(key);
  await page.waitForTimeout(120);
  await page.keyboard.up(key);
  await page.waitForTimeout(160);
}

async function slimeHits(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      getPracticeSlimeEncounterSnapshot?: () => { hitCount: number };
    };
    return scene.getPracticeSlimeEncounterSnapshot?.().hitCount ?? -1;
  });
}

async function dialogueOpen(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      dialogueBox?: { isOpen: () => boolean };
    };
    return scene.dialogueBox?.isOpen() ?? false;
  });
}

/**
 * Mira's on-screen objective line. The right probe for "Mira responded": on a
 * fresh save her handler advances the farm quest and retitles the objective, it
 * does not open a DialogueBox — so asserting on dialogue would pass for the
 * wrong reason (or fail for one, as an earlier version of this test did).
 */
async function objectiveText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      objectiveText: { text: string };
    };
    return scene.objectiveText.text;
  });
}

for (const profile of PROFILES) {
  test(`${profile.label}: a cast hits the Practice Slime from beyond walk-up range`, async ({ page }) => {
    await boot(page, profile.profileId, profile.clickAt);

    // Comfortably outside nearestTarget()'s reach, inside the cast corridor.
    const standoff = 150;
    expect(standoff).toBeGreaterThan(WALK_UP_RANGE);
    expect(standoff).toBeLessThan(CAST_RANGE);
    await placeAndFace(page, SLIME.x - standoff, SLIME.y - 32, 'ArrowRight');

    expect(await slimeHits(page)).toBe(0);
    await page.keyboard.press('Space');
    await expect.poll(() => slimeHits(page), { timeout: 10000 }).toBe(1);
  });

  test(`${profile.label}: a cast into empty ground changes nothing and raises nothing`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await boot(page, profile.profileId, profile.clickAt);

    // Facing away from the slime, with nothing castable ahead.
    await placeAndFace(page, SLIME.x - 400, SLIME.y - 32, 'ArrowLeft');
    await page.keyboard.press('Space');
    await page.waitForTimeout(700);

    expect(await slimeHits(page)).toBe(0);
    expect(await dialogueOpen(page)).toBe(false);
    expect(errors).toEqual([]);
  });

  test(`${profile.label}: a cast does not reach Mira, who must still be walked up to`, async ({ page }) => {
    await boot(page, profile.profileId, profile.clickAt);

    const before = await objectiveText(page);

    // Inside cast range of Mira, outside walk-up range.
    await placeAndFace(page, MIRA.x - 150, MIRA.y - 32, 'ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(700);
    expect(
      await objectiveText(page),
      'a cast advanced Mira from range — the objective is to walk to her'
    ).toBe(before);
    expect(await dialogueOpen(page)).toBe(false);

    // And walking up to her still works, which is the path this change had to
    // leave alone.
    await placeAndFace(page, MIRA.x - 40, MIRA.y - 32, 'ArrowRight');
    await page.keyboard.press('Space');
    await expect.poll(() => objectiveText(page), { timeout: 10000 }).not.toBe(before);
  });
}
