#!/usr/bin/env node
// Assembles one before/after contact sheet from the screenshots captured by
// scripts/capture-world-depth-evidence.mjs.
//
// Layout — four columns, four rows:
//
//              mage BEFORE | mage AFTER || ranger BEFORE | ranger AFTER
//   slime-north
//   slime-south
//   mira-north
//   mira-south
//
// The double rule separates the two profiles; the single rule inside each
// pair separates before from after.
//
// Validates before assembling: each pass/profile directory must contain
// exactly the required spot set (a missing or stray capture fails loudly
// rather than producing a short or misaligned sheet), and every before/after
// pair must have identical pixel dimensions — a mismatch means the two
// passes were not captured at the same viewport/crop and the row would stack
// images that are not comparable.
//
// Usage:
//   node scripts/build-world-depth-contact-sheet.mjs /tmp/world-depth out.png
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import {
  CELL_ZOOM,
  WORLD_DEPTH_EVIDENCE_PROFILES,
  WORLD_DEPTH_EVIDENCE_SPOT_NAMES
} from './world-depth-evidence-spots.mjs';

const ROOT = process.argv[2] ?? '/tmp/world-depth-evidence';
const DEST = process.argv[3] ?? path.join(ROOT, 'world-depth-contact-sheet.png');

const PASSES = ['before', 'after'];
const PAIR_GAP = 10;
const PROFILE_GAP = 28;
const ROW_GAP = 10;
const BG = [18, 20, 26, 255];

function capturedNames(dir) {
  return new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')));
}

function assertExactCaptureSet(profile, pass, actual) {
  const required = new Set(WORLD_DEPTH_EVIDENCE_SPOT_NAMES);
  const missing = WORLD_DEPTH_EVIDENCE_SPOT_NAMES.filter((name) => !actual.has(name));
  const extra = [...actual].filter((name) => !required.has(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `World depth evidence [${profile}/${pass}]: capture set does not match the required spots.`
        + (missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : '')
        + (extra.length > 0 ? ` Extra/unexpected: ${extra.join(', ')}.` : '')
    );
  }
}

/** Integer nearest-neighbour magnification — no blending, so a one-pixel
 * occlusion edge stays a hard edge at review size. */
function zoom(img, factor) {
  const width = img.width * factor;
  const height = img.height * factor;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (Math.floor(y / factor) * img.width + Math.floor(x / factor)) * 4;
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
  for (let i = 0; i < width * height; i += 1) {
    data.set(BG, i * 4);
  }
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

// Load and validate every cell first, so a broken capture set fails before
// any pixels are written.
const cells = new Map();
for (const profile of WORLD_DEPTH_EVIDENCE_PROFILES) {
  for (const pass of PASSES) {
    const dir = path.join(ROOT, pass, profile.label);
    if (!fs.existsSync(dir)) throw new Error(`World depth evidence: missing capture directory ${dir}`);
    assertExactCaptureSet(profile.label, pass, capturedNames(dir));
    for (const spot of WORLD_DEPTH_EVIDENCE_SPOT_NAMES) {
      cells.set(`${profile.label}/${pass}/${spot}`, readPng(path.join(dir, `${spot}.png`)));
    }
  }
}

for (const profile of WORLD_DEPTH_EVIDENCE_PROFILES) {
  for (const spot of WORLD_DEPTH_EVIDENCE_SPOT_NAMES) {
    const before = cells.get(`${profile.label}/before/${spot}`);
    const after = cells.get(`${profile.label}/after/${spot}`);
    if (before.width !== after.width || before.height !== after.height) {
      throw new Error(
        `World depth evidence [${profile.label}/${spot}]: before (${before.width}x${before.height}) and after `
          + `(${after.width}x${after.height}) were not captured at the same viewport/crop — not comparable.`
      );
    }
  }
}

const sample = zoom(cells.values().next().value, CELL_ZOOM);
const cellWidth = sample.width;
const cellHeight = sample.height;
const sheetWidth = cellWidth * 4 + PAIR_GAP * 2 + PROFILE_GAP;
const sheetHeight = cellHeight * WORLD_DEPTH_EVIDENCE_SPOT_NAMES.length
  + ROW_GAP * (WORLD_DEPTH_EVIDENCE_SPOT_NAMES.length - 1);

const sheet = blank(sheetWidth, sheetHeight);
const columns = [];
for (const [index, profile] of WORLD_DEPTH_EVIDENCE_PROFILES.entries()) {
  for (const pass of PASSES) {
    columns.push({ key: `${profile.label}/${pass}`, profileIndex: index });
  }
}

WORLD_DEPTH_EVIDENCE_SPOT_NAMES.forEach((spot, row) => {
  let ox = 0;
  columns.forEach((column, index) => {
    paste(sheet, zoom(cells.get(`${column.key}/${spot}`), CELL_ZOOM), ox, row * (cellHeight + ROW_GAP));
    ox += cellWidth;
    if (index < columns.length - 1) {
      ox += columns[index + 1].profileIndex === column.profileIndex ? PAIR_GAP : PROFILE_GAP;
    }
  });
});

fs.mkdirSync(path.dirname(DEST), { recursive: true });
writePng(DEST, sheet);
console.log(JSON.stringify({
  dest: DEST,
  sheet: `${sheetWidth}x${sheetHeight}`,
  cell: `${cellWidth}x${cellHeight}`,
  columns: columns.map((c) => c.key),
  rows: WORLD_DEPTH_EVIDENCE_SPOT_NAMES
}, null, 2));
