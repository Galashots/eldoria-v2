#!/usr/bin/env node
// Packs the nine approved Eldoria Village shop-facade runtime masters into one
// Phaser-loadable spritesheet:
//
//   public/assets/tilesets/tile_village_shop.png
//
// The three approved family sheets (assets/tilesets/tile_village_shop_wall.png,
// _door.png, _roof.png) are produced by scripts/build-village-art-top-gaps.mjs
// straight from the committed approved runtime masters and are already covered
// by the test:generated-surfaces diff gate. This script only concatenates them
// in the audit's fixed order and upscales 2x nearest-neighbour onto the map's
// 32px tile grid — the same convention compose-farm-scatter-tileset.mjs and
// compose-terrain-proof-tileset.mjs use. Zero derived pixels.
//
// Every input sheet's SHA-256 is asserted against the value recorded in
// docs/art-pipeline/review/village_top_gaps/AUDIT.md, so the runtime sheet is
// pinned to the exact art ChatGPT approved. A regenerated family sheet that no
// longer matches its audited hash fails loudly here rather than silently
// shipping unapproved pixels into the game.
//
// No map JSON is touched: the shop is a runtime-rendered structure (see
// src/data/villageShopBuilding.ts), never a Tiled tileset/gid.
//
// Re-run after any approved-master change:
//   node scripts/compose-village-shop-tileset.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import { upscaleNearestNeighborRgba } from './upscale-nearest-neighbor.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Master cell size, matching every target in farm_village_tile_targets.json. */
export const MASTER_CELL_PX = 16;
/** The Village map's tile grid is exactly 2x the 16px masters. */
export const UPSCALE = 2;
export const RUNTIME_CELL_PX = MASTER_CELL_PX * UPSCALE;

/**
 * Input families in the fixed order the audit and each manifest declare, with
 * the packed-sheet SHA-256 recorded in
 * docs/art-pipeline/review/village_top_gaps/AUDIT.md.
 */
export const FAMILIES = Object.freeze([
  {
    id: 'tile_village_shop_wall',
    variants: ['stone_base', 'wood_trim', 'window_lit'],
    sha256: 'f3ac3055e164653a9a70217529d5726a0691bec4432b2000d106d9c83e21b500'
  },
  {
    id: 'tile_village_shop_door',
    variants: ['closed', 'highlighted', 'open_optional'],
    sha256: 'e37c86a6236992ef3f8a6ea2fc18384c9b17e2061fb51960b23d53ada15af38f'
  },
  {
    id: 'tile_village_shop_roof',
    variants: ['thatch_base', 'thatch_moss', 'ridge'],
    sha256: '50247172398ddd5688b5feb5323479ba15a0f6c99c5ac0dd9cb412f3d22ed2ed'
  }
]);

/**
 * Spritesheet frame order: family by family, variant by variant. The runtime
 * cell ids are `<family-suffix>_<variant>` so a layout can name a cell without
 * knowing its frame index.
 */
export const CELL_ORDER = Object.freeze(
  FAMILIES.flatMap((family) =>
    family.variants.map((variant) => `${family.id.replace('tile_village_shop_', '')}_${variant}`)
  )
);

export const RUNTIME_SHEET_PATH = join(ROOT, 'public', 'assets', 'tilesets', 'tile_village_shop.png');

/**
 * Sidecar recording the packed frame order. Exists so the TypeScript side can
 * assert its own VILLAGE_SHOP_CELL_ORDER against this script's without either
 * importing the other: both are just index lookups into the same sheet, so a
 * silent reorder on one side would swap thatch for stone in the game with
 * nothing failing. Regenerated here and diff-gated by test:generated-surfaces.
 */
export const CELL_ORDER_PATH = join(ROOT, 'assets', 'tilesets', 'tile_village_shop.cells.json');

const sha256 = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

export function composeVillageShopTileset() {
  const sheets = FAMILIES.map((family) => {
    const familyPath = join(ROOT, 'assets', 'tilesets', `${family.id}.png`);
    const actual = sha256(familyPath);
    if (actual !== family.sha256) {
      throw new Error(
        `${family.id}: packed family sheet SHA-256 ${actual} does not match the value audited in `
          + `docs/art-pipeline/review/village_top_gaps/AUDIT.md (${family.sha256}). The runtime sheet must be `
          + 'built from the exact approved art — re-run npm run build:village-art, or get a fresh visual verdict '
          + 'if the masters genuinely changed.'
      );
    }
    const img = readPng(familyPath);
    const expectedWidth = MASTER_CELL_PX * family.variants.length;
    if (img.width !== expectedWidth || img.height !== MASTER_CELL_PX) {
      throw new Error(
        `${family.id}: expected ${expectedWidth}x${MASTER_CELL_PX} family sheet, got ${img.width}x${img.height}`
      );
    }
    return img;
  });

  const width = MASTER_CELL_PX * CELL_ORDER.length;
  const packed = { width, height: MASTER_CELL_PX, colorType: 6, data: new Uint8Array(width * MASTER_CELL_PX * 4) };
  let offsetX = 0;
  for (const sheet of sheets) {
    for (let y = 0; y < MASTER_CELL_PX; y += 1) {
      for (let x = 0; x < sheet.width; x += 1) {
        const src = (y * sheet.width + x) * 4;
        const dst = (y * width + offsetX + x) * 4;
        packed.data[dst] = sheet.data[src];
        packed.data[dst + 1] = sheet.data[src + 1];
        packed.data[dst + 2] = sheet.data[src + 2];
        packed.data[dst + 3] = sheet.data[src + 3];
      }
    }
    offsetX += sheet.width;
  }

  const runtime = upscaleNearestNeighborRgba(packed, UPSCALE);
  writePng(RUNTIME_SHEET_PATH, runtime);
  fs.writeFileSync(
    CELL_ORDER_PATH,
    `${JSON.stringify({ cellPx: RUNTIME_CELL_PX, cellOrder: CELL_ORDER }, null, 2)}\n`
  );
  console.log(
    `wrote ${RUNTIME_SHEET_PATH} (${runtime.width}x${runtime.height}, ${CELL_ORDER.length} cells of `
      + `${RUNTIME_CELL_PX}x${RUNTIME_CELL_PX}, ${UPSCALE}x nearest-neighbour from three audited family sheets)`
  );
  return { runtimePath: RUNTIME_SHEET_PATH, cellOrder: [...CELL_ORDER] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  composeVillageShopTileset();
}
