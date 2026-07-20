import Phaser from 'phaser';

/** How far a pressed button squashes (juice canon: fast, shallow, snappy). */
const PRESS_SCALE = 0.92;
const PRESS_DURATION_MS = 80;
const RELEASE_DURATION_MS = 140;

/**
 * Shared press feedback for every button-style control: pointerdown squashes
 * to ~0.92 over ~80ms; pointerup/out releases with Back.easeOut. Optionally
 * plays the `sfx-ui-tap` one-shot on activation (pointerdown) when the scene
 * has the sound cached.
 *
 * The squash tweens the button's OWN scale. Because the button geometry is
 * drawn centered on the object's local origin (see drawRoundedButton), the
 * squash pivots on the button's visual center instead of dragging the rect
 * toward the scene origin — and Phaser's hit-test, which accounts for an
 * interactive object's own transform, keeps the hit area aligned with the
 * squashed visual. (Only ANCESTOR container scale is unaccounted for — that
 * documented caveat is why the squash lives on the button object itself and
 * why callers must not rely on a scaled ancestor for hit alignment.)
 */
type PressableTarget = Phaser.GameObjects.GameObject & {
  scaleX: number;
  scaleY: number;
};

export function installButtonPressFeedback(
  scene: Phaser.Scene,
  target: PressableTarget & {
    on: (event: string, handler: () => void) => unknown;
  },
  options: { playTapSound?: boolean; alsoScale?: PressableTarget[] } = {}
): void {
  const baseScaleX = target.scaleX;
  const baseScaleY = target.scaleY;
  const extras = (options.alsoScale ?? []).map((extra) => ({
    visual: extra,
    baseScaleX: extra.scaleX,
    baseScaleY: extra.scaleY
  }));

  target.on('pointerdown', () => {
    if (options.playTapSound !== false && scene.cache.audio.exists('sfx-ui-tap')) {
      scene.sound.play('sfx-ui-tap', { volume: 0.35 });
    }
    scene.tweens.killTweensOf(target);
    scene.tweens.add({
      targets: target,
      scaleX: baseScaleX * PRESS_SCALE,
      scaleY: baseScaleY * PRESS_SCALE,
      duration: PRESS_DURATION_MS,
      ease: 'Quad.easeOut'
    });
    for (const extra of extras) {
      scene.tweens.killTweensOf(extra.visual);
      scene.tweens.add({
        targets: extra.visual,
        scaleX: extra.baseScaleX * PRESS_SCALE,
        scaleY: extra.baseScaleY * PRESS_SCALE,
        duration: PRESS_DURATION_MS,
        ease: 'Quad.easeOut'
      });
    }
  });

  const release = (): void => {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({
      targets: target,
      scaleX: baseScaleX,
      scaleY: baseScaleY,
      duration: RELEASE_DURATION_MS,
      ease: 'Back.easeOut'
    });
    for (const extra of extras) {
      scene.tweens.killTweensOf(extra.visual);
      scene.tweens.add({
        targets: extra.visual,
        scaleX: extra.baseScaleX,
        scaleY: extra.baseScaleY,
        duration: RELEASE_DURATION_MS,
        ease: 'Back.easeOut'
      });
    }
  };
  target.on('pointerup', release);
  target.on('pointerout', release);
}

/**
 * Draws a filled + stroked rounded rectangle and wires it up as a
 * pointer-interactive button, all as a single Graphics object. Shared by
 * every button across scenes so they read as one consistent UI language
 * instead of ad hoc flat rectangles.
 *
 * `x`/`y` are the button's center, in whatever coordinate space the caller
 * is drawing in (scene-root for HUD buttons, container-local for panel
 * buttons) — same convention `scene.add.rectangle(x, y, ...)` uses.
 *
 * The rect is drawn around the Graphics object's local origin and the object
 * is positioned at (`x`, `y`) — visually identical to drawing at absolute
 * coordinates, but with the transform pivot on the button's own center so
 * the shared press squash (installButtonPressFeedback) scales in place.
 *
 * Every button in this game is screen-fixed, and Phaser's input hit-test
 * uses each interactive object's own scroll factor rather than inheriting
 * an ancestor container's — so `setScrollFactor(0)` is applied here once
 * instead of being hand-chained onto every call site. Callers still need
 * to keep any scaled ancestor container free of this button's custom hit
 * area (Phaser's hit-test doesn't account for an ancestor container's
 * scale either); that part stays the caller's responsibility.
 */
export function drawRoundedButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: number,
  strokeColor: number,
  radius = 6
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(fillColor, 1);
  graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  graphics.lineStyle(2, strokeColor, 1);
  graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  graphics.setPosition(x, y);
  graphics.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains
  );
  graphics.setScrollFactor(0);
  if (graphics.input) graphics.input.cursor = 'pointer';
  installButtonPressFeedback(scene, graphics);
  return graphics;
}

/**
 * Standard panel pop-in — same feel as the toast: a brief 0.85x -> resting
 * scale with Back.easeOut. The tween always returns the container to its
 * exact resting scale, so the documented "Phaser's hit-test ignores an
 * ancestor container's scale" caveat only matters during the ~170ms settle
 * window, where button centers stay hittable throughout (this is also why
 * the pop is shallow rather than a dramatic 0.5x zoom).
 */
export function popInContainer(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  restingScale: number,
  durationMs = 170
): void {
  container.setScale(restingScale * 0.85);
  scene.tweens.add({
    targets: container,
    scale: restingScale,
    duration: durationMs,
    ease: 'Back.easeOut'
  });
}

/** Same rounded-rect drawing as `drawRoundedButton`, without interactivity — for panel backgrounds. */
export function drawRoundedPanelBackground(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: number,
  strokeColor: number,
  radius = 10
): Phaser.GameObjects.Graphics {
  const left = x - width / 2;
  const top = y - height / 2;
  const graphics = scene.add.graphics();
  graphics.fillStyle(fillColor, 1);
  graphics.fillRoundedRect(left, top, width, height, radius);
  graphics.lineStyle(3, strokeColor, 1);
  graphics.strokeRoundedRect(left, top, width, height, radius);
  return graphics;
}
