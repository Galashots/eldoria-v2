#!/usr/bin/env node
// Focused tests for the Farm grass-scatter runtime-pack pipeline
// (scripts/compose-farm-scatter-tileset.mjs): declared order, zero-drift
// family-sheet packing from the approved runtime masters, and the 2x
// nearest-neighbour public runtime sheet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './normalize-asset-sheet.mjs';
import { validateAssetSheet } from './validate-asset-sheet.mjs';
import {
  composeFarmScatterTileset,
  MANIFEST_PATH,
  FAMILY_SHEET_PATH,
  RUNTIME_SHEET_PATH,
  CELL_ORDER,
  UPSCALE
} from './compose-farm-scatter-tileset.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW_DIR = path.join(ROOT, 'docs', 'art-pipeline', 'review', 'tile_farm_grass_scatter_family');
const TARGETS_PATH = path.join(ROOT, 'docs', 'visual-targets', 'farm_village_tile_targets.json');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
}

composeFarmScatterTileset();

test("declared pack order matches the approved target's variants field", () => {
  const targets = JSON.parse(fs.readFileSync(TARGETS_PATH, 'utf8'));
  const target = targets.targets.find((t) => t.id === 'tile_farm_grass_scatter');
  assert.ok(target, 'tile_farm_grass_scatter target must exist');
  assert.deepEqual(CELL_ORDER, target.variants);
  assert.deepEqual(CELL_ORDER, ['tuft_a', 'tuft_b', 'pebble_a', 'flower_a']);
});

test('manifest frames pack in the declared order with no duplicate or missing cells', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  assert.equal(manifest.frames.length, CELL_ORDER.length);
  CELL_ORDER.forEach((id, index) => {
    const frame = manifest.frames.find((f) => f.sourceRef === id);
    assert.ok(frame, `manifest is missing a frame for ${id}`);
    assert.deepEqual(frame.destCell, [index, 0]);
  });
  const validation = validateAssetSheet(MANIFEST_PATH);
  assert.ok(validation.ok, (validation.errors ?? []).join('\n'));
});

test('family sheet is a zero-drift 1:1 copy of each approved runtime master', () => {
  const family = readPng(FAMILY_SHEET_PATH);
  assert.deepEqual([family.width, family.height], [16 * CELL_ORDER.length, 16]);
  CELL_ORDER.forEach((id, index) => {
    const master = readPng(path.join(REVIEW_DIR, `${id}.approved-runtime-master.png`));
    assert.deepEqual([master.width, master.height], [16, 16]);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const src = (y * 16 + x) * 4;
        const dst = (y * family.width + index * 16 + x) * 4;
        assert.deepEqual(
          [family.data[dst], family.data[dst + 1], family.data[dst + 2], family.data[dst + 3]],
          [master.data[src], master.data[src + 1], master.data[src + 2], master.data[src + 3]],
          `${id} pixel (${x},${y}) drifted from its approved runtime master`
        );
      }
    }
  });
});

test('public runtime sheet is an exact 2x nearest-neighbour of the family sheet (uniform blocks, zero diff)', () => {
  const family = readPng(FAMILY_SHEET_PATH);
  const runtime = readPng(RUNTIME_SHEET_PATH);
  assert.deepEqual([runtime.width, runtime.height], [family.width * UPSCALE, family.height * UPSCALE]);
  for (let y = 0; y < family.height; y += 1) {
    for (let x = 0; x < family.width; x += 1) {
      const src = (y * family.width + x) * 4;
      const expected = [family.data[src], family.data[src + 1], family.data[src + 2], family.data[src + 3]];
      for (let by = 0; by < UPSCALE; by += 1) {
        for (let bx = 0; bx < UPSCALE; bx += 1) {
          const dst = ((y * UPSCALE + by) * runtime.width + x * UPSCALE + bx) * 4;
          assert.deepEqual(
            [runtime.data[dst], runtime.data[dst + 1], runtime.data[dst + 2], runtime.data[dst + 3]],
            expected,
            `runtime block (${x},${y}) sub-pixel (${bx},${by}) is not a uniform ${UPSCALE}x copy`
          );
        }
      }
    }
  }
});

test('deterministic regeneration: re-running twice produces byte-identical sheets', () => {
  const before = { family: fs.readFileSync(FAMILY_SHEET_PATH), runtime: fs.readFileSync(RUNTIME_SHEET_PATH) };
  composeFarmScatterTileset();
  const after = { family: fs.readFileSync(FAMILY_SHEET_PATH), runtime: fs.readFileSync(RUNTIME_SHEET_PATH) };
  assert.ok(before.family.equals(after.family), 'family sheet changed on re-run');
  assert.ok(before.runtime.equals(after.runtime), 'runtime sheet changed on re-run');
});

console.log(`${passed} passed`);
