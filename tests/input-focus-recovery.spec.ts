import { expect, test, type Page } from '@playwright/test';
import { CANVAS, gameToCanvasPoint } from './support/canvas';

// Regression coverage for a real player-reported bug: the hero could get
// stuck sliding in one direction indefinitely. Root cause: if the browser
// loses focus while a movement key is physically held down (e.g. the player
// clicks something outside the game, or alt-tabs), the keyup never reaches
// the page, so Phaser's key state stays "down" forever.
//
// Verified empirically (before WorldScene's fix existed) rather than assumed:
// - Phaser's own VisibilityHandler already resets registered Key objects on
//   window `blur`, so a plain keyboard-then-blur repro already passed even
//   without any change here.
// - `document.visibilitychange` firing WITHOUT a `blur` event (which browsers
//   do not guarantee co-fire on every OS/window-manager combination) left the
//   player stuck at nonzero velocity indefinitely pre-fix — reproduced
//   directly (velocity stayed at -250) before WorldScene started also
//   listening for `visibilitychange`. This is the most likely match for a
//   keyboard-only repro.
// - WorldScene's custom joystick state (touchMove/joystickPointer) is
//   entirely unknown to Phaser and was never reset by any of its built-in
//   mechanisms — reproduced directly (velocity stuck at -177 after a
//   mid-drag `blur` with no pointerup) before this fix existed.

async function enterFarm(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('eldoria_v2_opening_seen_grade5-adventurer', 'true');
  });
  await page.reload();

  await expect(page.locator(CANVAS)).toBeVisible();
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('TitleScene'));
  const point = await gameToCanvasPoint(page, 480, 380);
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => window.__ELDORIA_GAME__?.scene.isActive('WorldScene'));
}

async function velocityX(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      player: { body: { velocity: { x: number } } };
    };
    return scene.player.body.velocity.x;
  });
}

test('a movement key stuck "down" by a lost focus event resets on window blur', async ({ page }) => {
  await enterFarm(page);

  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => velocityX(page)).toBeLessThan(0);

  // Simulate the browser never delivering a keyup (focus moved elsewhere)
  // by firing window blur directly, without ever calling keyboard.up().
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));

  await expect.poll(() => velocityX(page)).toBe(0);
  // Confirm it stays reset rather than being transiently zero for one frame.
  await page.waitForTimeout(100);
  expect(await velocityX(page)).toBe(0);

  await page.keyboard.up('ArrowLeft');
});

test('a movement key stuck "down" resets on visibilitychange even without a blur event', async ({ page }) => {
  await enterFarm(page);

  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => velocityX(page)).toBeLessThan(0);

  // No 'blur' event at all here — only visibilitychange, which Phaser's own
  // KeyboardPlugin does not listen for (it only resets keys on window blur).
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await expect.poll(() => velocityX(page)).toBe(0);
  await page.waitForTimeout(100);
  expect(await velocityX(page)).toBe(0);

  await page.keyboard.up('ArrowLeft');
});

test('a joystick drag stuck mid-gesture by a lost focus event resets on window blur', async ({ page }) => {
  await enterFarm(page);

  const origin = await gameToCanvasPoint(page, 100, 500);
  const dragged = await gameToCanvasPoint(page, 40, 500);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(dragged.x, dragged.y);

  await expect.poll(() => velocityX(page)).toBeLessThan(0);

  // Simulate losing the pointerup (e.g. the mouse button is released
  // outside the browser window) by firing window blur without mouse.up().
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));

  await expect.poll(() => velocityX(page)).toBe(0);
  await page.waitForTimeout(100);
  expect(await velocityX(page)).toBe(0);

  const joystickVisible = await page.evaluate(() => {
    const scene = window.__ELDORIA_GAME__?.scene.getScene('WorldScene') as unknown as {
      joystickBase?: { visible: boolean };
    };
    return scene.joystickBase?.visible;
  });
  expect(joystickVisible).toBe(false);

  await page.mouse.up();
});
