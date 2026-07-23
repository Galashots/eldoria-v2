#!/usr/bin/env node
// Builds one same-camera before/after contact sheet per profile from the
// screenshots captured by scripts/capture-farm-scatter-evidence.mjs: each
// named spot becomes one row, before on the left and after on the right.
//
// Validates the capture set before assembling anything: before/after must
// each contain exactly the required spot set (not just "whatever files
// happen to be in the directory" — a silently missing/extra capture must
// fail loudly, not produce a short or misaligned sheet), and every matched
// before/after pair must have identical pixel dimensions (a mismatch means
// the two passes weren't captured at the same camera/viewport and the row
// would misleadingly stack unequal images).
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import { FARM_SCATTER_EVIDENCE_PROFILES, FARM_SCATTER_EVIDENCE_SPOT_NAMES } from './farm-scatter-evidence-spots.mjs';

const ROOT = process.argv[2] ?? '/tmp/farm-scatter-evidence';
const PROFILES = FARM_SCATTER_EVIDENCE_PROFILES;
const REQUIRED_SPOTS = FARM_SCATTER_EVIDENCE_SPOT_NAMES;
const SEP = 12;

/** Lists the .png basenames (no extension) actually present in `dir`. */
function capturedNames(dir) {
  return new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')));
}

/** Throws a specific, named error if `actual` isn't exactly `required` —
 * never a silent pass on a directory that merely has "enough" files. */
function assertExactCaptureSet(profile, pass, actual, required) {
  const requiredSet = new Set(required);
  const missing = required.filter((name) => !actual.has(name));
  const extra = [...actual].filter((name) => !requiredSet.has(name));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Farm scatter evidence [${profile}/${pass}]: capture set does not match the required spots.` +
        (missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : '') +
        (extra.length > 0 ? ` Extra/unexpected: ${extra.join(', ')}.` : ''),
    );
  }
}

/** Throws if a before/after pair's decoded pixel dimensions differ. */
function assertMatchingDimensions(profile, spot, before, after) {
  if (before.width !== after.width || before.height !== after.height) {
    throw new Error(
      `Farm scatter evidence [${profile}/${spot}]: before (${before.width}x${before.height}) and after ` +
        `(${after.width}x${after.height}) captures have different pixel dimensions — not directly comparable.`,
    );
  }
}

function hstack(images) {
  const height = Math.max(...images.map((i) => i.height));
  const width = images.reduce((a, i) => a + i.width, 0) + SEP * (images.length - 1);
  const out = { width, height, colorType: 2, data: new Uint8Array(width * height * 4).fill(0) };
  let ox = 0;
  for (const img of images) {
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        const s = (y * img.width + x) * 4;
        const d = (y * width + ox + x) * 4;
        out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1];
        out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = 255;
      }
    }
    ox += img.width + SEP;
  }
  return out;
}

function vstack(images) {
  const width = Math.max(...images.map((i) => i.width));
  const height = images.reduce((a, i) => a + i.height, 0) + SEP * (images.length - 1);
  const out = { width, height, colorType: 2, data: new Uint8Array(width * height * 4).fill(0) };
  let oy = 0;
  for (const img of images) {
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        const s = (y * img.width + x) * 4;
        const d = ((oy + y) * width + x) * 4;
        out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1];
        out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = 255;
      }
    }
    oy += img.height + SEP;
  }
  return out;
}

const rowCountsByProfile = {};

for (const profile of PROFILES) {
  const beforeDir = path.join(ROOT, 'before', profile);
  const afterDir = path.join(ROOT, 'after', profile);

  assertExactCaptureSet(profile, 'before', capturedNames(beforeDir), REQUIRED_SPOTS);
  assertExactCaptureSet(profile, 'after', capturedNames(afterDir), REQUIRED_SPOTS);

  // Row order follows the canonical REQUIRED_SPOTS list, not directory sort
  // order — sorted directory contents alone would silently tolerate a
  // required name being swapped for an unrelated same-count file.
  const rows = REQUIRED_SPOTS.map((spot) => {
    const before = readPng(path.join(beforeDir, `${spot}.png`));
    const after = readPng(path.join(afterDir, `${spot}.png`));
    assertMatchingDimensions(profile, spot, before, after);
    return hstack([before, after]);
  });

  const outPath = path.join(ROOT, `${profile}-before-after-contact-sheet.png`);
  writePng(outPath, vstack(rows));
  rowCountsByProfile[profile] = rows.length;
  console.log(`wrote ${outPath} (${rows.length} rows: ${REQUIRED_SPOTS.join(', ')})`);
}

// Structural cross-check: every profile's contact sheet must have the same
// row count (they all derive from the same REQUIRED_SPOTS list, so a
// mismatch here means a profile's validation above was skipped or bypassed).
const distinctRowCounts = new Set(Object.values(rowCountsByProfile));
if (distinctRowCounts.size > 1) {
  throw new Error(
    `Farm scatter evidence: contact sheets have mismatched row counts across profiles: ` +
      `${JSON.stringify(rowCountsByProfile)}`,
  );
}
if ([...distinctRowCounts][0] !== REQUIRED_SPOTS.length) {
  throw new Error(
    `Farm scatter evidence: expected ${REQUIRED_SPOTS.length} rows, got ${[...distinctRowCounts][0]}`,
  );
}
