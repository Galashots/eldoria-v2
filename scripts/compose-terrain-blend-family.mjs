#!/usr/bin/env node
// Deterministic terrain-blend compositor (spec: docs/art-pipeline/TERRAIN_BLEND_COMPOSITOR_SPEC_V1.md).
//
// Derives a reduced 13-tile blend family from two approved exact 16x16 runtime
// inputs (a foreground material composited over a background material) using a
// four-corner code with integer bilinear interpolation. No image generation,
// interpolation, antialiasing, floating-point SDF, or per-variant randomness:
// every output pixel is copied verbatim from one of the two approved inputs at
// the same coordinate. Pure core functions are exported for focused tests; the
// CLI runs only when invoked as the entry module.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { readPng, writePng, normalizeAssetSheet } from './normalize-asset-sheet.mjs';
import { upscaleNearestNeighborRgbOnly } from './upscale-nearest-neighbor.mjs';

export const CELL = 16;
export const WEIGHT_TOTAL = 225; // (CELL-1)^2; odd, so q is never zero.

// Authoritative reduced 13-tile topology, in production packed order.
// corners are [north_west, north_east, south_east, south_west]; 1 = foreground.
export const TOPOLOGY = [
  { name: 'center', corners: [1, 1, 1, 1] },
  { name: 'edge_north', corners: [1, 1, 0, 0] },
  { name: 'edge_south', corners: [0, 0, 1, 1] },
  { name: 'edge_west', corners: [1, 0, 0, 1] },
  { name: 'edge_east', corners: [0, 1, 1, 0] },
  { name: 'corner_ne', corners: [0, 1, 0, 0] },
  { name: 'corner_nw', corners: [1, 0, 0, 0] },
  { name: 'corner_se', corners: [0, 0, 1, 0] },
  { name: 'corner_sw', corners: [0, 0, 0, 1] },
  { name: 'inner_corner_ne', corners: [1, 0, 1, 1] },
  { name: 'inner_corner_nw', corners: [0, 1, 1, 1] },
  { name: 'inner_corner_se', corners: [1, 1, 0, 1] },
  { name: 'inner_corner_sw', corners: [1, 1, 1, 0] },
];

// The two diagonal saddle codes are outside the reduced contract and rejected.
export const SADDLE_CODES = [
  [1, 0, 1, 0],
  [0, 1, 0, 1],
];

// --- Pure core mask model ------------------------------------------------

// Integer bilinear score of the four corner bits at integer pixel (x, y).
export function cornerScore(corners, x, y) {
  const [nw, ne, se, sw] = corners;
  const ix = CELL - 1 - x;
  const iy = CELL - 1 - y;
  return nw * ix * iy + ne * x * iy + se * x * y + sw * ix * y;
}

// q = 2*score - 225. q >= 0 means the foreground material occupies the pixel.
export function qValue(corners, x, y) {
  return 2 * cornerScore(corners, x, y) - WEIGHT_TOTAL;
}

export function coreForeground(corners, x, y) {
  return qValue(corners, x, y) >= 0;
}

// Deterministic unsigned 32-bit pixel hash (Math.imul + XOR + unsigned shifts).
export function hashPixel(x, y, seed) {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (x + 1), 0x9e3779b1) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h ^ (y + 1), 0x85ebca77) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae3d) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

export function fringeEligible(x, y, q, threshold) {
  return x >= 1 && x <= CELL - 2 && y >= 1 && y <= CELL - 2 && Math.abs(q) <= threshold;
}

export function cornerCode(corners) {
  return corners.map((b) => (b ? 1 : 0)).join('');
}

// Core foreground mask (pre-fringe) as a 16x16 Uint8Array of 0/1.
export function coreMask(corners) {
  const mask = new Uint8Array(CELL * CELL);
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      mask[y * CELL + x] = coreForeground(corners, x, y) ? 1 : 0;
    }
  }
  return mask;
}

export function coreForegroundCount(corners) {
  let n = 0;
  const mask = coreMask(corners);
  for (let i = 0; i < mask.length; i += 1) n += mask[i];
  return n;
}

// Compose one 16x16 cell. fg/bg are {width,height,data(RGBA)} decoded inputs.
// Returns the composed RGBA buffer plus deterministic per-cell statistics.
export function composeCell(fg, bg, corners, fringe) {
  if (fg.width !== CELL || fg.height !== CELL) throw new Error('foreground input must be 16x16');
  if (bg.width !== CELL || bg.height !== CELL) throw new Error('background input must be 16x16');
  const { threshold, modulus, selectedRemainder, seed } = fringe;
  const data = new Uint8Array(CELL * CELL * 4);
  let fgCount = 0;
  let bgCount = 0;
  let fringeEligibleCount = 0;
  let fringeChangedCount = 0;
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const q = qValue(corners, x, y);
      let useFg = q >= 0;
      const eligible = fringeEligible(x, y, q, threshold);
      if (eligible) {
        fringeEligibleCount += 1;
        if (hashPixel(x, y, seed) % modulus === selectedRemainder) {
          useFg = !useFg;
          fringeChangedCount += 1;
        }
      }
      const src = useFg ? fg : bg;
      const idx = (y * CELL + x) * 4;
      data[idx] = src.data[idx];
      data[idx + 1] = src.data[idx + 1];
      data[idx + 2] = src.data[idx + 2];
      data[idx + 3] = src.data[idx + 3];
      if (useFg) fgCount += 1; else bgCount += 1;
    }
  }
  return {
    width: CELL,
    height: CELL,
    colorType: 6,
    data,
    stats: {
      coreForegroundCount: coreForegroundCount(corners),
      fringeEligibleCount,
      fringeChangedCount,
      foregroundPixels: fgCount,
      backgroundPixels: bgCount,
    },
  };
}

// Material class along a tile's outer edges, from the core mask only (fringe
// never touches the border, so shared-edge classification is pure core).
export function edgeTraces(corners) {
  const mask = coreMask(corners);
  const at = (x, y) => mask[y * CELL + x];
  const north = [];
  const south = [];
  const west = [];
  const east = [];
  for (let x = 0; x < CELL; x += 1) { north.push(at(x, 0)); south.push(at(x, CELL - 1)); }
  for (let y = 0; y < CELL; y += 1) { west.push(at(0, y)); east.push(at(CELL - 1, y)); }
  return { north, south, west, east };
}

// --- Palette / colour helpers -------------------------------------------

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function nearestSwatchDistance(r, g, b, swatches) {
  let best = Infinity;
  for (const [sr, sg, sb] of swatches) {
    const d = Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2);
    if (d < best) best = d;
  }
  return best;
}

function pixelKey(data, idx) {
  return `${data[idx]},${data[idx + 1]},${data[idx + 2]},${data[idx + 3]}`;
}

function inputPixelSet(img) {
  const set = new Set();
  for (let i = 0; i < img.data.length; i += 4) set.add(pixelKey(img.data, i));
  return set;
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function sha256Buffer(data) {
  return crypto.createHash('sha256').update(Buffer.from(data)).digest('hex');
}

// --- Shoreline band model (spec §10: water-as-foreground q-band compositing) --
//
// Separate pure mode from binary_material_interlock. Reuses qValue()/TOPOLOGY
// unchanged. Every pixel is assigned to exactly one q-band; only band interior
// pixels (never the outer row/column) may receive a locked hashed-swatch
// variation. No fringe inversion, no alpha blending, no new colours.

export const SHORELINE_SWATCHES = {
  innerSandBase: '#D5A342',
  innerSandAlt: '#B98535',
  outerSandBase: '#B98535',
  outerSandAlt: '#926B2A',
  lightMoss: '#6C8B15',
  darkMoss: '#427118',
};

const SHORELINE_RGB = Object.fromEntries(Object.entries(SHORELINE_SWATCHES).map(([k, v]) => [k, hexToRgb(v)]));

// q-band classification. Thresholds match spec §10 exactly; q is always odd
// (never 0), so the half-open boundaries never admit ambiguity.
export function shorelineBand(q) {
  if (q >= 0) return 'water';
  if (q >= -30) return 'inner_sand';
  if (q >= -60) return 'outer_sand';
  if (q >= -90) return 'moss';
  return 'grass';
}

// Deterministic pre-variation band membership counts for one topology. Band
// membership depends only on the corner code (via qValue), never on hashing.
export function shorelineBandCounts(corners) {
  const counts = { water: 0, inner_sand: 0, outer_sand: 0, moss: 0, grass: 0 };
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) counts[shorelineBand(qValue(corners, x, y))] += 1;
  }
  return counts;
}

export function isOuterEdgePixel(x, y) {
  return x === 0 || y === 0 || x === CELL - 1 || y === CELL - 1;
}

// Compose one 16x16 shoreline cell. water/grass are approved {width,height,
// data(RGBA)} 16x16 decoded inputs (water = foreground/1, grass = background/0).
// shoreline = { seed, swatches? } (swatches optional override, merged over the
// locked defaults; validated against the locked set by validateShorelineRecipe).
export function composeShorelineCell(water, grass, corners, shoreline) {
  if (water.width !== CELL || water.height !== CELL) throw new Error('water input must be 16x16');
  if (grass.width !== CELL || grass.height !== CELL) throw new Error('grass input must be 16x16');
  const seed = shoreline.seed;
  const rgb = shoreline.swatches
    ? Object.fromEntries(Object.entries({ ...SHORELINE_SWATCHES, ...shoreline.swatches }).map(([k, v]) => [k, hexToRgb(v)]))
    : SHORELINE_RGB;
  const data = new Uint8Array(CELL * CELL * 4);
  const band = { water: 0, inner_sand: 0, outer_sand: 0, moss: 0, grass: 0 };
  const swatch = {
    waterInput: 0, grassInput: 0,
    innerSandBase: 0, innerSandAlt: 0,
    outerSandBase: 0, outerSandAlt: 0,
    lightMoss: 0, darkMoss: 0,
  };
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const q = qValue(corners, x, y);
      const b = shorelineBand(q);
      band[b] += 1;
      const idx = (y * CELL + x) * 4;
      const edge = isOuterEdgePixel(x, y);
      let out;
      let key;
      if (b === 'water') {
        out = [water.data[idx], water.data[idx + 1], water.data[idx + 2]];
        key = 'waterInput';
      } else if (b === 'grass') {
        out = [grass.data[idx], grass.data[idx + 1], grass.data[idx + 2]];
        key = 'grassInput';
      } else if (b === 'inner_sand') {
        // v2 (ChatGPT PR #99 correction): base #B98535 (muted); interior-only
        // accent hash%11==0 -> #D5A342. Mutes the water-adjacent line that
        // read as a bright continuous outline in v1.
        if (!edge && hashPixel(x, y, seed) % 11 === 0) { out = rgb.innerSandBase; key = 'innerSandBase'; } // #D5A342
        else { out = rgb.innerSandAlt; key = 'innerSandAlt'; } // #B98535
      } else if (b === 'outer_sand') {
        // v2: edge/base #926B2A; interior evaluated in priority order:
        // hash%4==0 -> exact grass_a pixel (feathers into land); else
        // hash%3==0 -> #6C8B15 (light moss bleed); else #926B2A.
        if (!edge) {
          const h = hashPixel(x, y, seed);
          if (h % 4 === 0) { out = [grass.data[idx], grass.data[idx + 1], grass.data[idx + 2]]; key = 'grassInput'; }
          else if (h % 3 === 0) { out = rgb.lightMoss; key = 'lightMoss'; } // #6C8B15
          else { out = rgb.outerSandAlt; key = 'outerSandAlt'; } // #926B2A
        } else {
          out = rgb.outerSandAlt; key = 'outerSandAlt'; // #926B2A
        }
      } else { // moss
        // v2: edge stays exact grass_a (unchanged); interior evaluated in
        // priority order: hash%5==0 -> #926B2A (sand/moss interlock); else
        // hash%3==0 -> #6C8B15; else hash%7==0 -> #427118; else exact grass_a.
        if (!edge) {
          const h = hashPixel(x, y, seed);
          if (h % 5 === 0) { out = rgb.outerSandAlt; key = 'outerSandAlt'; } // #926B2A
          else if (h % 3 === 0) { out = rgb.lightMoss; key = 'lightMoss'; } // #6C8B15
          else if (h % 7 === 0) { out = rgb.darkMoss; key = 'darkMoss'; } // #427118
          else { out = [grass.data[idx], grass.data[idx + 1], grass.data[idx + 2]]; key = 'grassInput'; }
        } else {
          out = [grass.data[idx], grass.data[idx + 1], grass.data[idx + 2]];
          key = 'grassInput';
        }
      }
      swatch[key] += 1;
      data[idx] = out[0]; data[idx + 1] = out[1]; data[idx + 2] = out[2]; data[idx + 3] = 255;
    }
  }
  return { width: CELL, height: CELL, colorType: 6, data, stats: { band, swatch } };
}

// --- Recipe validation ---------------------------------------------------

function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 40; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('could not locate repository root (package.json) above recipe');
}

export function validateRecipe(recipe, ctx) {
  const errors = [];
  const push = (m) => errors.push(m);
  if (recipe.version !== 1) push('recipe.version must be 1');
  if (recipe.mode !== 'binary_material_interlock') push(`unknown mode: ${recipe.mode}`);
  if (!Array.isArray(recipe.cellPx) || recipe.cellPx[0] !== 16 || recipe.cellPx[1] !== 16) push('cellPx must be [16, 16] in v1');
  if (recipe.upscale !== 64) push('upscale must be 64');
  const f = recipe.fringe ?? {};
  if (!Number.isInteger(f.threshold) || f.threshold < 0) push('fringe.threshold must be a non-negative integer');
  if (!Number.isInteger(f.modulus) || f.modulus < 1) push('fringe.modulus must be a positive integer');
  if (!Number.isInteger(f.selectedRemainder) || f.selectedRemainder < 0 || f.selectedRemainder >= (f.modulus ?? 1)) push('fringe.selectedRemainder must be an integer in [0, modulus)');
  if (!Number.isInteger(f.seed)) push('fringe.seed must be an integer');
  const variants = Array.isArray(recipe.variants) ? recipe.variants : [];
  if (variants.length !== TOPOLOGY.length) push(`variants must list exactly ${TOPOLOGY.length} entries in authoritative order`);
  const names = new Set();
  variants.forEach((v, i) => {
    if (names.has(v.name)) push(`duplicate variant name: ${v.name}`);
    names.add(v.name);
    if (!Array.isArray(v.corners) || v.corners.length !== 4 || v.corners.some((b) => b !== 0 && b !== 1)) {
      push(`variant ${v.name}: corners must be four 0/1 bits`);
      return;
    }
    if (SADDLE_CODES.some((s) => s.join('') === cornerCode(v.corners))) push(`variant ${v.name}: saddle code ${cornerCode(v.corners)} is not a production variant`);
    const expected = TOPOLOGY[i];
    if (expected && (expected.name !== v.name || cornerCode(expected.corners) !== cornerCode(v.corners))) {
      push(`variant[${i}] must be ${expected.name} ${cornerCode(expected.corners)}, got ${v.name} ${cornerCode(v.corners)}`);
    }
  });
  for (const t of TOPOLOGY) if (!names.has(t.name)) push(`missing required variant: ${t.name}`);
  if (errors.length) throw new Error(`Invalid recipe${ctx ? ` (${ctx})` : ''}:\n- ${errors.join('\n- ')}`);
}

// Separate validator for the shoreline_bands mode; does not alter validateRecipe
// or its binary_material_interlock behaviour in any way.
export function validateShorelineRecipe(recipe, ctx) {
  const errors = [];
  const push = (m) => errors.push(m);
  if (recipe.version !== 1) push('recipe.version must be 1');
  if (recipe.mode !== 'shoreline_bands') push(`unknown mode: ${recipe.mode}`);
  if (!Array.isArray(recipe.cellPx) || recipe.cellPx[0] !== 16 || recipe.cellPx[1] !== 16) push('cellPx must be [16, 16] in v1');
  if (recipe.upscale !== 64) push('upscale must be 64');
  const s = recipe.shoreline ?? {};
  if (!Number.isInteger(s.seed)) push('shoreline.seed must be an integer');
  if (s.swatches !== undefined) {
    for (const [k, v] of Object.entries(s.swatches)) {
      if (!Object.prototype.hasOwnProperty.call(SHORELINE_SWATCHES, k)) push(`shoreline.swatches has unknown key: ${k}`);
      else if (v !== SHORELINE_SWATCHES[k]) push(`shoreline.swatches.${k} must equal the locked value ${SHORELINE_SWATCHES[k]} (no new colours are authorized)`);
    }
  }
  const variants = Array.isArray(recipe.variants) ? recipe.variants : [];
  if (variants.length !== TOPOLOGY.length) push(`variants must list exactly ${TOPOLOGY.length} entries in authoritative order`);
  const names = new Set();
  variants.forEach((v, i) => {
    if (names.has(v.name)) push(`duplicate variant name: ${v.name}`);
    names.add(v.name);
    if (!Array.isArray(v.corners) || v.corners.length !== 4 || v.corners.some((b) => b !== 0 && b !== 1)) {
      push(`variant ${v.name}: corners must be four 0/1 bits`);
      return;
    }
    if (SADDLE_CODES.some((sc) => sc.join('') === cornerCode(v.corners))) push(`variant ${v.name}: saddle code ${cornerCode(v.corners)} is not a production variant`);
    const expected = TOPOLOGY[i];
    if (expected && (expected.name !== v.name || cornerCode(expected.corners) !== cornerCode(v.corners))) {
      push(`variant[${i}] must be ${expected.name} ${cornerCode(expected.corners)}, got ${v.name} ${cornerCode(v.corners)}`);
    }
  });
  for (const t of TOPOLOGY) if (!names.has(t.name)) push(`missing required variant: ${t.name}`);
  if (errors.length) throw new Error(`Invalid shoreline recipe${ctx ? ` (${ctx})` : ''}:\n- ${errors.join('\n- ')}`);
}

function assertOpaque16(img, label) {
  if (img.width !== CELL || img.height !== CELL) throw new Error(`${label} must decode as 16x16 (got ${img.width}x${img.height})`);
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] !== 255) throw new Error(`${label} must be fully opaque (alpha 255)`);
}

function assertInsideRepo(repoRoot, target, label) {
  const resolved = path.resolve(target);
  const root = path.resolve(repoRoot);
  const rel = path.relative(root, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`${label} resolves outside the repository: ${target}`);
  return resolved;
}

// --- Evidence rendering --------------------------------------------------

// Minimal 3x5 digit glyphs for deterministic index labels (0-9).
const DIGIT_GLYPHS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

function blank(width, height, rgb) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
  }
  return { width, height, colorType: 6, data };
}

function setPx(img, x, y, rgb) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
}

function drawLabel(img, num, ox, oy, scale, rgb) {
  const digits = String(num).split('');
  let cx = ox;
  for (const d of digits) {
    const glyph = DIGIT_GLYPHS[d];
    for (let gy = 0; gy < 5; gy += 1) {
      for (let gx = 0; gx < 3; gx += 1) {
        if (glyph[gy][gx] === '1') {
          for (let sy = 0; sy < scale; sy += 1) for (let sx = 0; sx < scale; sx += 1) setPx(img, cx + gx * scale + sx, oy + gy * scale + sy, rgb);
        }
      }
    }
    cx += (3 + 1) * scale;
  }
}

function blitCell(dst, cell, dx, dy, scale) {
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const si = (y * CELL + x) * 4;
      const rgb = [cell.data[si], cell.data[si + 1], cell.data[si + 2]];
      for (let sy = 0; sy < scale; sy += 1) for (let sx = 0; sx < scale; sx += 1) setPx(dst, dx + x * scale + sx, dy + y * scale + sy, rgb);
    }
  }
}

// --- Deterministic mixed-tiling lattice ----------------------------------
// Adjacency is exact by construction: a shared edge reads the same two corner
// vertices from both neighbours. The vertex field is a filled dirt rectangle
// (rows/cols 2..6 on an 8x8 vertex grid, leaving a one-cell pure-grass margin
// on every side) with one interior hole at (4,4). This yields center, all four
// outer corners, all four edges, all four inner corners, and pure-grass cells,
// and contains no saddle code.
const MIX_VERTS = (() => {
  const V = Array.from({ length: 8 }, () => new Array(8).fill(0));
  for (let r = 2; r <= 6; r += 1) for (let c = 2; c <= 6; c += 1) V[r][c] = 1;
  V[4][4] = 0;
  return V;
})();

function mixedLatticeCells() {
  const rows = MIX_VERTS.length - 1;
  const cols = MIX_VERTS[0].length - 1;
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const corners = [MIX_VERTS[r][c], MIX_VERTS[r][c + 1], MIX_VERTS[r + 1][c + 1], MIX_VERTS[r + 1][c]];
      cells.push({ r, c, corners });
    }
  }
  return { rows, cols, cells };
}

// --- Main composition ----------------------------------------------------

export function composeFamily(recipePath, options = {}) {
  const recipeAbs = path.resolve(recipePath);
  const recipeDir = path.dirname(recipeAbs);
  const recipe = JSON.parse(fs.readFileSync(recipeAbs, 'utf8'));
  validateRecipe(recipe, recipePath);
  const repoRoot = findRepoRoot(recipeDir);
  const resolveRel = (p) => path.resolve(recipeDir, p);

  const fgPath = resolveRel(recipe.foregroundPath);
  const bgPath = resolveRel(recipe.backgroundPath);
  const fg = readPng(fgPath);
  const bg = readPng(bgPath);
  assertOpaque16(fg, 'foreground input');
  assertOpaque16(bg, 'background input');

  const fgSet = inputPixelSet(fg);
  const bgSet = inputPixelSet(bg);
  const swatches = (recipe.paletteSwatches ?? []).map(hexToRgb);

  const canonicalDir = assertInsideRepo(repoRoot, resolveRel(recipe.canonicalSourceDir), 'canonicalSourceDir');
  const runtimeDir = assertInsideRepo(repoRoot, resolveRel(recipe.runtimeMasterDir), 'runtimeMasterDir');
  const evidenceDir = assertInsideRepo(repoRoot, resolveRel(recipe.evidenceDir ?? '.'), 'evidenceDir');
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });

  const cells = {};
  const variantReports = [];

  for (const variant of recipe.variants) {
    const composed = composeCell(fg, bg, variant.corners, recipe.fringe);
    cells[variant.name] = composed;

    // Colour-origin + palette metrics (every pixel must come from an input).
    let fromFg = 0;
    let fromBg = 0;
    let unexpected = 0;
    let minD = Infinity;
    let maxD = -Infinity;
    const dists = [];
    for (let i = 0; i < composed.data.length; i += 4) {
      const key = pixelKey(composed.data, i);
      const inFg = fgSet.has(key);
      const inBg = bgSet.has(key);
      if (inFg) fromFg += 1; else if (inBg) fromBg += 1; else unexpected += 1;
      if (swatches.length) {
        const d = nearestSwatchDistance(composed.data[i], composed.data[i + 1], composed.data[i + 2], swatches);
        minD = Math.min(minD, d); maxD = Math.max(maxD, d); dists.push(d);
      }
    }
    dists.sort((a, b) => a - b);
    const median = dists.length ? dists[Math.floor(dists.length / 2)] : null;
    const withinTol = swatches.length ? dists.filter((d) => d <= (recipe.paletteTolerance ?? 40)).length : null;

    // Runtime master (16x16) written to the evidence/temp runtime dir.
    const runtimePath = path.join(runtimeDir, `${variant.name}.png`);
    writePng(runtimePath, composed, { colorType: 6 });
    const runtimeSha = sha256Buffer(composed.data);

    // Canonical source: exact 64x block replication (RGB), except the untouched
    // approved centre, which keeps its existing canonical source on disk.
    const canonicalPath = path.join(canonicalDir, `${variant.name}.png`);
    let canonicalSha;
    let centerUnchanged = false;
    if (variant.name === 'center' && recipe.preserveCenterCanonical !== false) {
      if (!fs.existsSync(canonicalPath)) throw new Error(`existing centre canonical source missing: ${canonicalPath}`);
      canonicalSha = sha256File(canonicalPath);
      centerUnchanged = true;
    } else {
      const upscaled = upscaleNearestNeighborRgbOnly(composed, recipe.upscale);
      writePng(canonicalPath, upscaled, { colorType: upscaled.colorType });
      canonicalSha = sha256File(canonicalPath);
    }

    variantReports.push({
      name: variant.name,
      corners: variant.corners,
      cornerCode: cornerCode(variant.corners),
      coreForegroundCount: composed.stats.coreForegroundCount,
      fringeEligibleCount: composed.stats.fringeEligibleCount,
      fringeChangedCount: composed.stats.fringeChangedCount,
      foregroundPixels: composed.stats.foregroundPixels,
      backgroundPixels: composed.stats.backgroundPixels,
      colourOrigin: { foregroundInput: fromFg, backgroundInput: fromBg, unexpected },
      alpha: { opaque: CELL * CELL, partial: 0, transparent: 0 },
      palette: swatches.length ? {
        tolerance: recipe.paletteTolerance ?? 40,
        withinTolerance: withinTol,
        total: CELL * CELL,
        minDistance: Number(minD.toFixed(3)),
        medianDistance: Number(median.toFixed(3)),
        maxDistance: Number(maxD.toFixed(3)),
      } : null,
      edgeTraces: edgeTraces(variant.corners),
      runtimeMasterSha256: runtimeSha,
      canonicalSourceSha256: canonicalSha,
      centerUnchanged,
    });
  }

  // Shared-edge classification proof across the mixed lattice (adjacency is
  // exact by construction, but we verify it explicitly for the report).
  const traceByCode = new Map(TOPOLOGY.map((t) => [cornerCode(t.corners), edgeTraces(t.corners)]));
  traceByCode.set('0000', edgeTraces([0, 0, 0, 0]));
  const { rows, cols, cells: latticeCells } = mixedLatticeCells();
  const cellCode = (r, c) => {
    const cell = latticeCells.find((k) => k.r === r && k.c === c);
    return cornerCode(cell.corners);
  };
  let sharedEdgePairs = 0;
  let sharedEdgeMismatches = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const code = cellCode(r, c);
      const t = traceByCode.get(code);
      if (c + 1 < cols) {
        const rt = traceByCode.get(cellCode(r, c + 1));
        sharedEdgePairs += 1;
        for (let i = 0; i < CELL; i += 1) if (t.east[i] !== rt.west[i]) sharedEdgeMismatches += 1;
      }
      if (r + 1 < rows) {
        const bt = traceByCode.get(cellCode(r + 1, c));
        sharedEdgePairs += 1;
        for (let i = 0; i < CELL; i += 1) if (t.south[i] !== bt.north[i]) sharedEdgeMismatches += 1;
      }
    }
  }

  // Coverage assertion for the mixed preview.
  const presentCodes = new Set(latticeCells.map((k) => cornerCode(k.corners)));
  const required = ['center', 'edge_north', 'edge_south', 'edge_west', 'edge_east',
    'corner_ne', 'corner_nw', 'corner_se', 'corner_sw',
    'inner_corner_ne', 'inner_corner_nw', 'inner_corner_se', 'inner_corner_sw'];
  for (const name of required) {
    const code = cornerCode(TOPOLOGY.find((t) => t.name === name).corners);
    if (!presentCodes.has(code)) throw new Error(`mixed preview lattice missing required topology: ${name}`);
  }
  if (!presentCodes.has('0000')) throw new Error('mixed preview lattice missing pure-grass neighbours');
  for (const s of SADDLE_CODES) if (presentCodes.has(s.join(''))) throw new Error('mixed preview lattice contains a forbidden saddle code');

  // Evidence: mask sheet (208x16, 2-tone core masks in packed order).
  const maskSheet = blank(CELL * TOPOLOGY.length, CELL, [20, 20, 20]);
  recipe.variants.forEach((variant, i) => {
    const mask = coreMask(variant.corners);
    for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) if (mask[y * CELL + x]) setPx(maskSheet, i * CELL + x, y, [235, 235, 235]);
  });
  writePng(path.join(evidenceDir, 'masks-13x1.png'), maskSheet, { colorType: 6 });

  // Evidence: labelled contact sheet (13 columns, 8x tiles + index caption).
  const SCALE = 8;
  const capH = 16;
  const gap = 4;
  const tileW = CELL * SCALE;
  const contact = blank(TOPOLOGY.length * (tileW + gap) + gap, tileW + capH + gap * 2, [12, 12, 16]);
  recipe.variants.forEach((variant, i) => {
    const dx = gap + i * (tileW + gap);
    blitCell(contact, cells[variant.name], dx, gap, SCALE);
    drawLabel(contact, i, dx + 2, gap + tileW + 3, 2, [230, 230, 120]);
  });
  writePng(path.join(evidenceDir, 'family-contact-sheet.png'), contact, { colorType: 6 });

  // Evidence: mixed-tiling preview (deterministic irregular field, 8x).
  const MSCALE = 8;
  const grassCell = { width: CELL, height: CELL, colorType: 6, data: bg.data };
  const preview = blank(cols * CELL * MSCALE, rows * CELL * MSCALE, [0, 0, 0]);
  for (const cell of latticeCells) {
    const code = cornerCode(cell.corners);
    const variant = TOPOLOGY.find((t) => cornerCode(t.corners) === code);
    const tile = variant ? cells[variant.name] : grassCell;
    blitCell(preview, tile, cell.c * CELL * MSCALE, cell.r * CELL * MSCALE, MSCALE);
  }
  writePng(path.join(evidenceDir, 'mixed-tiling-preview.png'), preview, { colorType: 6 });

  // Optional: pack via the real manifest pipeline and verify packed cells.
  let packed = null;
  if (recipe.productionManifest) {
    const manifestPath = assertInsideRepo(repoRoot, resolveRel(recipe.productionManifest), 'productionManifest');
    const result = normalizeAssetSheet(manifestPath);
    const sheet = readPng(result.outputPath);
    if (sheet.width !== CELL * TOPOLOGY.length || sheet.height !== CELL) {
      throw new Error(`packed sheet must be ${CELL * TOPOLOGY.length}x${CELL}, got ${sheet.width}x${sheet.height}`);
    }
    const packedCells = [];
    recipe.variants.forEach((variant, i) => {
      const runtime = cells[variant.name];
      const cellData = new Uint8Array(CELL * CELL * 4);
      let mismatches = 0;
      for (let y = 0; y < CELL; y += 1) {
        for (let x = 0; x < CELL; x += 1) {
          const si = (y * sheet.width + (i * CELL + x)) * 4;
          const di = (y * CELL + x) * 4;
          for (let ch = 0; ch < 4; ch += 1) {
            cellData[di + ch] = sheet.data[si + ch];
            if (sheet.data[si + ch] !== runtime.data[di + ch]) mismatches += 1;
          }
        }
      }
      packedCells.push({ name: variant.name, index: i, packedCellSha256: sha256Buffer(cellData), zeroDriftMismatches: mismatches });
    });
    packed = {
      manifest: path.relative(repoRoot, manifestPath).split(path.sep).join('/'),
      sheet: path.relative(repoRoot, result.outputPath).split(path.sep).join('/'),
      width: sheet.width,
      height: sheet.height,
      sheetSha256: sha256File(result.outputPath),
      cells: packedCells,
      totalZeroDriftMismatches: packedCells.reduce((a, k) => a + k.zeroDriftMismatches, 0),
    };
  }

  const report = {
    schema: 'terrain-blend-family-report/v1',
    id: recipe.id,
    compositor: { version: recipe.version, mode: recipe.mode, upscale: recipe.upscale, fringe: recipe.fringe },
    inputs: {
      foreground: { path: path.relative(repoRoot, fgPath).split(path.sep).join('/'), sha256: sha256File(fgPath), colors: fgSet.size },
      background: { path: path.relative(repoRoot, bgPath).split(path.sep).join('/'), sha256: sha256File(bgPath), colors: bgSet.size },
    },
    topology: TOPOLOGY.map((t) => ({ name: t.name, corners: t.corners })),
    variants: variantReports,
    sharedEdge: { pairs: sharedEdgePairs, mismatches: sharedEdgeMismatches },
    mixedPreview: { rows, cols, incompatibleSharedEdges: sharedEdgeMismatches, codes: [...presentCodes].sort() },
    packed,
    runtimeIntegrated: false,
    mapIntegrated: false,
    physicalIpadValidated: false,
    childValidated: false,
  };
  if (options.writeReport !== false) {
    fs.writeFileSync(path.join(evidenceDir, 'family-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  return { report, cells };
}

// --- Shoreline family composition -----------------------------------------
// Mirrors composeFamily()'s skeleton (inputs, evidence, packing, report) but
// is a fully separate function: composeFamily() above is untouched by this
// addition, so binary_material_interlock (dirt) behaviour is byte-for-byte
// unchanged.

// Mean-RGB-distance wrap metrics for one approved 16x16 input, reported as
// context baselines (not a pass/fail gate): the same "wrap step vs internal
// step" convention used in the grass_b/water_b derivation audits.
export function computeWrapMetrics(image) {
  const at = (x, y) => { const i = (y * image.width + x) * 4; return [image.data[i], image.data[i + 1], image.data[i + 2]]; };
  const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  let hWrap = 0; let hInternal = 0; let vWrap = 0; let vInternal = 0;
  for (let y = 0; y < image.height; y += 1) {
    hWrap += dist(at(0, y), at(image.width - 1, y));
    for (let x = 0; x < image.width - 1; x += 1) hInternal += dist(at(x, y), at(x + 1, y));
  }
  for (let x = 0; x < image.width; x += 1) {
    vWrap += dist(at(x, 0), at(x, image.height - 1));
    for (let y = 0; y < image.height - 1; y += 1) vInternal += dist(at(x, y), at(x, y + 1));
  }
  const hWrapAvg = hWrap / image.height;
  const hInternalAvg = hInternal / (image.height * (image.width - 1));
  const vWrapAvg = vWrap / image.width;
  const vInternalAvg = vInternal / (image.width * (image.height - 1));
  return {
    horizontalWrapStep: Number(hWrapAvg.toFixed(6)),
    averageInternalHorizontalStep: Number(hInternalAvg.toFixed(6)),
    horizontalWrapRatio: Number((hWrapAvg / hInternalAvg).toFixed(6)),
    verticalWrapStep: Number(vWrapAvg.toFixed(6)),
    averageInternalVerticalStep: Number(vInternalAvg.toFixed(6)),
    verticalWrapRatio: Number((vWrapAvg / vInternalAvg).toFixed(6)),
  };
}

// Hard gate: shared-edge band-class and sand-to-sand RGB mismatches are
// required to be exactly 0. Extracted as a pure function so the throw path
// itself is directly unit-testable, independent of a real algorithm regression.
export function assertNoSharedEdgeMismatches(bandMismatches, sandRgbMismatches) {
  if (bandMismatches !== 0) throw new Error(`shoreline shared-edge band-class mismatch: ${bandMismatches} (must be 0)`);
  if (sandRgbMismatches !== 0) throw new Error(`shoreline sand-to-sand shared-edge RGB mismatch: ${sandRgbMismatches} (must be 0)`);
}

export function composeShorelineFamily(recipePath, options = {}) {
  const recipeAbs = path.resolve(recipePath);
  const recipeDir = path.dirname(recipeAbs);
  const recipe = JSON.parse(fs.readFileSync(recipeAbs, 'utf8'));
  validateShorelineRecipe(recipe, recipePath);
  const repoRoot = findRepoRoot(recipeDir);
  const resolveRel = (p) => path.resolve(recipeDir, p);

  const waterPath = resolveRel(recipe.foregroundPath);
  const grassPath = resolveRel(recipe.backgroundPath);
  const water = readPng(waterPath);
  const grass = readPng(grassPath);
  assertOpaque16(water, 'water (foreground) input');
  assertOpaque16(grass, 'grass (background) input');

  const canonicalDir = assertInsideRepo(repoRoot, resolveRel(recipe.canonicalSourceDir), 'canonicalSourceDir');
  const runtimeDir = assertInsideRepo(repoRoot, resolveRel(recipe.runtimeMasterDir), 'runtimeMasterDir');
  const evidenceDir = assertInsideRepo(repoRoot, resolveRel(recipe.evidenceDir ?? '.'), 'evidenceDir');
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });

  const allowedTriples = new Set(Object.values(SHORELINE_RGB).map((rgb) => rgb.join(',')));
  const cells = {};
  const variantReports = [];

  for (const variant of recipe.variants) {
    const composed = composeShorelineCell(water, grass, variant.corners, recipe.shoreline);
    cells[variant.name] = composed;

    // Per-pixel exact-membership + edge-variation-lockout verification (spec
    // gate: every output pixel is the exact water/grass pixel at that same
    // coordinate, or one of the 5 locked swatches; zero other colours; no
    // hashed variation may reach the outer row/column).
    let waterOriginCount = 0;
    let grassOriginCount = 0;
    let unexpected = 0;
    let opaque = 0;
    let edgeVariationViolations = 0;
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        const idx = (y * CELL + x) * 4;
        if (composed.data[idx + 3] === 255) opaque += 1;
        const r = composed.data[idx]; const g = composed.data[idx + 1]; const b = composed.data[idx + 2];
        const matchesWater = r === water.data[idx] && g === water.data[idx + 1] && b === water.data[idx + 2];
        const matchesGrass = r === grass.data[idx] && g === grass.data[idx + 1] && b === grass.data[idx + 2];
        if (matchesWater) waterOriginCount += 1;
        else if (matchesGrass) grassOriginCount += 1;
        else if (!allowedTriples.has(`${r},${g},${b}`)) unexpected += 1;
        if (isOuterEdgePixel(x, y) && !matchesWater && !matchesGrass) {
          // v2 edge bases: inner_sand edge = #B98535 (innerSandAlt), outer_sand
          // edge = #926B2A (outerSandAlt); moss edge is always exact grass_a
          // (already excluded above via matchesGrass).
          const key = `${r},${g},${b}`;
          const isBaseOnly = key === SHORELINE_RGB.innerSandAlt.join(',') || key === SHORELINE_RGB.outerSandAlt.join(',');
          if (!isBaseOnly) edgeVariationViolations += 1;
        }
      }
    }
    if (edgeVariationViolations > 0) throw new Error(`variant ${variant.name}: hashed variation leaked onto ${edgeVariationViolations} outer-edge pixel(s)`);

    const expectedBand = shorelineBandCounts(variant.corners);
    for (const k of Object.keys(expectedBand)) {
      if (composed.stats.band[k] !== expectedBand[k]) throw new Error(`variant ${variant.name}: band ${k} count ${composed.stats.band[k]} != expected ${expectedBand[k]}`);
    }

    const runtimePath = path.join(runtimeDir, `${variant.name}.png`);
    writePng(runtimePath, composed, { colorType: 6 });
    const runtimeSha = sha256Buffer(composed.data);

    // Canonical source. center is an exact byte copy of the already-approved
    // water_a canonical (never a visually independent shoreline centre, never
    // a modification of the approved water_a source file itself).
    const canonicalPath = path.join(canonicalDir, `${variant.name}.png`);
    let canonicalSha;
    let centerReusesApprovedWaterA = false;
    if (variant.name === 'center') {
      const sourceCanonical = assertInsideRepo(repoRoot, resolveRel(recipe.centerCanonicalSourcePath), 'centerCanonicalSourcePath');
      const bytes = fs.readFileSync(sourceCanonical);
      fs.mkdirSync(path.dirname(canonicalPath), { recursive: true });
      fs.writeFileSync(canonicalPath, bytes);
      canonicalSha = sha256File(canonicalPath);
      const originalSha = sha256File(sourceCanonical);
      if (canonicalSha !== originalSha) throw new Error('center canonical copy diverged from the approved water_a source');
      centerReusesApprovedWaterA = true;
    } else {
      const upscaled = upscaleNearestNeighborRgbOnly(composed, recipe.upscale);
      writePng(canonicalPath, upscaled, { colorType: upscaled.colorType });
      canonicalSha = sha256File(canonicalPath);
    }

    variantReports.push({
      name: variant.name,
      corners: variant.corners,
      cornerCode: cornerCode(variant.corners),
      band: composed.stats.band,
      swatch: composed.stats.swatch,
      colourOrigin: { waterInput: waterOriginCount, grassInput: grassOriginCount, unexpected },
      alpha: { opaque, partial: 0, transparent: CELL * CELL - opaque },
      runtimeMasterSha256: runtimeSha,
      canonicalSourceSha256: canonicalSha,
      centerReusesApprovedWaterA,
    });
  }

  // center must be byte-identical to water_a.
  let centerMismatches = 0;
  for (let i = 0; i < cells.center.data.length; i += 1) if (cells.center.data[i] !== water.data[i]) centerMismatches += 1;
  if (centerMismatches > 0) throw new Error(`center is not byte-identical to water_a: ${centerMismatches} channel mismatches`);

  // Shared-edge proof. The required gate is band-class equality (matching
  // corner bits give the exact same q, hence the exact same q-band, at every
  // shared position -- proven empirically below). Raw RGB equality is a
  // DIFFERENT, weaker claim for the water/grass bands: those edge pixels are
  // sampled from the approved source image at the tile's own local
  // coordinate (local x=15 for an east edge vs local x=0 for the neighbour's
  // west edge), which are literally different source pixels unless water_a's
  // or grass_a's own opposite edges happen to match -- not guaranteed, and
  // explicitly not required (spec: "do not incorrectly require raw RGB
  // equality between opposite edges of approved water_a/grass_a"). Sand-band
  // edge pixels are the one case where RGB equality IS a real, provable
  // guarantee: the sand base swatches are fixed locked constants, never
  // sampled from a source image and never hash-varied at an edge, so any two
  // sand-classified shared positions are colour-identical by construction.
  // That sand-to-sand guarantee is checked as a hard gate; water/grass-band
  // divergence is instead measured and reported against the sources' own
  // self-wrap baselines (see seamBaselines below).
  const computeEdges = (corners) => {
    const c = composeShorelineCell(water, grass, corners, recipe.shoreline);
    const at = (x, y) => { const i = (y * CELL + x) * 4; return [c.data[i], c.data[i + 1], c.data[i + 2]]; };
    const bandAt = (x, y) => shorelineBand(qValue(corners, x, y));
    const north = []; const south = []; const west = []; const east = [];
    const bnorth = []; const bsouth = []; const bwest = []; const beast = [];
    for (let x = 0; x < CELL; x += 1) { north.push(at(x, 0)); south.push(at(x, CELL - 1)); bnorth.push(bandAt(x, 0)); bsouth.push(bandAt(x, CELL - 1)); }
    for (let y = 0; y < CELL; y += 1) { west.push(at(0, y)); east.push(at(CELL - 1, y)); bwest.push(bandAt(0, y)); beast.push(bandAt(CELL - 1, y)); }
    return { rgb: { north, south, west, east }, band: { north: bnorth, south: bsouth, west: bwest, east: beast } };
  };
  const rgbEdgeByCode = new Map();
  const bandTraceByCode = new Map();
  for (const t of TOPOLOGY) { const e = computeEdges(t.corners); rgbEdgeByCode.set(cornerCode(t.corners), e.rgb); bandTraceByCode.set(cornerCode(t.corners), e.band); }
  { const e = computeEdges([0, 0, 0, 0]); rgbEdgeByCode.set('0000', e.rgb); bandTraceByCode.set('0000', e.band); }

  const isSandBand = (b) => b === 'inner_sand' || b === 'outer_sand';
  const isLandBand = (b) => b === 'grass' || b === 'moss';
  const rgbDist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

  // Exhaustive adjacency gate: all 14 usable codes (13 topology + 0000,
  // saddle codes excluded), every ordered horizontal and vertical compatible
  // pair -- not a sample from one mixed-preview lattice. This is the hard
  // gate; the mixed-tiling PNG below is a separate, purely illustrative
  // rendering built from a smaller field.
  const usableCodes = [...TOPOLOGY.map((t) => t.corners), [0, 0, 0, 0]];
  let sharedEdgePairs = 0;
  let bandMismatches = 0;
  let sandRgbMismatches = 0;
  const waterSeamDeltas = [];
  const landSeamDeltas = [];
  const checkShared = (tBand, oBand, tRgb, oRgb) => {
    for (let i = 0; i < CELL; i += 1) {
      if (tBand[i] !== oBand[i]) { bandMismatches += 1; continue; }
      if (isSandBand(tBand[i])) {
        if (tRgb[i][0] !== oRgb[i][0] || tRgb[i][1] !== oRgb[i][1] || tRgb[i][2] !== oRgb[i][2]) sandRgbMismatches += 1;
      } else if (tBand[i] === 'water') {
        waterSeamDeltas.push(rgbDist(tRgb[i], oRgb[i]));
      } else if (isLandBand(tBand[i])) {
        landSeamDeltas.push(rgbDist(tRgb[i], oRgb[i]));
      }
    }
  };
  let horizontalPairs = 0;
  let verticalPairs = 0;
  for (const l of usableCodes) {
    for (const r of usableCodes) {
      if (l[1] === r[0] && l[2] === r[3]) { // left.east(ne,se) == right.west(nw,sw)
        sharedEdgePairs += 1; horizontalPairs += 1;
        checkShared(bandTraceByCode.get(cornerCode(l)).east, bandTraceByCode.get(cornerCode(r)).west, rgbEdgeByCode.get(cornerCode(l)).east, rgbEdgeByCode.get(cornerCode(r)).west);
      }
    }
  }
  for (const t of usableCodes) {
    for (const b of usableCodes) {
      if (t[3] === b[0] && t[2] === b[1]) { // top.south(sw,se) == bottom.north(nw,ne)
        sharedEdgePairs += 1; verticalPairs += 1;
        checkShared(bandTraceByCode.get(cornerCode(t)).south, bandTraceByCode.get(cornerCode(b)).north, rgbEdgeByCode.get(cornerCode(t)).south, rgbEdgeByCode.get(cornerCode(b)).north);
      }
    }
  }
  assertNoSharedEdgeMismatches(bandMismatches, sandRgbMismatches);

  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const max = (arr) => (arr.length ? Math.max(...arr) : 0);

  const { rows, cols, cells: latticeCells } = mixedLatticeCells();

  const presentCodes = new Set(latticeCells.map((k) => cornerCode(k.corners)));
  const required = ['center', 'edge_north', 'edge_south', 'edge_west', 'edge_east',
    'corner_ne', 'corner_nw', 'corner_se', 'corner_sw',
    'inner_corner_ne', 'inner_corner_nw', 'inner_corner_se', 'inner_corner_sw'];
  for (const name of required) {
    const code = cornerCode(TOPOLOGY.find((t) => t.name === name).corners);
    if (!presentCodes.has(code)) throw new Error(`mixed preview lattice missing required topology: ${name}`);
  }
  if (!presentCodes.has('0000')) throw new Error('mixed preview lattice missing pure-grass neighbours');
  if (!presentCodes.has('1111')) throw new Error('mixed preview lattice missing pure-water neighbours');
  for (const s of SADDLE_CODES) if (presentCodes.has(s.join(''))) throw new Error('mixed preview lattice contains a forbidden saddle code');

  // Evidence: band sheet (208x16) -- one flat colour per q-band, distinguishing
  // water / inner sand / outer sand / moss / grass (not the composited pixels).
  const BAND_COLORS = { water: [62, 157, 198], inner_sand: [213, 163, 66], outer_sand: [185, 133, 53], moss: [66, 113, 24], grass: [50, 94, 25] };
  const bandSheet = blank(CELL * TOPOLOGY.length, CELL, [20, 20, 20]);
  recipe.variants.forEach((variant, i) => {
    for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) setPx(bandSheet, i * CELL + x, y, BAND_COLORS[shorelineBand(qValue(variant.corners, x, y))]);
  });
  writePng(path.join(evidenceDir, 'bands-13x1.png'), bandSheet, { colorType: 6 });

  // Evidence: labelled contact sheet.
  const SCALE = 8; const capH = 16; const gap = 4; const tileW = CELL * SCALE;
  const contact = blank(TOPOLOGY.length * (tileW + gap) + gap, tileW + capH + gap * 2, [12, 12, 16]);
  recipe.variants.forEach((variant, i) => {
    const dx = gap + i * (tileW + gap);
    blitCell(contact, cells[variant.name], dx, gap, SCALE);
    drawLabel(contact, i, dx + 2, gap + tileW + 3, 2, [230, 230, 120]);
  });
  writePng(path.join(evidenceDir, 'family-contact-sheet.png'), contact, { colorType: 6 });

  // Evidence: mixed-tiling preview.
  const MSCALE = 8;
  const grassCell = { width: CELL, height: CELL, colorType: 6, data: grass.data };
  const preview = blank(cols * CELL * MSCALE, rows * CELL * MSCALE, [0, 0, 0]);
  for (const cell of latticeCells) {
    const code = cornerCode(cell.corners);
    const variant = TOPOLOGY.find((t) => cornerCode(t.corners) === code);
    const tile = variant ? cells[variant.name] : grassCell;
    blitCell(preview, tile, cell.c * CELL * MSCALE, cell.r * CELL * MSCALE, MSCALE);
  }
  writePng(path.join(evidenceDir, 'mixed-tiling-preview.png'), preview, { colorType: 6 });

  const waterWrap = computeWrapMetrics(water);
  const grassWrap = computeWrapMetrics(grass);

  // Optional: pack via the real manifest pipeline and verify packed cells.
  let packed = null;
  if (recipe.productionManifest) {
    const manifestPath = assertInsideRepo(repoRoot, resolveRel(recipe.productionManifest), 'productionManifest');
    const result = normalizeAssetSheet(manifestPath);
    const sheet = readPng(result.outputPath);
    if (sheet.width !== CELL * TOPOLOGY.length || sheet.height !== CELL) {
      throw new Error(`packed sheet must be ${CELL * TOPOLOGY.length}x${CELL}, got ${sheet.width}x${sheet.height}`);
    }
    const packedCells = [];
    recipe.variants.forEach((variant, i) => {
      const runtime = cells[variant.name];
      const cellData = new Uint8Array(CELL * CELL * 4);
      let mismatches = 0;
      for (let y = 0; y < CELL; y += 1) {
        for (let x = 0; x < CELL; x += 1) {
          const si = (y * sheet.width + (i * CELL + x)) * 4;
          const di = (y * CELL + x) * 4;
          for (let ch = 0; ch < 4; ch += 1) {
            cellData[di + ch] = sheet.data[si + ch];
            if (sheet.data[si + ch] !== runtime.data[di + ch]) mismatches += 1;
          }
        }
      }
      packedCells.push({ name: variant.name, index: i, packedCellSha256: sha256Buffer(cellData), zeroDriftMismatches: mismatches });
    });
    packed = {
      manifest: path.relative(repoRoot, manifestPath).split(path.sep).join('/'),
      sheet: path.relative(repoRoot, result.outputPath).split(path.sep).join('/'),
      width: sheet.width,
      height: sheet.height,
      sheetSha256: sha256File(result.outputPath),
      cells: packedCells,
      totalZeroDriftMismatches: packedCells.reduce((a, k) => a + k.zeroDriftMismatches, 0),
    };
  }

  const report = {
    schema: 'terrain-blend-shoreline-family-report/v1',
    id: recipe.id,
    compositor: { version: recipe.version, mode: recipe.mode, upscale: recipe.upscale, shoreline: recipe.shoreline },
    inputs: {
      waterForeground: { path: path.relative(repoRoot, waterPath).split(path.sep).join('/'), sha256: sha256File(waterPath) },
      grassBackground: { path: path.relative(repoRoot, grassPath).split(path.sep).join('/'), sha256: sha256File(grassPath) },
      approvedWaterACanonical: { path: path.relative(repoRoot, resolveRel(recipe.centerCanonicalSourcePath)).split(path.sep).join('/'), sha256: sha256File(resolveRel(recipe.centerCanonicalSourcePath)) },
    },
    topology: TOPOLOGY.map((t) => ({ name: t.name, corners: t.corners })),
    variants: variantReports,
    centerByteIdenticalToWaterA: centerMismatches === 0,
    // bandMismatches and sandRgbMismatches are hard gates -- composeShorelineFamily
    // throws above if either is nonzero, so a returned report always has both
    // at 0. Coverage is exhaustive: all 14 usable codes (13 topology + 0000,
    // saddles excluded), every ordered horizontal/vertical compatible pair
    // (not a sample from one mixed-preview lattice). Sand-band RGB equality
    // holds because sand base swatches are fixed constants, never image-sampled
    // and never hash-varied at an edge. Water/grass-band RGB divergence across
    // a shared edge is expected (see seamBaselines) and is not an error.
    sharedEdge: { pairs: sharedEdgePairs, horizontalPairs, verticalPairs, bandMismatches, sandRgbMismatches },
    mixedPreview: { rows, cols, incompatibleSharedEdges: bandMismatches, codes: [...presentCodes].sort() },
    seamBaselines: {
      note: 'Sand-band shared edges are colour-identical by construction (sandRgbMismatches = 0 above): sand swatches are fixed constants, not image samples. Water- and grass-band shared-edge pixels are sampled from the approved water_a/grass_a source at each tile’s own local coordinate, so (per spec) they are not required to be byte-identical across a boundary -- only band-class-identical (also proven, bandMismatches = 0). shorelineWaterToWaterSeamStep/shorelineGrassToGrassSeamStep are the actual measured mean RGB deltas across those shared edges in this family’s mixed lattice; waterASelfWrap/grassASelfWrap are the same sources’ own internal wrap-vs-internal-step baseline, reported for direct comparison. A shoreline step materially larger than the source’s own internal step would indicate a seam penalty worth flagging; a comparable or smaller step indicates the shoreline boundary reads no rougher than the source texture already does.',
      waterASelfWrap: waterWrap,
      grassASelfWrap: grassWrap,
      shorelineWaterToWaterSeamStep: { mean: Number(mean(waterSeamDeltas).toFixed(6)), max: Number(max(waterSeamDeltas).toFixed(6)), samples: waterSeamDeltas.length },
      shorelineGrassToGrassSeamStep: { mean: Number(mean(landSeamDeltas).toFixed(6)), max: Number(max(landSeamDeltas).toFixed(6)), samples: landSeamDeltas.length },
    },
    packed,
    runtimeIntegrated: false,
    mapIntegrated: false,
    physicalIpadValidated: false,
    childValidated: false,
  };
  if (options.writeReport !== false) {
    fs.writeFileSync(path.join(evidenceDir, 'family-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  return { report, cells };
}

function args(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith('--')) { a[argv[i].slice(2)] = argv[i + 1]; i += 1; }
  return a;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  if (!a.config) { console.error('Usage: node scripts/compose-terrain-blend-family.mjs --config <recipe.json>'); process.exit(1); }
  try {
    const recipeForMode = JSON.parse(fs.readFileSync(path.resolve(a.config), 'utf8'));
    if (recipeForMode.mode === 'shoreline_bands') {
      const { report } = composeShorelineFamily(a.config);
      const drift = report.packed ? report.packed.totalZeroDriftMismatches : 'n/a';
      console.log(`Terrain-blend shoreline family composed: ${report.id} (${report.variants.length} variants, shared-edge band mismatches ${report.sharedEdge.bandMismatches}, packed zero-drift mismatches ${drift}).`);
    } else {
      const { report } = composeFamily(a.config);
      const drift = report.packed ? report.packed.totalZeroDriftMismatches : 'n/a';
      console.log(`Terrain-blend family composed: ${report.id} (${report.variants.length} variants, shared-edge mismatches ${report.sharedEdge.mismatches}, packed zero-drift mismatches ${drift}).`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
