#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeAssetSheet, readPng, writePng } from './normalize-asset-sheet.mjs';
import { validateAssetSheet } from './validate-asset-sheet.mjs';

const ROOT = path.resolve('.tmp/asset-pipeline');

function image(width, height, color = [0, 0, 0, 0]) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; data[i + 3] = color[3];
  }
  return { width, height, colorType: 6, data };
}

function rect(img, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) {
    const i = (yy * img.width + xx) * 4;
    img.data[i] = color[0]; img.data[i + 1] = color[1]; img.data[i + 2] = color[2]; img.data[i + 3] = color[3];
  }
}

function blobCell(img, cols, rows, col, row, color) {
  const cw = img.width / cols;
  const ch = img.height / rows;
  rect(img, col * cw + 12, row * ch + 12, cw - 24, ch - 24, color);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function hasOpaque(img) {
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 0) return true;
  return false;
}

function cellTransparent(img, cellPx, cell) {
  const [cw, ch] = cellPx;
  for (let y = cell[1] * ch; y < (cell[1] + 1) * ch; y += 1) for (let x = cell[0] * cw; x < (cell[0] + 1) * cw; x += 1) {
    if (img.data[(y * img.width + x) * 4 + 3] !== 0) return false;
  }
  return true;
}

const usedCells = [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[0,2],[1,2],[2,2],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3]];
const emptyCells = [[4,0],[5,0],[3,2],[4,2],[5,2]];

function makeSource(filePath, background, options = {}) {
  const src = image(384, 256, background);
  for (const [i, cell] of usedCells.entries()) blobCell(src, 6, 4, cell[0], cell[1], [(40 + i * 9) % 255, (100 + i * 5) % 255, 180, 255]);
  writePng(filePath, src, options);
}

function sixByFourFrames(sourceRef) {
  return usedCells.map((cell) => ({ sourceRef, sourceCell: cell, destCell: cell, trim: 'alpha', fit: 'contain', anchor: 'center_bottom' }));
}

function requireOk(result) {
  if (!result.ok) throw new Error(result.errors.join('\n'));
}

fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });

{
  const src = path.join(ROOT, 'alpha-source.png');
  const out = path.join(ROOT, 'alpha-output.png');
  const manifest = path.join(ROOT, 'alpha-manifest.json');
  makeSource(src, [0, 0, 0, 0]);
  writeJson(manifest, { version: 1, id: 'test_alpha_slime_sheet', target: { outputPath: out, cellPx: [32, 32], cols: 6, rows: 4, expectedEmptyCells: emptyCells }, sources: { sheet: { path: src, grid: { cols: 6, rows: 4 }, background: { mode: 'alpha' } } }, frames: sixByFourFrames('sheet') });
  normalizeAssetSheet(manifest);
  requireOk(validateAssetSheet(manifest));
  const png = readPng(out);
  assert.equal(png.width, 192);
  assert.equal(png.height, 128);
  assert.equal(png.colorType, 6);
  assert.equal(cellTransparent(png, [32, 32], [4, 0]), true);
  assert.equal(hasOpaque(png), true);
}

{
  const src = path.join(ROOT, 'color-key-source.png');
  const out = path.join(ROOT, 'color-key-output.png');
  const manifest = path.join(ROOT, 'color-key-manifest.json');
  makeSource(src, [255, 0, 255, 255], { colorType: 2 });
  writeJson(manifest, { version: 1, id: 'test_color_key_slime_sheet', target: { outputPath: out, cellPx: [32, 32], cols: 6, rows: 4, expectedEmptyCells: emptyCells }, sources: { sheet: { path: src, grid: { cols: 6, rows: 4 }, background: { mode: 'color_key', color: '#ff00ff', tolerance: 0 } } }, frames: sixByFourFrames('sheet') });
  normalizeAssetSheet(manifest);
  requireOk(validateAssetSheet(manifest));
  const png = readPng(out);
  assert.equal(png.width, 192);
  assert.equal(png.height, 128);
  assert.equal(cellTransparent(png, [32, 32], [3, 2]), true);
  assert.equal(hasOpaque(png), true);
}

{
  const src = path.join(ROOT, 'building-source.png');
  const out = path.join(ROOT, 'building-output.png');
  const manifest = path.join(ROOT, 'building-manifest.json');
  const building = image(256, 192);
  rect(building, 32, 24, 192, 144, [120, 85, 50, 255]);
  rect(building, 72, 96, 48, 72, [80, 50, 30, 255]);
  writePng(src, building);
  writeJson(manifest, { version: 1, id: 'test_large_building_asset', target: { outputPath: out, cellPx: [128, 96], cols: 1, rows: 1 }, sources: { building: { path: src, background: { mode: 'alpha' } } }, frames: [{ sourceRef: 'building', destCell: [0, 0], trim: 'alpha', fit: 'contain', anchor: 'center_bottom' }] });
  normalizeAssetSheet(manifest);
  requireOk(validateAssetSheet(manifest));
  const png = readPng(out);
  assert.equal(png.width, 128);
  assert.equal(png.height, 96);
  assert.equal(hasOpaque(png), true);
}

console.log('Asset pipeline test passed.');
