#!/usr/bin/env node
// Focused tests for the shoreline_bands terrain-blend mode (spec §10). Runs
// alongside, and never weakens, scripts/test-terrain-blend-compositor.mjs
// (the dirt/binary_material_interlock suite, left completely untouched).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CELL, TOPOLOGY, SADDLE_CODES, SHORELINE_SWATCHES,
  qValue, cornerCode, hashPixel, isOuterEdgePixel,
  shorelineBand, shorelineBandCounts, composeShorelineCell,
  validateShorelineRecipe, composeShorelineFamily, computeWrapMetrics,
  assertNoSharedEdgeMismatches, composeFamily,
} from './compose-terrain-blend-family.mjs';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const tmp = path.join(repoRoot, '.tmp', 'shoreline-terrain-blend-test');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
}

const SEED = 22282; // 0x0000570A
const sha = (buf) => crypto.createHash('sha256').update(Buffer.from(buf)).digest('hex');

function solid16(rgb) {
  const data = new Uint8Array(CELL * CELL * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255; }
  return { width: CELL, height: CELL, colorType: 6, data };
}

function patterned16(base) {
  const data = new Uint8Array(CELL * CELL * 4);
  for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) {
    const i = (y * CELL + x) * 4;
    data[i] = (base + x * 3) & 255; data[i + 1] = (base + y * 5) & 255; data[i + 2] = (x * 7 + y * 11) & 255; data[i + 3] = 255;
  }
  return { width: CELL, height: CELL, colorType: 6, data };
}

// Synthetic water/grass fixtures distinct from the locked shoreline swatches,
// so colour-origin/unexpected-colour checks are meaningful in isolation.
const WATER_FIXTURE = solid16([10, 20, 200]);
const GRASS_FIXTURE = patterned16(60);

const EXPECTED_BAND_COUNTS = {
  center: { water: 256, inner_sand: 0, outer_sand: 0, moss: 0, grass: 0 },
  edge: { water: 128, inner_sand: 16, outer_sand: 16, moss: 16, grass: 80 },
  outerCorner: { water: 41, inner_sand: 15, outer_sand: 14, moss: 17, grass: 169 },
  innerCorner: { water: 215, inner_sand: 9, outer_sand: 8, moss: 9, grass: 15 },
};

// --- 1. locked pre-variation band counts ---------------------------------

test('deterministic pre-variation band counts match the locked spec table', () => {
  assert.deepEqual(shorelineBandCounts([1, 1, 1, 1]), EXPECTED_BAND_COUNTS.center);
  for (const name of ['edge_north', 'edge_south', 'edge_west', 'edge_east']) {
    const t = TOPOLOGY.find((v) => v.name === name);
    assert.deepEqual(shorelineBandCounts(t.corners), EXPECTED_BAND_COUNTS.edge, name);
  }
  for (const name of ['corner_ne', 'corner_nw', 'corner_se', 'corner_sw']) {
    const t = TOPOLOGY.find((v) => v.name === name);
    assert.deepEqual(shorelineBandCounts(t.corners), EXPECTED_BAND_COUNTS.outerCorner, name);
  }
  for (const name of ['inner_corner_ne', 'inner_corner_nw', 'inner_corner_se', 'inner_corner_sw']) {
    const t = TOPOLOGY.find((v) => v.name === name);
    assert.deepEqual(shorelineBandCounts(t.corners), EXPECTED_BAND_COUNTS.innerCorner, name);
  }
  assert.deepEqual(shorelineBandCounts([0, 0, 0, 0]), { water: 0, inner_sand: 0, outer_sand: 0, moss: 0, grass: 256 });
  // Band membership is purely geometric (q-derived); hash variation never
  // changes it -- confirmed by composing with two different seeds.
  const t = TOPOLOGY.find((v) => v.name === 'edge_north');
  const a = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, t.corners, { seed: 1 });
  const b = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, t.corners, { seed: 999999 });
  assert.deepEqual(a.stats.band, b.stats.band);
});

// --- 2. centre and 0000 identity -------------------------------------------

test('centre is exact water identity; 0000 is exact grass identity', () => {
  const center = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, [1, 1, 1, 1], { seed: SEED });
  assert.deepEqual([...center.data], [...WATER_FIXTURE.data]);
  const grass = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, [0, 0, 0, 0], { seed: SEED });
  assert.deepEqual([...grass.data], [...GRASS_FIXTURE.data]);
});

// --- 3. no hashed variation on any outer row/column ------------------------

test('no hashed variation reaches any outer row or column, for any seed', () => {
  for (const t of TOPOLOGY) {
    const seeds = [SEED, 1, 2, 3, 4, 5, 999983];
    const runs = seeds.map((seed) => composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, t.corners, { seed }));
    for (let x = 0; x < CELL; x += 1) {
      for (let y = 0; y < CELL; y += 1) {
        if (!isOuterEdgePixel(x, y)) continue;
        const idx = (y * CELL + x) * 4;
        const first = [runs[0].data[idx], runs[0].data[idx + 1], runs[0].data[idx + 2]];
        for (const run of runs.slice(1)) {
          assert.deepEqual([run.data[idx], run.data[idx + 1], run.data[idx + 2]], first, `${t.name} (${x},${y}) varied across seeds`);
        }
      }
    }
  }
});

// --- 4. exact per-pixel material rules (bands + variation formulas) --------

test('per-pixel material assignment follows the exact v2 band/hash rules (ChatGPT PR #99 correction)', () => {
  for (const t of TOPOLOGY) {
    const composed = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, t.corners, { seed: SEED });
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        const q = qValue(t.corners, x, y);
        const band = shorelineBand(q);
        const idx = (y * CELL + x) * 4;
        const got = [composed.data[idx], composed.data[idx + 1], composed.data[idx + 2]];
        const edge = isOuterEdgePixel(x, y);
        const grassPx = [GRASS_FIXTURE.data[idx], GRASS_FIXTURE.data[idx + 1], GRASS_FIXTURE.data[idx + 2]];
        const hx = () => hashPixel(x, y, SEED);
        let expected;
        if (band === 'water') expected = [WATER_FIXTURE.data[idx], WATER_FIXTURE.data[idx + 1], WATER_FIXTURE.data[idx + 2]];
        else if (band === 'grass') expected = grassPx;
        else if (band === 'inner_sand') {
          // v2: base #B98535; interior hash%11==0 -> #D5A342.
          expected = (!edge && hx() % 11 === 0) ? hexToRgb(SHORELINE_SWATCHES.innerSandBase) : hexToRgb(SHORELINE_SWATCHES.innerSandAlt);
        } else if (band === 'outer_sand') {
          // v2: edge base #926B2A; interior hash%4==0 -> grass_a; else hash%3==0 -> #6C8B15; else #926B2A.
          if (edge) expected = hexToRgb(SHORELINE_SWATCHES.outerSandAlt);
          else {
            const h = hx();
            if (h % 4 === 0) expected = grassPx;
            else if (h % 3 === 0) expected = hexToRgb(SHORELINE_SWATCHES.lightMoss);
            else expected = hexToRgb(SHORELINE_SWATCHES.outerSandAlt);
          }
        } else { // moss
          // v2: edge exact grass_a (unchanged); interior hash%5==0 -> #926B2A;
          // else hash%3==0 -> #6C8B15; else hash%7==0 -> #427118; else grass_a.
          if (edge) expected = grassPx;
          else {
            const h = hx();
            if (h % 5 === 0) expected = hexToRgb(SHORELINE_SWATCHES.outerSandAlt);
            else if (h % 3 === 0) expected = hexToRgb(SHORELINE_SWATCHES.lightMoss);
            else if (h % 7 === 0) expected = hexToRgb(SHORELINE_SWATCHES.darkMoss);
            else expected = grassPx;
          }
        }
        assert.deepEqual(got, expected, `${t.name} (${x},${y}) band=${band}`);
      }
    }
  }
});

function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

// --- 5. water never scattered into land; sand never scattered into water --

test('water pixels only occur in the water band; land swatches never occur in the water band', () => {
  const waterRgb = [WATER_FIXTURE.data[0], WATER_FIXTURE.data[1], WATER_FIXTURE.data[2]];
  for (const t of TOPOLOGY) {
    const composed = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, t.corners, { seed: SEED });
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        const band = shorelineBand(qValue(t.corners, x, y));
        const idx = (y * CELL + x) * 4;
        const px = [composed.data[idx], composed.data[idx + 1], composed.data[idx + 2]];
        const isWaterFixtureColor = px[0] === WATER_FIXTURE.data[idx] && px[1] === WATER_FIXTURE.data[idx + 1] && px[2] === WATER_FIXTURE.data[idx + 2];
        if (isWaterFixtureColor && px.join(',') === waterRgb.join(',')) assert.equal(band, 'water');
        if (band === 'water') assert.deepEqual(px, [WATER_FIXTURE.data[idx], WATER_FIXTURE.data[idx + 1], WATER_FIXTURE.data[idx + 2]]);
      }
    }
  }
});

// --- 6. no dirt fringe inversion applied to shoreline ----------------------

test('shoreline output has no fringe-style inversion field and never touches |q|-symmetric interior toggling', () => {
  const t = TOPOLOGY.find((v) => v.name === 'corner_ne');
  const composed = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, t.corners, { seed: SEED });
  assert.equal('fringeEligibleCount' in composed.stats, false);
  assert.equal('fringeChangedCount' in composed.stats, false);
});

// --- 7. saddle codes rejected --------------------------------------------

test('both diagonal saddle codes are rejected by validateShorelineRecipe', () => {
  const base = { version: 1, mode: 'shoreline_bands', cellPx: [16, 16], upscale: 64, shoreline: { seed: SEED }, variants: TOPOLOGY.map((t) => ({ ...t })) };
  for (const s of SADDLE_CODES) {
    const variants = base.variants.map((v) => ({ ...v }));
    variants[5] = { name: 'corner_ne', corners: s };
    assert.throws(() => validateShorelineRecipe({ ...base, variants }), /saddle/);
  }
});

// --- 8. locked swatches cannot be overridden -------------------------------

test('recipe cannot introduce a new colour via shoreline.swatches', () => {
  const base = { version: 1, mode: 'shoreline_bands', cellPx: [16, 16], upscale: 64, shoreline: { seed: SEED, swatches: { innerSandBase: '#FF00FF' } }, variants: TOPOLOGY.map((t) => ({ ...t })) };
  assert.throws(() => validateShorelineRecipe(base), /locked value|no new colours/);
  assert.throws(() => validateShorelineRecipe({ ...base, shoreline: { seed: SEED, swatches: { notARealKey: '#000000' } } }), /unknown key/);
});

// --- 9. determinism --------------------------------------------------------

test('same recipe and inputs produce byte-identical buffers and stable SHA-256', () => {
  for (const t of TOPOLOGY) {
    const a = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, t.corners, { seed: SEED });
    const b = composeShorelineCell(WATER_FIXTURE, GRASS_FIXTURE, t.corners, { seed: SEED });
    assert.equal(sha(a.data), sha(b.data));
  }
});

// --- 10. loud failures ------------------------------------------------------

test('invalid shoreline recipes fail loudly', () => {
  const base = { version: 1, mode: 'shoreline_bands', cellPx: [16, 16], upscale: 64, shoreline: { seed: SEED }, variants: TOPOLOGY.map((t) => ({ ...t })) };
  assert.throws(() => validateShorelineRecipe({ ...base, version: 2 }), /version/);
  assert.throws(() => validateShorelineRecipe({ ...base, mode: 'nope' }), /mode/);
  assert.throws(() => validateShorelineRecipe({ ...base, cellPx: [32, 32] }), /cellPx/);
  assert.throws(() => validateShorelineRecipe({ ...base, shoreline: {} }), /seed/);
  const dup = base.variants.map((v) => ({ ...v })); dup[1] = { ...dup[0] };
  assert.throws(() => validateShorelineRecipe({ ...base, variants: dup }), /duplicate|must be/);
});

test('wrong dimensions and non-opaque inputs fail loudly', () => {
  const small = { width: 8, height: 8, colorType: 6, data: new Uint8Array(8 * 8 * 4).fill(255) };
  assert.throws(() => composeShorelineCell(small, GRASS_FIXTURE, [1, 1, 1, 1], { seed: SEED }), /16x16/);

  fs.mkdirSync(tmp, { recursive: true });
  fs.mkdirSync(path.join(tmp, 'canon'), { recursive: true });
  const waterPath = path.join(tmp, 'water.png');
  const grassPath = path.join(tmp, 'grass.png');
  writePng(waterPath, WATER_FIXTURE, { colorType: 6 });
  const badGrass = patterned16(90); badGrass.data[3] = 128;
  writePng(grassPath, badGrass, { colorType: 6 });
  const centerCanon = path.join(tmp, 'water_a_canonical.png');
  writePng(centerCanon, { width: 32, height: 32, colorType: 2, data: new Uint8Array(32 * 32 * 4).fill(200) }, { colorType: 2 });
  const recipe = {
    version: 1, id: 'test_shoreline', mode: 'shoreline_bands', cellPx: [16, 16], upscale: 64,
    shoreline: { seed: SEED }, foregroundPath: 'water.png', backgroundPath: 'grass.png',
    canonicalSourceDir: 'canon', runtimeMasterDir: 'runtime', evidenceDir: 'evidence',
    centerCanonicalSourcePath: 'water_a_canonical.png', variants: TOPOLOGY.map((t) => ({ ...t })),
  };
  const recipePath = path.join(tmp, 'bad-alpha.recipe.json');
  fs.writeFileSync(recipePath, JSON.stringify(recipe));
  assert.throws(() => composeShorelineFamily(recipePath, { writeReport: false }), /opaque|alpha/);
});

// --- 11. integration: full family over real synthetic fixtures ------------

test('composeShorelineFamily produces a valid 13-cell family with zero shared-edge mismatches', () => {
  const root = path.join(tmp, 'integ');
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, 'canon'), { recursive: true });
  writePng(path.join(root, 'water.png'), WATER_FIXTURE, { colorType: 6 });
  writePng(path.join(root, 'grass.png'), GRASS_FIXTURE, { colorType: 6 });
  const centerCanon = { width: 1024, height: 1024, colorType: 2, data: new Uint8Array(1024 * 1024 * 4) };
  for (let y = 0; y < 1024; y += 1) for (let x = 0; x < 1024; x += 1) { const i = (y * 1024 + x) * 4; centerCanon.data[i] = 10; centerCanon.data[i + 1] = 20; centerCanon.data[i + 2] = 200; centerCanon.data[i + 3] = 255; }
  writePng(path.join(root, 'water_a_canonical.png'), centerCanon, { colorType: 2 });

  const recipe = {
    version: 1, id: 'test_shoreline_family', mode: 'shoreline_bands', cellPx: [16, 16], upscale: 64,
    shoreline: { seed: SEED }, foregroundPath: 'water.png', backgroundPath: 'grass.png',
    canonicalSourceDir: 'canon', runtimeMasterDir: 'runtime', evidenceDir: 'evidence',
    centerCanonicalSourcePath: 'water_a_canonical.png', variants: TOPOLOGY.map((t) => ({ ...t })),
  };
  const rp = path.join(root, 'r.recipe.json'); fs.writeFileSync(rp, JSON.stringify(recipe));
  const { report } = composeShorelineFamily(rp, { writeReport: true });
  assert.equal(report.variants.length, 13);
  assert.equal(report.sharedEdge.bandMismatches, 0);
  assert.equal(report.sharedEdge.sandRgbMismatches, 0);
  assert.equal(report.centerByteIdenticalToWaterA, true);
  assert.ok(report.seamBaselines.waterASelfWrap);
  assert.ok(report.seamBaselines.grassASelfWrap);
  assert.ok('shorelineWaterToWaterSeamStep' in report.seamBaselines);
  assert.ok('shorelineGrassToGrassSeamStep' in report.seamBaselines);
  for (const v of report.variants) {
    assert.equal(v.colourOrigin.unexpected, 0, v.name);
    assert.equal(v.alpha.opaque, 256, v.name);
  }
  assert.ok(fs.existsSync(path.join(root, 'evidence', 'family-report.json')));

  // Two clean runs -> stable per-variant runtime-master hashes.
  const run2 = composeShorelineFamily(rp, { writeReport: false }).report;
  report.variants.forEach((v, i) => assert.equal(v.runtimeMasterSha256, run2.variants[i].runtimeMasterSha256));
});

// --- 12. computeWrapMetrics sanity ----------------------------------------

test('computeWrapMetrics returns finite self-wrap statistics for a non-uniform image', () => {
  const m = computeWrapMetrics(GRASS_FIXTURE);
  for (const k of ['horizontalWrapStep', 'averageInternalHorizontalStep', 'horizontalWrapRatio', 'verticalWrapStep', 'averageInternalVerticalStep', 'verticalWrapRatio']) {
    assert.equal(typeof m[k], 'number');
    assert.ok(Number.isFinite(m[k]), `${k} is not finite`);
  }
});

// --- 13. dirt non-regression: recomposing the real dirt recipe is unchanged -

test('recomposing the merged dirt recipe leaves dirt pixels and packed sheet unchanged', () => {
  const dirtRecipePath = path.join(repoRoot, 'docs/art-pipeline/review/tile_farm_path_dirt_family/dirt.compositor.recipe.json');
  const packedSheetPath = path.join(repoRoot, 'assets/tilesets/tile_farm_path_dirt.png');
  const beforeSheetSha = sha(fs.readFileSync(packedSheetPath));
  const beforeCanonicalShas = {};
  const dirtDir = path.join(repoRoot, 'assets/source/generated/tile_farm_path_dirt');
  for (const f of fs.readdirSync(dirtDir)) beforeCanonicalShas[f] = sha(fs.readFileSync(path.join(dirtDir, f)));

  const { report } = composeFamily(dirtRecipePath, { writeReport: false });
  assert.equal(report.variants.length, 13);

  const afterSheetSha = sha(fs.readFileSync(packedSheetPath));
  assert.equal(afterSheetSha, beforeSheetSha, 'packed dirt sheet changed after adding the shoreline mode');
  for (const f of fs.readdirSync(dirtDir)) {
    assert.equal(sha(fs.readFileSync(path.join(dirtDir, f))), beforeCanonicalShas[f], `dirt canonical source changed: ${f}`);
  }
});

// --- 14. exhaustive adjacency: all 100 legal directed pairs (ChatGPT PR #99) -

test('exhaustive adjacency: all 14 usable codes, every compatible directed horizontal/vertical pair (50+50) match at all 16 shared positions', () => {
  const usableCodes = [...TOPOLOGY.map((t) => t.corners), [0, 0, 0, 0]];
  assert.equal(usableCodes.length, 14);
  for (const s of SADDLE_CODES) assert.ok(!usableCodes.some((c) => cornerCode(c) === s.join('')), 'saddle code leaked into the usable set');
  assert.ok(usableCodes.some((c) => cornerCode(c) === '0000'), 'usable set missing 0000');
  assert.ok(usableCodes.some((c) => cornerCode(c) === '1111'), 'usable set missing 1111 (center)');

  const bandTrace = (corners) => {
    const north = []; const south = []; const west = []; const east = [];
    for (let x = 0; x < CELL; x += 1) { north.push(shorelineBand(qValue(corners, x, 0))); south.push(shorelineBand(qValue(corners, x, CELL - 1))); }
    for (let y = 0; y < CELL; y += 1) { west.push(shorelineBand(qValue(corners, 0, y))); east.push(shorelineBand(qValue(corners, CELL - 1, y))); }
    return { north, south, west, east };
  };
  const traceByCode = new Map(usableCodes.map((c) => [cornerCode(c), bandTrace(c)]));

  let horizontalPairs = 0;
  let verticalPairs = 0;
  let mismatches = 0;
  for (const l of usableCodes) {
    for (const r of usableCodes) {
      if (l[1] === r[0] && l[2] === r[3]) { // left.east(ne,se) == right.west(nw,sw)
        horizontalPairs += 1;
        const lt = traceByCode.get(cornerCode(l)).east;
        const rt = traceByCode.get(cornerCode(r)).west;
        for (let i = 0; i < CELL; i += 1) if (lt[i] !== rt[i]) mismatches += 1;
      }
    }
  }
  for (const t of usableCodes) {
    for (const b of usableCodes) {
      if (t[3] === b[0] && t[2] === b[1]) { // top.south(sw,se) == bottom.north(nw,ne)
        verticalPairs += 1;
        const tt = traceByCode.get(cornerCode(t)).south;
        const bt = traceByCode.get(cornerCode(b)).north;
        for (let i = 0; i < CELL; i += 1) if (tt[i] !== bt[i]) mismatches += 1;
      }
    }
  }
  assert.equal(horizontalPairs, 50, 'expected exactly 50 directed horizontal compatible pairs among the 14 usable codes');
  assert.equal(verticalPairs, 50, 'expected exactly 50 directed vertical compatible pairs among the 14 usable codes');
  assert.equal(mismatches, 0);
});

// --- 15. hard-throw guard is real, not just a reported field ---------------

test('assertNoSharedEdgeMismatches throws on nonzero band or sand-edge mismatches', () => {
  assert.doesNotThrow(() => assertNoSharedEdgeMismatches(0, 0));
  assert.throws(() => assertNoSharedEdgeMismatches(1, 0), /band-class mismatch/);
  assert.throws(() => assertNoSharedEdgeMismatches(0, 1), /sand-to-sand.*RGB mismatch/);
  assert.throws(() => assertNoSharedEdgeMismatches(2, 3), /band-class mismatch/);
});

console.log(`\nShoreline terrain-blend tests passed (${passed} groups).`);
