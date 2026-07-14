#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import { reviewAsset } from './review-asset.mjs';

const root = path.resolve('.tmp', 'asset-review-test');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });

const source = { width: 16, height: 16, colorType: 6, data: new Uint8Array(16 * 16 * 4) };
for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) {
  const i = (y * 16 + x) * 4;
  source.data[i] = 23 + ((x + y) % 2) * 9;
  source.data[i + 1] = 79 + ((x + y) % 2) * 8;
  source.data[i + 2] = 29;
  source.data[i + 3] = 255;
}
writePng(path.join(root, 'source.png'), source);

const manifestPath = path.join(root, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify({
  version: 1,
  id: 'test_review_grass',
  target: { outputPath: 'runtime.png', cellPx: [16, 16], cols: 1, rows: 1 },
  sources: { source: { path: 'source.png', background: { mode: 'alpha' } } },
  frames: [{ sourceRef: 'source', destCell: [0, 0], trim: 'none', fit: 'fill', anchor: 'top_left' }]
}, null, 2));

const palettePath = path.join(root, 'palette.json');
fs.writeFileSync(palettePath, JSON.stringify({ families: { forest: ['#174F1D', '#325E19'] } }));
const outDir = path.join(root, 'evidence');
const result = reviewAsset(manifestPath, { outDir, palettePath, families: ['forest'], tolerance: 40 });

assert.deepEqual(result.report.dimensions, [16, 16]);
assert.equal(result.report.frames, 1);
assert.equal(result.report.alpha.opaque, 256);
assert.equal(result.report.alpha.transparent, 0);
assert.equal(result.report.palette.withinTolerance, 256);
assert.ok(result.report.seams.horizontal.ratio >= 0);
assert.equal(readPng(path.join(outDir, 'preview-20x.png')).width, 320);
assert.deepEqual([readPng(path.join(outDir, 'tile-3x3-8x.png')).width, readPng(path.join(outDir, 'tile-3x3-8x.png')).height], [384, 384]);
assert.deepEqual([readPng(path.join(outDir, 'field-12x8-3x.png')).width, readPng(path.join(outDir, 'field-12x8-3x.png')).height], [576, 384]);
assert.deepEqual([readPng(path.join(outDir, 'comparison-panel.png')).width, readPng(path.join(outDir, 'comparison-panel.png')).height], [864, 288]);
assert.ok(fs.existsSync(path.join(outDir, 'review.json')));
assert.deepEqual(result.report.evidence, ['preview-20x.png', 'tile-3x3-8x.png', 'field-12x8-3x.png', 'comparison-panel.png']);
assert.equal('connectivity' in result.report, false);

function fillRect(image, x, y, width, height, color) {
  for (let yy = y; yy < y + height; yy += 1) for (let xx = x; xx < x + width; xx += 1) {
    const index = (yy * image.width + xx) * 4;
    image.data.set(color, index);
  }
}

const fence = { width: 16, height: 32, colorType: 6, data: new Uint8Array(16 * 32 * 4) };
fillRect(fence, 0, 10, 16, 2, [103, 75, 31, 255]);
fillRect(fence, 0, 18, 16, 2, [146, 107, 42, 255]);
fillRect(fence, 7, 7, 2, 25, [65, 46, 21, 255]);
const fenceSourcePath = path.join(root, 'fence-source.png');
writePng(fenceSourcePath, fence);

function writeFenceManifest(name, sourceName) {
  const manifest = path.join(root, `${name}-manifest.json`);
  fs.writeFileSync(manifest, JSON.stringify({
    version: 1,
    id: name,
    target: { outputPath: `${name}-runtime.png`, cellPx: [16, 32], cols: 1, rows: 1 },
    sources: { source: { path: sourceName, background: { mode: 'alpha' } } },
    frames: [{ sourceRef: 'source', destCell: [0, 0], trim: 'none', fit: 'fill', anchor: 'top_left' }]
  }, null, 2));
  return manifest;
}

const fenceOutDir = path.join(root, 'fence-evidence');
const fenceResult = reviewAsset(
  writeFenceManifest('test_review_modular_fence', path.basename(fenceSourcePath)),
  { outDir: fenceOutDir, modularAxis: 'horizontal' }
);
assert.deepEqual(fenceResult.report.connectivity.horizontal.sharedRuns, [[10, 11], [18, 19]]);
assert.deepEqual(fenceResult.report.connectivity.horizontal.leftOnlyRows, []);
assert.deepEqual(fenceResult.report.connectivity.horizontal.rightOnlyRows, []);
assert.deepEqual(
  [readPng(path.join(fenceOutDir, 'strip-horizontal-8x.png')).width, readPng(path.join(fenceOutDir, 'strip-horizontal-8x.png')).height],
  [640, 256]
);
assert.deepEqual(
  [readPng(path.join(fenceOutDir, 'connection-edges-horizontal-20x.png')).width, readPng(path.join(fenceOutDir, 'connection-edges-horizontal-20x.png')).height],
  [160, 640]
);

const brokenFence = { ...fence, data: new Uint8Array(fence.data) };
fillRect(brokenFence, 15, 18, 1, 2, [0, 0, 0, 0]);
const brokenSourcePath = path.join(root, 'broken-fence-source.png');
writePng(brokenSourcePath, brokenFence);
const brokenResult = reviewAsset(
  writeFenceManifest('test_review_broken_modular_fence', path.basename(brokenSourcePath)),
  { outDir: path.join(root, 'broken-fence-evidence'), modularAxis: 'horizontal' }
);
assert.deepEqual(brokenResult.report.connectivity.horizontal.sharedRuns, [[10, 11]]);
assert.deepEqual(brokenResult.report.connectivity.horizontal.leftOnlyRows, [18, 19]);
assert.deepEqual(brokenResult.report.connectivity.horizontal.rightOnlyRows, []);

const verticalFence = { width: 16, height: 32, colorType: 6, data: new Uint8Array(16 * 32 * 4) };
fillRect(verticalFence, 4, 0, 2, 32, [103, 75, 31, 255]);
fillRect(verticalFence, 10, 0, 2, 32, [146, 107, 42, 255]);
fillRect(verticalFence, 0, 15, 16, 2, [65, 46, 21, 255]);
const verticalSourcePath = path.join(root, 'vertical-fence-source.png');
writePng(verticalSourcePath, verticalFence);
const verticalOutDir = path.join(root, 'vertical-fence-evidence');
const verticalResult = reviewAsset(
  writeFenceManifest('test_review_vertical_modular_fence', path.basename(verticalSourcePath)),
  { outDir: verticalOutDir, modularAxis: 'vertical' }
);
assert.deepEqual(verticalResult.report.connectivity.vertical.sharedRuns, [[4, 5], [10, 11]]);
assert.deepEqual(verticalResult.report.connectivity.vertical.topOnlyColumns, []);
assert.deepEqual(verticalResult.report.connectivity.vertical.bottomOnlyColumns, []);
assert.deepEqual(
  [readPng(path.join(verticalOutDir, 'strip-vertical-8x.png')).width, readPng(path.join(verticalOutDir, 'strip-vertical-8x.png')).height],
  [128, 1280]
);
assert.deepEqual(
  [readPng(path.join(verticalOutDir, 'connection-edges-vertical-20x.png')).width, readPng(path.join(verticalOutDir, 'connection-edges-vertical-20x.png')).height],
  [320, 160]
);

const narrowFence = { width: 3, height: 5, colorType: 6, data: new Uint8Array(3 * 5 * 4) };
fillRect(narrowFence, 0, 1, 3, 1, [103, 75, 31, 255]);
fillRect(narrowFence, 0, 3, 3, 1, [146, 107, 42, 255]);
const narrowSourcePath = path.join(root, 'narrow-fence-source.png');
writePng(narrowSourcePath, narrowFence);
const narrowManifestPath = path.join(root, 'narrow-fence-manifest.json');
fs.writeFileSync(narrowManifestPath, JSON.stringify({
  version: 1,
  id: 'test_review_narrow_modular_fence',
  target: { outputPath: 'narrow-fence-runtime.png', cellPx: [3, 5], cols: 1, rows: 1 },
  sources: { source: { path: path.basename(narrowSourcePath), background: { mode: 'alpha' } } },
  frames: [{ sourceRef: 'source', destCell: [0, 0], trim: 'none', fit: 'fill', anchor: 'top_left' }]
}, null, 2));
const narrowOutDir = path.join(root, 'narrow-fence-evidence');
const narrowResult = reviewAsset(narrowManifestPath, { outDir: narrowOutDir, modularAxis: 'horizontal' });
assert.deepEqual(narrowResult.report.connectivity.horizontal.sharedRuns, [[1, 1], [3, 3]]);
assert.deepEqual(
  [readPng(path.join(narrowOutDir, 'connection-edges-horizontal-20x.png')).width, readPng(path.join(narrowOutDir, 'connection-edges-horizontal-20x.png')).height],
  [120, 100]
);

const missingAxisValue = spawnSync(process.execPath, [
  path.resolve('scripts/review-asset.mjs'),
  '--manifest', path.join(root, 'does-not-exist.json'),
  '--modular-axis'
], { encoding: 'utf8' });
assert.equal(missingAxisValue.status, 1);
assert.match(missingAxisValue.stderr, /--modular-axis requires a value: horizontal or vertical/);
assert.doesNotMatch(missingAxisValue.stderr, /ENOENT/);

console.log('Asset review test passed.');
