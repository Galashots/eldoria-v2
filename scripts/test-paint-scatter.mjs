#!/usr/bin/env node
// Focused tests for the deterministic scatter-decal painter (recipe-level gates,
// docs/art-pipeline/CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md; report shape per
// the canonical lane contract eldoria-lane-report/v1).
// Pure grammar/gate logic is tested with synthetic in-memory fixtures; the
// family-level integration tests use the real locked repo palette and the
// approved grass base. Loud failure paths write small fixtures under .tmp.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CELL, FAMILY_VARIANTS, PAINTERS, SEED_SIBLING_OF, VARIANT_FAMILY, EXPECTED_SIZE,
  REPORT_SCHEMA, LANE, PIVOT, KEY_COLOR,
  seedFromName, makeRng, createGrid, setPx, rgbaOfGrid,
  loadForest, loadStone, paintVariant, analyzeRuntime, gatesOfMetrics, assertGatesPass,
  makeKeyedSource, keyedRoundtripDiff, paintFamily, readBackVariant, compareTrees,
} from './paint-scatter-family.mjs';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const tmp = path.join(repoRoot, '.tmp', 'paint-scatter-test');
const PALETTE = path.join(repoRoot, 'docs', 'visual-targets', 'farm_environment_palette_v1.json');
const GRASS = path.join(repoRoot, 'docs', 'art-pipeline', 'review', 'tile_farm_grass_base_grass_a', 'grass_a.review-normalized.png');
const RECIPE = path.join(repoRoot, 'scripts', 'paint-scatter-family.mjs');

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

function loadPalettes() {
  return { forest: loadForest(PALETTE), metal_stone: loadStone(PALETTE) };
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

// --- gates (synthetic fixtures) ---------------------------------------------

test('assertGatesPass rejects edge contact by name', () => {
  const forest = loadForest(PALETTE);
  const g = createGrid();
  setPx(g, 0, 7, 2); // touches the left border
  const metrics = analyzeRuntime(rgbaOfGrid(g, forest), forest);
  const gates = gatesOfMetrics(metrics, EXPECTED_SIZE.tuft_a);
  assert.equal(gates.edge_contacts, false);
  assert.throws(() => assertGatesPass([{ id: 'bad_edge', gates }]), /bad_edge: edge_contacts/);
});

test('assertGatesPass rejects a lowest row outside the pivot band', () => {
  const forest = loadForest(PALETTE);
  const g = createGrid();
  setPx(g, 8, 4, 2); // floats high: lowest row 4, allowed 13-15
  const metrics = analyzeRuntime(rgbaOfGrid(g, forest), forest);
  const gates = gatesOfMetrics(metrics, EXPECTED_SIZE.tuft_a);
  assert.equal(gates.lowest_row, false);
  assert.throws(() => assertGatesPass([{ id: 'bad_float', gates }]), /bad_float: lowest_row/);
});

test('binary_alpha gate: partial alpha is measured and rejected by name', () => {
  const forest = loadForest(PALETTE);
  const img = rgbaOfGrid(createGrid(), forest);
  img.data[(7 * CELL + 8) * 4 + 3] = 128; // one partial-alpha pixel
  const metrics = analyzeRuntime(img, forest);
  assert.equal(metrics.partial_alpha_pixels, 1);
  const gates = gatesOfMetrics(metrics, EXPECTED_SIZE.tuft_a);
  assert.equal(gates.binary_alpha, false);
  assert.throws(() => assertGatesPass([{ id: 'bad_alpha', gates }]), /bad_alpha: binary_alpha/);
});

test('expected size ranges: a too-narrow silhouette fails visible_width by name', () => {
  const forest = loadForest(PALETTE);
  const g = createGrid();
  setPx(g, 8, 14, 2); // 1px wide; declared tuft width range starts at 8
  const metrics = analyzeRuntime(rgbaOfGrid(g, forest), forest);
  const gates = gatesOfMetrics(metrics, EXPECTED_SIZE.tuft_a);
  assert.equal(gates.visible_width, false);
  assert.throws(() => assertGatesPass([{ id: 'too_narrow', gates }]), /too_narrow: visible_width/);
});

test('horizontal_offset_from_pivot measures bbox centre vs pivot x', () => {
  const forest = loadForest(PALETTE);
  const g = createGrid();
  setPx(g, 4, 14, 2); setPx(g, 5, 14, 2); setPx(g, 6, 14, 2);
  const metrics = analyzeRuntime(rgbaOfGrid(g, forest), forest);
  assert.equal(metrics.horizontal_offset_from_pivot, (4 + 6) / 2 - PIVOT[0]); // -3
});

// --- keyed source + round trip ------------------------------------------------

test('keyed source is 256x256 exact-key and round-trips with zero differences', () => {
  const img = paintVariant('tuft_a', loadPalettes());
  const { img: keyed, keyPixels } = makeKeyedSource(img);
  assert.equal(keyed.width, 256);
  assert.equal(keyed.height, 256);
  assert.ok(keyPixels > 0);
  assert.equal(keyed.data[0], 255); // tuft_a never touches the corner: exact key
  assert.equal(keyed.data[1], 0);
  assert.equal(keyed.data[2], 255);
  assert.equal(keyedRoundtripDiff(keyed, img), 0);
});

test('keyed round trip is fail-closed: one contaminated cell is counted, not sampled away', () => {
  const img = paintVariant('tuft_a', loadPalettes());
  const { img: keyed } = makeKeyedSource(img);
  let subj = -1; // first subject cell
  for (let i = 0; i < CELL * CELL && subj < 0; i += 1) if (img.data[i * 4 + 3] === 255) subj = i;
  const cx = (subj % CELL) * 16; const cy = Math.floor(subj / CELL) * 16;
  const s = (cy * keyed.width + cx) * 4;
  keyed.data[s] = 255; keyed.data[s + 1] = 0; keyed.data[s + 2] = 255; // key pixel inside a subject cell
  assert.equal(keyedRoundtripDiff(keyed, img), 1);
});

// --- family integration (real locked inputs) --------------------------------

test('paintFamily emits the canonical contract report and passes every gate', () => {
  const out = path.join(tmp, 'family-a');
  const report = paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: out });
  assert.equal(report.report_schema, 'eldoria-lane-report/v1'); // literal: contract freeze
  assert.equal(report.report_schema, REPORT_SCHEMA);
  assert.equal(report.lane, LANE);
  assert.equal(report.palette_authority, 'read-from-locked-file');
  assert.equal(report.locked_inputs.key_color, KEY_COLOR);
  assert.deepEqual(report.locked_inputs.palette.families, ['forest', 'metal_stone']);
  assert.deepEqual(report.expected_geometry.pivot, PIVOT);
  assert.deepEqual(report.expected_geometry.allowed_lowest_rows, [13, 14, 15]);
  assert.equal(report.producer.tool_sha256, sha256File(RECIPE));
  assert.equal(report.review_sheet_sha256, sha256File(path.join(out, 'montage.png')));
  assert.equal(report.machine_passed, true);
  assert.equal(report.family_verdict_draft, 'HOLD');
  assert.ok(report.named_next_gate.length > 0);
  assert.equal(report.deterministic_regeneration.written_files_byte_identical, true);
  assert.ok(report.deterministic_regeneration.files_compared >= FAMILY_VARIANTS.length * 4 + 1,
    'file-level regeneration must compare the full written tree');
  assert.equal(report.variants.length, FAMILY_VARIANTS.length);
  for (const v of report.variants) {
    assert.equal(v.passed, true, `${v.id} gates: ${JSON.stringify(v.gates)}`);
    assert.equal(v.palette_family, VARIANT_FAMILY[v.id], `${v.id} report family mismatch`);
    assert.equal(v.metrics.approved_master_parity, true, `${v.id} must match its committed approved runtime master`);
    assert.ok(v.metrics.visible_width >= v.expected_visible_width[0] && v.metrics.visible_width <= v.expected_visible_width[1],
      `${v.id} width ${v.metrics.visible_width} outside declared range`);
    assert.equal(v.metrics.partial_alpha_pixels, 0);
    assert.equal(v.metrics.keyed_roundtrip_difference_pixels, 0);
    assert.ok(v.metrics.exact_key_background_pixels > 0);
    assert.equal(v.runtime_sha256, sha256File(path.join(out, v.runtime_file)));
    assert.equal(v.keyed_sha256, sha256File(path.join(out, v.keyed_file)));
  }
  assert.equal(report.variants.find((v) => v.id === 'tuft_b').production_class, 'derived');
  assert.equal(report.variants.find((v) => v.id === 'tuft_b').seed_sibling_of, 'tuft_a');
  assert.equal(report.variants.find((v) => v.id === 'tuft_a').production_class, 'anchor');
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
  const palettes = loadPalettes();
  const allowedByFamily = Object.fromEntries(Object.entries(palettes)
    .map(([k, sw]) => [k, new Set(sw.map(([r, g, b]) => `${r},${g},${b}`))]));
  for (const v of report.variants) {
    assert.ok(VARIANT_FAMILY[v.id], `${v.id} has no declared palette family`);
    const allowed = allowedByFamily[VARIANT_FAMILY[v.id]];
    const img = readPng(path.join(out, v.runtime_file));
    let subject = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] === 0) continue;
      assert.equal(img.data[i + 3], 255, `${v.id} partial alpha at ${i / 4}`);
      subject += 1;
      assert.ok(allowed.has(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`),
        `${v.id} off-palette pixel at ${i / 4}`);
    }
    // The written evidence image must carry exactly the subject area the gates measured.
    assert.equal(subject, v.metrics.occupied_pixels,
      `${v.id}: evidence alpha count ${subject} != gated occupancy ${v.metrics.occupied_pixels}`);
    // The 8x preview must contain at least one exact locked-swatch pixel.
    const iso = readPng(path.join(out, `${v.id}.x8.png`));
    let swatchPixels = 0;
    for (let i = 0; i < iso.data.length; i += 4) {
      if (allowed.has(`${iso.data[i]},${iso.data[i + 1]},${iso.data[i + 2]}`)) swatchPixels += 1;
    }
    assert.ok(swatchPixels > 0, `${v.id}: 8x evidence contains no subject pixels`);
  }
  // pebble_a must paint in metal_stone, not forest (spec finding 2026-07-22).
  const pebble = readPng(path.join(out, 'pebble_a.16.png'));
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

test('read-back gating is loud: post-write corruption fails palette and master-parity gates', () => {
  const out = path.join(tmp, 'corruption-check');
  paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: out });
  const palettes = loadPalettes();
  const img = readPng(path.join(out, 'tuft_a.16.png'));
  let subj = -1;
  for (let i = 0; i < CELL * CELL && subj < 0; i += 1) if (img.data[i * 4 + 3] === 255) subj = i;
  img.data[subj * 4] = 0x12; img.data[subj * 4 + 1] = 0x34; img.data[subj * 4 + 2] = 0x56; // off-palette pixel
  writePng(path.join(out, 'tuft_a.16.png'), img);
  const entry = readBackVariant(out, 'tuft_a', palettes);
  assert.equal(entry.gates.palette, false, 'corrupted written file must fail the palette gate on read-back');
  assert.equal(entry.metrics.approved_master_parity, false, 'corrupted written file must lose master parity');
  assert.throws(() => assertGatesPass([{ id: 'tuft_a', gates: entry.gates }]), /tuft_a/);
});

test('compareTrees fails loudly on a byte difference between written runs', () => {
  const a = path.join(tmp, 'trees-a');
  const b = path.join(tmp, 'trees-b');
  paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: a });
  paintFamily({ palettePath: PALETTE, grassPath: GRASS, outDir: b });
  assert.ok(compareTrees(a, b) > 0, 'identical trees must compare clean');
  const f = path.join(b, 'flower_a.16.png');
  const bytes = fs.readFileSync(f);
  fs.writeFileSync(f, Buffer.concat([bytes, Buffer.from([0])])); // trailing-byte tamper
  assert.throws(() => compareTrees(a, b), /flower_a\.16\.png differs/);
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

console.log(`Scatter painter tests passed: ${passed}/${passed}.`);
