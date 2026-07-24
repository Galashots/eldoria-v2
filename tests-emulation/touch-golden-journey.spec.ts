import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { CANVAS } from '../tests/support/canvas';
import { holdAndTapGame, tapGame, touchDragGame } from './support/touch';

// Genuine touch input on the Chromium iPad-emulation surface (hasTouch: true).
// Movement and ACTION here run through the REAL pointer/touch path, not
// page.mouse or keyboard -- see tests-emulation/support/touch.ts. This is
// emulation, not physical iPad Safari validation (docs/IPAD_EMULATION.md).

// Game-logical coordinates (0..960, 0..640).
const MAGE_PROFILE = { x: 480, y: 232 };
const RANGER_PROFILE = { x: 480, y: 368 };
// A comfortable point well inside the bounded lower-left joystick zone
// (x <= sx(130)=260, y >= 640 - sy(110)=420).
const JOYSTICK_START = { gameX: 130, gameY: 530 };
const JOYSTICK_DRAG_RIGHT = { gameX: 245, gameY: 530 };
// ACTION button center: (960 - sx(54), 640 - sy(52)) = (852, 536).
const ACTION_BUTTON = { gameX: 852, gameY: 536 };
// Practice Slime world position (matches ipad-emulation.spec.ts arrangement).
const SLIME_WORLD = { x: 1408, y: 640 };

type SlimeSnapshot = { completed: boolean; hitCount: number; inputLocked: boolean; remainingHits: number };

async function useE2EHandle(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__ELDORIA_E2E__ = true;
  });
}

async function waitForBoot(page: Page): Promise<void> {
  await expect(page.locator(CANVAS)).toBeVisible();
  // Active (input live), not merely constructed, so the profile touch tap is
  // not dropped on a scene that isn't listening for pointer input yet.
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
}

/** Start a profile via a REAL touch tap on its title-screen button. */
async function startProfileByTouch(page: Page, profile: { x: number; y: number }): Promise<void> {
  await tapGame(page, profile.x, profile.y);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function playerMotion(page: Page): Promise<{ x: number; y: number; vx: number; vy: number }> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { x: number; y: number; body: { velocity: { x: number; y: number } } };
    };
    return { x: scene.player.x, y: scene.player.y, vx: scene.player.body.velocity.x, vy: scene.player.body.velocity.y };
  });
}

/** Arrange (non-decisive): place the player on a world point deterministically. */
async function placePlayer(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(({ px, py }) => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { setPosition: (x: number, y: number) => void; setVelocity: (x: number, y: number) => void };
      updateHint: () => void;
    };
    scene.player.setPosition(px, py);
    scene.player.setVelocity(0, 0);
    scene.updateHint();
  }, { px: x, py: y });
}

async function slimeSnapshot(page: Page): Promise<SlimeSnapshot> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      getPracticeSlimeEncounterSnapshot: () => { completed: boolean; hitCount: number; inputLocked: boolean; remainingHits: number };
    };
    return scene.getPracticeSlimeEncounterSnapshot();
  });
}

async function waitForSlime(page: Page, predicate: (s: SlimeSnapshot) => boolean, message: string): Promise<void> {
  await expect
    .poll(async () => predicate(await slimeSnapshot(page)), { message, timeout: 5000 })
    .toBe(true);
}

async function runGoldenTouchJourney(page: Page, profile: { x: number; y: number }, client: CDPSession): Promise<void> {
  await startProfileByTouch(page, profile);

  // --- Movement: a real touch-start inside the bounded joystick zone, dragged
  // far enough to produce measured player movement. The finger stays down
  // (release: false) so we can observe sustained movement before lifting it. ---
  const before = await playerMotion(page);
  await touchDragGame(page, client, JOYSTICK_START, JOYSTICK_DRAG_RIGHT, { steps: 10, release: false });
  await page.waitForTimeout(260);
  const during = await playerMotion(page);
  expect(during.x, 'joystick drag should move the player right').toBeGreaterThan(before.x + 4);
  expect(during.vx, 'joystick drag should give the player a rightward velocity').toBeGreaterThan(0);

  // --- Release: lifting the finger stops movement. ---
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(220);
  const afterRelease = await playerMotion(page);
  expect(Math.hypot(afterRelease.vx, afterRelease.vy), 'releasing the joystick stops movement').toBeLessThan(1);

  // --- ACTION via a real single touch tap: arrange the player on the Practice
  // Slime (non-decisive), then prove a genuine touch tap on ACTION drives a
  // hit-state transition through the public input path. ---
  await placePlayer(page, SLIME_WORLD.x, SLIME_WORLD.y);
  expect((await slimeSnapshot(page)).hitCount, 'slime starts un-hit').toBe(0);
  await tapGame(page, ACTION_BUTTON.gameX, ACTION_BUTTON.gameY);
  await waitForSlime(page, (s) => s.hitCount >= 1, 'a real ACTION tap should land one strike');
  expect((await slimeSnapshot(page)).hitCount).toBe(1);

  // --- Second touch while the movement finger is still active: prove ACTION
  // can be triggered by a second finger during a held joystick touch. ---
  await waitForSlime(page, (s) => s.inputLocked === false, 'strike lock should clear before the multi-touch strike');
  await placePlayer(page, SLIME_WORLD.x, SLIME_WORLD.y);
  const preMulti = (await slimeSnapshot(page)).hitCount;
  await holdAndTapGame(page, client, JOYSTICK_START, ACTION_BUTTON);
  await waitForSlime(
    page,
    (s) => s.hitCount > preMulti,
    'a second-finger ACTION tap during a held joystick touch should land a strike'
  );
}

/** Restart the live WorldScene the way beginMapTransition() does, then wait
 *  for the fresh instance to be active (create()/createTouchControls() re-run). */
async function restartWorldScene(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      profileId: string;
      mapId: string;
      scene: { restart: (data: { profileId: string; mapId: string; spawnId?: string }) => void };
    };
    // Same shape beginMapTransition() passes to scene.restart(); undefined
    // spawnId resolves to the map's default spawn (resolveSpawn handles it).
    scene.scene.restart({ profileId: scene.profileId, mapId: scene.mapId });
  });
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
  // Let the restarted scene finish create() (which runs createTouchControls()).
  await page.waitForTimeout(300);
}

const pointersTotal = (page: Page): Promise<number> =>
  page.evaluate(() => window.__ELDORIA_GAME__!.input.pointersTotal);

// Regression guard for the pointer-pool leak: the second touch pointer is
// configured once, game-wide (gameConfig input.activePointers), NOT via a
// per-scene addPointer(). Because createTouchControls() re-runs on every scene
// create() and the InputManager is shared game-wide, a per-create addPointer()
// would grow pointersTotal on every map transition. Assert it stays fixed.
test('active touch-pointer count stays fixed across WorldScene restarts (no per-create addPointer leak)', async ({ page }) => {
  await useE2EHandle(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForBoot(page);
  await startProfileByTouch(page, MAGE_PROFILE);

  const initial = await pointersTotal(page);
  expect(initial, 'two active touch pointers configured for simultaneous move + ACTION').toBe(2);

  await restartWorldScene(page);
  expect(await pointersTotal(page), 'pointer count must not grow across a scene restart').toBe(initial);

  // A second restart makes any per-create growth unmistakable (old code: 2 -> 3 -> 4).
  await restartWorldScene(page);
  expect(await pointersTotal(page), 'pointer count still fixed after a second restart').toBe(initial);
});

for (const { name, profile } of [
  { name: 'Mage', profile: MAGE_PROFILE },
  { name: 'Ranger', profile: RANGER_PROFILE }
]) {
  test(`${name}: golden touch journey — joystick movement, release, ACTION, and second-touch ACTION run through real touch input`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await useE2EHandle(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForBoot(page);

    const client = await page.context().newCDPSession(page);
    await runGoldenTouchJourney(page, profile, client);

    expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
    expect(pageErrors, `page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  });
}
