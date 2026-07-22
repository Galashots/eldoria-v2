#!/usr/bin/env node
// Focused tests for the deterministic scatter-decal painter (recipe-level gates,
// docs/art-pipeline/CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md).
// Pure grammar/gate logic is tested with synthetic in-memory fixtures; the
// family-level integration test uses the real locked repo palette and the
// approved grass base. Loud failure paths write small fixtures under .tmp.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CELL, BOTTOM, FAMILY_VARIANTS, PAINTERS, SEED_SIBLING_OF, VARIANT_FAMILY,
  seedFromName, makeRng, createGrid, setPx,
  loadForest, loadStone, paintVariant, gatesOfGrid, assertGatesPass, paintFamily,
} from './paint-scatter-family.mjs';
import { readPng } from './normalize-asset-sheet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const tmp = path.join(repoRoot, '.tmp', 'paint-scatter-test');
const PALETTE = path.join(repoRoot, 'docs', 'visual-targets', 'farm_environment_palette_v1.json');
const GRASS = path.join(repoRoot, 'docs', 'art-pipeline', 'review', 'tile_farm_grass_base_grass_a', 'grass_a.review-normalized.png');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function listFiles(dir) {
  return fs.readdirSync(dir).sort();
}

// --- grammar / seed structure ---------------------------------------------

test('tuft_b is a declared seed sibling of tuft_a (identical grammar fn)', () => {
  assert.equal(PAINTERS.tuft_a, PAINTERS.tuft_b);
  assert.equal(SEED_SIBLING_OF.tuft_b, 'tuft_a');
  assert.notEqual(seedFromName('tuft_a'), seedFromName('tuft_b'));
});

test('seedFromName is deterministic and name-scoped', () => {
  assert.equal(seedFromName('tuft_a'), seedFromName('tuft_a'));
  assert.notEqual(seedFromName('tuft_a'), seedFromName('flower_a'));
});

test('makeRng reproduces the identical draw sequence', () => {
  const a = makeRng(42); const b = makeRng(42);
  for (let i = 0; i < 50; i += 1) assert.equal(a.next(), b.next());
});

// --- palette loading --------------------------------------------------------

test('loadForest reads the six locked swatches from the repo palette JSON', () => {
  const forest = loadForest(PALETTE);
  assert.equal(forest.length, 6);
  assert.deepEqual(forest[5], [0x91, 0xA5, 0x13]);
});

test('loadForest rejects a palette that is not status=locked', () => {
  const p = path.join(tmp, 'palette-unlocked.json');
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ status: 'draft', families: { forest: ['#000000', '#111111', '#222222', '#333333', '#444444', '#555555'] } }));
  assert.throws(() => loadForest(p), /locked/);
});

test('loadForest rejects a wrong swatch count', () => {
  const p = path.join(tmp, 'palette-short.json');
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ status: 'locked', families: { forest: ['#000000', '#111111'] } }));
  assert.throws(() => loadForest(p), /6/);
});

// --- gates ------------------------------------------------------------------

test('assertGatesPass rejects edge contact by name', () => {
  const g = createGrid();
  setPx(g, 0, 7, 2); // touches the left border
  const report = [{ variant: 'bad_edge', ...gatesOfGrid(g) }];
  assert.throws(() => assertGatesPass(report), /bad_edge.*edge contact/);
});

test('assertGatesPass rejects a bottom row outside the pivot band', () => {
  const g = createGrid();
  setPx(g, 8, 4, 2); // floats high: bottom row 4, expect 13-15
  const report = [{ variant: 'bad_float', ...gatesOfGrid(g) }];
  assert.throws(() => assertGatesPass(report), /bad_float.*bottom row/);
});

// --- family integration (real locked inputs) --------------------------------

test('paintFamily passes all gates on the real palette + grass base', () => {
  const out = path.join(tmp, 'family-a');
  const report = paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: out });
  assert.equal(report.schema, 'scatter-paint-family-report/v1');
  assert.equal(report.variants.length, FAMILY_VARIANTS.length);
  for (const v of report.variants) {
    assert.equal(v.edge_contact, false, `${v.variant} edge contact`);
    assert.ok(v.bottom_row >= 13 && v.bottom_row <= 15, `${v.variant} bottom row ${v.bottom_row}`);
    assert.ok(v.occupancy_pct > 1 && v.occupancy_pct <= 40, `${v.variant} occupancy ${v.occupancy_pct}`);
  }
});

test('deterministic regeneration: two runs emit byte-identical files', () => {
  const a = path.join(tmp, 'regen-a');
  const b = path.join(tmp, 'regen-b');
  paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: a });
  paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: b });
  const files = listFiles(a);
  assert.ok(files.length > 0);
  assert.deepEqual(files, listFiles(b));
  for (const f of files) assert.equal(sha256File(path.join(a, f)), sha256File(path.join(b, f)), f);
});

test('every subject pixel is exactly one locked swatch of its declared family', () => {
  const out = path.join(tmp, 'palette-check');
  const report = paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: out });
  const palettes = { forest: loadForest(PALETTE), metal_stone: loadStone(PALETTE) };
  const allowedByFamily = Object.fromEntries(Object.entries(palettes)
    .map(([k, sw]) => [k, new Set(sw.map(([r, g, b]) => `${r},${g},${b}`))]));
  for (const v of report.variants) {
    assert.ok(VARIANT_FAMILY[v.variant], `${v.variant} has no declared palette family`);
    assert.equal(v.palette_family, VARIANT_FAMILY[v.variant], `${v.variant} report family mismatch`);
    const allowed = allowedByFamily[VARIANT_FAMILY[v.variant]];
    const img = readPngCompat(path.join(out, `${v.variant}.16.png`));
    let subject = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] === 0) continue;
      subject += 1;
      assert.ok(allowed.has(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`),
        `${v.variant} off-palette pixel at ${i / 4}`);
    }
    // The written evidence image must carry the same subject area the gates measured.
    const expected = Math.round((v.occupancy_pct / 100) * 256);
    assert.ok(Math.abs(subject - expected) <= 1,
      `${v.variant}: evidence alpha count ${subject} != gated occupancy ${expected}`);
    // The 8x preview must contain at least one exact locked-swatch pixel.
    const iso = readPngCompat(path.join(out, `${v.variant}.x8.png`));
    let swatchPixels = 0;
    for (let i = 0; i < iso.data.length; i += 4) {
      if (allowed.has(`${iso.data[i]},${iso.data[i + 1]},${iso.data[i + 2]}`)) swatchPixels += 1;
    }
    assert.ok(swatchPixels > 0, `${v.variant}: 8x evidence contains no subject pixels`);
  }
  // pebble_a must paint in metal_stone, not forest (spec finding 2026-07-22).
  const pebble = readPngCompat(path.join(out, 'pebble_a.16.png'));
  const stone = allowedByFamily.metal_stone;
  let pebbleSubject = 0;
  for (let i = 0; i < pebble.data.length; i += 4) {
    if (pebble.data[i + 3] === 0) continue;
    pebbleSubject += 1;
    assert.ok(stone.has(`${pebble.data[i]},${pebble.data[i + 1]},${pebble.data[i + 2]}`),
      `pebble_a non-metal_stone pixel at ${i / 4}`);
  }
  assert.ok(pebbleSubject > 0, 'pebble_a has no subject pixels');
});

test('locked-input verification is loud: a palette edit changes hash and output bytes', () => {
  const tampered = path.join(tmp, 'palette-tampered.json');
  const original = JSON.parse(fs.readFileSync(PALETTE, 'utf8'));
  original.families.forest[5] = '#91A514'; // one step off the locked lightest swatch
  fs.writeFileSync(tampered, JSON.stringify(original, null, 2));
  assert.notEqual(sha256File(tampered), sha256File(PALETTE));
  const base = path.join(tmp, 'tamper-base');
  const tamp = path.join(tmp, 'tamper-out');
  paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: base });
  const report = paintFamily({ palettePath: tampered, grassPath: GRASS, outDir: tamp });
  assert.notEqual(report.locked_inputs.palette.sha256, sha256File(PALETTE));
  assert.notEqual(sha256File(path.join(tamp, 'flower_a.16.png')), sha256File(path.join(base, 'flower_a.16.png')),
    'a locked-palette edit must change the painted output');
});

test('locked-input verification covers metal_stone: a stone edit changes pebble bytes', () => {
  const tampered = path.join(tmp, 'palette-tampered-stone.json');
  const original = JSON.parse(fs.readFileSync(PALETTE, 'utf8'));
  original.families.metal_stone[4] = '#ECE0B2'; // one step off the locked palest stone swatch
  fs.writeFileSync(tampered, JSON.stringify(original, null, 2));
  assert.notEqual(sha256File(tampered), sha256File(PALETTE));
  const base = path.join(tmp, 'tamper-stone-base');
  const tamp = path.join(tmp, 'tamper-stone-out');
  paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: base });
  paintFamily({ palettePath: tampered, grassPath: GRASS, outDir: tamp });
  assert.notEqual(sha256File(path.join(tamp, 'pebble_a.16.png')), sha256File(path.join(base, 'pebble_a.16.png')),
    'a metal_stone edit must change the painted pebble');
  assert.equal(sha256File(path.join(tamp, 'tuft_a.16.png')), sha256File(path.join(base, 'tuft_a.16.png')),
    'a metal_stone edit must not touch forest-painted variants');
});

function readPngCompat(p) {
  return readPng(p);
}

console.log(`Scatter painter tests passed: ${passed}/${passed}.`);
