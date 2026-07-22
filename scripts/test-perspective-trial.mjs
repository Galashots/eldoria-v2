#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './normalize-asset-sheet.mjs';
import { composePerspectiveTrialEvidence } from './compose-perspective-trial-evidence.mjs';

const ROOT = path.resolve('.tmp/perspective-trial');
const DIRECTIONS = ['front', 'back', 'left', 'right'];

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

function makePlateSources(dir) {
  const farmTile = path.join(dir, 'farm-tile.png');
  const grass = image(16, 16, [60, 120, 50, 255]);
  rect(grass, 3, 3, 2, 2, [90, 160, 70, 255]);
  writePng(farmTile, grass);

  const woodsTileset = path.join(dir, 'woods-tileset.png');
  const tiles = image(32, 32, [24, 34, 30, 255]);
  rect(tiles, 0, 0, 16, 16, [20, 30, 26, 255]);   // cell [0,0]: dark woods ground
  rect(tiles, 16, 0, 16, 16, [200, 0, 0, 255]);   // cell [1,0]: sentinel, must not appear
  writePng(woodsTileset, tiles);
  return { farmTile, woodsTileset };
}

function makeManifest(dir, options = {}) {
  const sheetPath = options.sheetPath ?? path.join(dir, 'candidate-a.png');
  const { farmTile, woodsTileset } = makePlateSources(dir);
  const manifest = {
    version: 1,
    id: options.id ?? 'test_perspective_trial',
    target: { cellPx: [32, 48], directions: DIRECTIONS, pivotRow: 47 },
    plates: {
      farm_bright: { mode: 'tile', tilePath: farmTile, tilePx: [16, 16] },
      woods_bridge: { mode: 'tileset_cells', tilesetPath: woodsTileset, tilePx: [16, 16], cells: [[0, 0]] }
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
  // 9. Farm plate is tiled from the declared tile; woods plate uses only the
  // declared tileset cell (the red sentinel cell must never appear).
  const dir = path.join(ROOT, 'plates');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  composePerspectiveTrialEvidence(manifestPath);
  const farm = readPng(path.join(manifest.outDir, 'cand_a', 'preview_1x_farm_bright.png'));
  assert.equal(farm.width % 16, 0);
  assert.deepEqual(pixel(farm, 0, 0), [60, 120, 50, 255], 'farm plate corner must be the grass tile base color');
  assert.deepEqual(pixel(farm, 16 + 3, 3), [90, 160, 70, 255], 'farm tiling must repeat the tile detail');
  const woods = readPng(path.join(manifest.outDir, 'cand_a', 'preview_1x_woods_bridge.png'));
  let sentinel = false;
  for (let i = 0; i < woods.data.length; i += 4) {
    if (woods.data[i] === 200 && woods.data[i + 1] === 0 && woods.data[i + 2] === 0) sentinel = true;
  }
  assert.equal(sentinel, false, 'undeclared tileset cell must not enter the woods plate');
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
  // 12. Two-run byte-identical regeneration over every artifact.
  const dir = path.join(ROOT, 'determinism');
  makeIdleSheet(path.join(dir, 'candidate-a.png'));
  const { manifestPath, manifest } = makeManifest(dir);
  composePerspectiveTrialEvidence(manifestPath);
  const snapshot = new Map();
  const walk = (p) => {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) walk(full);
      else snapshot.set(full, fs.readFileSync(full));
    }
  };
  walk(manifest.outDir);
  assert.ok(snapshot.size >= 10, 'expected a full artifact set to compare');
  composePerspectiveTrialEvidence(manifestPath);
  for (const [file, bytes] of snapshot) {
    assert.ok(fs.readFileSync(file).equals(bytes), `artifact must be byte-identical across runs: ${file}`);
  }
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
  // 14. Multi-candidate comparison: both candidates appear in the trial index
  // and the comparison sheet is tall enough for two rows.
  const dir = path.join(ROOT, 'multi');
  const sheetA = path.join(dir, 'candidate-a.png');
  const sheetB = path.join(dir, 'candidate-b.png');
  makeIdleSheet(sheetA);
  makeIdleSheet(sheetB, { front: { width: 18, left: 7 } });
  const { manifestPath, manifest } = makeManifest(dir, {
    candidates: [
      { id: 'cand_a', provider: 'test', approach: 'same_sheet', sheetPath: sheetA },
      { id: 'cand_b', provider: 'test', approach: 'direction_anchored', sheetPath: sheetB }
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

console.log(`Perspective trial test passed (${passed}/15).`);
