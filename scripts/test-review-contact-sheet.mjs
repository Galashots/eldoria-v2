#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildReviewContactSheet, CONTACT_SHEET } from './build-review-contact-sheet.mjs';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

const root = path.resolve('.tmp', 'review-contact-sheet-test');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });

const definitions = [
  ['tile_farm_grass_base', 'grass_a', 'GRASS A', [16, 16], [8, 15]],
  ['tile_farm_path_dirt', 'center', 'DIRT CENTER', [16, 16], [8, 15]],
  ['tile_farm_water_base', 'water_a', 'WATER A', [16, 16], [8, 15]],
  ['env_farm_tree', 'oak', 'OAK', [32, 48], [16, 47]],
  ['env_farm_fence', 'rail_horizontal', 'FENCE RAIL', [16, 32], [8, 31]],
  ['env_farm_rock_medium', 'rock_a', 'ROCK A', [32, 32], [16, 31]],
  ['env_wildbloom_landmark', 'root_star_revealed', 'ROOT STAR', [32, 32], [16, 31]]
];

const hash = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

function syntheticImage(width, height, seed) {
  const image = { width, height, colorType: 6, data: new Uint8Array(width * height * 4) };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4;
    image.data[index] = (31 + seed * 23 + x * 7) % 256;
    image.data[index + 1] = (47 + seed * 29 + y * 5) % 256;
    image.data[index + 2] = (59 + seed * 17 + x + y) % 256;
    image.data[index + 3] = 255;
  }
  if (seed === 0) image.data[3] = 128;
  return image;
}

const items = definitions.map(([id, variant, label, dimensions, pivot], order) => {
  const filePath = path.join(root, `${order}.png`);
  writePng(filePath, syntheticImage(dimensions[0], dimensions[1], order));
  return {
    slot: order,
    order,
    id,
    variant,
    label,
    path: path.basename(filePath),
    dimensions,
    pivot,
    sha256: hash(filePath),
    approvalVerdict: order % 2 === 0 ? 'APPROVED SOURCE CANDIDATE' : 'APPROVED RUNTIME MASTER'
  };
});

function writeManifest(name, transform = (manifest) => manifest) {
  const manifest = transform({ version: 1, id: name, expectedCount: 7, items: structuredClone(items) });
  const manifestPath = path.join(root, `${name}.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

const manifestPath = writeManifest('synthetic_batch_a');
const outputA = path.join(root, 'sheet-a.png');
const reportA = path.join(root, 'sheet-a.json');
const resultA = buildReviewContactSheet(manifestPath, { outputPath: outputA, reportPath: reportA });

assert.deepEqual([resultA.report.geometry.dimensions[0], resultA.report.geometry.dimensions[1]], [1312, 1072]);
assert.equal(resultA.report.geometry.nearestNeighborScale, 8);
assert.equal(resultA.report.geometry.items.length, 7);
assert.deepEqual(resultA.report.claims, {
  purpose: 'BATCH A REVIEW CONTACT SHEET',
  sourceOnlyReview: true,
  packedSheet: false,
  targetFamiliesComplete: false,
  runtimeIntegrated: false,
  physicalIpadValidated: false,
  childValidated: false,
  approvalScope: 'INDIVIDUAL ASSET VERDICTS ONLY'
});
assert.equal(resultA.report.hashes.outputSha256, hash(outputA));
assert.deepEqual(resultA.report.hashes.inputs.map((entry) => entry.sha256), items.map((item) => item.sha256));

assert.deepEqual(resultA.report.geometry.rows, {
  top: { baselineY: 456, cardTop: 64, cardBottom: 536, stageTop: 80, stageBottom: 464, labelTop: 488 },
  bottom: { baselineY: 944, cardTop: 552, cardBottom: 1024, stageTop: 568, stageBottom: 952, labelTop: 976 }
});
assert.deepEqual(resultA.report.geometry.slots, [
  { slot: 0, row: 'top', centerX: 176, cardLeft: 24, cardRight: 328 },
  { slot: 1, row: 'top', centerX: 496, cardLeft: 344, cardRight: 648 },
  { slot: 2, row: 'top', centerX: 816, cardLeft: 664, cardRight: 968 },
  { slot: 3, row: 'top', centerX: 1136, cardLeft: 984, cardRight: 1288 },
  { slot: 4, row: 'bottom', centerX: 336, cardLeft: 184, cardRight: 488 },
  { slot: 5, row: 'bottom', centerX: 656, cardLeft: 504, cardRight: 808 },
  { slot: 6, row: 'bottom', centerX: 976, cardLeft: 824, cardRight: 1128 }
]);
assert.deepEqual(
  resultA.report.geometry.slots.map((slot) => [slot.cardLeft, resultA.report.geometry.rows[slot.row].cardTop, slot.cardRight - slot.cardLeft, resultA.report.geometry.rows[slot.row].cardBottom - resultA.report.geometry.rows[slot.row].cardTop]),
  [[24,64,304,472], [344,64,304,472], [664,64,304,472], [984,64,304,472], [184,552,304,472], [504,552,304,472], [824,552,304,472]]
);
assert.deepEqual(
  resultA.report.geometry.slots.map((slot) => [slot.centerX - 128, resultA.report.geometry.rows[slot.row].stageTop, 256, resultA.report.geometry.rows[slot.row].stageBottom - resultA.report.geometry.rows[slot.row].stageTop]),
  [[48,80,256,384], [368,80,256,384], [688,80,256,384], [1008,80,256,384], [208,568,256,384], [528,568,256,384], [848,568,256,384]]
);
assert.deepEqual(
  resultA.report.geometry.slots.slice(0, 4).slice(1).map((slot, index) => slot.cardLeft - resultA.report.geometry.slots[index].cardRight),
  [16, 16, 16]
);
assert.deepEqual(
  resultA.report.geometry.slots.slice(4).slice(1).map((slot, index) => slot.cardLeft - resultA.report.geometry.slots[index + 4].cardRight),
  [16, 16]
);
assert.deepEqual(
  resultA.report.geometry.items.map(({ slot, order, id, variant, scaledBounds, pivotSheetPx }) => ({ slot, order, id, variant, scaledBounds, pivotSheetPx })),
  [
    { slot: 0, order: 0, id: 'tile_farm_grass_base', variant: 'grass_a', scaledBounds: [112,336,128,128], pivotSheetPx: [176,456] },
    { slot: 1, order: 1, id: 'tile_farm_path_dirt', variant: 'center', scaledBounds: [432,336,128,128], pivotSheetPx: [496,456] },
    { slot: 2, order: 2, id: 'tile_farm_water_base', variant: 'water_a', scaledBounds: [752,336,128,128], pivotSheetPx: [816,456] },
    { slot: 3, order: 3, id: 'env_farm_tree', variant: 'oak', scaledBounds: [1008,80,256,384], pivotSheetPx: [1136,456] },
    { slot: 4, order: 4, id: 'env_farm_fence', variant: 'rail_horizontal', scaledBounds: [272,696,128,256], pivotSheetPx: [336,944] },
    { slot: 5, order: 5, id: 'env_farm_rock_medium', variant: 'rock_a', scaledBounds: [528,696,256,256], pivotSheetPx: [656,944] },
    { slot: 6, order: 6, id: 'env_wildbloom_landmark', variant: 'root_star_revealed', scaledBounds: [848,696,256,256], pivotSheetPx: [976,944] }
  ]
);

const sheet = readPng(outputA);
assert.deepEqual([sheet.width, sheet.height], [CONTACT_SHEET.width, CONTACT_SHEET.height]);
for (const geometry of resultA.report.geometry.items) {
  const source = readPng(path.join(root, geometry.source));
  const [left, top] = geometry.scaledBounds;
  const expectedBaseline = resultA.report.geometry.rows[geometry.row].baselineY;
  assert.equal(geometry.pivotSheetPx[1], expectedBaseline, `${geometry.id} must share its row pivot baseline`);
  assert.equal(top + geometry.pivot[1] * 8, expectedBaseline, `${geometry.id} pivot must map to its baseline`);
  for (let sy = 0; sy < source.height; sy += 1) for (let sx = 0; sx < source.width; sx += 1) {
    const sourceOffset = (sy * source.width + sx) * 4;
    const sourcePixel = Array.from(source.data.subarray(sourceOffset, sourceOffset + 4));
    const checkerA = [75, 79, 86];
    const checkerB = [54, 59, 66];
    const slot = resultA.report.geometry.slots[geometry.slot];
    const row = resultA.report.geometry.rows[geometry.row];
    const stageLeft = slot.centerX - 128;
    const checker = (((left + sx * 8 - stageLeft) / 16 | 0) + ((top + sy * 8 - row.stageTop) / 16 | 0)) % 2 === 0 ? checkerA : checkerB;
    const alpha = sourcePixel[3] / 255;
    const expected = sourcePixel[3] === 255
      ? sourcePixel
      : sourcePixel.slice(0, 3).map((channel, index) => Math.round(channel * alpha + checker[index] * (1 - alpha))).concat(255);
    for (let oy = 0; oy < 8; oy += 1) for (let ox = 0; ox < 8; ox += 1) {
      const sheetOffset = ((top + sy * 8 + oy) * sheet.width + left + sx * 8 + ox) * 4;
      assert.deepEqual(Array.from(sheet.data.subarray(sheetOffset, sheetOffset + 4)), expected, `${geometry.id} pixel ${sx},${sy} must replicate as an exact 8x block`);
    }
  }
}

const outputB = path.join(root, 'sheet-b.png');
const reportB = path.join(root, 'sheet-b.json');
const resultB = buildReviewContactSheet(manifestPath, { outputPath: outputB, reportPath: reportB });
assert.equal(hash(outputB), hash(outputA), 'same inputs must produce the same PNG hash');
assert.equal(resultB.report.hashes.outputSha256, resultA.report.hashes.outputSha256);

function expectFailure(name, transform, pattern) {
  const manifest = writeManifest(name, transform);
  const output = path.join(root, `${name}-must-not-exist.png`);
  const report = path.join(root, `${name}-must-not-exist.json`);
  assert.throws(() => buildReviewContactSheet(manifest, { outputPath: output, reportPath: report }), pattern);
  assert.equal(fs.existsSync(output), false, `${name} must fail before PNG output`);
  assert.equal(fs.existsSync(report), false, `${name} must fail before JSON output`);
}

expectFailure('missing_file', (manifest) => {
  manifest.items[0].path = 'missing.png';
  return manifest;
}, /path does not exist/);

expectFailure('absolute_path', (manifest) => {
  manifest.items[0].path = path.resolve(root, '0.png');
  return manifest;
}, /path must be relative to the manifest/);

expectFailure('wrong_dimensions', (manifest) => {
  manifest.items[1].dimensions = [15, 16];
  return manifest;
}, /PNG is 16x16/);

expectFailure('wrong_count', (manifest) => {
  manifest.expectedCount = 6;
  manifest.items.pop();
  return manifest;
}, /expectedCount must be 7/);

expectFailure('duplicate_slot_order', (manifest) => {
  manifest.items[1].slot = manifest.items[0].slot;
  manifest.items[1].order = manifest.items[0].order;
  return manifest;
}, /duplicates/);

expectFailure('wrong_hash', (manifest) => {
  manifest.items[2].sha256 = '0'.repeat(64);
  return manifest;
}, /sha256 does not match/);

expectFailure('wrong_verdict', (manifest) => {
  manifest.items[3].approvalVerdict = 'HOLD';
  return manifest;
}, /not an allowed approval verdict/);

const cliScript = path.resolve('scripts/build-review-contact-sheet.mjs');
const typoOutput = path.join(root, 'typo-must-not-exist.png');
const typoReport = path.join(root, 'typo-must-not-exist.json');
const typoResult = spawnSync(process.execPath, [
  cliScript, '--manifest', manifestPath, '--out', typoOutput, '--reprot', typoReport
], { encoding: 'utf8' });
assert.equal(typoResult.status, 1);
assert.match(typoResult.stderr, /Unknown option: --reprot/);
assert.equal(fs.existsSync(typoOutput), false);
assert.equal(fs.existsSync(typoReport), false);

const duplicateOutputA = path.join(root, 'duplicate-a-must-not-exist.png');
const duplicateOutputB = path.join(root, 'duplicate-b-must-not-exist.png');
const duplicateResult = spawnSync(process.execPath, [
  cliScript, '--manifest', manifestPath, '--out', duplicateOutputA, '--out', duplicateOutputB
], { encoding: 'utf8' });
assert.equal(duplicateResult.status, 1);
assert.match(duplicateResult.stderr, /Duplicate option: --out/);
assert.equal(fs.existsSync(duplicateOutputA), false);
assert.equal(fs.existsSync(duplicateOutputB), false);

const nullManifest = path.join(root, 'null-root.json');
fs.writeFileSync(nullManifest, 'null\n');
const nullOutput = path.join(root, 'null-must-not-exist.png');
const nullReport = path.join(root, 'null-must-not-exist.json');
assert.throws(
  () => buildReviewContactSheet(nullManifest, { outputPath: nullOutput, reportPath: nullReport }),
  /root must be a JSON object/
);
assert.equal(fs.existsSync(nullOutput), false);
assert.equal(fs.existsSync(nullReport), false);

console.log('Review contact-sheet test passed.');
