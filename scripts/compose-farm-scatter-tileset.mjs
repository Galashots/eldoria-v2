#!/usr/bin/env node
// Packs the approved tile_farm_grass_scatter family (tuft_a, tuft_b, pebble_a,
// flower_a — the fixed row-major order declared by
// docs/visual-targets/farm_village_tile_targets.json's `variants` field and
// docs/art-pipeline/review/tile_farm_grass_scatter_family/AUDIT.md) into:
//
//   1. assets/tilesets/tile_farm_grass_scatter.png — the source-pipeline
//      family sheet, packed 1:1 from the committed approved runtime masters
//      via the manifest-driven normalizer (zero derived pixels).
//   2. public/assets/tilesets/tile_farm_grass_scatter.png — the
//      Phaser-loadable runtime sheet: the family sheet upscaled exactly 2x
//      nearest-neighbour to match the Farm map's 32px tile grid, the same
//      convention scripts/compose-terrain-proof-tileset.mjs uses for the
//      terrain masters.
//
// No map JSON is touched here or anywhere in this family's integration —
// decor scatter is a runtime-only presentation layer (see
// src/data/farmDecorScatterConfig.ts), never a Tiled tileset/gid.
//
// Re-run after any approved-master change:
//   node scripts/compose-farm-scatter-tileset.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeAssetSheet, readPng, writePng } from './normalize-asset-sheet.mjs';
import { validateAssetSheet } from './validate-asset-sheet.mjs';
import { upscaleNearestNeighborRgba } from './upscale-nearest-neighbor.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const MANIFEST_PATH = join(ROOT, 'assets', 'manifests', 'tile_farm_grass_scatter.manifest.json');
export const FAMILY_SHEET_PATH = join(ROOT, 'assets', 'tilesets', 'tile_farm_grass_scatter.png');
export const RUNTIME_SHEET_PATH = join(ROOT, 'public', 'assets', 'tilesets', 'tile_farm_grass_scatter.png');
export const CELL_ORDER = ['tuft_a', 'tuft_b', 'pebble_a', 'flower_a'];
// Matches MAP_TILE_PX / MASTER_TILE_PX in compose-terrain-proof-tileset.mjs:
// the Farm map's 32px tile grid is exactly 2x the approved masters' 16px canvas.
export const UPSCALE = 2;

export function composeFarmScatterTileset() {
  normalizeAssetSheet(MANIFEST_PATH);
  const validation = validateAssetSheet(MANIFEST_PATH);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));

  const family = readPng(FAMILY_SHEET_PATH);
  if (family.width !== 16 * CELL_ORDER.length || family.height !== 16) {
    throw new Error(
      `tile_farm_grass_scatter family sheet: expected ${16 * CELL_ORDER.length}x16, got ${family.width}x${family.height}`
    );
  }
  const runtime = upscaleNearestNeighborRgba(family, UPSCALE);
  writePng(RUNTIME_SHEET_PATH, runtime);
  console.log(
    `wrote ${RUNTIME_SHEET_PATH} (${runtime.width}x${runtime.height}, ${CELL_ORDER.length} cells, ${UPSCALE}x nearest-neighbour from the family sheet)`
  );
  return { familyPath: FAMILY_SHEET_PATH, runtimePath: RUNTIME_SHEET_PATH, cellOrder: CELL_ORDER };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  composeFarmScatterTileset();
}
