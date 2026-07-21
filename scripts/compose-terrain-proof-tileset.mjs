#!/usr/bin/env node
// Terrain integration: builds a runtime tileset from the pipeline's
// *formally approved* terrain runtime masters and wires it into the farm
// map, including the approved 13-cell dirt-blend and shoreline transition
// families so the path and pond meet the grass with blended edges instead
// of hard tile boundaries.
//
// Doctrine notes:
// - Only approved runtime pixels are used. The five centre masters come
//   from their approved 16x16 review artifacts; the 24 transition cells
//   come from the packed family sheets on main (all 12 generated cells of
//   each family are APPROVED RUNTIME MASTERS — see the family AUDIT docs).
//   grass_a has no approved 16x16 runtime master, so it is still NOT
//   composed directly (the transition cells embed approved grass_a-derived
//   pixels from their own approved composites, which is inside their
//   approval).
// - The map's 32px grid is preserved: masters are upscaled exactly 2x
//   nearest-neighbour (the pipeline's own upscaler), so collision, object
//   coordinates, saves, and every existing gameplay test are unaffected.
// - The repaint is deterministic and idempotent: same inputs -> identical
//   farm.json and sheet on every run.
// - Transition selection is a pure function of the Ground layer's terrain
//   categories (grass/dirt/water). Cases with no approved art keep the
//   centre cell: dirt-vs-water seams, 1-tile-wide necks (grass on opposite
//   sides), and multi-notch diagonals. Out-of-map neighbours count as the
//   tile's own category so borders never blend.
// - Cell-name orientation is empirical, verified by
//   scripts/test-terrain-transitions.mjs: a cell's name says where the
//   TERRAIN sits in the tile (edge_north = terrain at top, grass below;
//   corner_ne = terrain quadrant at NE, grass wrapping; inner_ne = terrain
//   tile with a grass notch at NE).
//
// Re-run after any approved-master change:
//   node scripts/compose-terrain-proof-tileset.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import { upscaleNearestNeighborRgba } from './upscale-nearest-neighbor.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP_PATH = join(ROOT, 'public', 'maps', 'farm.json');
const SHEET_PATH = join(ROOT, 'public', 'assets', 'tilesets', 'farm-terrain-proof.png');

const TILESET_NAME = 'farm-terrain-proof';
const FIRSTGID = 9; // placeholder tileset occupies gids 1-8
const MASTER_TILE_PX = 16;
const MAP_TILE_PX = 32; // the farm map's grid; masters upscale 2x onto it

// Packed 13-cell family sheets (16px cells, one row). Column order is fixed
// by the family manifests.
const FAMILY_CELL_ORDER = [
  'center', 'edge_north', 'edge_south', 'edge_west', 'edge_east',
  'corner_ne', 'corner_nw', 'corner_se', 'corner_sw',
  'inner_ne', 'inner_nw', 'inner_se', 'inner_sw'
];
const TRANSITION_CELLS = FAMILY_CELL_ORDER.slice(1); // centres come from the approved individual masters

// Sheet cell order defines the new gids: FIRSTGID + index.
export const CELLS = [
  { gidName: 'grass_b', source: 'docs/art-pipeline/review/tile_farm_grass_base_grass_b/grass_b.approved-runtime-master.png' },
  { gidName: 'grass_c', source: 'docs/art-pipeline/review/tile_farm_grass_base_grass_c/grass_c.approved-runtime-master.png' },
  { gidName: 'water_a', source: 'docs/art-pipeline/review/tile_farm_water_base_water_a/water_a.approved-master-16x16.png' },
  { gidName: 'water_b', source: 'docs/art-pipeline/review/tile_farm_water_base_water_b/water_b.approved-runtime-master.png' },
  { gidName: 'dirt_center', source: 'docs/art-pipeline/review/tile_farm_path_dirt_center/dirt_center.approved-master-16x16.png' },
  ...TRANSITION_CELLS.map((cell) => ({
    gidName: `dirt_${cell}`,
    source: 'assets/tilesets/tile_farm_path_dirt.png',
    sheetCell: FAMILY_CELL_ORDER.indexOf(cell)
  })),
  ...TRANSITION_CELLS.map((cell) => ({
    gidName: `shore_${cell}`,
    source: 'assets/tilesets/tile_farm_water_shore.png',
    sheetCell: FAMILY_CELL_ORDER.indexOf(cell)
  }))
];
export const gidOf = (gidName) => FIRSTGID + CELLS.findIndex((cell) => cell.gidName === gidName);

// Placeholder gids on the farm map's Ground layer (see the tileset image:
// 1 grass, 2 dirt path, 3 water; everything else is decor/structure and is
// out of scope).
const PLACEHOLDER = { grass: 1, dirt: 2, water: 3 };

/** Stable per-cell hash so the repaint is identical on every run. */
function cellHash(x, y) {
  return (x * 31 + y * 17) % 20;
}

function baseRepaintGid(gid, x, y) {
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

/** Terrain category of a Ground gid, or null for out-of-scope gids. */
export function categoryOf(gid) {
  if (gid === PLACEHOLDER.grass || gid === gidOf('grass_b') || gid === gidOf('grass_c')) return 'grass';
  if (gid === PLACEHOLDER.water || gid === gidOf('water_a') || gid === gidOf('water_b')) return 'water';
  if (gid === PLACEHOLDER.dirt || gid === gidOf('dirt_center')) return 'dirt';
  const index = gid - FIRSTGID;
  const name = CELLS[index]?.gidName ?? '';
  if (name.startsWith('dirt_')) return 'dirt';
  if (name.startsWith('shore_')) return 'water';
  return null;
}

/**
 * Pure transition resolver. Given a tile's terrain kind ('dirt' | 'water')
 * and which neighbours are grass, returns the family cell name to use.
 * Cell names locate the TERRAIN inside the tile (verified empirically by
 * scripts/test-terrain-transitions.mjs), so a tile at the region's south
 * boundary (grass to the S) keeps its terrain at the top: edge_north.
 */
export function resolveTransitionCell(grass) {
  const { n, e, s, w, ne, nw, se, sw } = grass;
  const cardinals = [n, e, s, w].filter(Boolean).length;
  if (cardinals === 0) {
    const diagonals = [['ne', ne], ['nw', nw], ['se', se], ['sw', sw]].filter(([, isGrass]) => isGrass);
    // Exactly one grass diagonal gets the matching notch cell; anything
    // else (open terrain, or multi-notch shapes with no approved art)
    // keeps the centre.
    return diagonals.length === 1 ? `inner_${diagonals[0][0]}` : 'center';
  }
  if (cardinals === 1) {
    if (s) return 'edge_north';
    if (n) return 'edge_south';
    if (e) return 'edge_west';
    return 'edge_east';
  }
  if (cardinals === 2) {
    if (n && e) return 'corner_sw';
    if (n && w) return 'corner_se';
    if (s && e) return 'corner_nw';
    if (s && w) return 'corner_ne';
    // Opposite-side grass (1-tile-wide neck): no approved art, keep centre.
    return 'center';
  }
  // 3-4 grass cardinals (peninsula tip / island): no approved art.
  return 'center';
}

/**
 * Full Ground-layer repaint: base centre scatter, then category-driven
 * transition cells for dirt and water tiles that touch grass. Pure —
 * returns a new data array.
 */
export function repaintGround(data, width, height) {
  const based = data.map((gid, index) => baseRepaintGid(gid, index % width, Math.floor(index / width)));
  const category = (x, y, self) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return self; // borders never blend
    return categoryOf(based[y * width + x]) ?? self;
  };
  return based.map((gid, index) => {
    const kind = categoryOf(gid);
    if (kind !== 'dirt' && kind !== 'water') return gid;
    const x = index % width;
    const y = Math.floor(index / width);
    const grassAt = (dx, dy) => category(x + dx, y + dy, kind) === 'grass';
    const cell = resolveTransitionCell({
      n: grassAt(0, -1), e: grassAt(1, 0), s: grassAt(0, 1), w: grassAt(-1, 0),
      ne: grassAt(1, -1), nw: grassAt(-1, -1), se: grassAt(1, 1), sw: grassAt(-1, 1)
    });
    if (cell === 'center') {
      // Open terrain: keep the base scatter (water_a/b, dirt_center). If a
      // previous run assigned a transition gid here, fall back to the base
      // centre so re-runs stay idempotent from any starting state.
      const name = CELLS[gid - FIRSTGID]?.gidName ?? '';
      if (name.startsWith('dirt_') && name !== 'dirt_center') return gidOf('dirt_center');
      if (name.startsWith('shore_')) return cellHash(x, y) < 17 ? gidOf('water_a') : gidOf('water_b');
      return gid;
    }
    return gidOf(`${kind === 'dirt' ? 'dirt' : 'shore'}_${cell}`);
  });
}

export function composeTerrainProof() {
  // --- 1. Compose the 32px-cell sheet from the approved masters ----------
  const sheet = {
    width: MAP_TILE_PX * CELLS.length,
    height: MAP_TILE_PX,
    colorType: 6,
    data: new Uint8Array(MAP_TILE_PX * CELLS.length * MAP_TILE_PX * 4)
  };

  CELLS.forEach((cell, index) => {
    const source = readPng(join(ROOT, cell.source));
    let master;
    if (cell.sheetCell === undefined) {
      if (source.width !== MASTER_TILE_PX || source.height !== MASTER_TILE_PX) {
        throw new Error(`${cell.gidName}: expected a ${MASTER_TILE_PX}x${MASTER_TILE_PX} approved master, got ${source.width}x${source.height} — refusing to derive unapproved sizes`);
      }
      master = source;
    } else {
      if (source.height !== MASTER_TILE_PX || source.width !== MASTER_TILE_PX * FAMILY_CELL_ORDER.length) {
        throw new Error(`${cell.gidName}: expected a packed ${FAMILY_CELL_ORDER.length}-cell ${MASTER_TILE_PX}px family sheet, got ${source.width}x${source.height}`);
      }
      master = { width: MASTER_TILE_PX, height: MASTER_TILE_PX, colorType: 6, data: new Uint8Array(MASTER_TILE_PX * MASTER_TILE_PX * 4) };
      for (let y = 0; y < MASTER_TILE_PX; y += 1) {
        for (let x = 0; x < MASTER_TILE_PX; x += 1) {
          const src = (y * source.width + cell.sheetCell * MASTER_TILE_PX + x) * 4;
          const dst = (y * MASTER_TILE_PX + x) * 4;
          for (let k = 0; k < 4; k += 1) master.data[dst + k] = source.data[src + k];
        }
      }
    }
    const tile = upscaleNearestNeighborRgba(master, MAP_TILE_PX / MASTER_TILE_PX);
    for (let y = 0; y < MAP_TILE_PX; y += 1) {
      for (let x = 0; x < MAP_TILE_PX; x += 1) {
        const src = (y * MAP_TILE_PX + x) * 4;
        const dst = (y * sheet.width + index * MAP_TILE_PX + x) * 4;
        for (let k = 0; k < 4; k += 1) sheet.data[dst + k] = tile.data[src + k];
      }
    }
  });
  writePng(SHEET_PATH, sheet);
  console.log(`wrote ${SHEET_PATH} (${sheet.width}x${sheet.height}, ${CELLS.length} cells from approved masters)`);

  // --- 2. Wire the tileset into farm.json and repaint the Ground layer ----
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
  const before = ground.data;
  ground.data = repaintGround(before, ground.width, ground.height);
  const repainted = ground.data.filter((gid, index) => gid !== before[index]).length;

  writeFileSync(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`);
  console.log(`updated ${MAP_PATH}: added tileset '${TILESET_NAME}' (firstgid ${FIRSTGID}), repainted ${repainted} Ground cells`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  composeTerrainProof();
}
