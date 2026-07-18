#!/usr/bin/env node
// Generates Eldoria's PWA / home-screen icons deterministically: a gold
// four-point "Wildbloom sparkle" (the same rune mark the orientation lock
// uses) on the game's dark backdrop. Drawn procedurally into a pixel buffer
// and written with the asset pipeline's own dependency-free PNG codec, so
// icons can be reproduced byte-for-byte and never drift from a forgotten
// design tool. Re-run after any palette/identity change:
//
//   node scripts/generate-pwa-icons.mjs
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writePng } from './normalize-asset-sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'icons');

const BACKGROUND = { r: 0x1a, g: 0x12, b: 0x08 }; // #1a1208, matches theme-color
const SPARKLE = { r: 0xf2, g: 0xc1, b: 0x4e };     // gold, matches the rune mark

/**
 * Vertices of a four-point sparkle (elongated cardinal points, sharp concave
 * diagonals) centered at (cx, cy) with outer radius R.
 */
function sparklePolygon(cx, cy, R) {
  const INNER = 0.16 * R;
  const points = [];
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i - Math.PI / 2; // start at 12 o'clock
    const radius = i % 2 === 0 ? R : INNER;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return points;
}

/** Even-odd point-in-polygon test; deterministic per pixel center. */
function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function renderIcon(size) {
  const data = new Uint8Array(size * size * 4);
  // Full-bleed background (required for maskable purpose).
  for (let i = 0; i < data.length; i += 4) {
    data[i] = BACKGROUND.r;
    data[i + 1] = BACKGROUND.g;
    data[i + 2] = BACKGROUND.b;
    data[i + 3] = 255;
  }

  // Main sparkle ~26% of canvas (well inside the maskable safe zone) plus a
  // small companion sparkle upper-right, echoing the game's rune motif.
  const shapes = [
    sparklePolygon(size * 0.5, size * 0.54, size * 0.26),
    sparklePolygon(size * 0.72, size * 0.28, size * 0.09)
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (shapes.some((polygon) => insidePolygon(px, py, polygon))) {
        const index = (y * size + x) * 4;
        data[index] = SPARKLE.r;
        data[index + 1] = SPARKLE.g;
        data[index + 2] = SPARKLE.b;
      }
    }
  }
  return { width: size, height: size, colorType: 6, data };
}

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 }
];

mkdirSync(OUT_DIR, { recursive: true });
for (const target of targets) {
  const outPath = join(OUT_DIR, target.file);
  writePng(outPath, renderIcon(target.size));
  console.log(`wrote ${outPath} (${target.size}x${target.size})`);
}
