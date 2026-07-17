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

function args(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith('--')) { a[argv[i].slice(2)] = argv[i + 1]; i += 1; }
  return a;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  if (!a.config) { console.error('Usage: node scripts/compose-terrain-blend-family.mjs --config <recipe.json>'); process.exit(1); }
  try {
    const { report } = composeFamily(a.config);
    const drift = report.packed ? report.packed.totalZeroDriftMismatches : 'n/a';
    console.log(`Terrain-blend family composed: ${report.id} (${report.variants.length} variants, shared-edge mismatches ${report.sharedEdge.mismatches}, packed zero-drift mismatches ${drift}).`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
