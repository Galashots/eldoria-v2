#!/usr/bin/env node
// Regression coverage for the farm Ground transition integration:
// 1. empirically verifies the packed family sheets' cell orientation that
//    the resolver mapping relies on (cell name = where the terrain sits);
// 2. exercises the pure resolver on every neighbourhood class;
// 3. repaints a synthetic map and checks the exact expected cells,
//    border behaviour, and idempotency;
// 4. confirms the committed farm.json Ground layer matches the resolver.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './normalize-asset-sheet.mjs';
import { CELLS, categoryOf, gidOf, repaintGround, resolveTransitionCell } from './compose-terrain-proof-tileset.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CELL_PX = 16;
const NAMES = ['center', 'edge_north', 'edge_south', 'edge_west', 'edge_east', 'corner_ne', 'corner_nw', 'corner_se', 'corner_sw', 'inner_ne', 'inner_nw', 'inner_se', 'inner_sw'];

// --- 1. Sheet-orientation self-check --------------------------------------
for (const family of ['tile_farm_path_dirt', 'tile_farm_water_shore']) {
  const img = readPng(join(ROOT, 'assets', 'tilesets', `${family}.png`));
  assert.equal(img.width, CELL_PX * NAMES.length, `${family}: packed sheet layout changed`);
  const isGrass = (i) => img.data[i + 1] > img.data[i] && img.data[i + 1] > img.data[i + 2];
  const grassFraction = (cellIndex, x0, y0, w, h) => {
    let grass = 0, total = 0;
    for (let y = y0; y < y0 + h; y += 1) for (let x = x0; x < x0 + w; x += 1) {
      total += 1;
      if (isGrass((y * img.width + cellIndex * CELL_PX + x) * 4)) grass += 1;
    }
    return grass / total;
  };
  const cellIndex = (name) => NAMES.indexOf(name);
  // Edges: the named side holds terrain, the opposite side grass.
  assert.ok(grassFraction(cellIndex('edge_north'), 0, 0, CELL_PX, 3) < 0.2, `${family}: edge_north top must be terrain`);
  assert.ok(grassFraction(cellIndex('edge_north'), 0, CELL_PX - 3, CELL_PX, 3) > 0.8, `${family}: edge_north bottom must be grass`);
  assert.ok(grassFraction(cellIndex('edge_south'), 0, 0, CELL_PX, 3) > 0.8, `${family}: edge_south top must be grass`);
  assert.ok(grassFraction(cellIndex('edge_west'), 0, 0, 3, CELL_PX) < 0.2, `${family}: edge_west left must be terrain`);
  assert.ok(grassFraction(cellIndex('edge_east'), CELL_PX - 3, 0, 3, CELL_PX) < 0.2, `${family}: edge_east right must be terrain`);
  // Corners: terrain occupies only the named quadrant; inners: grass notch
  // only at the named corner.
  const quadrant = { nw: [0, 0], ne: [CELL_PX - 5, 0], sw: [0, CELL_PX - 5], se: [CELL_PX - 5, CELL_PX - 5] };
  for (const dir of ['ne', 'nw', 'se', 'sw']) {
    for (const [q, [qx, qy]] of Object.entries(quadrant)) {
      const outer = grassFraction(cellIndex(`corner_${dir}`), qx, qy, 5, 5);
      const inner = grassFraction(cellIndex(`inner_${dir}`), qx, qy, 5, 5);
      if (q === dir) {
        assert.ok(outer < 0.2, `${family}: corner_${dir} must hold terrain at ${q}`);
        assert.ok(inner > 0.7, `${family}: inner_${dir} must hold a grass notch at ${q}`);
      } else {
        assert.ok(outer > 0.8, `${family}: corner_${dir} must be grass at ${q}`);
        assert.ok(inner < 0.2, `${family}: inner_${dir} must be terrain at ${q}`);
      }
    }
  }
}

// --- 2. Resolver unit coverage --------------------------------------------
const G = (sides) => ({ n: false, e: false, s: false, w: false, ne: false, nw: false, se: false, sw: false, ...sides });
assert.equal(resolveTransitionCell(G({})), 'center');
assert.equal(resolveTransitionCell(G({ s: true })), 'edge_north');
assert.equal(resolveTransitionCell(G({ n: true })), 'edge_south');
assert.equal(resolveTransitionCell(G({ e: true })), 'edge_west');
assert.equal(resolveTransitionCell(G({ w: true })), 'edge_east');
assert.equal(resolveTransitionCell(G({ n: true, e: true })), 'corner_sw');
assert.equal(resolveTransitionCell(G({ n: true, w: true })), 'corner_se');
assert.equal(resolveTransitionCell(G({ s: true, e: true })), 'corner_nw');
assert.equal(resolveTransitionCell(G({ s: true, w: true })), 'corner_ne');
assert.equal(resolveTransitionCell(G({ ne: true })), 'inner_ne');
assert.equal(resolveTransitionCell(G({ sw: true })), 'inner_sw');
assert.equal(resolveTransitionCell(G({ ne: true, sw: true })), 'center', 'multi-notch has no approved art');
assert.equal(resolveTransitionCell(G({ n: true, s: true })), 'center', '1-wide neck has no approved art');
assert.equal(resolveTransitionCell(G({ n: true, e: true, s: true })), 'center', 'peninsula tip has no approved art');
// A grass diagonal beside a grass cardinal must not demote an edge to a notch.
assert.equal(resolveTransitionCell(G({ s: true, se: true, sw: true })), 'edge_north');

// --- 3. Synthetic-map repaint ---------------------------------------------
{
  // 6x6 grass field with a 2x2 water pond at (1,1) and a horizontal 2-tall
  // dirt band across rows 4-5 (placeholder gids: 1 grass, 2 dirt, 3 water).
  const W = 6, H = 6;
  const data = new Array(W * H).fill(1);
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2]]) data[y * W + x] = 3;
  for (let x = 0; x < W; x += 1) { data[4 * W + x] = 2; data[5 * W + x] = 2; }
  const out = repaintGround(data, W, H);
  const at = (x, y) => out[y * W + x];
  // Pond: four outer corners (terrain hugs the pond's own quadrant).
  assert.equal(at(1, 1), gidOf('shore_corner_se'), 'pond NW tile keeps water at its SE');
  assert.equal(at(2, 1), gidOf('shore_corner_sw'), 'pond NE tile keeps water at its SW');
  assert.equal(at(1, 2), gidOf('shore_corner_ne'), 'pond SW tile keeps water at its NE');
  assert.equal(at(2, 2), gidOf('shore_corner_nw'), 'pond SE tile keeps water at its NW');
  // Dirt band: top row blends north, bottom row blends south — except at
  // the map border columns nothing changes horizontally (borders never
  // blend, so x=0 and x=5 still resolve the same north/south edges).
  for (let x = 0; x < W; x += 1) {
    assert.equal(at(x, 4), gidOf('dirt_edge_south'), `band top row x=${x} blends toward the grass above`);
    assert.equal(at(x, 5), gidOf('dirt_center'), `band bottom row x=${x} touches the map border, no blend`);
  }
  // Grass scatter stays inside the approved grass variants.
  assert.ok([gidOf('grass_b'), gidOf('grass_c')].includes(at(4, 0)));
  // Idempotency from the repainted state.
  assert.deepEqual(repaintGround(out, W, H), out, 'repaint must be idempotent');
}

// --- 4. Committed farm.json consistency -----------------------------------
{
  const map = JSON.parse(readFileSync(join(ROOT, 'public', 'maps', 'farm.json'), 'utf8'));
  const ground = map.layers.find((layer) => layer.type === 'tilelayer' && layer.name === 'Ground');
  assert.ok(ground, 'farm.json Ground layer missing');
  assert.deepEqual(repaintGround(ground.data, ground.width, ground.height), ground.data, 'committed farm.json must equal the resolver output');
  const transitionCount = ground.data.filter((gid) => {
    const name = CELLS[gid - 9]?.gidName ?? '';
    return (name.startsWith('dirt_') && name !== 'dirt_center') || name.startsWith('shore_');
  }).length;
  assert.ok(transitionCount >= 40, `expected a substantial transition repaint, found ${transitionCount}`);
  const tileset = map.tilesets.find((entry) => entry.name === 'farm-terrain-proof');
  assert.equal(tileset.tilecount, CELLS.length, 'tileset tilecount must cover all composed cells');
  // Sanity: every Ground gid is either a known category or an out-of-scope
  // decor/structure gid from the placeholder tileset (never undefined).
  for (const gid of ground.data) {
    assert.ok(gid > 0, 'Ground must not contain empty cells');
    assert.ok(categoryOf(gid) !== undefined, `unknown gid ${gid}`);
  }
}

console.log('Terrain transition tests passed.');
