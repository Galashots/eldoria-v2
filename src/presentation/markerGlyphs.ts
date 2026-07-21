import Phaser from 'phaser';
import type { InteractionId } from '../data/interactions';

/**
 * Literal interaction-marker glyphs, hand-drawn with Canvas-safe Graphics
 * primitives (fillEllipse/fillCircle/fillRoundedRect/fillTriangle/lines —
 * no WebGL-only blends or filters).
 *
 * Rationale (Batch 1 readability pass): the old colored-dot markers leaned
 * on color alone, which is exactly what color-blind players aged 6-11 can't
 * reliably read. Each target type now gets a small LITERAL icon — flower,
 * sprout, berry bush, stone, scroll, well, "!"" for quest givers — and the
 * legacy kind color survives only as a thin redundant ring (shape + color,
 * never color alone).
 *
 * Everything is drawn in a ±9 design-pixel box around the local origin;
 * callers position the Graphics object and apply `.setScale(GAME_SCALE)`,
 * so the glyphs read crisp at runtime scale.
 */

export type MarkerGlyphKind =
  | 'quest'
  | 'berry'
  | 'sprout'
  | 'flower'
  | 'stone'
  | 'slime'
  | 'scroll'
  | 'well'
  | 'sparkle';

const OUTLINE = 0x1a1208;

export function markerGlyphKind(id: InteractionId): MarkerGlyphKind {
  switch (id) {
    case 'mira':
    case 'baker-pell':
      return 'quest';
    case 'crop-bonus':
      return 'berry';
    case 'sprout-1':
    case 'sprout-2':
    case 'sprout-3':
      return 'sprout';
    case 'whispering-flower':
      return 'flower';
    case 'mossy-stone':
      return 'stone';
    case 'practice-slime':
      return 'slime';
    case 'village-notice-board':
      return 'scroll';
    case 'village-well':
      return 'well';
    case 'generic-bonus':
      return 'sparkle';
  }
}

/**
 * Paints the glyph for `id` into `graphics` (drawn, not generated, so it can
 * also repaint an existing object). `ringColor` is the legacy kind color,
 * kept as a redundant outer ring.
 */
export function drawMarkerGlyph(graphics: Phaser.GameObjects.Graphics, id: InteractionId, ringColor: number): void {
  switch (markerGlyphKind(id)) {
    case 'quest':
      paintQuestGlyph(graphics);
      break;
    case 'berry':
      paintBerryGlyph(graphics);
      break;
    case 'sprout':
      paintSproutGlyph(graphics);
      break;
    case 'flower':
      paintFlowerGlyph(graphics);
      break;
    case 'stone':
      paintStoneGlyph(graphics);
      break;
    case 'slime':
      paintSlimeGlyph(graphics);
      break;
    case 'scroll':
      paintScrollGlyph(graphics);
      break;
    case 'well':
      paintWellGlyph(graphics);
      break;
    case 'sparkle':
      paintSparkleGlyph(graphics);
      break;
  }

  // Redundant color coding: the old marker color survives as a soft outer
  // ring — the literal shape carries the meaning, the color only reinforces.
  graphics.lineStyle(1.2, ringColor, 0.8);
  graphics.strokeCircle(0, 0, 9);
}

/** Quest giver: a bold golden "!" (Pokemon-style "someone needs you"). */
function paintQuestGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0xffd666, 1);
  graphics.fillRoundedRect(-1.8, -6.5, 3.6, 8, 1.8);
  graphics.fillCircle(0, 4.4, 2.1);
  graphics.lineStyle(1, OUTLINE, 0.9);
  graphics.strokeRoundedRect(-1.8, -6.5, 3.6, 8, 1.8);
  graphics.strokeCircle(0, 4.4, 2.1);
}

/** Crop patch / sunberry spot: a leafy bush with three gold berries. */
function paintBerryGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0x3f7a33, 1);
  graphics.fillEllipse(0, 1.5, 14, 10);
  graphics.fillStyle(0x2f6126, 0.9);
  graphics.fillEllipse(0, 3.5, 12, 5);
  graphics.lineStyle(1, OUTLINE, 0.8);
  graphics.strokeEllipse(0, 1.5, 14, 10);

  graphics.fillStyle(0xffd666, 1);
  graphics.fillCircle(-3.5, 0, 1.7);
  graphics.fillCircle(3.5, 0.8, 1.7);
  graphics.fillCircle(0, 3.4, 1.7);
  graphics.lineStyle(0.8, OUTLINE, 0.7);
  graphics.strokeCircle(-3.5, 0, 1.7);
  graphics.strokeCircle(3.5, 0.8, 1.7);
  graphics.strokeCircle(0, 3.4, 1.7);
}

/** Sleepy sprout: two leaves and a pale bud curling out of a soil mound. */
function paintSproutGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0x5f3d12, 1);
  graphics.fillEllipse(0, 6, 12, 4.5);
  graphics.lineStyle(1, OUTLINE, 0.7);
  graphics.strokeEllipse(0, 6, 12, 4.5);

  graphics.lineStyle(1.4, 0x5e9f3a, 1);
  graphics.lineBetween(0, 5, 0, -1);

  graphics.fillStyle(0x8fd14f, 1);
  graphics.fillEllipse(-3.2, 0, 6.5, 3);
  graphics.fillEllipse(3, -1.8, 6.5, 3);
  graphics.fillStyle(0xd7ffb8, 1);
  graphics.fillCircle(0, -3.4, 1.9);
  graphics.lineStyle(0.8, OUTLINE, 0.7);
  graphics.strokeCircle(0, -3.4, 1.9);
}

/** Whispering Flower: violet petals around a gold heart on a thin stem. */
function paintFlowerGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.lineStyle(1.5, 0x5e9f3a, 1);
  graphics.lineBetween(0, 8, 0, -1);
  graphics.fillStyle(0x5e9f3a, 1);
  graphics.fillEllipse(-3, 3.5, 5, 2.5);
  graphics.fillEllipse(3, 4.5, 5, 2.5);

  graphics.fillStyle(0xcdb8ff, 1);
  const centerY = -3.5;
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
    graphics.fillCircle(Math.cos(angle) * 3.2, centerY + Math.sin(angle) * 3.2, 2.1);
  }
  graphics.fillStyle(0xffd666, 1);
  graphics.fillCircle(0, centerY, 1.9);
  graphics.lineStyle(0.8, OUTLINE, 0.7);
  graphics.strokeCircle(0, centerY, 1.9);
}

/** Mossy Stone: a gray rock with a moss cap. */
function paintStoneGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0x8a8f7a, 1);
  graphics.fillEllipse(0, 1.5, 13, 9);
  graphics.lineStyle(1, OUTLINE, 0.85);
  graphics.strokeEllipse(0, 1.5, 13, 9);
  graphics.fillStyle(0x5e9f3a, 0.95);
  graphics.fillEllipse(-2.5, -0.5, 6, 3);
  graphics.fillStyle(0xb8bfa8, 0.8);
  graphics.fillEllipse(2.5, 1, 4, 2);
}

/**
 * Practice Slime face — drawn for completeness; the farm slime currently
 * keeps its animated sprite as the literal marker instead of this glyph.
 */
function paintSlimeGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0x7fd18f, 1);
  graphics.fillEllipse(0, 2, 13, 9);
  graphics.lineStyle(1, OUTLINE, 0.85);
  graphics.strokeEllipse(0, 2, 13, 9);
  graphics.fillStyle(0xd7ffb8, 0.85);
  graphics.fillEllipse(-3.5, -0.5, 3, 1.6);
  graphics.fillStyle(OUTLINE, 1);
  graphics.fillCircle(-2.5, 1, 1.1);
  graphics.fillCircle(2.5, 1, 1.1);
  graphics.lineStyle(1, OUTLINE, 0.9);
  graphics.beginPath();
  graphics.arc(0, 2.2, 2.6, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  graphics.strokePath();
}

/** Notice board: a pinned parchment scroll. */
function paintScrollGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0xc9a66b, 1);
  graphics.fillRoundedRect(-7.2, -6, 2.6, 12, 1.3);
  graphics.fillRoundedRect(4.6, -6, 2.6, 12, 1.3);
  graphics.fillStyle(0xe8d8a8, 1);
  graphics.fillRoundedRect(-5.5, -5, 11, 10, 2);
  graphics.lineStyle(1, 0x6f5126, 1);
  graphics.strokeRoundedRect(-5.5, -5, 11, 10, 2);
  graphics.lineStyle(1, 0x6f5126, 0.9);
  graphics.lineBetween(-3, -2, 3, -2);
  graphics.lineBetween(-3, 0.5, 3, 0.5);
  graphics.lineBetween(-3, 3, 1, 3);
}

/** Village Well: a little roofed well with glinting water. */
function paintWellGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0x5f3d12, 1);
  graphics.fillRect(-5.5, -3, 1.4, 7);
  graphics.fillRect(4.1, -3, 1.4, 7);
  graphics.fillStyle(0xa9522e, 1);
  graphics.fillTriangle(0, -7.5, -6.5, -1.5, 6.5, -1.5);
  graphics.lineStyle(1, OUTLINE, 0.8);
  graphics.strokeTriangle(0, -7.5, -6.5, -1.5, 6.5, -1.5);

  graphics.fillStyle(0x8a8f7a, 1);
  graphics.fillEllipse(0, 5, 13, 5.5);
  graphics.lineStyle(1, OUTLINE, 0.8);
  graphics.strokeEllipse(0, 5, 13, 5.5);
  graphics.fillStyle(0x6db3f2, 1);
  graphics.fillEllipse(0, 4, 9, 3);
  graphics.fillStyle(0xd7f0ff, 0.9);
  graphics.fillEllipse(-1.5, 3.5, 3.5, 1.2);
}

/** Fallback interactable: a small four-point sparkle. */
function paintSparkleGlyph(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0xffd666, 1);
  graphics.fillTriangle(0, -7, 2.2, 0, 0, 7);
  graphics.fillTriangle(0, -7, -2.2, 0, 0, 7);
  graphics.fillTriangle(-7, 0, 0, -2.2, 7, 0);
  graphics.fillTriangle(-7, 0, 0, 2.2, 7, 0);
  graphics.fillStyle(0xfff3c9, 1);
  graphics.fillCircle(0, 0, 1.6);
}
