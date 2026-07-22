#!/usr/bin/env node
// Deterministic scatter-decal painter - pilot recipe for the derive-over-generate
// production classes (docs/art-pipeline/CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md).
//
// Draws 16x16 palette-locked scatter decals directly on the runtime grid: no
// image generation, no key colour, no watermark, no palette drift. Seeded =>
// byte-reproducible, and the recipe PROVES it: the full family is painted twice
// in-process and output bytes must be identical, else the run fails.
//
// Recipe-level gates enforced here (universal per the workflow):
//   * locked-input verification - palette hexes are READ from the repo palette
//     JSON (status must be "locked", exactly 6 forest swatches); SHA-256 of the
//     palette JSON and grass base PNG are recorded in family-report.json.
//   * deterministic regeneration - two in-process runs, byte-identical outputs.
//   * exact output validation    - per-variant gates: bbox, occupancy, edge
//     contact (fail), bottom row (pivot band 13-15), palette exact by
//     construction; assertGatesPass() throws, naming every failure.
// Non-applicable invariants (seam/adjacency, histogram preservation,
// frame-continuity) are recorded as explicit "N/A" in the report.
//
// GRAMMAR CONSTANTS ARE HELD pending ChatGPT's visual audit of the family
// contact sheet (relayed 2026-07-21); fold any tweak into this file and the
// Python skill copy (scripts/paint_scatter.py in the eldoria-asset-pipeline
// skill) in one pass, then flip GRAMMAR_VERSION to v1.
//
// Usage:
//   node scripts/paint-scatter-family.mjs --palette <palette.json> --grass <grass.png> --out <dir> [--variants tuft_a,tuft_b]
//
// Pure core functions are exported for focused tests; the CLI runs only when
// invoked as the entry module.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

export const CELL = 16;
export const BOTTOM = 14;
export const GRAMMAR_VERSION = 'scatter-grammar/v1-held';
export const FAMILY_ID = 'tile_farm_grass_scatter';

// --- deterministic RNG (mulberry32; integer math only) ----------------------

export function seedFromName(name) {
  const digest = crypto.createHash('sha256').update(`eldoria-scatter/${name}/v1`).digest();
  return digest.readUInt32LE(0);
}

export function makeRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    uniform: (a, b) => a + next() * (b - a),
    randrange: (a, b) => a + Math.floor(next() * (b - a)),
    choice: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

// Round half to even (matches the Python reference painter's round()).
function pyRound(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

// --- grid -------------------------------------------------------------------

export function createGrid() {
  return new Int16Array(CELL * CELL).fill(-1);
}

export function setPx(g, x, y, c) {
  if (x >= 0 && x < CELL && y >= 0 && y < CELL) g[y * CELL + x] = c;
}

export function getPx(g, x, y) {
  return x >= 0 && x < CELL && y >= 0 && y < CELL ? g[y * CELL + x] : -1;
}

// Remove subject px with zero 4-connected subject neighbours.
export function destray(g) {
  const drop = [];
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      if (g[y * CELL + x] < 0) continue;
      const n = [getPx(g, x + 1, y), getPx(g, x - 1, y), getPx(g, x, y + 1), getPx(g, x, y - 1)];
      if (n.every((v) => v < 0)) drop.push([x, y]);
    }
  }
  for (const [x, y] of drop) g[y * CELL + x] = -1;
}

// --- grammar constants (HELD pending ChatGPT visual verdict, 2026-07-21) ----

export const TUFT = {
  cxChoices: [7, 8, 9],
  angles: [5, 35, 65, 115, 145, 180, 215, 325],
  countChoices: [6, 7],
  lenChoices: [4, 5, 5, 6],
  bodyChoices: [2, 2, 3],
  jitterDeg: 8,
  flatten: 0.8,
  crownFlatten: 0.85,
  crownLen: 3,
};
export const FLOWER = {
  cxChoices: [6, 7, 8, 9],
  leafExtraProb: 0.6,
  bxOffset: [0, 1],
  budRise: [2, 3],
};
export const PEBBLE = {
  wChoices: [8, 9, 10],
  hChoices: [3, 4, 5],
  cxChoices: [7, 8],
  jitter: 0.28,
  crevices: 2,
};

// --- shape grammars (upper-left key light, bottom anchored at row 14) --------

// Flat radial top-down grass tuft. tuft_b reuses this grammar with a different
// seed (declared seed sibling: identical grammar, seed-only change).
export function paintTuft(rng) {
  const g = createGrid();
  const cx = rng.choice(TUFT.cxChoices);
  const cy = BOTTOM - 1;
  setPx(g, cx, cy, 0);
  setPx(g, cx, cy + 1, 1);
  const angles = rng.shuffle([...TUFT.angles]);
  for (const a0 of angles.slice(0, rng.choice(TUFT.countChoices))) {
    const rad = ((a0 + rng.uniform(-TUFT.jitterDeg, TUFT.jitterDeg)) * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = -Math.sin(rad) * TUFT.flatten;
    const length = rng.choice(TUFT.lenChoices);
    const body = rng.choice(TUFT.bodyChoices);
    let x = cx;
    let y = cy;
    const pts = [];
    for (let i = 0; i < length; i += 1) {
      x += dx; y += dy;
      const px = pyRound(x); const py = pyRound(y);
      if (pts.length === 0 || px !== pts[pts.length - 1][0] || py !== pts[pts.length - 1][1]) pts.push([px, py]);
    }
    for (let i = 0; i < pts.length; i += 1) {
      const [px, py] = pts[i];
      if (py > BOTTOM) break;
      if (i === pts.length - 1 && pts.length >= 3) setPx(g, px, py, px <= cx && py <= cy ? 5 : 4);
      else setPx(g, px, py, body);
    }
  }
  for (const a0 of [rng.uniform(75, 90), rng.uniform(95, 115)]) {
    const rad = (a0 * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = -Math.sin(rad) * TUFT.crownFlatten;
    let x = cx;
    let y = cy;
    const pts = [];
    for (let i = 0; i < TUFT.crownLen; i += 1) {
      x += dx; y += dy;
      const px = pyRound(x); const py = pyRound(y);
      if (pts.length === 0 || px !== pts[pts.length - 1][0] || py !== pts[pts.length - 1][1]) pts.push([px, py]);
    }
    for (let i = 0; i < pts.length; i += 1) {
      const [px, py] = pts[i];
      if (py > BOTTOM) break;
      setPx(g, px, py, i === pts.length - 1 ? 4 : 2);
    }
  }
  destray(g);
  return g;
}

// Tiny low bud: leaves at base, plus-shaped 5px bloom, darker core.
export function paintFlower(rng) {
  const g = createGrid();
  const cx = rng.choice(FLOWER.cxChoices);
  const by = BOTTOM;
  setPx(g, cx - 1, by, 2);
  setPx(g, cx + 2, by, 2);
  if (rng.next() < FLOWER.leafExtraProb) setPx(g, cx - 1, by - 1, 3);
  const bx = cx + rng.choice(FLOWER.bxOffset);
  const byy = by - rng.choice(FLOWER.budRise);
  setPx(g, bx, byy, 4);
  setPx(g, bx - 1, byy, 5);
  setPx(g, bx + 1, byy, 5);
  setPx(g, bx, byy - 1, 5);
  setPx(g, bx, byy + 1, 5);
  setPx(g, bx, byy + 2, 3);
  destray(g);
  return g;
}

// Matte low-wide stone: jittered ellipse, upper-left lit band, dark lower rim.
export function paintPebble(rng) {
  const g = createGrid();
  const w = rng.choice(PEBBLE.wChoices);
  const h = rng.choice(PEBBLE.hChoices);
  const cx = rng.choice(PEBBLE.cxChoices);
  const x0 = cx - Math.floor(w / 2);
  const y1 = BOTTOM;
  const y0 = y1 - h + 1;
  const jit = new Map();
  for (let i = 0; i < w; i += 1) {
    for (let j = 0; j < h; j += 1) jit.set(`${i},${j}`, rng.uniform(-PEBBLE.jitter, PEBBLE.jitter));
  }
  for (let yy = y0; yy <= y1; yy += 1) {
    for (let xx = x0; xx < x0 + w; xx += 1) {
      const nx = (xx - (x0 + w / 2 - 0.5)) / (w / 2);
      const ny = (yy - (y0 + h / 2 - 0.5)) / (h / 2);
      if (nx * nx + ny * ny <= 1.0 + jit.get(`${xx - x0},${yy - y0}`)) {
        let c;
        if (yy === y0 || (xx <= x0 + 1 && yy <= y0 + 1)) c = (xx + yy) % 2 === 0 ? 4 : 3;
        else if (xx <= x0 + 2 && yy <= y0 + 2) c = 3;
        else if (yy === y1 || xx >= x0 + w - 2) c = 1;
        else c = 2;
        setPx(g, xx, yy, c);
      }
    }
  }
  for (let i = 0; i < PEBBLE.crevices; i += 1) {
    const xx = rng.randrange(x0 + 1, x0 + w - 1);
    const yy = rng.randrange(y0 + Math.floor(h / 2), y1 + 1);
    if (getPx(g, xx, yy) >= 0 && getPx(g, xx, yy - 1) >= 0) setPx(g, xx, yy, 0);
  }
  destray(g);
  return g;
}

export const PAINTERS = {
  tuft_a: paintTuft,
  tuft_b: paintTuft, // declared seed sibling: identical grammar, seed-only change
  flower_a: paintFlower,
  pebble_a: paintPebble,
};
export const SEED_SIBLING_OF = { tuft_b: 'tuft_a' };
export const FAMILY_VARIANTS = ['tuft_a', 'tuft_b', 'flower_a', 'pebble_a'];

// --- locked palette -----------------------------------------------------------

export function loadForest(palettePath) {
  const data = JSON.parse(fs.readFileSync(palettePath, 'utf8'));
  if (data.status !== 'locked') throw new Error(`palette ${palettePath} is not status=locked`);
  const fam = data?.families?.forest;
  if (!Array.isArray(fam) || fam.length !== 6) {
    throw new Error(`palette ${palettePath}: forest family must have exactly 6 swatches`);
  }
  return fam.map((h) => {
    if (typeof h !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(h)) throw new Error(`palette ${palettePath}: invalid hex ${h}`);
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  });
}

// --- render + gates -----------------------------------------------------------

export function rgbaOfGrid(g, forest) {
  const data = new Uint8Array(CELL * CELL * 4);
  for (let i = 0; i < CELL * CELL; i += 1) {
    if (g[i] < 0) continue;
    const [r, gg, b] = forest[g[i]];
    data[i * 4] = r; data[i * 4 + 1] = gg; data[i * 4 + 2] = b; data[i * 4 + 3] = 255;
  }
  return { width: CELL, height: CELL, colorType: 6, data };
}

export function gatesOfGrid(g) {
  let minX = CELL; let minY = CELL; let maxX = -1; let maxY = -1; let count = 0;
  let edge = false;
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      if (g[y * CELL + x] < 0) continue;
      count += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || x === CELL - 1 || y === 0 || y === CELL - 1) edge = true;
    }
  }
  return {
    runtime_bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    occupancy_pct: Math.round((1000 * count) / (CELL * CELL)) / 10,
    edge_contact: edge,
    bottom_row: maxY,
    palette: 'exact by construction (read from locked palette JSON)',
  };
}

export function assertGatesPass(variantReports) {
  const failures = [];
  for (const v of variantReports) {
    if (v.edge_contact) failures.push(`${v.variant}: edge contact`);
    if (!(v.bottom_row >= 13 && v.bottom_row <= 15)) failures.push(`${v.variant}: bottom row ${v.bottom_row} outside 13-15`);
    if (!(v.occupancy_pct > 1 && v.occupancy_pct <= 40)) failures.push(`${v.variant}: occupancy ${v.occupancy_pct}% outside (1, 40]`);
  }
  if (failures.length > 0) throw new Error(`scatter gate failures:\n  ${failures.join('\n  ')}`);
}

export function paintVariant(name, forest) {
  const painter = PAINTERS[name];
  if (!painter) throw new Error(`unknown scatter variant ${name}`);
  return rgbaOfGrid(painter(makeRng(seedFromName(name))), forest);
}

// --- evidence helpers ---------------------------------------------------------
// writePng always reads image.data with a 4-byte stride (alpha is stripped for
// colorType 2), so every helper below produces RGBA buffers.

function newRgba(width, height, fill) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3];
  }
  return data;
}

function blit(out, outWidth, ox, oy, img) {
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      const s = (y * img.width + x) * 4;
      const d = ((oy + y) * outWidth + ox + x) * 4;
      out[d] = img.data[s]; out[d + 1] = img.data[s + 1]; out[d + 2] = img.data[s + 2]; out[d + 3] = img.data[s + 3];
    }
  }
}

function hstack(images, sepWidth = 8) {
  const height = images[0].height;
  const total = images.reduce((a, i) => a + i.width, 0) + sepWidth * (images.length - 1);
  const data = newRgba(total, height, [40, 40, 40, 255]);
  let ox = 0;
  for (const img of images) {
    blit(data, total, ox, 0, img);
    ox += img.width + sepWidth;
  }
  return { width: total, height, colorType: 2, data };
}

function vstack(images, sepHeight = 8) {
  const width = Math.max(...images.map((i) => i.width));
  const height = images.reduce((a, i) => a + i.height, 0) + sepHeight * (images.length - 1);
  const data = newRgba(width, height, [40, 40, 40, 255]);
  let oy = 0;
  for (const img of images) {
    blit(data, width, 0, oy, img);
    oy += img.height + sepHeight;
  }
  return { width, height, colorType: 2, data };
}

function resizeNearest(img, size) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sx = Math.min(img.width - 1, Math.floor((x * img.width) / size));
      const sy = Math.min(img.height - 1, Math.floor((y * img.height) / size));
      const s = (sy * img.width + sx) * 4;
      const d = (y * size + x) * 4;
      data[d] = img.data[s]; data[d + 1] = img.data[s + 1]; data[d + 2] = img.data[s + 2]; data[d + 3] = img.data[s + 3];
    }
  }
  return { width: size, height: size, colorType: 2, data };
}

function isolated8x(rgba) {
  const size = CELL * 8;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = Math.floor(x / 8); const py = Math.floor(y / 8);
      const s = (py * CELL + px) * 4;
      const d = (y * size + x) * 4;
      if (rgba.data[s + 3] > 0) {
        data[d] = rgba.data[s]; data[d + 1] = rgba.data[s + 1]; data[d + 2] = rgba.data[s + 2]; data[d + 3] = 255;
      } else {
        const v = (px + py) % 2 === 0 ? 105 : 150;
        data[d] = v; data[d + 1] = v; data[d + 2] = v; data[d + 3] = 255;
      }
    }
  }
  return { width: size, height: size, colorType: 2, data };
}

function grassComposite(rgba, grassRgb) {
  const field = new Uint8Array(48 * 48 * 4);
  for (let y = 0; y < 48; y += 1) {
    for (let x = 0; x < 48; x += 1) {
      const s = ((y % 16) * 16 + (x % 16)) * 3;
      const d = (y * 48 + x) * 4;
      field[d] = grassRgb[s]; field[d + 1] = grassRgb[s + 1]; field[d + 2] = grassRgb[s + 2]; field[d + 3] = 255;
    }
  }
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const s = (y * CELL + x) * 4;
      if (rgba.data[s + 3] === 0) continue;
      const d = ((16 + y) * 48 + 16 + x) * 4;
      field[d] = rgba.data[s]; field[d + 1] = rgba.data[s + 1]; field[d + 2] = rgba.data[s + 2];
    }
  }
  return resizeNearest({ width: 48, height: 48, colorType: 2, data: field }, 48 * 4);
}

// --- family driver --------------------------------------------------------------

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

export function paintFamily({ palettePath, grassPath, outDir, variants = FAMILY_VARIANTS }) {
  const forest = loadForest(palettePath);
  const grass = readPng(grassPath);
  if (grass.width !== CELL || grass.height !== CELL) throw new Error(`grass base must be exact 16x16, got ${grass.width}x${grass.height}`);
  const grassRgb = new Uint8Array(CELL * CELL * 3);
  for (let i = 0; i < CELL * CELL; i += 1) {
    grassRgb[i * 3] = grass.data[i * 4]; grassRgb[i * 3 + 1] = grass.data[i * 4 + 1]; grassRgb[i * 3 + 2] = grass.data[i * 4 + 2];
  }

  // Gate: deterministic regeneration - paint twice, output bytes must match.
  const run1 = variants.map((n) => ({ name: n, img: paintVariant(n, forest) }));
  const run2 = variants.map((n) => ({ name: n, img: paintVariant(n, forest) }));
  for (let i = 0; i < variants.length; i += 1) {
    if (!Buffer.from(run1[i].img.data).equals(Buffer.from(run2[i].img.data))) {
      throw new Error(`deterministic regeneration gate: ${variants[i]} diverged across two runs`);
    }
  }

  const gridReports = run1.map(({ name }) => {
    const painter = PAINTERS[name];
    const g = painter(makeRng(seedFromName(name)));
    const rep = { variant: name, seed: `eldoria-scatter/${name}/v1 (sha256[0:4] LE)`, ...gatesOfGrid(g) };
    if (SEED_SIBLING_OF[name]) {
      rep.seed_sibling_of = SEED_SIBLING_OF[name];
      rep.derivation = 'identical grammar, seed-only change';
    }
    return rep;
  });
  assertGatesPass(gridReports);

  fs.mkdirSync(outDir, { recursive: true });
  const rows = [];
  for (const { name, img } of run1) {
    writePng(path.join(outDir, `${name}.16.png`), img);
    const iso = isolated8x(img);
    writePng(path.join(outDir, `${name}.x8.png`), iso);
    const comp = grassComposite(img, grassRgb);
    writePng(path.join(outDir, `${name}.grass-x4.png`), comp);
    rows.push(hstack([iso, resizeNearest(comp, iso.width)]));
  }
  writePng(path.join(outDir, 'montage.png'), vstack(rows));

  const report = {
    schema: 'scatter-paint-family-report/v1',
    family: FAMILY_ID,
    grammar_version: GRAMMAR_VERSION,
    production_class: 'anchor (family gated as anchor); tuft_b = derived seed sibling',
    locked_inputs: {
      palette: { path: palettePath, sha256: sha256File(palettePath), family: 'forest', status: 'locked' },
      grass_base: { path: grassPath, sha256: sha256File(grassPath) },
    },
    deterministic_regeneration: { runs: 2, output_byte_identical: true },
    applicable_invariants: {
      palette_conformance: 'exact by construction',
      occupancy_bbox: 'gated per variant',
      edge_contact: 'gated (fail on contact)',
      pivot_fit_bottom_row: 'gated (expect 13-15)',
      seam_adjacency: 'N/A (decals, non-tiling)',
      histogram_preservation: 'N/A (no input bitmap; direct grid paint)',
      frame_continuity: 'N/A (static decals)',
    },
    variants: gridReports,
    family_verdict_draft: 'HOLD - all machine gates pass; named next gate: ChatGPT visual audit (routine final art gate). Candidates + machine evidence only; not an approval.',
  };
  fs.writeFileSync(path.join(outDir, 'family-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

// --- CLI ------------------------------------------------------------------------

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, '')] = argv[i + 1];
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  if (!a.palette || !a.grass || !a.out) {
    console.error('Usage: node scripts/paint-scatter-family.mjs --palette <palette.json> --grass <grass.png> --out <dir> [--variants tuft_a,tuft_b]');
    process.exit(1);
  }
  try {
    const report = paintFamily({
      palettePath: a.palette,
      grassPath: a.grass,
      outDir: a.out,
      variants: a.variants ? a.variants.split(',') : FAMILY_VARIANTS,
    });
    console.log(JSON.stringify(report.variants, null, 2));
    console.log(`family montage + report -> ${a.out}`);
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  }
}
