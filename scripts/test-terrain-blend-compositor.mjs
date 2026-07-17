#!/usr/bin/env node
// Focused tests for the deterministic terrain-blend compositor.
// Pure mask/compose logic is tested with synthetic in-memory fixtures; loud
// failure paths use small fixtures under .tmp. No production art hashes are
// locked into these unit tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CELL, WEIGHT_TOTAL, TOPOLOGY, SADDLE_CODES,
  cornerScore, qValue, coreForeground, coreMask, coreForegroundCount,
  cornerCode, edgeTraces, hashPixel, fringeEligible, composeCell,
  validateRecipe, composeFamily,
} from './compose-terrain-blend-family.mjs';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const tmp = path.join(repoRoot, '.tmp', 'terrain-blend-test');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
}

// --- fixtures ------------------------------------------------------------

function solid(rgb) {
  const data = new Uint8Array(CELL * CELL * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255; }
  return { width: CELL, height: CELL, colorType: 6, data };
}

function patterned(base) {
  // Deterministic distinct-per-pixel opaque image so any single-pixel change is detectable.
  const data = new Uint8Array(CELL * CELL * 4);
  for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) {
    const i = (y * CELL + x) * 4;
    data[i] = (base + x * 3) & 255; data[i + 1] = (base + y * 5) & 255; data[i + 2] = (x * 7 + y * 11) & 255; data[i + 3] = 255;
  }
  return { width: CELL, height: CELL, colorType: 6, data };
}

const FRINGE = { threshold: 30, modulus: 3, selectedRemainder: 0, seed: 0x0000d17a };

function rotateCornersRight(c) { return [c[3], c[0], c[1], c[2]]; }
function reflectCornersH(c) { return [c[1], c[0], c[3], c[2]]; }
function rotateMaskCW(mask) {
  const out = new Uint8Array(CELL * CELL);
  for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) out[x * CELL + (CELL - 1 - y)] = mask[y * CELL + x];
  return out;
}
function reflectMaskH(mask) {
  const out = new Uint8Array(CELL * CELL);
  for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) out[y * CELL + (CELL - 1 - x)] = mask[y * CELL + x];
  return out;
}
const maskEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const sha = (buf) => crypto.createHash('sha256').update(Buffer.from(buf)).digest('hex');
const ALL_CODES = [];
for (let n = 0; n < 16; n += 1) ALL_CODES.push([(n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1]);
const isSaddle = (c) => SADDLE_CODES.some((s) => s.join('') === cornerCode(c));

// --- 1. topology names, order, codes ------------------------------------

test('topology names, order, and corner codes are exact', () => {
  const expected = [
    ['center', '1111'], ['edge_north', '1100'], ['edge_south', '0011'], ['edge_west', '1001'], ['edge_east', '0110'],
    ['corner_ne', '0100'], ['corner_nw', '1000'], ['corner_se', '0010'], ['corner_sw', '0001'],
    ['inner_corner_ne', '1011'], ['inner_corner_nw', '0111'], ['inner_corner_se', '1101'], ['inner_corner_sw', '1110'],
  ];
  assert.equal(TOPOLOGY.length, 13);
  TOPOLOGY.forEach((t, i) => {
    assert.equal(t.name, expected[i][0]);
    assert.equal(cornerCode(t.corners), expected[i][1]);
  });
});

// --- 2. core occupancy counts -------------------------------------------

test('core occupancy counts are 256 / 128 / 41 / 215', () => {
  for (const t of TOPOLOGY) {
    const n = coreForegroundCount(t.corners);
    if (t.name === 'center') assert.equal(n, 256);
    else if (t.name.startsWith('edge_')) assert.equal(n, 128);
    else if (t.name.startsWith('inner_corner_')) assert.equal(n, 215);
    else if (t.name.startsWith('corner_')) assert.equal(n, 41);
  }
  assert.equal(WEIGHT_TOTAL, (CELL - 1) * (CELL - 1));
});

// --- 3. centre identity and 0000 background identity --------------------

test('centre is exact foreground identity; 0000 is exact background identity', () => {
  const fg = patterned(10); const bg = patterned(200);
  const center = composeCell(fg, bg, [1, 1, 1, 1], FRINGE);
  assert.deepEqual([...center.data], [...fg.data]);
  assert.equal(center.stats.fringeChangedCount, 0);
  const grass = composeCell(fg, bg, [0, 0, 0, 0], FRINGE);
  assert.deepEqual([...grass.data], [...bg.data]);
  assert.equal(grass.stats.fringeChangedCount, 0);
  assert.equal(coreForegroundCount([0, 0, 0, 0]), 0);
});

// --- 4. exact complement property ---------------------------------------

test('q(complement) = -q(original); core masks are exact inverses', () => {
  for (const c of ALL_CODES) {
    const comp = c.map((b) => 1 - b);
    for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) {
      assert.equal(qValue(comp, x, y), -qValue(c, x, y));
      assert.notEqual(qValue(c, x, y), 0); // never a tie
    }
    const a = coreMask(c); const b = coreMask(comp);
    for (let i = 0; i < a.length; i += 1) assert.equal(a[i] ^ b[i], 1);
  }
});

// --- 5. rotations / reflections map to named variants -------------------

test('90-degree rotations and horizontal reflection map core masks correctly', () => {
  for (const t of TOPOLOGY) {
    const rotated = rotateMaskCW(coreMask(t.corners));
    assert.ok(maskEq(rotated, coreMask(rotateCornersRight(t.corners))), `rotate ${t.name}`);
    const reflected = reflectMaskH(coreMask(t.corners));
    assert.ok(maskEq(reflected, coreMask(reflectCornersH(t.corners))), `reflect ${t.name}`);
  }
  // Spot semantic check: rotating edge_north CW yields edge_east.
  assert.ok(maskEq(rotateMaskCW(coreMask([1, 1, 0, 0])), coreMask([0, 1, 1, 0])));
});

// --- 6. shared-edge classification across compatible neighbours ---------

test('every compatible neighbour pair (incl. 0000) shares identical edge classification at all 16 positions', () => {
  const usable = ALL_CODES.filter((c) => !isSaddle(c));
  let horizontal = 0; let vertical = 0;
  for (const l of usable) for (const r of usable) {
    // horizontal: left.east corners (ne,se) match right.west corners (nw,sw)
    if (l[1] === r[0] && l[2] === r[3]) {
      const lt = edgeTraces(l); const rt = edgeTraces(r);
      for (let i = 0; i < CELL; i += 1) assert.equal(lt.east[i], rt.west[i]);
      horizontal += 1;
    }
  }
  for (const top of usable) for (const bot of usable) {
    // vertical: top.south corners (sw,se) match bottom.north corners (nw,ne)
    if (top[3] === bot[0] && top[2] === bot[1]) {
      const tt = edgeTraces(top); const bt = edgeTraces(bot);
      for (let i = 0; i < CELL; i += 1) assert.equal(tt.south[i], bt.north[i]);
      vertical += 1;
    }
  }
  assert.ok(horizontal > 0 && vertical > 0);
});

// --- 7. reject saddle codes ---------------------------------------------

test('both diagonal saddle codes are rejected as production variants', () => {
  for (const s of SADDLE_CODES) {
    const variants = TOPOLOGY.map((t) => ({ ...t }));
    variants[5] = { name: 'corner_ne', corners: s }; // inject saddle at a production slot
    assert.throws(() => validateRecipe({ version: 1, mode: 'binary_material_interlock', cellPx: [16, 16], upscale: 64, fringe: FRINGE, variants }), /saddle/);
  }
});

// --- 8. fringe never touches outer edge or |q| > threshold --------------

test('fringe never changes an outer-edge pixel or a pixel with |q| > 30', () => {
  // eligibility predicate
  for (let x = 0; x < CELL; x += 1) for (let y = 0; y < CELL; y += 1) {
    assert.equal(fringeEligible(x, y, 0, 30) && (x === 0 || y === 0 || x === 15 || y === 15), false);
  }
  assert.equal(fringeEligible(5, 5, 31, 30), false);
  assert.equal(fringeEligible(5, 5, 30, 30), true);
  // composed border pixels always equal the core selection (solid distinct inputs)
  const fg = solid([200, 30, 30]); const bg = solid([30, 30, 200]);
  for (const t of TOPOLOGY) {
    const c = composeCell(fg, bg, t.corners, FRINGE);
    for (let x = 0; x < CELL; x += 1) for (let y = 0; y < CELL; y += 1) {
      if (x === 0 || y === 0 || x === 15 || y === 15) {
        const core = coreForeground(t.corners, x, y) ? fg : bg;
        const i = (y * CELL + x) * 4;
        assert.equal(c.data[i], core.data[i]);
        assert.equal(c.data[i + 2], core.data[i + 2]);
      }
    }
  }
});

// --- 9. determinism ------------------------------------------------------

test('same recipe and inputs produce byte-identical buffers and stable SHA-256', () => {
  const fg = patterned(3); const bg = patterned(150);
  for (const t of TOPOLOGY) {
    const a = composeCell(fg, bg, t.corners, FRINGE);
    const b = composeCell(fg, bg, t.corners, FRINGE);
    assert.equal(sha(a.data), sha(b.data));
    assert.deepEqual([...a.data], [...b.data]);
  }
  // hash is stable and stays within 32-bit unsigned range
  assert.equal(hashPixel(5, 7, 0x0000d17a), hashPixel(5, 7, 0x0000d17a));
  assert.ok(hashPixel(9, 2, 123) >= 0 && hashPixel(9, 2, 123) <= 0xffffffff);
});

// --- 10. single-pixel input sensitivity ---------------------------------

test('a one-pixel input change changes a generated output hash (not silently ignored)', () => {
  const fg = patterned(3); const bg = patterned(150);
  const before = composeCell(fg, bg, [1, 0, 0, 0], FRINGE); // corner_nw: interior (1,1) is foreground
  const fg2 = { ...fg, data: new Uint8Array(fg.data) };
  const idx = (1 * CELL + 1) * 4; fg2.data[idx] ^= 0xff;
  const after = composeCell(fg2, bg, [1, 0, 0, 0], FRINGE);
  assert.notEqual(sha(before.data), sha(after.data));
});

// --- 11. loud failures ---------------------------------------------------

test('invalid recipes fail loudly', () => {
  const base = { version: 1, mode: 'binary_material_interlock', cellPx: [16, 16], upscale: 64, fringe: FRINGE, variants: TOPOLOGY.map((t) => ({ ...t })) };
  assert.throws(() => validateRecipe({ ...base, version: 2 }), /version/);
  assert.throws(() => validateRecipe({ ...base, mode: 'nope' }), /mode/);
  assert.throws(() => validateRecipe({ ...base, cellPx: [32, 32] }), /cellPx/);
  const dup = base.variants.map((v) => ({ ...v })); dup[1] = { ...dup[0] };
  assert.throws(() => validateRecipe({ ...base, variants: dup }), /duplicate|must be/);
  assert.throws(() => validateRecipe({ ...base, variants: base.variants.slice(0, 12) }), /exactly|missing/);
});

test('wrong dimensions and partial alpha fail loudly', () => {
  const small = { width: 8, height: 8, colorType: 6, data: new Uint8Array(8 * 8 * 4).fill(255) };
  assert.throws(() => composeCell(small, solid([0, 0, 0]), [1, 1, 1, 1], FRINGE), /16x16/);

  fs.mkdirSync(tmp, { recursive: true });
  const fgPath = path.join(tmp, 'fg.png');
  const bgPath = path.join(tmp, 'bg.png');
  writePng(fgPath, patterned(20), { colorType: 6 });
  // background with a partial-alpha pixel
  const badBg = patterned(120); badBg.data[3] = 128;
  writePng(bgPath, badBg, { colorType: 6 });
  const recipe = {
    version: 1, id: 'test_blend', mode: 'binary_material_interlock', cellPx: [16, 16], upscale: 64,
    fringe: FRINGE, foregroundPath: 'fg.png', backgroundPath: 'bg.png',
    canonicalSourceDir: 'canon', runtimeMasterDir: 'runtime', evidenceDir: 'evidence',
    preserveCenterCanonical: false, variants: TOPOLOGY.map((t) => ({ ...t })),
  };
  const recipePath = path.join(tmp, 'bad-alpha.recipe.json');
  fs.writeFileSync(recipePath, JSON.stringify(recipe));
  assert.throws(() => composeFamily(recipePath, { writeReport: false }), /opaque|alpha/);
});

test('missing input and path escape fail loudly', () => {
  fs.mkdirSync(tmp, { recursive: true });
  writePng(path.join(tmp, 'fg.png'), patterned(20), { colorType: 6 });
  writePng(path.join(tmp, 'bg.png'), patterned(120), { colorType: 6 });
  const good = {
    version: 1, id: 'test_blend', mode: 'binary_material_interlock', cellPx: [16, 16], upscale: 64,
    fringe: FRINGE, foregroundPath: 'fg.png', backgroundPath: 'bg.png',
    canonicalSourceDir: 'canon', runtimeMasterDir: 'runtime', evidenceDir: 'evidence',
    preserveCenterCanonical: false, variants: TOPOLOGY.map((t) => ({ ...t })),
  };
  const missing = { ...good, foregroundPath: 'does-not-exist.png' };
  const mp = path.join(tmp, 'missing.recipe.json'); fs.writeFileSync(mp, JSON.stringify(missing));
  assert.throws(() => composeFamily(mp, { writeReport: false }), /PNG|exist|ENOENT|Not a PNG/i);

  const escape = { ...good, canonicalSourceDir: '../'.repeat(12) + 'escape-out' };
  const ep = path.join(tmp, 'escape.recipe.json'); fs.writeFileSync(ep, JSON.stringify(escape));
  assert.throws(() => composeFamily(ep, { writeReport: false }), /outside the repository/);
});

// --- integration: full family determinism over two clean runs -----------

test('composeFamily produces stable per-variant hashes across two clean runs', () => {
  const root = path.join(tmp, 'integ');
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, 'canon'), { recursive: true });
  writePng(path.join(root, 'fg.png'), patterned(40), { colorType: 6 });
  writePng(path.join(root, 'bg.png'), patterned(170), { colorType: 6 });
  const recipe = {
    version: 1, id: 'test_blend', mode: 'binary_material_interlock', cellPx: [16, 16], upscale: 64,
    fringe: FRINGE, foregroundPath: 'fg.png', backgroundPath: 'bg.png',
    canonicalSourceDir: 'canon', runtimeMasterDir: 'runtime', evidenceDir: 'evidence',
    paletteTolerance: 40, preserveCenterCanonical: false, variants: TOPOLOGY.map((t) => ({ ...t })),
  };
  const rp = path.join(root, 'r.recipe.json'); fs.writeFileSync(rp, JSON.stringify(recipe));
  const run1 = composeFamily(rp, { writeReport: false }).report;
  const run2 = composeFamily(rp, { writeReport: false }).report;
  run1.variants.forEach((v, i) => {
    assert.equal(v.runtimeMasterSha256, run2.variants[i].runtimeMasterSha256);
    assert.equal(v.colourOrigin.unexpected, 0);
    assert.equal(v.alpha.opaque, 256);
  });
  assert.equal(run1.sharedEdge.mismatches, 0);
  assert.equal(run1.mixedPreview.incompatibleSharedEdges, 0);
});

console.log(`\nTerrain-blend compositor tests passed (${passed} groups).`);
