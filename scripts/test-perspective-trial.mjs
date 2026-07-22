#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import {
  composePerspectiveTrialEvidence, compareArtifactTrees, composePreview, buildOverlay,
} from './compose-perspective-trial-evidence.mjs';

const ROOT = path.resolve('.tmp/perspective-trial');
const DIRECTIONS = ['front', 'back', 'left', 'right'];
const REPO_ROOT = path.resolve('.');
const FARM_TILE = path.join(REPO_ROOT, 'docs', 'art-pipeline', 'review', 'tile_farm_grass_base_grass_a', 'grass_a.review-normalized.png');
const WOODS_TILESET = path.join(REPO_ROOT, 'public', 'assets', 'tilesets', 'eldoria-placeholder.png');
const CANONICAL_TARGETS_PATH = path.join(REPO_ROOT, 'docs', 'visual-targets', 'hero_actor_targets.json');
const COMPOSE_SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'compose-perspective-trial-evidence.mjs');

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

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

function pixel(img, x, y) {
  const index = (y * img.width + x) * 4;
  return Array.from(img.data.slice(index, index + 4));
}

const DIRECTION_COLORS = [
  [200, 40, 40, 255],
  [40, 160, 60, 255],
  [50, 90, 200, 255],
  [210, 170, 30, 255]
];

// Builds a synthetic 128x48 four-direction idle sheet. Per-direction overrides
// allow each gate test to construct exactly one controlled defect.
function makeIdleSheet(filePath, overrides = {}) {
  const sheet = image(128, 48);
  for (let d = 0; d < 4; d += 1) {
    const o = overrides[DIRECTIONS[d]] ?? {};
    const w = o.width ?? 16;
    const h = o.height ?? 40;
    const contactRow = o.contactRow ?? 47;
    const left = o.left ?? d * 32 + Math.floor((32 - w) / 2);
    rect(sheet, left, contactRow - h + 1, w, h, DIRECTION_COLORS[d]);
    if (o.semiAlphaPixel) {
      const i = ((contactRow - 2) * sheet.width + left + 1) * 4;
      sheet.data[i + 3] = 128;
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writePng(filePath, sheet);
  return sheet;
}

// Manifests are bound to the canonical target and the exact repo plate assets;
// tests use the real committed grass_a master and placeholder tileset. Options
// allow negative tests to declare noncanonical values that must be rejected.
function makeManifest(dir, options = {}) {
  const sheetPath = options.sheetPath ?? path.join(dir, 'candidate-a.png');
  const manifest = {
    version: 1,
    id: options.id ?? 'test_perspective_trial',
    target: options.target ?? { cellPx: [32, 48], directions: DIRECTIONS, pivotPx: [16, 47] },
    plates: options.plates ?? {
      farm_bright: { mode: 'tile', tilePath: FARM_TILE, tilePx: [16, 16] },
      woods_bridge: { mode: 'tileset_cells', tilesetPath: WOODS_TILESET, tilePx: [16, 16], cells: options.woodsCells ?? [[0, 0]] }
    },
    outDir: options.outDir ?? path.join(dir, 'out'),
    candidates: options.candidates ?? [
      {
        id: 'cand_a',
        provider: 'test',
        approach: 'same_sheet',
        sheetPath,
        occupancy: { maxWidthPx: 20, heightRangePx: [36, 46] }
      }
    ]
  };
  const manifestPath = path.join(dir, 'manifest.json');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifestPath, manifest };
}

function gate(report, name) {
  const found = report.gates.find((g) => g.name === name);
  assert.ok(found, `expected gate "${name}" in report`);
  return found;
}

function readReport(outDir, candidateId) {
  return JSON.parse(fs.readFileSync(path.join(outDir, candidateId, 'report.json'), 'utf8'));
}

fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });
let passed = 0;

{
  // 1. Happy path: all machine gates pass and every declared artifact exists.
  const dir = path.join(ROOT, 'happy');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, true, `happy path should pass: ${JSON.stringify(result.failures ?? [])}`);
  const report = readReport(manifest.outDir, 'cand_a');
  assert.equal(report.reportId, 'eldoria-perspective-trial-report/v1');
  for (const name of ['geometry', 'binary_alpha', 'cell_bleed', 'apparent_height_parity', 'pivot_contact', 'occupancy_bounds']) {
    assert.equal(gate(report, name).passed, true, `gate ${name} should pass`);
  }
  for (const file of [
    'preview_1x_farm_bright.png', 'preview_1x_woods_bridge.png', 'sheet_nn8x.png',
    'overlay_front.png', 'overlay_back.png', 'overlay_left.png', 'overlay_right.png',
    'contact_sheet.png', 'report.json'
  ]) {
    assert.ok(fs.existsSync(path.join(manifest.outDir, 'cand_a', file)), `missing artifact ${file}`);
  }
  assert.ok(fs.existsSync(path.join(manifest.outDir, 'comparison_by_direction.png')), 'missing comparison sheet');
  assert.ok(fs.existsSync(path.join(manifest.outDir, 'trial_report.json')), 'missing trial index report');
  passed += 1;
}

{
  // 2. Judgment gates are named open items, never machine-passed, and carry the
  // reference-consultation requirement (owner amendment 2026-07-21).
  const dir = path.join(ROOT, 'judgment');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  composePerspectiveTrialEvidence(manifestPath);
  const report = readReport(manifest.outDir, 'cand_a');
  const names = report.judgmentGates.map((g) => g.name);
  for (const expected of ['foreshortened_not_frontal', 'visible_top_planes', 'single_camera_pitch', 'upper_left_key_light', 'identity_readability', 'embedded_in_environment']) {
    assert.ok(names.includes(expected), `expected judgment gate ${expected}`);
  }
  for (const g of report.judgmentGates) assert.equal(g.status, 'open');
  assert.match(report.reviewProtocol, /reference imagery/i);
  passed += 1;
}

{
  // 3. Apparent-height parity: one direction 3px shorter must fail by name.
  const dir = path.join(ROOT, 'height');
  makeIdleSheet(path.join(dir, 'candidate-a.png'), { left: { height: 37 } });
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, false);
  const report = readReport(manifest.outDir, 'cand_a');
  assert.equal(gate(report, 'apparent_height_parity').passed, false);
  passed += 1;
}

{
  // 4. A single semitransparent pixel must fail binary_alpha by name.
  const dir = path.join(ROOT, 'alpha');
  makeIdleSheet(path.join(dir, 'candidate-a.png'), { back: { semiAlphaPixel: true } });
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, false);
  assert.equal(gate(readReport(manifest.outDir, 'cand_a'), 'binary_alpha').passed, false);
  passed += 1;
}

{
  // 5. A floating sprite (contact above pivot row 47) must fail pivot_contact.
  const dir = path.join(ROOT, 'pivot');
  makeIdleSheet(path.join(dir, 'candidate-a.png'), { right: { contactRow: 45 } });
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, false);
  assert.equal(gate(readReport(manifest.outDir, 'cand_a'), 'pivot_contact').passed, false);
  passed += 1;
}

{
  // 6. Art touching an interior cell boundary column must fail cell_bleed.
  const dir = path.join(ROOT, 'bleed');
  makeIdleSheet(path.join(dir, 'candidate-a.png'), { front: { left: 16, width: 16 } }); // touches col 31 of cell 0
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, false);
  assert.equal(gate(readReport(manifest.outDir, 'cand_a'), 'cell_bleed').passed, false);
  passed += 1;
}

{
  // 7. A wrong sheet size must fail geometry before any other gate runs.
  const dir = path.join(ROOT, 'geometry');
  const sheetPath = path.join(dir, 'candidate-a.png');
  fs.mkdirSync(dir, { recursive: true });
  const bad = image(96, 48);
  rect(bad, 8, 8, 16, 39, [200, 40, 40, 255]);
  writePng(sheetPath, bad);
  const { manifestPath, manifest } = makeManifest(dir, { sheetPath });
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, false);
  assert.equal(gate(readReport(manifest.outDir, 'cand_a'), 'geometry').passed, false);
  passed += 1;
}

{
  // 8. Declared occupancy bounds are enforced (width 26 > maxWidthPx 20).
  const dir = path.join(ROOT, 'occupancy');
  makeIdleSheet(path.join(dir, 'candidate-a.png'), { front: { width: 26, left: 3 } });
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, false);
  assert.equal(gate(readReport(manifest.outDir, 'cand_a'), 'occupancy_bounds').passed, false);
  passed += 1;
}

{
  // 9. Plates are composed from the exact canonical repo assets: the farm
  // preview tiles the committed grass_a master, and the woods preview strides
  // only the declared cell of the committed placeholder tileset.
  const dir = path.join(ROOT, 'plates');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  composePerspectiveTrialEvidence(manifestPath);
  const grassTile = readPng(FARM_TILE);
  const farm = readPng(path.join(manifest.outDir, 'cand_a', 'preview_1x_farm_bright.png'));
  assert.equal(farm.width % 16, 0);
  assert.deepEqual(pixel(farm, 0, 0), pixel(grassTile, 0, 0), 'farm plate corner must be the grass_a master pixel');
  assert.deepEqual(pixel(farm, 16 + 3, 3), pixel(grassTile, 3, 3), 'farm tiling must repeat the grass_a master');
  const tileset = readPng(WOODS_TILESET);
  const woods = readPng(path.join(manifest.outDir, 'cand_a', 'preview_1x_woods_bridge.png'));
  assert.deepEqual(pixel(woods, 2, 2), pixel(tileset, 2, 2), 'woods plate must come from declared cell [0,0] of the committed tileset');
  passed += 1;
}

{
  // 9b. Substituted plate sources must be rejected before evidence exists:
  // a manifest pointing at look-alike temp files is not the canonical context.
  const dir = path.join(ROOT, 'plate-substitute');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const fakeTile = path.join(dir, 'fake-grass.png');
  writePng(fakeTile, image(16, 16, [60, 120, 50, 255]));
  const { manifestPath } = makeManifest(dir, {
    plates: {
      farm_bright: { mode: 'tile', tilePath: fakeTile, tilePx: [16, 16] },
      woods_bridge: { mode: 'tileset_cells', tilesetPath: WOODS_TILESET, tilePx: [16, 16], cells: [[0, 0]] }
    }
  });
  assert.throws(() => composePerspectiveTrialEvidence(manifestPath), /canonical repo asset/);
  const fakeSet = path.join(dir, 'fake-tileset.png');
  writePng(fakeSet, image(256, 32, [24, 34, 30, 255]));
  const { manifestPath: mp2 } = makeManifest(dir, {
    plates: {
      farm_bright: { mode: 'tile', tilePath: FARM_TILE, tilePx: [16, 16] },
      woods_bridge: { mode: 'tileset_cells', tilesetPath: fakeSet, tilePx: [16, 16], cells: [[0, 0]] }
    }
  });
  assert.throws(() => composePerspectiveTrialEvidence(mp2), /canonical repo asset/);
  passed += 1;
}

{
  // 9c. The manifest cannot redefine the authoritative target: wrong canvas,
  // wrong pivot Y, wrong pivot X, and wrong direction order each fail against
  // the canonical char_mage_boy_base entry in hero_actor_targets.json.
  const dir = path.join(ROOT, 'target-substitute');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const wrongSize = makeManifest(dir, { target: { cellPx: [32, 64], directions: DIRECTIONS, pivotPx: [16, 47] } });
  assert.throws(() => composePerspectiveTrialEvidence(wrongSize.manifestPath), /canonical char_mage_boy_base canvas/);
  const wrongPivotY = makeManifest(dir, { target: { cellPx: [32, 48], directions: DIRECTIONS, pivotPx: [16, 40] } });
  assert.throws(() => composePerspectiveTrialEvidence(wrongPivotY.manifestPath), /must match canonical pivot/);
  // 9c-2. Wrong pivot X alone (correct Y, correct canvas) must also be
  // rejected: a manifest cannot pass by only matching the contact row while
  // silently substituting the horizontal pivot.
  const wrongPivotX = makeManifest(dir, { target: { cellPx: [32, 48], directions: DIRECTIONS, pivotPx: [10, 47] } });
  assert.throws(() => composePerspectiveTrialEvidence(wrongPivotX.manifestPath), /must match canonical pivot/);
  const wrongOrder = makeManifest(dir, { target: { cellPx: [32, 48], directions: ['back', 'front', 'left', 'right'], pivotPx: [16, 47] } });
  assert.throws(() => composePerspectiveTrialEvidence(wrongOrder.manifestPath), /canonical order/);
  passed += 1;
}

{
  // 9d. Omitted occupancy bounds are a hard failure, never a skipped pass.
  const dir = path.join(ROOT, 'occupancy-required');
  const sheetPath = path.join(dir, 'candidate-a.png');
  makeIdleSheet(sheetPath);
  const { manifestPath } = makeManifest(dir, {
    candidates: [{ id: 'cand_a', provider: 'test', approach: 'same_sheet', sheetPath }]
  });
  assert.throws(() => composePerspectiveTrialEvidence(manifestPath), /occupancy bounds .* required/);
  passed += 1;
}

{
  // 9e. Declared woods cells outside the committed tileset are rejected.
  const dir = path.join(ROOT, 'cell-bounds');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath } = makeManifest(dir, { woodsCells: [[99, 0]] });
  assert.throws(() => composePerspectiveTrialEvidence(manifestPath), /outside the .* tileset/);
  passed += 1;
}

{
  // 10. Previews ground each direction at the pivot: the sprite's bottom pixel
  // sits exactly on the declared baseline row for every direction slot.
  const dir = path.join(ROOT, 'grounding');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  composePerspectiveTrialEvidence(manifestPath);
  const preview = readPng(path.join(manifest.outDir, 'cand_a', 'preview_1x_farm_bright.png'));
  const report = readReport(manifest.outDir, 'cand_a');
  const { baselineRow, slotWidth, pivotOffsetX } = report.previewLayout;
  for (let d = 0; d < 4; d += 1) {
    const px = d * slotWidth + pivotOffsetX;
    assert.deepEqual(pixel(preview, px, baselineRow), DIRECTION_COLORS[d], `direction ${DIRECTIONS[d]} bottom pixel must sit on the baseline`);
    assert.notDeepEqual(pixel(preview, px, baselineRow + 1), DIRECTION_COLORS[d], 'nothing below the baseline');
  }
  passed += 1;
}

{
  // 11. Pivot/baseline overlays exist per direction at 8x with the marker row.
  const dir = path.join(ROOT, 'overlay');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  composePerspectiveTrialEvidence(manifestPath);
  const overlay = readPng(path.join(manifest.outDir, 'cand_a', 'overlay_front.png'));
  assert.equal(overlay.width, 32 * 8);
  assert.equal(overlay.height, 48 * 8);
  assert.deepEqual(pixel(overlay, 0, 47 * 8), [255, 0, 255, 255], 'baseline row must be marked');
  passed += 1;
}

{
  // 12. The PRODUCTION run itself gates two-run byte-identical regeneration
  // (not merely a test-level snapshot comparison across two separate calls):
  // both the per-candidate report and the trial index must record and pass
  // the determinism result, and no leftover verify tree should remain.
  const dir = path.join(ROOT, 'determinism');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.deterministicRegeneration.runs, 2);
  assert.equal(result.deterministicRegeneration.written_files_byte_identical, true);
  // 8 per-candidate artifacts (2 previews, enlarged sheet, 4 overlays,
  // contact sheet) + 1 top-level comparison sheet; report.json/trial_report.json
  // are excluded (written only after this gate).
  assert.ok(result.deterministicRegeneration.files_compared >= 9, 'expected a full artifact set to have been compared');
  const report = readReport(manifest.outDir, 'cand_a');
  assert.deepEqual(report.deterministicRegeneration, result.deterministicRegeneration);
  const index = JSON.parse(fs.readFileSync(path.join(manifest.outDir, 'trial_report.json'), 'utf8'));
  assert.deepEqual(index.deterministicRegeneration, result.deterministicRegeneration);
  assert.equal(index.machinePassed, true);
  assert.ok(!fs.existsSync(`${manifest.outDir}.regen-verify`), 'the throwaway verify tree must not be left behind');

  // A second independent call remains byte-identical to the first, over the
  // full written artifact set (previews, sheets, overlays, contact sheet,
  // comparison sheet, and both reports).
  const snapshot = new Map();
  const walk = (p) => {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) walk(full);
      else snapshot.set(full, fs.readFileSync(full));
    }
  };
  walk(manifest.outDir);
  composePerspectiveTrialEvidence(manifestPath);
  for (const [file, bytes] of snapshot) {
    assert.ok(fs.readFileSync(file).equals(bytes), `artifact must be byte-identical across runs: ${file}`);
  }
  passed += 1;
}

{
  // 12b. compareArtifactTrees is the production determinism gate itself, not
  // just an implementation detail: it must fail loudly, by name, on a
  // differing file list between two written trees.
  const a = path.join(ROOT, 'tree-list-a');
  const b = path.join(ROOT, 'tree-list-b');
  fs.mkdirSync(a, { recursive: true });
  fs.mkdirSync(b, { recursive: true });
  fs.writeFileSync(path.join(a, 'one.png'), Buffer.from([1, 2, 3]));
  fs.writeFileSync(path.join(b, 'one.png'), Buffer.from([1, 2, 3]));
  fs.writeFileSync(path.join(b, 'extra.png'), Buffer.from([9]));
  assert.throws(() => compareArtifactTrees(a, b), /file lists differ/);
  passed += 1;
}

{
  // 12c. compareArtifactTrees must fail loudly, by name, on a byte
  // difference between two written trees that share the same file list.
  const a = path.join(ROOT, 'tree-bytes-a');
  const b = path.join(ROOT, 'tree-bytes-b');
  fs.mkdirSync(path.join(a, 'nested'), { recursive: true });
  fs.mkdirSync(path.join(b, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(a, 'nested', 'sheet.png'), Buffer.from([1, 2, 3]));
  fs.writeFileSync(path.join(b, 'nested', 'sheet.png'), Buffer.from([1, 2, 4]));
  assert.throws(() => compareArtifactTrees(a, b), /nested\/sheet\.png differs/);
  passed += 1;
}

{
  // 12d. A non-centred pivot flows correctly through placement and overlay
  // logic: it must NOT be derived from canvas centre. Use a synthetic target
  // wider than its pivot doubled, so a centre-derived X (cellW/2) would land
  // in a visibly different column than the declared pivotPx[0].
  const cellW = 40; const cellH = 48;
  const pivotX = 10; // canvas centre would be 20 - deliberately off-centre
  const pivotY = 47;
  const target = { cellPx: [cellW, cellH], directions: DIRECTIONS, pivotPx: [pivotX, pivotY] };
  const sheet = image(cellW * 4, cellH);
  const markerColor = [200, 40, 40, 255];
  for (let d = 0; d < 4; d += 1) {
    // One marker pixel at each direction's declared pivot column/row.
    const i = (pivotY * sheet.width + d * cellW + pivotX) * 4;
    sheet.data[i] = markerColor[0]; sheet.data[i + 1] = markerColor[1];
    sheet.data[i + 2] = markerColor[2]; sheet.data[i + 3] = markerColor[3];
  }
  const plateTilePx = [16, 16];
  const plate = image(3 * 4 * plateTilePx[0], 8 * plateTilePx[1], [30, 30, 30, 255]);
  const { preview, layout } = composePreview(plate, sheet, target, plateTilePx);
  const slotWidth = layout.slotWidth;
  const pivotOffsetX = layout.pivotOffsetX;
  for (let d = 0; d < 4; d += 1) {
    // The marker must land at the slot's centre column (pivot-aligned), not
    // at a centre-derived column (which would be offset by 20 - 10 = 10px).
    const expectedX = d * slotWidth + pivotOffsetX;
    assert.deepEqual(pixel(preview, expectedX, layout.baselineRow), markerColor,
      `direction ${DIRECTIONS[d]}: pivot marker must land on the slot centre using the declared pivotPx[0], not canvas centre`);
  }
  // buildOverlay draws its own magenta pivot/baseline marker lines directly
  // over the art, so check where the vertical marker LINE lands, sampled
  // above the baseline (away from the full-width baseline line): it must sit
  // at the declared pivotPx[0] column, not a canvas-centre-derived column.
  const overlay = buildOverlay(sheet, target, 0);
  const overlayPivotX = pivotX * 8; // NN_SCALE = 8
  const centreDerivedX = Math.floor(cellW / 2) * 8;
  assert.notEqual(overlayPivotX, centreDerivedX, 'test fixture sanity: pivot must be genuinely off-centre');
  const sampleY = pivotY * 8 - 8; // one NN cell above the baseline
  const MARKER = [255, 0, 255, 255];
  assert.deepEqual(pixel(overlay, overlayPivotX, sampleY), MARKER,
    'overlay pivot marker column must use the declared pivotPx[0], not canvas centre');
  assert.notDeepEqual(pixel(overlay, centreDerivedX, sampleY), MARKER,
    'overlay must not also mark a canvas-centre-derived column');
  passed += 1;
}

{
  // 13. Report records a sha256 for every input file.
  const dir = path.join(ROOT, 'hashes');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  composePerspectiveTrialEvidence(manifestPath);
  const report = readReport(manifest.outDir, 'cand_a');
  assert.ok(report.inputs.length >= 3, 'expected sheet + both plate sources');
  for (const input of report.inputs) assert.match(input.sha256, /^[0-9a-f]{64}$/);
  passed += 1;
}

{
  // 13b. Shared provenance (trial manifest, hero_actor_targets.json, and the
  // compose script itself) is present and matches the actual files, on both
  // the per-candidate report and the top-level trial report - not merely
  // present in some regex-matching shape, but byte-for-byte correct.
  const dir = path.join(ROOT, 'provenance');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  const expected = {
    trialManifest: sha256File(manifestPath),
    canonicalTargets: sha256File(CANONICAL_TARGETS_PATH),
    composeScript: sha256File(COMPOSE_SCRIPT_PATH),
  };
  for (const [key, expectedHash] of Object.entries(expected)) {
    assert.match(result.provenance[key].sha256, /^[0-9a-f]{64}$/, `provenance.${key}.sha256 must be present`);
    assert.equal(result.provenance[key].sha256, expectedHash, `provenance.${key} must match the actual file`);
  }
  const report = readReport(manifest.outDir, 'cand_a');
  assert.deepEqual(report.provenance, result.provenance, 'candidate report provenance must match the run provenance');
  const index = JSON.parse(fs.readFileSync(path.join(manifest.outDir, 'trial_report.json'), 'utf8'));
  assert.deepEqual(index.provenance, result.provenance, 'trial_report.json provenance must match the run provenance');
  passed += 1;
}

{
  // 14. Multi-candidate comparison: both candidates appear in the trial index
  // and the comparison sheet is tall enough for two rows.
  const dir = path.join(ROOT, 'multi');
  const sheetA = path.join(dir, 'candidate-a.png');
  const sheetB = path.join(dir, 'candidate-b.png');
  makeIdleSheet(sheetA);
  makeIdleSheet(sheetB, { front: { width: 18, left: 7 } });
  const { manifestPath, manifest } = makeManifest(dir, {
    candidates: [
      { id: 'cand_a', provider: 'test', approach: 'same_sheet', sheetPath: sheetA, occupancy: { maxWidthPx: 20, heightRangePx: [36, 46] } },
      { id: 'cand_b', provider: 'test', approach: 'direction_anchored', sheetPath: sheetB, occupancy: { maxWidthPx: 20, heightRangePx: [36, 46] } }
    ]
  });
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, true);
  const index = JSON.parse(fs.readFileSync(path.join(manifest.outDir, 'trial_report.json'), 'utf8'));
  assert.deepEqual(index.candidates.map((c) => c.id), ['cand_a', 'cand_b']);
  const single = readPng(path.join(path.join(ROOT, 'happy'), 'out', 'comparison_by_direction.png'));
  const multi = readPng(path.join(manifest.outDir, 'comparison_by_direction.png'));
  assert.ok(multi.height > single.height, 'two candidates must occupy more comparison rows than one');
  passed += 1;
}

{
  // 15. A gate failure still produces the evidence artifacts (fail-closed on
  // verdict, not on evidence: reviewers need to see the failing candidate).
  const dir = path.join(ROOT, 'fail-evidence');
  makeIdleSheet(path.join(dir, 'candidate-a.png'), { left: { height: 30 } });
  const { manifestPath, manifest } = makeManifest(dir);
  const result = composePerspectiveTrialEvidence(manifestPath);
  assert.equal(result.ok, false);
  assert.ok(fs.existsSync(path.join(manifest.outDir, 'cand_a', 'contact_sheet.png')));
  assert.ok(fs.existsSync(path.join(manifest.outDir, 'cand_a', 'preview_1x_farm_bright.png')));
  passed += 1;
}

console.log(`Perspective trial test passed (${passed}/23).`);
