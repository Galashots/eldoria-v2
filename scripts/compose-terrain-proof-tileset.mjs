#!/usr/bin/env node
// Terrain-integration proof of concept: builds a runtime tileset from the
// pipeline's *formally approved* 16x16 terrain runtime masters (grass_b,
// grass_c, water_a, water_b, dirt center) and wires it into the farm map.
//
// Doctrine notes (why this is deliberately small):
// - Only masters with an approved 16x16 runtime artifact under
//   docs/art-pipeline/review/ are used. grass_a has no approved 16x16
//   runtime master (its audit blesses the 1254x1254 source only), so it is
//   NOT included — deriving one here would bypass the audit trail.
// - The dirt blend family contributes only its center cell. Edges/corners
//   need a Wangset-aware repaint pass (docs/TILED_WANGSET_WORKFLOW.md),
//   which is the next milestone, not this proof.
// - The map's 32px grid is preserved: masters are upscaled exactly 2x
//   nearest-neighbour (the pipeline's own upscaler), so collision, object
//   coordinates, saves, and every existing gameplay test are unaffected.
// - The map repaint is deterministic: same inputs -> identical farm.json.
//
// Re-run after any approved-master change:
//   node scripts/compose-terrain-proof-tileset.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import { upscaleNearestNeighborRgba } from './upscale-nearest-neighbor.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP_PATH = join(ROOT, 'public', 'maps', 'farm.json');
const SHEET_PATH = join(ROOT, 'public', 'assets', 'tilesets', 'farm-terrain-proof.png');

const TILESET_NAME = 'farm-terrain-proof';
const FIRSTGID = 9; // placeholder tileset occupies gids 1-8
const MASTER_TILE_PX = 16;
const MAP_TILE_PX = 32; // the farm map's grid; masters upscale 2x onto it

// Sheet cell order defines the new gids: FIRSTGID + index.
const CELLS = [
  { gidName: 'grass_b', source: 'docs/art-pipeline/review/tile_farm_grass_base_grass_b/grass_b.approved-runtime-master.png' },
  { gidName: 'grass_c', source: 'docs/art-pipeline/review/tile_farm_grass_base_grass_c/grass_c.approved-runtime-master.png' },
  { gidName: 'water_a', source: 'docs/art-pipeline/review/tile_farm_water_base_water_a/water_a.approved-master-16x16.png' },
  { gidName: 'water_b', source: 'docs/art-pipeline/review/tile_farm_water_base_water_b/water_b.approved-runtime-master.png' },
  { gidName: 'dirt_center', source: 'docs/art-pipeline/review/tile_farm_path_dirt_center/dirt_center.approved-master-16x16.png' }
];
const gidOf = (gidName) => FIRSTGID + CELLS.findIndex((cell) => cell.gidName === gidName);

// Placeholder gids on the farm map's Ground layer (see the tileset image:
// 1 grass, 2 dirt path, 3 water; everything else is decor/structure and is
// out of scope for this proof).
const PLACEHOLDER = { grass: 1, dirt: 2, water: 3 };

/** Stable per-cell hash so the repaint is identical on every run. */
function cellHash(x, y) {
  return (x * 31 + y * 17) % 20;
}

function repaintGid(gid, x, y) {
  const hash = cellHash(x, y);
  switch (gid) {
    case PLACEHOLDER.grass:
      // 80/20 quiet-texture scatter between the two approved grass variants.
      return hash < 16 ? gidOf('grass_b') : gidOf('grass_c');
    case PLACEHOLDER.water:
      // 85/15 shimmer variation across the pond.
      return hash < 17 ? gidOf('water_a') : gidOf('water_b');
    case PLACEHOLDER.dirt:
      return gidOf('dirt_center');
    default:
      // Already-remapped gids (idempotent re-runs) and out-of-scope gids
      // pass through untouched.
      return gid;
  }
}

// --- 1. Compose the 32px-cell sheet from the approved 16x16 masters -------
const sheet = {
  width: MAP_TILE_PX * CELLS.length,
  height: MAP_TILE_PX,
  colorType: 6,
  data: new Uint8Array(MAP_TILE_PX * CELLS.length * MAP_TILE_PX * 4)
};

CELLS.forEach((cell, index) => {
  const master = readPng(join(ROOT, cell.source));
  if (master.width !== MASTER_TILE_PX || master.height !== MASTER_TILE_PX) {
    throw new Error(`${cell.gidName}: expected a ${MASTER_TILE_PX}x${MASTER_TILE_PX} approved master, got ${master.width}x${master.height} — refusing to derive unapproved sizes`);
  }
  const tile = upscaleNearestNeighborRgba(master, MAP_TILE_PX / MASTER_TILE_PX);
  for (let y = 0; y < MAP_TILE_PX; y += 1) {
    for (let x = 0; x < MAP_TILE_PX; x += 1) {
      const src = (y * MAP_TILE_PX + x) * 4;
      const dst = (y * sheet.width + index * MAP_TILE_PX + x) * 4;
      sheet.data[dst] = tile.data[src];
      sheet.data[dst + 1] = tile.data[src + 1];
      sheet.data[dst + 2] = tile.data[src + 2];
      sheet.data[dst + 3] = tile.data[src + 3];
    }
  }
});
writePng(SHEET_PATH, sheet);
console.log(`wrote ${SHEET_PATH} (${sheet.width}x${sheet.height}, ${CELLS.length} cells from approved masters)`);

// --- 2. Wire the tileset into farm.json and repaint the Ground layer ------
const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
map.tilesets = map.tilesets.filter((tileset) => tileset.name !== TILESET_NAME);
map.tilesets.push({
  columns: CELLS.length,
  firstgid: FIRSTGID,
  image: '../assets/tilesets/farm-terrain-proof.png',
  imageheight: MAP_TILE_PX,
  imagewidth: MAP_TILE_PX * CELLS.length,
  margin: 0,
  name: TILESET_NAME,
  spacing: 0,
  tilecount: CELLS.length,
  tileheight: MAP_TILE_PX,
  tilewidth: MAP_TILE_PX
});

const ground = map.layers.find((layer) => layer.type === 'tilelayer' && layer.name === 'Ground');
if (!ground) throw new Error('farm.json is missing its Ground tile layer');
let repainted = 0;
ground.data = ground.data.map((gid, index) => {
  const next = repaintGid(gid, index % ground.width, Math.floor(index / ground.width));
  if (next !== gid) repainted += 1;
  return next;
});

writeFileSync(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`);
console.log(`updated ${MAP_PATH}: added tileset '${TILESET_NAME}' (firstgid ${FIRSTGID}), repainted ${repainted} Ground cells`);
