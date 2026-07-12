#!/usr/bin/env node
import assert from 'node:assert/strict';
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

console.log('Asset review test passed.');
