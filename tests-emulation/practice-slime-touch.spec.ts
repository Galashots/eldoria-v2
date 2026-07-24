import { expect, test, type Page } from '@playwright/test';
import { CANVAS, clickGame } from '../tests/support/canvas';
import { tapGame } from './support/touch';

// Practice Slime input-reliability investigation on the iPad-emulation surface.
//
// The audit (docs/playtests/PLAYTHROUGH_UI_AUDIT_2026-07-23.md) reported that
// "repeated focused Space input... animated the scene but did not visibly
// advance the three-hit state." This spec reproduces the encounter across the
// three ordinary player input paths the brief names -- keyboard Space, the
// on-screen ACTION control (real touch tap), and (implicitly) the same touch
// path used for movement -- and inspects the ACTUAL hit-state transitions
// (getPracticeSlimeEncounterSnapshot), not animation, to establish whether a
// deterministic ordinary-player input is lost.
//
// Finding (see the encounter's own contract in
// tests/practice-slime-encounter.spec.ts): the single-slot buffered-strike is
// INTENTIONAL anti-mash / anti-hold-to-win design. Deliberately spaced strikes
// (>= the hit lock) always land all three hits and complete; only rapid input
// beyond one buffered slot during a single lock window is intentionally
// dropped. That dropped-mash case is the documented design, not a defect, so
// combat is left unchanged and these tests assert the intended behavior across
// every real input path.

const MAGE_PROFILE_Y = 232;
const RANGER_PROFILE_Y = 368;
const ACTION_BUTTON = { gameX: 852, gameY: 536 };
const SLIME_WORLD = { x: 1408, y: 640 };

type SlimeSnapshot = { completed: boolean; hitCount: number; inputLocked: boolean; remainingHits: number };

async function bootToSlime(page: Page, profileY: number, profileInput: 'touch' | 'mouse' = 'touch'): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(CANVAS)).toBeVisible();
  // Wait for TitleScene to be ACTIVE (input live), not merely constructed, so
  // the profile tap/click is not dropped on a scene that isn't listening yet.
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  // Profile selection is non-decisive arrangement. The keyboard-path test
  // selects via a mouse click so the canvas gains keyboard focus (a touch tap
  // does not), which is exactly the input path that test then exercises.
  if (profileInput === 'mouse') {
    await clickGame(page, 480, profileY);
  } else {
    await tapGame(page, 480, profileY);
  }
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  await seatOnSlime(page);
}

async function seatOnSlime(page: Page): Promise<void> {
  await page.evaluate(({ x, y }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      setFirstQuestStep: (step: 'find-slime') => void;
      updateHint: () => void;
    };
    scene.setFirstQuestStep('find-slime');
    scene.player.setPosition(x, y);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, SLIME_WORLD);
  await page.waitForTimeout(120);
}

async function snapshot(page: Page): Promise<SlimeSnapshot> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      getPracticeSlimeEncounterSnapshot: () => { completed: boolean; hitCount: number; inputLocked: boolean; remainingHits: number };
    };
    return scene.getPracticeSlimeEncounterSnapshot();
  });
}

async function waitUnlocked(page: Page): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).inputLocked, { timeout: 4000 }).toBe(false);
}

test('Practice Slime: three deliberately spaced ACTION touches land all three hits and complete (real touch path)', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await bootToSlime(page, MAGE_PROFILE_Y);

  expect(await snapshot(page)).toMatchObject({ hitCount: 0, completed: false, remainingHits: 3 });

  for (let hit = 1; hit <= 3; hit += 1) {
    await tapGame(page, ACTION_BUTTON.gameX, ACTION_BUTTON.gameY);
    await expect.poll(async () => (await snapshot(page)).hitCount, {
      message: `spaced touch strike ${hit} should advance the hit count`,
      timeout: 4000
    }).toBe(hit);
    if (hit < 3) {
      await waitUnlocked(page);
      // Re-seat: a strike can nudge the slime; keep the player in range so the
      // next deliberate tap is a real in-range interaction, not a miss.
      await seatOnSlime(page);
    }
  }

  await expect.poll(async () => (await snapshot(page)).completed, { timeout: 4000 }).toBe(true);
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

test('Practice Slime: three deliberately spaced Space presses land all three hits (keyboard path)', async ({ page }) => {
  await bootToSlime(page, RANGER_PROFILE_Y, 'mouse');
  expect(await snapshot(page)).toMatchObject({ hitCount: 0, completed: false });

  for (let hit = 1; hit <= 3; hit += 1) {
    // Explicit down + gap + up: a bare press() can deliver the down/up inside
    // one frame and leave Phaser's key in a state where the next JustDown edge
    // is missed. A held gap guarantees the scene's update loop observes a clean
    // down edge, then a clean release before the next deliberate press.
    await page.keyboard.down('Space');
    await page.waitForTimeout(60);
    await page.keyboard.up('Space');
    await expect.poll(async () => (await snapshot(page)).hitCount, {
      message: `spaced Space strike ${hit} should advance the hit count`,
      timeout: 4000
    }).toBe(hit);
    if (hit < 3) {
      await waitUnlocked(page);
      await seatOnSlime(page);
    }
  }
  await expect.poll(async () => (await snapshot(page)).completed, { timeout: 4000 }).toBe(true);
});

test('Practice Slime: rapid mash is intentionally debounced (one buffered strike, rest dropped) — anti-hold-to-win, not a defect', async ({ page }) => {
  await bootToSlime(page, MAGE_PROFILE_Y);

  // Fire three ACTION taps as fast as the harness allows, inside the first
  // strike's lock window. Read the hit-state directly: exactly one strike
  // starts (hit 1) and one is buffered; the third is rejected. This is the
  // documented anti-mash contract, identical to the mouse-path coverage in
  // tests/practice-slime-encounter.spec.ts, now confirmed on the touch path.
  await tapGame(page, ACTION_BUTTON.gameX, ACTION_BUTTON.gameY);
  await tapGame(page, ACTION_BUTTON.gameX, ACTION_BUTTON.gameY);
  await tapGame(page, ACTION_BUTTON.gameX, ACTION_BUTTON.gameY);

  // Immediately after the burst, at most one hit has registered and the
  // encounter is locked (the buffered strike runs on lock release).
  const mid = await snapshot(page);
  expect(mid.hitCount).toBeGreaterThanOrEqual(1);
  expect(mid.hitCount).toBeLessThanOrEqual(2);
  expect(mid.completed).toBe(false);

  // The buffered strike lands after the lock, reaching hit 2 -- the mash did
  // NOT auto-complete the three-hit encounter (no hold-to-win), and did not
  // lose the encounter into an un-advanceable state.
  await expect.poll(async () => (await snapshot(page)).hitCount, { timeout: 4000 }).toBe(2);
  await waitUnlocked(page);

  // A final deliberate, spaced tap completes it — the encounter remains fully
  // advanceable by ordinary input after a mash.
  await seatOnSlime(page);
  await tapGame(page, ACTION_BUTTON.gameX, ACTION_BUTTON.gameY);
  await expect.poll(async () => (await snapshot(page)).completed, { timeout: 4000 }).toBe(true);
});
