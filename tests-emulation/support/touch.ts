import type { CDPSession, Page } from '@playwright/test';
import { gameToCanvasPoint } from '../../tests/support/canvas';

/**
 * Real touch-input helpers for the Chromium iPad-emulation suite ONLY.
 *
 * The rest of the repo substitutes `page.mouse` clicks for touch (see
 * tests/support/canvas.ts `clickGame`), which does NOT exercise the pointer
 * type the on-screen joystick and ACTION button actually receive on a tablet.
 * These helpers drive genuine touch events so a "touch works" claim is real:
 *
 *  - `tapGame` uses Playwright's high-level Touchscreen API (single tap only).
 *  - `touchDragGame` / multi-touch sequences use raw CDP
 *    `Input.dispatchTouchEvent`, because the high-level API cannot express a
 *    press-move-release drag or two simultaneous touch points.
 *
 * All coordinates are game-logical (0..GAME_WIDTH, 0..GAME_HEIGHT) and mapped
 * to CSS px on the real letterboxed canvas via `gameToCanvasPoint`, the same
 * mapping the mouse helpers use — so a touch lands exactly where a click would.
 *
 * Requires the emulation context (`hasTouch: true`); a plain desktop context
 * rejects `page.touchscreen.tap` and dispatches no-op touch events.
 */

/** Single genuine touch tap at a game-logical point (Playwright Touchscreen API). */
export async function tapGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const point = await gameToCanvasPoint(page, gameX, gameY);
  await page.touchscreen.tap(point.x, point.y);
}

type TouchPoint = { x: number; y: number };

/**
 * One raw CDP touch event. `type` is touchStart | touchMove | touchEnd |
 * touchCancel; `points` are the CSS-px touch points currently on screen
 * (empty for touchEnd of the last finger). Each point carries a stable id so
 * the browser can track multi-touch fingers across move/end.
 */
async function dispatchTouch(
  client: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
  points: { id: number; point: TouchPoint }[]
): Promise<void> {
  await client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p) => ({ x: p.point.x, y: p.point.y, id: p.id }))
  });
}

/**
 * A genuine single-finger touch drag: touchStart at `from`, a series of
 * touchMove steps to `to`, then touchEnd. Returns after release. Used to drive
 * the dynamic joystick through its real pointer path (engage in the bounded
 * lower-left zone, drag to produce a movement vector, release to stop).
 *
 * `steps` interpolated moves make the drag read as a real finger sweep rather
 * than a teleport, which matters because the joystick reads pointer position
 * every move to compute its analog vector.
 */
export async function touchDragGame(
  page: Page,
  client: CDPSession,
  from: { gameX: number; gameY: number },
  to: { gameX: number; gameY: number },
  options: { steps?: number; id?: number; release?: boolean } = {}
): Promise<void> {
  const steps = options.steps ?? 8;
  const id = options.id ?? 0;
  const start = await gameToCanvasPoint(page, from.gameX, from.gameY);
  const end = await gameToCanvasPoint(page, to.gameX, to.gameY);

  await dispatchTouch(client, 'touchStart', [{ id, point: start }]);
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    await dispatchTouch(client, 'touchMove', [
      { id, point: { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t } }
    ]);
  }
  if (options.release !== false) {
    await dispatchTouch(client, 'touchEnd', [{ id, point: end }]);
  }
}

/**
 * Holds a first finger down at `hold` (game coords) and, while it stays down,
 * taps a second finger at `tap` (game coords). Proves ACTION can be triggered
 * by a second touch while the movement touch is still active — the real
 * "walk and act at once" tablet gesture. The first finger is released at the
 * end. Returns the CSS-px point the first finger is holding so the caller can
 * assert on movement state before this resolves if needed.
 */
export async function holdAndTapGame(
  page: Page,
  client: CDPSession,
  hold: { gameX: number; gameY: number },
  tap: { gameX: number; gameY: number },
  options: { holdSteps?: number } = {}
): Promise<void> {
  const holdSteps = options.holdSteps ?? 6;
  const holdStart = await gameToCanvasPoint(page, hold.gameX, hold.gameY);
  // Drag the holding finger a little so the joystick registers movement, then
  // keep it planted at its final offset (no touchEnd for id 0).
  const holdEnd = await gameToCanvasPoint(page, hold.gameX + 6, hold.gameY + 40);
  const tapPoint = await gameToCanvasPoint(page, tap.gameX, tap.gameY);

  await dispatchTouch(client, 'touchStart', [{ id: 0, point: holdStart }]);
  for (let step = 1; step <= holdSteps; step += 1) {
    const t = step / holdSteps;
    await dispatchTouch(client, 'touchMove', [
      { id: 0, point: { x: holdStart.x + (holdEnd.x - holdStart.x) * t, y: holdStart.y + (holdEnd.y - holdStart.y) * t } }
    ]);
  }

  // Second finger down while finger 0 stays planted (touchStart carries the
  // full active set, including finger 0 at its current position).
  await dispatchTouch(client, 'touchStart', [
    { id: 0, point: holdEnd },
    { id: 1, point: tapPoint }
  ]);
  // Lift finger 1. CDP touchEnd's touchPoints are the points that REMAIN
  // active after the event, so finger 0 (still down) is listed and finger 1
  // is omitted.
  await dispatchTouch(client, 'touchEnd', [{ id: 0, point: holdEnd }]);
  // Lift finger 0 (nothing remains).
  await dispatchTouch(client, 'touchEnd', []);
}
