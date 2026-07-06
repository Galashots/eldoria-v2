import Phaser from 'phaser';

/**
 * Draws a filled + stroked rounded rectangle and wires it up as a
 * pointer-interactive button, all as a single Graphics object. Shared by
 * every button across scenes so they read as one consistent UI language
 * instead of ad hoc flat rectangles.
 *
 * `x`/`y` are the button's center, in whatever coordinate space the caller
 * is drawing in (scene-root for HUD buttons, container-local for panel
 * buttons) — same convention `scene.add.rectangle(x, y, ...)` uses.
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
  const left = x - width / 2;
  const top = y - height / 2;
  const graphics = scene.add.graphics();
  graphics.fillStyle(fillColor, 1);
  graphics.fillRoundedRect(left, top, width, height, radius);
  graphics.lineStyle(2, strokeColor, 1);
  graphics.strokeRoundedRect(left, top, width, height, radius);
  graphics.setInteractive(
    new Phaser.Geom.Rectangle(left, top, width, height),
    Phaser.Geom.Rectangle.Contains
  );
  if (graphics.input) graphics.input.cursor = 'pointer';
  return graphics;
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
