#!/usr/bin/env node
// Deterministic evidence composer for the character perspective trial.
// Authority: docs/CHARACTER_PERSPECTIVE_TRIAL_EVIDENCE_PLAN_2026-07.md and
// docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md §8–§9.
//
// Manifest shape (version 1):
// {
//   version: 1, id, outDir,
//   target: { cellPx: [32, 48], directions: [...4], pivotRow },
//   plates: {
//     farm_bright:  { mode: "tile", tilePath, tilePx },
//     woods_bridge: { mode: "tileset_cells", tilesetPath, tilePx, cells: [[c,r],...] }
//   },
//   candidates: [{ id, provider, approach, sheetPath, occupancy? }]
// }
// Machine gates fail the verdict, never the evidence: artifacts are always
// written so reviewers can inspect failing candidates.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import { upscaleNearestNeighborRgba } from './upscale-nearest-neighbor.mjs';

// --- canonical bindings -------------------------------------------------------
// The manifest cannot redefine the authoritative target or the evidence plates.
// Target geometry is resolved from hero_actor_targets.json; the two plates are
// pinned to the exact repo assets named in the approved plan. A manifest that
// declares anything else fails loudly before any evidence is produced.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CANONICAL_TARGET_ID = 'char_mage_boy_base';
const CANONICAL_TARGETS_PATH = path.join(REPO_ROOT, 'docs', 'visual-targets', 'hero_actor_targets.json');
export const CANONICAL_PLATES = {
  farm_bright: { mode: 'tile', relPath: 'docs/art-pipeline/review/tile_farm_grass_base_grass_a/grass_a.review-normalized.png', tilePx: [16, 16] },
  woods_bridge: { mode: 'tileset_cells', relPath: 'public/assets/tilesets/eldoria-placeholder.png', tilePx: [16, 16] },
};

export function canonicalTarget() {
  const doc = JSON.parse(fs.readFileSync(CANONICAL_TARGETS_PATH, 'utf8'));
  const list = Array.isArray(doc) ? doc : (doc.targets ?? []);
  const target = list.find((t) => t.id === CANONICAL_TARGET_ID);
  if (!target) fail(`canonical target ${CANONICAL_TARGET_ID} not found in hero_actor_targets.json`);
  return { cellPx: target.canvasPx, directions: target.directions, pivotRow: target.pivotPx[1] };
}

const REPORT_ID = 'eldoria-perspective-trial-report/v1';
const NN_SCALE = 8;
const PLATE_TILES = [12, 7];
const SLOT_TILES = 3; // horizontal tiles per direction slot in 1x previews
const BASELINE_TILE_ROW = 5; // sprite feet sit on the bottom edge of this tile row
const MARKER = [255, 0, 255, 255];
const GUTTER = 4;

const JUDGMENT_GATES = [
  { name: 'foreshortened_not_frontal', detail: 'Down-facing torso and head read as elevated and foreshortened, not a frontal portrait.' },
  { name: 'visible_top_planes', detail: 'Hair/hat, shoulders, and carried equipment show top planes in every facing (target band: 3-5 px top plane on the head at 32x48).' },
  { name: 'single_camera_pitch', detail: 'All four directions share one camera pitch that matches the approved oak master, not an external reference.' },
  { name: 'upper_left_key_light', detail: 'One upper-left key light across all directions; no mirrored lighting.' },
  { name: 'identity_readability', detail: 'Friendly Mage identity and face remain readable at exact runtime size.' },
  { name: 'embedded_in_environment', detail: 'The character reads as standing inside both plates, not pasted onto them.' }
];

const REVIEW_PROTOCOL =
  'Judgment gates require a reviewer verdict. Before issuing perspective verdicts, the reviewer '
  + '(AI or human) must consult external reference imagery of the elevated three-quarter idiom and '
  + 'compare against the approved oak master (owner amendment 2026-07-21). Machine gates measure pixels only.';

function fail(message) {
  throw new Error(`compose-perspective-trial-evidence: ${message}`);
}

function image(width, height, color = [0, 0, 0, 0]) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; data[i + 3] = color[3];
  }
  return { width, height, colorType: 6, data };
}

function blit(dst, src, dx, dy, options = {}) {
  const { skipTransparent = true } = options;
  for (let y = 0; y < src.height; y += 1) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x += 1) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const si = (y * src.width + x) * 4;
      if (skipTransparent && src.data[si + 3] === 0) continue;
      const di = (ty * dst.width + tx) * 4;
      dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = src.data[si + 3];
    }
  }
}

function crop(src, x, y, w, h) {
  const out = image(w, h);
  blit(out, { width: w, height: h, colorType: 6, data: cropData(src, x, y, w, h) }, 0, 0, { skipTransparent: false });
  return out;
}

function cropData(src, x, y, w, h) {
  const data = new Uint8Array(w * h * 4);
  for (let yy = 0; yy < h; yy += 1) {
    const srcStart = ((y + yy) * src.width + x) * 4;
    data.set(src.data.subarray(srcStart, srcStart + w * 4), yy * w * 4);
  }
  return data;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== 1) fail('manifest version must be 1');
  for (const key of ['id', 'outDir', 'target', 'plates', 'candidates']) {
    if (!manifest[key]) fail(`manifest missing "${key}"`);
  }
  const { target, plates, candidates } = manifest;
  if (!Array.isArray(target.cellPx) || target.cellPx.length !== 2) fail('target.cellPx must be [w, h]');
  if (!Array.isArray(target.directions) || target.directions.length !== 4) fail('target.directions must list 4 directions');
  if (!Number.isInteger(target.pivotRow)) fail('target.pivotRow must be an integer row');

  // Bind the manifest to the canonical target: any substitute geometry fails.
  const canon = canonicalTarget();
  if (target.cellPx[0] !== canon.cellPx[0] || target.cellPx[1] !== canon.cellPx[1]) {
    fail(`target.cellPx [${target.cellPx}] must match canonical ${CANONICAL_TARGET_ID} canvas [${canon.cellPx}]`);
  }
  if (target.directions.join(',') !== canon.directions.join(',')) {
    fail(`target.directions must match canonical order [${canon.directions}]`);
  }
  if (target.pivotRow !== canon.pivotRow) {
    fail(`target.pivotRow ${target.pivotRow} must match canonical pivot row ${canon.pivotRow}`);
  }

  // Bind the evidence plates to the exact repo assets from the approved plan.
  for (const [name, spec] of Object.entries(CANONICAL_PLATES)) {
    const plate = plates[name];
    if (!plate) fail(`plates missing "${name}"`);
    if (plate.mode !== spec.mode) fail(`plate ${name}: mode must be "${spec.mode}"`);
    const declaredPath = spec.mode === 'tile' ? plate.tilePath : plate.tilesetPath;
    const canonicalAbs = path.join(REPO_ROOT, ...spec.relPath.split('/'));
    if (!declaredPath || path.resolve(declaredPath) !== canonicalAbs) {
      fail(`plate ${name}: source must be the canonical repo asset ${spec.relPath}`);
    }
    if (!Array.isArray(plate.tilePx) || plate.tilePx[0] !== spec.tilePx[0] || plate.tilePx[1] !== spec.tilePx[1]) {
      fail(`plate ${name}: tilePx must be [${spec.tilePx}]`);
    }
  }
  if (!Array.isArray(plates.woods_bridge.cells) || plates.woods_bridge.cells.length === 0) {
    fail('plate woods_bridge: declared cells are required');
  }

  if (!Array.isArray(candidates) || candidates.length === 0) fail('candidates must be a non-empty array');
  for (const candidate of candidates) {
    for (const key of ['id', 'provider', 'approach', 'sheetPath']) {
      if (!candidate[key]) fail(`candidate missing "${key}"`);
    }
    if (!['same_sheet', 'direction_anchored'].includes(candidate.approach)) {
      fail(`candidate ${candidate.id}: approach must be same_sheet or direction_anchored`);
    }
    // Occupancy bounds are required, never skippable (approved plan: the
    // machine surface is fail-closed; a missing declaration is a failure).
    const occ = candidate.occupancy;
    if (!occ || typeof occ.maxWidthPx !== 'number'
      || !Array.isArray(occ.heightRangePx) || occ.heightRangePx.length !== 2
      || !occ.heightRangePx.every((v) => typeof v === 'number')) {
      fail(`candidate ${candidate.id}: occupancy bounds (maxWidthPx + heightRangePx [min, max]) are required`);
    }
  }
  return manifest;
}

function buildPlate(plate) {
  const [tileW, tileH] = plate.tilePx;
  const [cols, rows] = PLATE_TILES;
  const out = image(cols * tileW, rows * tileH);
  if (plate.mode === 'tile') {
    const tile = readPng(plate.tilePath);
    if (tile.width !== tileW || tile.height !== tileH) fail(`plate tile ${plate.tilePath} must be ${tileW}x${tileH}`);
    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
      blit(out, tile, c * tileW, r * tileH, { skipTransparent: false });
    }
    return { plate: out, inputPaths: [plate.tilePath] };
  }
  if (plate.mode === 'tileset_cells') {
    const tileset = readPng(plate.tilesetPath);
    if (!Array.isArray(plate.cells) || plate.cells.length === 0) fail('tileset_cells plate needs declared cells');
    for (const [c, r] of plate.cells) {
      if (!Number.isInteger(c) || !Number.isInteger(r)
        || (c + 1) * tileW > tileset.width || (r + 1) * tileH > tileset.height || c < 0 || r < 0) {
        fail(`tileset_cells plate: cell [${c}, ${r}] is outside the ${tileset.width}x${tileset.height} tileset`);
      }
    }
    const tiles = plate.cells.map(([c, r]) => crop(tileset, c * tileW, r * tileH, tileW, tileH));
    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
      // Deterministic cell pattern with no RNG: stride the declared cells.
      const tile = tiles[(r * cols + c) % tiles.length];
      blit(out, tile, c * tileW, r * tileH, { skipTransparent: false });
    }
    return { plate: out, inputPaths: [plate.tilesetPath] };
  }
  return fail(`unknown plate mode "${plate.mode}"`);
}

function directionMetrics(sheet, cellW, cellH, index) {
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  let semiAlpha = 0;
  for (let y = 0; y < cellH; y += 1) {
    for (let x = 0; x < cellW; x += 1) {
      const a = sheet.data[((y * sheet.width) + index * cellW + x) * 4 + 3];
      if (a !== 0 && a !== 255) semiAlpha += 1;
      if (a > 0) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  const empty = maxX < 0;
  return {
    empty,
    semiAlphaPixels: semiAlpha,
    boundsPx: empty ? null : [minX, minY, maxX - minX + 1, maxY - minY + 1],
    widthPx: empty ? 0 : maxX - minX + 1,
    heightPx: empty ? 0 : maxY - minY + 1,
    contactRow: empty ? null : maxY,
    touchesLeftBoundary: !empty && minX === 0,
    touchesRightBoundary: !empty && maxX === cellW - 1
  };
}

function runMachineGates(sheet, target, candidate) {
  const [cellW, cellH] = target.cellPx;
  const gates = [];
  const geometryOk = sheet.width === cellW * 4 && sheet.height === cellH;
  const metrics = [];
  if (geometryOk) {
    for (let d = 0; d < 4; d += 1) metrics.push(directionMetrics(sheet, cellW, cellH, d));
  }
  const emptyDirections = metrics.filter((m) => m.empty).length;
  gates.push({
    name: 'geometry',
    passed: geometryOk && emptyDirections === 0,
    measured: { widthPx: sheet.width, heightPx: sheet.height, expected: [cellW * 4, cellH], emptyDirections }
  });
  if (!geometryOk) return { gates, metrics };

  gates.push({
    name: 'binary_alpha',
    passed: metrics.every((m) => m.semiAlphaPixels === 0),
    measured: { semiAlphaPixelsByDirection: metrics.map((m) => m.semiAlphaPixels) }
  });

  // Interior boundary columns: art touching the column shared with a
  // neighboring cell reads as bleed at this contiguous-sheet layout.
  const bleed = metrics.map((m, d) => (d > 0 && m.touchesLeftBoundary) || (d < 3 && m.touchesRightBoundary));
  gates.push({ name: 'cell_bleed', passed: bleed.every((b) => !b), measured: { bleedByDirection: bleed } });

  const heights = metrics.map((m) => m.heightPx);
  const heightSpread = Math.max(...heights) - Math.min(...heights);
  gates.push({
    name: 'apparent_height_parity',
    passed: heightSpread <= 1,
    measured: { heightsPx: heights, spreadPx: heightSpread, tolerancePx: 1 }
  });

  gates.push({
    name: 'pivot_contact',
    passed: metrics.every((m) => m.contactRow === target.pivotRow),
    measured: { contactRows: metrics.map((m) => m.contactRow), pivotRow: target.pivotRow }
  });

  // Occupancy bounds are guaranteed by loadManifest; the gate always evaluates
  // and can never be skipped-as-passed.
  const occupancy = candidate.occupancy;
  let occupancyPassed = true;
  for (const m of metrics) {
    if (m.widthPx > occupancy.maxWidthPx) occupancyPassed = false;
    if (m.heightPx < occupancy.heightRangePx[0] || m.heightPx > occupancy.heightRangePx[1]) occupancyPassed = false;
  }
  gates.push({
    name: 'occupancy_bounds',
    passed: occupancyPassed,
    measured: { declared: occupancy, widthsPx: metrics.map((m) => m.widthPx), heightsPx: heights }
  });

  return { gates, metrics };
}

function composePreview(plateImage, sheet, target, plateTilePx) {
  const [cellW, cellH] = target.cellPx;
  const slotWidth = SLOT_TILES * plateTilePx[0];
  const baselineRow = BASELINE_TILE_ROW * plateTilePx[1] - 1;
  const preview = image(plateImage.width, plateImage.height);
  blit(preview, plateImage, 0, 0, { skipTransparent: false });
  const pivotOffsetX = Math.floor(slotWidth / 2);
  for (let d = 0; d < 4; d += 1) {
    const cell = { width: cellW, height: cellH, colorType: 6, data: cropData(sheet, d * cellW, 0, cellW, cellH) };
    const dx = d * slotWidth + pivotOffsetX - Math.floor(cellW / 2);
    const dy = baselineRow - target.pivotRow;
    blit(preview, cell, dx, dy);
  }
  return { preview, layout: { baselineRow, slotWidth, pivotOffsetX } };
}

function buildOverlay(sheet, target, index) {
  const [cellW, cellH] = target.cellPx;
  const cell = { width: cellW, height: cellH, colorType: 6, data: cropData(sheet, index * cellW, 0, cellW, cellH) };
  const up = upscaleNearestNeighborRgba(cell, NN_SCALE);
  const overlay = image(up.width, up.height, [40, 40, 46, 255]);
  blit(overlay, up, 0, 0);
  const baselineY = target.pivotRow * NN_SCALE;
  for (let x = 0; x < overlay.width; x += 1) {
    const i = (baselineY * overlay.width + x) * 4;
    overlay.data[i] = MARKER[0]; overlay.data[i + 1] = MARKER[1]; overlay.data[i + 2] = MARKER[2]; overlay.data[i + 3] = MARKER[3];
  }
  const pivotX = Math.floor(cellW / 2) * NN_SCALE;
  for (let y = Math.max(0, baselineY - 3 * NN_SCALE); y < overlay.height; y += 1) {
    const i = (y * overlay.width + pivotX) * 4;
    overlay.data[i] = MARKER[0]; overlay.data[i + 1] = MARKER[1]; overlay.data[i + 2] = MARKER[2]; overlay.data[i + 3] = MARKER[3];
  }
  return overlay;
}

function buildContactSheet(sheet, target) {
  const [cellW, cellH] = target.cellPx;
  const w = 4 * cellW * NN_SCALE + 3 * GUTTER;
  const h = cellH * NN_SCALE;
  const out = image(w, h, [40, 40, 46, 255]);
  for (let d = 0; d < 4; d += 1) {
    const cell = { width: cellW, height: cellH, colorType: 6, data: cropData(sheet, d * cellW, 0, cellW, cellH) };
    blit(out, upscaleNearestNeighborRgba(cell, NN_SCALE), d * (cellW * NN_SCALE + GUTTER), 0);
  }
  return out;
}

function buildComparisonSheet(candidateSheets, target) {
  const [cellW, cellH] = target.cellPx;
  const columnW = cellW * NN_SCALE;
  const rowH = cellH * NN_SCALE;
  const w = 4 * columnW + 3 * GUTTER;
  const h = candidateSheets.length * rowH + (candidateSheets.length - 1) * GUTTER;
  const out = image(w, h, [40, 40, 46, 255]);
  candidateSheets.forEach(({ sheet }, row) => {
    for (let d = 0; d < 4; d += 1) {
      const cell = { width: cellW, height: cellH, colorType: 6, data: cropData(sheet, d * cellW, 0, cellW, cellH) };
      blit(out, upscaleNearestNeighborRgba(cell, NN_SCALE), d * (columnW + GUTTER), row * (rowH + GUTTER));
    }
  });
  return out;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(JSON.parse(stableStringify(value)), null, 2)}\n`);
}

export function composePerspectiveTrialEvidence(manifestPath) {
  const manifest = loadManifest(manifestPath);
  const { target, plates, outDir } = manifest;
  const farm = buildPlate(plates.farm_bright);
  const woods = buildPlate(plates.woods_bridge);
  const failures = [];
  const candidateSummaries = [];
  const candidateSheets = [];

  for (const candidate of manifest.candidates) {
    const sheet = readPng(candidate.sheetPath);
    const candidateDir = path.join(outDir, candidate.id);
    fs.mkdirSync(candidateDir, { recursive: true });
    const { gates, metrics } = runMachineGates(sheet, target, candidate);
    const machinePassed = gates.every((g) => g.passed);
    if (!machinePassed) {
      failures.push({ candidate: candidate.id, gates: gates.filter((g) => !g.passed).map((g) => g.name) });
    }

    const farmPreview = composePreview(farm.plate, sheet, target, plates.farm_bright.tilePx);
    const woodsPreview = composePreview(woods.plate, sheet, target, plates.woods_bridge.tilePx);
    writePng(path.join(candidateDir, 'preview_1x_farm_bright.png'), farmPreview.preview);
    writePng(path.join(candidateDir, 'preview_1x_woods_bridge.png'), woodsPreview.preview);
    writePng(path.join(candidateDir, 'sheet_nn8x.png'), upscaleNearestNeighborRgba(sheet, NN_SCALE));
    target.directions.forEach((direction, d) => {
      writePng(path.join(candidateDir, `overlay_${direction}.png`), buildOverlay(sheet, target, d));
    });
    writePng(path.join(candidateDir, 'contact_sheet.png'), buildContactSheet(sheet, target));

    const inputs = [candidate.sheetPath, ...farm.inputPaths, ...woods.inputPaths]
      .map((p) => ({ path: p.replace(/\\/g, '/'), sha256: sha256(p) }));
    const report = {
      reportId: REPORT_ID,
      trialId: manifest.id,
      candidate: { id: candidate.id, provider: candidate.provider, approach: candidate.approach },
      target: { cellPx: target.cellPx, directions: target.directions, pivotRow: target.pivotRow },
      plates: { woods_bridge_label: 'bridge terrain (current Wildbloom placeholder tiles)' },
      inputs,
      gates,
      machinePassed,
      metricsByDirection: Object.fromEntries(target.directions.map((direction, d) => [direction, metrics[d] ?? null])),
      judgmentGates: JUDGMENT_GATES.map((g) => ({ ...g, status: 'open' })),
      reviewProtocol: REVIEW_PROTOCOL,
      previewLayout: farmPreview.layout,
      producer: { tool: 'scripts/compose-perspective-trial-evidence.mjs' }
    };
    writeJson(path.join(candidateDir, 'report.json'), report);
    candidateSummaries.push({ id: candidate.id, approach: candidate.approach, machinePassed, failedGates: gates.filter((g) => !g.passed).map((g) => g.name) });
    candidateSheets.push({ id: candidate.id, sheet });
  }

  writePng(path.join(outDir, 'comparison_by_direction.png'), buildComparisonSheet(candidateSheets, target));
  writeJson(path.join(outDir, 'trial_report.json'), {
    reportId: REPORT_ID,
    trialId: manifest.id,
    candidates: candidateSummaries,
    reviewProtocol: REVIEW_PROTOCOL
  });

  return { ok: failures.length === 0, failures, outDir };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flagIndex = process.argv.indexOf('--manifest');
  const manifestPath = flagIndex >= 0 ? process.argv[flagIndex + 1] : process.argv[2];
  if (!manifestPath) fail('usage: node scripts/compose-perspective-trial-evidence.mjs --manifest <path>');
  const result = composePerspectiveTrialEvidence(manifestPath);
  console.log(result.ok
    ? `Perspective trial evidence composed: ${result.outDir}`
    : `Perspective trial machine gates FAILED: ${JSON.stringify(result.failures)}`);
  process.exitCode = result.ok ? 0 : 1;
}
