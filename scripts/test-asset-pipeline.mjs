#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeAssetSheet, readPng, writePng } from './normalize-asset-sheet.mjs';
import { validateAssetSheet } from './validate-asset-sheet.mjs';
import {
  upscaleNearestNeighborRgbOnly,
  upscaleNearestNeighborRgba
} from './upscale-nearest-neighbor.mjs';

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

function pixel(img, x, y) {
  const index = (y * img.width + x) * 4;
  return Array.from(img.data.slice(index, index + 4));
}

function hasOpaqueColor(img, color) {
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i] === color[0] && img.data[i + 1] === color[1] && img.data[i + 2] === color[2] && img.data[i + 3] > 0) return true;
  }
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
  assert.equal(hasOpaqueColor(png, [255, 0, 255]), false);
}

{
  const src = path.join(ROOT, 'building-source.png');
  const out = path.join(ROOT, 'building-output.png');
  const manifest = path.join(ROOT, 'building-manifest.json');
  const building = image(256, 192);
  rect(building, 32, 24, 192, 144, [120, 85, 50, 255]);
  rect(building, 72, 96, 48, 72, [80, 50, 30, 255]);
  writePng(src, building);
  writeJson(manifest, { version: 1, id: 'test_large_building_asset', target: { outputPath: out, cellPx: [128, 96], cols: 1, rows: 1 }, sources: { building: { path: src, background: { mode: 'alpha' } } }, frames: [{ sourceRef: 'building', sourceRect: [32, 24, 192, 144], destCell: [0, 0], trim: 'none', fit: 'contain', anchor: 'center_bottom' }] });
  normalizeAssetSheet(manifest);
  requireOk(validateAssetSheet(manifest));
  const png = readPng(out);
  assert.equal(png.width, 128);
  assert.equal(png.height, 96);
  assert.equal(hasOpaque(png), true);
}

{
  const src = path.join(ROOT, 'edge-flood-source.png');
  const out = path.join(ROOT, 'edge-flood-output.png');
  const manifest = path.join(ROOT, 'edge-flood-manifest.json');
  const keyed = image(16, 16, [255, 0, 255, 255]);
  rect(keyed, 3, 3, 10, 10, [20, 180, 200, 255]);
  rect(keyed, 7, 7, 2, 2, [255, 0, 255, 255]);
  writePng(src, keyed, { colorType: 2 });
  writeJson(manifest, {
    version: 1,
    id: 'test_edge_flood_color_key',
    target: { outputPath: out, cellPx: [16, 16], cols: 1, rows: 1 },
    sources: { sheet: { path: src, background: { mode: 'edge_flood_color_key', color: '#ff00ff', tolerance: 0 } } },
    frames: [{ sourceRef: 'sheet', sourceRect: [0, 0, 16, 16], destCell: [0, 0], trim: 'none', fit: 'contain', anchor: 'top_left' }]
  });
  normalizeAssetSheet(manifest);
  requireOk(validateAssetSheet(manifest));
  const png = readPng(out);
  assert.equal(pixel(png, 0, 0)[3], 0);
  assert.deepEqual(pixel(png, 7, 7), [255, 0, 255, 255]);
}

{
  // Category-C sources may share a larger source sheet. The sourceRect must
  // retain connected key-colour padding on every side so edge flooding has
  // frame-local seeds without reading artwork outside the declared crop.
  const src = path.join(ROOT, 'category-c-padded-source-rect.png');
  const out = path.join(ROOT, 'category-c-padded-source-rect-output.png');
  const manifest = path.join(ROOT, 'category-c-padded-source-rect-manifest.json');
  const sheet = image(40, 32, [255, 0, 255, 255]);
  rect(sheet, 1, 1, 2, 2, [20, 180, 200, 255]); // unrelated art outside sourceRect
  rect(sheet, 8, 10, 16, 12, [78, 79, 65, 255]); // grounded prop inside padded crop
  rect(sheet, 15, 15, 1, 1, [255, 0, 255, 255]); // enclosed key-colour detail
  writePng(src, sheet, { colorType: 2 });
  writeJson(manifest, {
    version: 1,
    id: 'test_category_c_padded_source_rect',
    target: { outputPath: out, cellPx: [16, 32], cols: 1, rows: 1 },
    sources: { sheet: { path: src, background: { mode: 'edge_flood_color_key', color: '#ff00ff', tolerance: 0 } } },
    frames: [{ sourceRef: 'sheet', sourceRect: [4, 4, 24, 24], destCell: [0, 0], trim: 'alpha', fit: 'contain', anchor: 'center_bottom' }]
  });
  normalizeAssetSheet(manifest);
  requireOk(validateAssetSheet(manifest));
  const png = readPng(out);
  assert.deepEqual(pixel(png, 0, 0), [0, 0, 0, 0], 'edge-connected key padding should become transparent');
  assert.deepEqual(pixel(png, 0, 19), [0, 0, 0, 0], 'trimmed prop should retain transparent space above its grounded placement');
  assert.deepEqual(pixel(png, 0, 20), [78, 79, 65, 255], 'edge flood should expose the trimmed prop top');
  assert.deepEqual(pixel(png, 7, 25), [255, 0, 255, 255], 'enclosed key-colour detail should survive edge flooding');
  assert.deepEqual(pixel(png, 0, 31), [78, 79, 65, 255], 'center-bottom placement should ground the trimmed prop');
  assert.equal(hasOpaqueColor(png, [20, 180, 200]), false, 'art outside sourceRect must not enter the output');
}

{
  const manifest = path.join(ROOT, 'invalid-manifest.json');
  writeJson(manifest, {
    version: 2,
    id: 'Invalid ID',
    target: { outputPath: 'missing.png', cellPx: [32, 32], cols: 1, rows: 1, expectedEmptyCells: [[2, 2]] },
    sources: { sheet: { path: 'missing-source.png', grid: { cols: 0, rows: 1 }, background: { mode: 'unknown' } } },
    frames: [
      { sourceRef: 'missing', destCell: [0, 0], fit: 'cover' },
      { sourceRef: 'sheet', destCell: [0, 0] },
      { sourcePath: 'missing-direct.png', destCell: [2, 0] }
    ]
  });
  const result = validateAssetSheet(manifest);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 8, `expected aggregated errors, got ${result.errors.length}`);
}

{
  // A. RGB source + background.mode "alpha": normalization/validation pass, output is RGBA
  // with alpha=255 everywhere and RGB values preserved from the source.
  const src = path.join(ROOT, 'rgb-alpha-source.png');
  const out = path.join(ROOT, 'rgb-alpha-output.png');
  const manifest = path.join(ROOT, 'rgb-alpha-manifest.json');
  const rgbImg = image(20, 20, [0, 0, 0, 255]);
  rect(rgbImg, 0, 0, 20, 20, [34, 90, 21, 255]);
  rect(rgbImg, 5, 5, 6, 6, [140, 200, 60, 255]);
  writePng(src, rgbImg, { colorType: 2 });
  writeJson(manifest, {
    version: 1,
    id: 'test_rgb_alpha_full_bleed',
    target: { outputPath: out, cellPx: [20, 20], cols: 1, rows: 1 },
    sources: { tile: { path: src, background: { mode: 'alpha' } } },
    frames: [{ sourceRef: 'tile', destCell: [0, 0], trim: 'none', fit: 'contain', anchor: 'top_left' }]
  });
  normalizeAssetSheet(manifest);
  requireOk(validateAssetSheet(manifest));
  const png = readPng(out);
  assert.equal(png.colorType, 6);
  assert.equal(png.width, 20);
  assert.equal(png.height, 20);
  for (let i = 3; i < png.data.length; i += 4) assert.equal(png.data[i], 255, 'expected fully opaque alpha for RGB source');
  assert.deepEqual(pixel(png, 0, 0), [34, 90, 21, 255]);
  assert.deepEqual(pixel(png, 7, 7), [140, 200, 60, 255]);
}

{
  // B. fit "contain" vs fit "fill" on a non-square source pasted into a square cell,
  // plus confirmation that an unknown fit value remains rejected.
  const src = path.join(ROOT, 'fit-source.png');
  const containOut = path.join(ROOT, 'fit-contain-output.png');
  const fillOut = path.join(ROOT, 'fit-fill-output.png');
  const containManifest = path.join(ROOT, 'fit-contain-manifest.json');
  const fillManifest = path.join(ROOT, 'fit-fill-manifest.json');

  // 40 wide x 20 tall, fully opaque, non-square source with four distinct quadrants.
  // The corner assertions below prove fill performs independent X/Y nearest-neighbour mapping,
  // rather than merely making all output pixels opaque.
  const fitSrc = image(40, 20, [0, 0, 0, 255]);
  rect(fitSrc, 0, 0, 20, 10, [200, 10, 10, 255]);
  rect(fitSrc, 20, 0, 20, 10, [10, 200, 10, 255]);
  rect(fitSrc, 0, 10, 20, 10, [10, 10, 200, 255]);
  rect(fitSrc, 20, 10, 20, 10, [220, 180, 20, 255]);
  writePng(src, fitSrc);

  writeJson(containManifest, {
    version: 1,
    id: 'test_fit_contain',
    target: { outputPath: containOut, cellPx: [20, 20], cols: 1, rows: 1 },
    sources: { tile: { path: src, background: { mode: 'alpha' } } },
    frames: [{ sourceRef: 'tile', destCell: [0, 0], trim: 'none', fit: 'contain', anchor: 'top_left' }]
  });
  normalizeAssetSheet(containManifest);
  requireOk(validateAssetSheet(containManifest));
  const containPng = readPng(containOut);
  // contain preserves the 40x20 (2:1) aspect ratio inside a 20x20 cell: scale = 20/40 = 0.5 -> 20x10,
  // leaving transparent padding below the pasted content.
  assert.equal(pixel(containPng, 0, 0)[3], 255, 'contain: top-left should be opaque');
  assert.equal(pixel(containPng, 0, 19)[3], 0, 'contain: bottom row should be transparent padding');

  writeJson(fillManifest, {
    version: 1,
    id: 'test_fit_fill',
    target: { outputPath: fillOut, cellPx: [20, 20], cols: 1, rows: 1 },
    sources: { tile: { path: src, background: { mode: 'alpha' } } },
    frames: [{ sourceRef: 'tile', destCell: [0, 0], trim: 'none', fit: 'fill', anchor: 'top_left' }]
  });
  normalizeAssetSheet(fillManifest);
  requireOk(validateAssetSheet(fillManifest));
  const fillPng = readPng(fillOut);
  // fill covers every destination pixel via independent X/Y nearest-neighbour scaling: no transparent padding anywhere.
  assert.equal(hasOpaque(fillPng), true);
  for (let y = 0; y < 20; y += 1) for (let x = 0; x < 20; x += 1) assert.equal(pixel(fillPng, x, y)[3], 255, `fill: pixel (${x},${y}) should be fully opaque`);
  assert.deepEqual(pixel(fillPng, 0, 0), [200, 10, 10, 255], 'fill: top-left quadrant should map to top-left');
  assert.deepEqual(pixel(fillPng, 19, 0), [10, 200, 10, 255], 'fill: top-right quadrant should map to top-right');
  assert.deepEqual(pixel(fillPng, 0, 19), [10, 10, 200, 255], 'fill: bottom-left quadrant should map to bottom-left');
  assert.deepEqual(pixel(fillPng, 19, 19), [220, 180, 20, 255], 'fill: bottom-right quadrant should map to bottom-right');

  // An unknown fit value (e.g. "cover") must still be rejected.
  const badManifest = path.join(ROOT, 'fit-bad-manifest.json');
  writeJson(badManifest, {
    version: 1,
    id: 'test_fit_bad',
    target: { outputPath: path.join(ROOT, 'fit-bad-output.png'), cellPx: [20, 20], cols: 1, rows: 1 },
    sources: { tile: { path: src, background: { mode: 'alpha' } } },
    frames: [{ sourceRef: 'tile', destCell: [0, 0], trim: 'none', fit: 'cover', anchor: 'top_left' }]
  });
  const badResult = validateAssetSheet(badManifest);
  assert.equal(badResult.ok, false);
  assert.ok(badResult.errors.some((e) => e.includes('fit must be contain or fill')), 'expected fit rejection error');
}

{
  // C. upscaleNearestNeighborRgbOnly on a colorType-2 (RGB, no alpha channel) source.
  // readPng() always expands data to 4 bytes/pixel (RGBA) regardless of the source's
  // original colorType, so the read stride inside the upscaler must always be 4 — a
  // colorType-conditional 3-byte stride previously misaligned every pixel by one channel
  // for exactly this RGB-source case (caught by the tile_farm_water_base/water_a audit).
  const src = path.join(ROOT, 'upscale-rgb-source.png');
  const rgbSrc = image(3, 1, [0, 0, 0, 255]);
  const setPixel = (img, x, y, color) => { const i = (y * img.width + x) * 4; img.data[i] = color[0]; img.data[i + 1] = color[1]; img.data[i + 2] = color[2]; img.data[i + 3] = 255; };
  setPixel(rgbSrc, 0, 0, [10, 96, 147]);
  setPixel(rgbSrc, 1, 0, [200, 20, 5]);
  setPixel(rgbSrc, 2, 0, [1, 2, 3]);
  writePng(src, rgbSrc, { colorType: 2 });

  const rgbSource = readPng(src);
  assert.equal(rgbSource.colorType, 2);
  const scale = 4;
  const up = upscaleNearestNeighborRgbOnly(rgbSource, scale);
  assert.equal(up.width, 12);
  assert.equal(up.height, 4);
  assert.deepEqual(pixel(up, 0, 0), [10, 96, 147, 255]);
  assert.deepEqual(pixel(up, scale - 1, scale - 1), [10, 96, 147, 255], 'first block should be uniform');
  assert.deepEqual(pixel(up, scale, 0), [200, 20, 5, 255], 'second block should start at the second source pixel with no channel shift');
  assert.deepEqual(pixel(up, scale * 2, 0), [1, 2, 3, 255], 'third block should start at the third source pixel with no channel shift');

  const upOut = path.join(ROOT, 'upscale-rgb-output.png');
  writePng(upOut, up, { colorType: 2 });
  const reread = readPng(upOut);
  assert.deepEqual(pixel(reread, scale, 0), [200, 20, 5, 255], 'round-trip through disk preserves the second block');
}

{
  // D. RGBA upscaling preserves every alpha value as well as RGB, including
  // fully opaque, fully transparent, and semitransparent source pixels.
  const src = image(3, 1);
  rect(src, 0, 0, 1, 1, [18, 79, 29, 255]);
  rect(src, 1, 0, 1, 1, [210, 15, 90, 0]);
  rect(src, 2, 0, 1, 1, [40, 120, 230, 128]);

  const scale = 3;
  const up = upscaleNearestNeighborRgba(src, scale);
  assert.equal(up.colorType, 6);
  assert.equal(up.width, 9);
  assert.equal(up.height, 3);

  const expectedBlocks = [
    [18, 79, 29, 255],
    [210, 15, 90, 0],
    [40, 120, 230, 128]
  ];
  for (let block = 0; block < expectedBlocks.length; block += 1) {
    for (let y = 0; y < scale; y += 1) {
      for (let x = 0; x < scale; x += 1) {
        assert.deepEqual(
          pixel(up, block * scale + x, y),
          expectedBlocks[block],
          `RGBA block ${block} should replicate uniformly at (${x},${y})`
        );
      }
    }
  }

  const rgbaSourcePath = path.join(ROOT, 'upscale-rgba-source.png');
  const upOut = path.join(ROOT, 'upscale-rgba-output.png');
  writePng(rgbaSourcePath, src, { colorType: 6 });
  execFileSync(process.execPath, [
    path.resolve('scripts/upscale-nearest-neighbor.mjs'),
    '--in', rgbaSourcePath,
    '--out', upOut,
    '--scale', String(scale),
    '--mode', 'rgba'
  ]);
  const reread = readPng(upOut);
  assert.equal(reread.colorType, 6);
  assert.deepEqual(pixel(reread, 0, 0), expectedBlocks[0]);
  assert.deepEqual(pixel(reread, scale, 0), expectedBlocks[1]);
  assert.deepEqual(pixel(reread, scale * 2, 0), expectedBlocks[2]);
}

console.log('Asset pipeline test passed.');
