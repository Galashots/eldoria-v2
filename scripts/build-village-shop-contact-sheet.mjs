#!/usr/bin/env node
// Assembles one contact sheet from the captures produced by
// scripts/capture-village-shop-evidence.mjs.
//
// Layout — two columns (Mage, Ranger Explorer), four rows:
//
//   approach-from-the-road
//   partly-behind-the-wall
//   partly-behind-the-wall--as-terrain-layer
//   blocked-by-the-front-wall
//
// Rows 2 and 3 are the same framing with only the structure's depth changed,
// so they are the whole render-layer decision side by side.
//
// Cells are point-sampled down by 2 (every other pixel — no blending, so no
// blur) purely to keep one reviewable file a sane size; the committed captures
// are canvas screenshots at the 1194x834 viewport.
//
// Usage:
//   node scripts/build-village-shop-contact-sheet.mjs /tmp/village-shop out.png
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

const ROOT = process.argv[2] ?? '/tmp/village-shop-evidence';
const DEST = process.argv[3] ?? path.join(ROOT, 'village-shop-contact-sheet.png');

export const PROFILE_LABELS = ['mage', 'ranger'];
export const ROW_ORDER = [
  'approach-from-the-road',
  'partly-behind-the-wall',
  'partly-behind-the-wall--as-terrain-layer',
  'blocked-by-the-front-wall'
];
const DOWNSAMPLE = 2;
const GAP = 10;
const BG = [18, 20, 26, 255];

function pointDownsample(img, factor) {
  const width = Math.floor(img.width / factor);
  const height = Math.floor(img.height / factor);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = ((y * factor) * img.width + x * factor) * 4;
      const dst = (y * width + x) * 4;
      data[dst] = img.data[src];
      data[dst + 1] = img.data[src + 1];
      data[dst + 2] = img.data[src + 2];
      data[dst + 3] = img.data[src + 3];
    }
  }
  return { width, height, colorType: 6, data };
}

function blank(width, height) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) data.set(BG, i * 4);
  return { width, height, colorType: 6, data };
}

function paste(dest, src, ox, oy) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const s = (y * src.width + x) * 4;
      const d = ((oy + y) * dest.width + ox + x) * 4;
      dest.data[d] = src.data[s];
      dest.data[d + 1] = src.data[s + 1];
      dest.data[d + 2] = src.data[s + 2];
      dest.data[d + 3] = src.data[s + 3];
    }
  }
}

// Load and validate every cell before writing pixels, so a missing capture
// fails loudly instead of yielding a short or misaligned sheet.
const cells = new Map();
for (const profile of PROFILE_LABELS) {
  const dir = path.join(ROOT, profile);
  if (!fs.existsSync(dir)) throw new Error(`Village shop evidence: missing capture directory ${dir}`);
  const present = new Set(
    fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''))
  );
  const missing = ROW_ORDER.filter((name) => !present.has(name));
  const extra = [...present].filter((name) => !ROW_ORDER.includes(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Village shop evidence [${profile}]: capture set does not match the required framings.`
        + (missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : '')
        + (extra.length > 0 ? ` Extra/unexpected: ${extra.join(', ')}.` : '')
    );
  }
  for (const name of ROW_ORDER) {
    cells.set(`${profile}/${name}`, pointDownsample(readPng(path.join(dir, `${name}.png`)), DOWNSAMPLE));
  }
}

const sizes = [...cells.values()];
const cellWidth = sizes[0].width;
const cellHeight = sizes[0].height;
for (const [key, img] of cells) {
  if (img.width !== cellWidth || img.height !== cellHeight) {
    throw new Error(
      `Village shop evidence [${key}]: ${img.width}x${img.height} does not match ${cellWidth}x${cellHeight} — `
        + 'the captures were not all taken at the same viewport, so the sheet would stack incomparable frames.'
    );
  }
}

const sheetWidth = cellWidth * PROFILE_LABELS.length + GAP * (PROFILE_LABELS.length - 1);
const sheetHeight = cellHeight * ROW_ORDER.length + GAP * (ROW_ORDER.length - 1);
const sheet = blank(sheetWidth, sheetHeight);
ROW_ORDER.forEach((name, row) => {
  PROFILE_LABELS.forEach((profile, col) => {
    paste(sheet, cells.get(`${profile}/${name}`), col * (cellWidth + GAP), row * (cellHeight + GAP));
  });
});

fs.mkdirSync(path.dirname(DEST), { recursive: true });
writePng(DEST, sheet);
console.log(JSON.stringify({
  dest: DEST,
  sheet: `${sheetWidth}x${sheetHeight}`,
  cell: `${cellWidth}x${cellHeight}`,
  columns: PROFILE_LABELS,
  rows: ROW_ORDER
}, null, 2));
