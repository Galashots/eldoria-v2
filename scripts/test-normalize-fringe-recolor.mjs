// Focused tests for the two opt-in normalizer steps added for keyed
// high-resolution character sources: background.fringeHueMargin (chroma-fringe
// rejection) and source.recolor (declared per-channel gain over a region).
//
// The load-bearing assertion is the FIRST one: with neither key present the
// normalizer must behave exactly as before, because every already-approved
// asset family shares this script.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { normalizeAssetSheet, readPng, writePng, collectManifestErrors } from './normalize-asset-sheet.mjs';

const KEY = [250, 3, 249];      // magenta key: R and B high, G low
const NAVY = [37, 68, 110];     // legitimate tunic colour (r < g, so not key-hued)
const HAIR = [72, 43, 20];      // legitimate warm hair (b < g, so not key-hued)
const FRINGE = [90, 10, 90];    // dark magenta blend: key-hued, far from the key in RGB distance

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok - ${name}`); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eldoria-fringe-recolor-'));

/** 4x4 source: row0 = key, row1 = fringe, row2 = navy, row3 = hair. */
function writeSource(file) {
  const rows = [KEY, FRINGE, NAVY, HAIR];
  const img = { width: 4, height: 4, colorType: 6, bitDepth: 8, data: new Uint8Array(4 * 4 * 4) };
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
    const i = (y * 4 + x) * 4;
    img.data[i] = rows[y][0]; img.data[i + 1] = rows[y][1]; img.data[i + 2] = rows[y][2]; img.data[i + 3] = 255;
  }
  writePng(file, img);
}

function manifest({ fringeHueMargin, recolor }) {
  const source = {
    path: 'src.png',
    background: { mode: 'color_key', color: '#fa03f9', tolerance: 10, ...(fringeHueMargin !== undefined ? { fringeHueMargin } : {}) },
    ...(recolor ? { recolor } : {})
  };
  return {
    version: 1,
    id: 'fringe_recolor_fixture',
    target: { outputPath: 'out.png', cellPx: [4, 4], cols: 1, rows: 1 },
    sources: { src: source },
    frames: [{ sourceRef: 'src', destCell: [0, 0], trim: 'none', fit: 'fill', anchor: 'top_left' }]
  };
}

function run(name, cfg) {
  const dir = fs.mkdtempSync(path.join(tmp, `${name}-`));
  writeSource(path.join(dir, 'src.png'));
  const mp = path.join(dir, 'm.json');
  fs.writeFileSync(mp, JSON.stringify(manifest(cfg)));
  normalizeAssetSheet(mp);
  return { dir, out: readPng(path.join(dir, 'out.png')), manifestPath: mp };
}

const px = (img, x, y) => {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
};

// 1. Absent keys => unchanged legacy behaviour: only the exact key is removed,
//    the fringe row survives, and no colour is altered.
{
  const { out } = run('baseline', {});
  assert.deepEqual(px(out, 0, 0), [0, 0, 0, 0], 'key row must be keyed out');
  assert.deepEqual(px(out, 0, 1), [...FRINGE, 255], 'fringe row must survive without fringeHueMargin');
  assert.deepEqual(px(out, 0, 2), [...NAVY, 255], 'navy must be untouched');
  assert.deepEqual(px(out, 0, 3), [...HAIR, 255], 'hair must be untouched');
  ok('with neither fringeHueMargin nor recolor declared, output matches legacy keying exactly');
}

// 2. fringeHueMargin removes key-hued fringe and keeps colours that do not
//    share the key's channel signature.
{
  const { out } = run('fringe', { fringeHueMargin: 20 });
  assert.equal(px(out, 0, 1)[3], 0, 'key-hued fringe must be rejected');
  assert.deepEqual(px(out, 0, 2), [...NAVY, 255], 'navy must survive fringe rejection');
  assert.deepEqual(px(out, 0, 3), [...HAIR, 255], 'hair must survive fringe rejection');
  ok('fringeHueMargin rejects key-hued fringe while preserving non-key-hued subject colours');
}

// 3. recolor applies the declared gain only to selected pixels inside the
//    declared region of the alpha bounding box.
{
  // Bounding box after keying is rows 1..3. regionFraction height 0.34 covers
  // only the first of those three rows (the fringe row), so with fringe
  // rejection ON the selected band is empty and nothing changes; target the
  // hair row instead by selecting the whole box and filtering on colour.
  const { out } = run('recolor', {
    fringeHueMargin: 20,
    recolor: { regionFraction: [0, 0, 1, 1], select: { rMin: 30, rMax: 150, minWarmth: 10 }, gain: [2, 1, 0.5] }
  });
  // hair (72,43,20): r-b = 52 >= 10 and 30 <= 72 <= 150 -> selected
  assert.deepEqual(px(out, 0, 3), [144, 43, 10, 255], 'hair must take the declared gain');
  // navy (37,68,110): r-b = -73 -> not selected
  assert.deepEqual(px(out, 0, 2), [...NAVY, 255], 'navy must be excluded by the warmth selector');
  ok('recolor applies declared gains only to selected pixels, leaving others exact');
}

// 4. Both steps together are deterministic across runs.
{
  const cfg = { fringeHueMargin: 20, recolor: { regionFraction: [0, 0, 1, 1], select: { rMin: 30, rMax: 150, minWarmth: 10 }, gain: [1.309, 1.162, 1.15] } };
  const a = run('det-a', cfg);
  const b = run('det-b', cfg);
  assert.ok(fs.readFileSync(path.join(a.dir, 'out.png')).equals(fs.readFileSync(path.join(b.dir, 'out.png'))), 'two runs must be byte-identical');
  ok('fringe rejection + recolor regenerate byte-identically');
}

// 5. Fail-closed validation on the new fields.
{
  const dir = fs.mkdtempSync(path.join(tmp, 'invalid-'));
  writeSource(path.join(dir, 'src.png'));
  const bad = manifest({ fringeHueMargin: 20, recolor: { gain: [1, 1] } });
  bad.sources.src.recolor.regionFraction = [0, 0, 2, 1];
  bad.sources.src.recolor.select = { rMin: 30, bogus: 1 };
  const mp = path.join(dir, 'm.json');
  fs.writeFileSync(mp, JSON.stringify(bad));
  const errors = collectManifestErrors(mp, { checkOutput: false });
  assert.ok(errors.some((e) => e.includes('gain must be')), 'a 2-element gain must be rejected');
  assert.ok(errors.some((e) => e.includes('regionFraction must be')), 'an out-of-range regionFraction must be rejected');
  assert.ok(errors.some((e) => e.includes('unknown select keys')), 'unknown select keys must be rejected');

  const wrongMode = manifest({ fringeHueMargin: 20 });
  wrongMode.sources.src.background = { mode: 'alpha', fringeHueMargin: 20 };
  const mp2 = path.join(dir, 'm2.json');
  fs.writeFileSync(mp2, JSON.stringify(wrongMode));
  assert.ok(collectManifestErrors(mp2, { checkOutput: false }).some((e) => e.includes('fringeHueMargin requires a color-key background mode')), 'fringeHueMargin without a colour key must be rejected');
  ok('malformed recolor/fringe declarations fail closed in manifest validation');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${passed} passed`);
