#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

export const CONTACT_SHEET = Object.freeze({ width: 1312, height: 1072, scale: 8, expectedCount: 7 });
export const APPROVAL_VERDICTS = Object.freeze(['APPROVED SOURCE CANDIDATE', 'APPROVED RUNTIME MASTER']);

const EXPECTED_ITEMS = Object.freeze([
  { id: 'tile_farm_grass_base', variant: 'grass_a', dimensions: [16, 16], pivot: [8, 15] },
  { id: 'tile_farm_path_dirt', variant: 'center', dimensions: [16, 16], pivot: [8, 15] },
  { id: 'tile_farm_water_base', variant: 'water_a', dimensions: [16, 16], pivot: [8, 15] },
  { id: 'env_farm_tree', variant: 'oak', dimensions: [32, 48], pivot: [16, 47] },
  { id: 'env_farm_fence', variant: 'rail_horizontal', dimensions: [16, 32], pivot: [8, 31] },
  { id: 'env_farm_rock_medium', variant: 'rock_a', dimensions: [32, 32], pivot: [16, 31] },
  { id: 'env_wildbloom_landmark', variant: 'root_star_revealed', dimensions: [32, 32], pivot: [16, 31] }
]);

const ROWS = Object.freeze({
  top: { baselineY: 456, cardTop: 64, cardBottom: 536, stageTop: 80, stageBottom: 464, labelTop: 488 },
  bottom: { baselineY: 944, cardTop: 552, cardBottom: 1024, stageTop: 568, stageBottom: 952, labelTop: 976 }
});

const SLOTS = Object.freeze([
  { slot: 0, row: 'top', centerX: 176, cardLeft: 24, cardRight: 328 },
  { slot: 1, row: 'top', centerX: 496, cardLeft: 344, cardRight: 648 },
  { slot: 2, row: 'top', centerX: 816, cardLeft: 664, cardRight: 968 },
  { slot: 3, row: 'top', centerX: 1136, cardLeft: 984, cardRight: 1288 },
  { slot: 4, row: 'bottom', centerX: 336, cardLeft: 184, cardRight: 488 },
  { slot: 5, row: 'bottom', centerX: 656, cardLeft: 504, cardRight: 808 },
  { slot: 6, row: 'bottom', centerX: 976, cardLeft: 824, cardRight: 1128 }
]);

const CLAIMS = Object.freeze({
  purpose: 'BATCH A REVIEW CONTACT SHEET',
  sourceOnlyReview: true,
  packedSheet: false,
  targetFamiliesComplete: false,
  runtimeIntegrated: false,
  physicalIpadValidated: false,
  childValidated: false,
  approvalScope: 'INDIVIDUAL ASSET VERDICTS ONLY'
});

const COLORS = Object.freeze({
  background: [18, 22, 27, 255],
  card: [35, 41, 48, 255],
  checkerA: [75, 79, 86, 255],
  checkerB: [54, 59, 66, 255],
  baseline: [125, 157, 111, 255],
  text: [236, 224, 177, 255],
  muted: [166, 174, 181, 255],
  border: [81, 91, 99, 255]
});

// Deterministic 5x7 bitmap font. Each number is one five-bit row.
const FONT = {
  ' ': [0,0,0,0,0,0,0], '-': [0,0,0,31,0,0,0], '_': [0,0,0,0,0,0,31],
  '/': [1,2,4,8,16,0,0], ':': [0,4,0,0,4,0,0], '.': [0,0,0,0,0,6,6],
  '0':[14,17,19,21,25,17,14], '1':[4,12,4,4,4,4,14], '2':[14,17,1,2,4,8,31],
  '3':[30,1,1,14,1,1,30], '4':[2,6,10,18,31,2,2], '5':[31,16,16,30,1,1,30],
  '6':[14,16,16,30,17,17,14], '7':[31,1,2,4,8,8,8], '8':[14,17,17,14,17,17,14],
  '9':[14,17,17,15,1,1,14],
  A:[14,17,17,31,17,17,17], B:[30,17,17,30,17,17,30], C:[14,17,16,16,16,17,14],
  D:[30,17,17,17,17,17,30], E:[31,16,16,30,16,16,31], F:[31,16,16,30,16,16,16],
  G:[14,17,16,23,17,17,15], H:[17,17,17,31,17,17,17], I:[14,4,4,4,4,4,14],
  J:[7,2,2,2,2,18,12], K:[17,18,20,24,20,18,17], L:[16,16,16,16,16,16,31],
  M:[17,27,21,21,17,17,17], N:[17,25,21,19,17,17,17], O:[14,17,17,17,17,17,14],
  P:[30,17,17,30,16,16,16], Q:[14,17,17,17,21,18,13], R:[30,17,17,30,20,18,17],
  S:[15,16,16,14,1,1,30], T:[31,4,4,4,4,4,4], U:[17,17,17,17,17,17,14],
  V:[17,17,17,17,17,10,4], W:[17,17,17,21,21,21,10], X:[17,17,10,4,10,17,17],
  Y:[17,17,10,4,4,4,4], Z:[31,1,2,4,8,16,31]
};

const sha256 = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const portable = (from, target) => path.relative(from, target).split(path.sep).join('/');
const isPositivePair = (value) => Array.isArray(value) && value.length === 2 && value.every((part) => Number.isInteger(part) && part > 0);
const isPivot = (value, dimensions) => Array.isArray(value) && value.length === 2 && value.every(Number.isInteger)
  && value[0] >= 0 && value[0] < dimensions[0] && value[1] >= 0 && value[1] < dimensions[1];

function parseArgs(argv) {
  const values = {};
  const allowed = new Set(['manifest', 'out', 'report']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (!allowed.has(key)) throw new Error(`Unknown option: ${token}`);
    if (Object.hasOwn(values, key)) throw new Error(`Duplicate option: ${token}`);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`${token} requires a value`);
    values[key] = next;
    index += 1;
  }
  return values;
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  image.data.set(color, (y * image.width + x) * 4);
}

function fillRect(image, left, top, width, height, color) {
  for (let y = top; y < top + height; y += 1) for (let x = left; x < left + width; x += 1) setPixel(image, x, y, color);
}

function strokeRect(image, left, top, width, height, color) {
  fillRect(image, left, top, width, 1, color);
  fillRect(image, left, top + height - 1, width, 1, color);
  fillRect(image, left, top, 1, height, color);
  fillRect(image, left + width - 1, top, 1, height, color);
}

function drawText(image, text, left, top, scale, color) {
  let cursor = left;
  for (const raw of text.toUpperCase()) {
    const glyph = FONT[raw];
    if (!glyph) throw new Error(`Unsupported bitmap-label character: ${JSON.stringify(raw)}`);
    for (let row = 0; row < 7; row += 1) for (let column = 0; column < 5; column += 1) {
      if ((glyph[row] & (1 << (4 - column))) !== 0) fillRect(image, cursor + column * scale, top + row * scale, scale, scale, color);
    }
    cursor += 6 * scale;
  }
}

function textWidth(text, scale) {
  return Math.max(0, text.length * 6 * scale - scale);
}

function drawCenteredText(image, text, centerX, top, scale, color) {
  drawText(image, text, Math.round(centerX - textWidth(text, scale) / 2), top, scale, color);
}

function compositeScaled(image, source, left, top, scale) {
  for (let sy = 0; sy < source.height; sy += 1) for (let sx = 0; sx < source.width; sx += 1) {
    const sourceOffset = (sy * source.width + sx) * 4;
    const alpha = source.data[sourceOffset + 3] / 255;
    if (alpha === 0) continue;
    for (let oy = 0; oy < scale; oy += 1) for (let ox = 0; ox < scale; ox += 1) {
      const x = left + sx * scale + ox;
      const y = top + sy * scale + oy;
      const destOffset = (y * image.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        image.data[destOffset + channel] = Math.round(source.data[sourceOffset + channel] * alpha + image.data[destOffset + channel] * (1 - alpha));
      }
      image.data[destOffset + 3] = 255;
    }
  }
}

function validateManifest(manifestPath) {
  const resolvedManifest = path.resolve(manifestPath);
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(resolvedManifest, 'utf8')); }
  catch (error) { throw new Error(`Cannot read contact-sheet manifest: ${error.message}`); }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Invalid contact-sheet manifest:\n- root must be a JSON object');
  }

  const errors = [];
  const rootKeys = new Set(['version', 'id', 'expectedCount', 'items']);
  for (const key of Object.keys(manifest)) if (!rootKeys.has(key)) errors.push(`unsupported root field: ${key}`);
  if (manifest.version !== 1) errors.push('version must be 1');
  if (typeof manifest.id !== 'string' || !/^[a-z0-9_]+$/.test(manifest.id)) errors.push('id must be lowercase snake_case');
  if (manifest.expectedCount !== CONTACT_SHEET.expectedCount) errors.push(`expectedCount must be ${CONTACT_SHEET.expectedCount}`);
  if (!Array.isArray(manifest.items)) errors.push('items must be an array');
  else if (manifest.items.length !== CONTACT_SHEET.expectedCount) errors.push(`items must contain exactly ${CONTACT_SHEET.expectedCount} entries`);

  const manifestDir = path.dirname(resolvedManifest);
  const slots = new Set();
  const orders = new Set();
  const identities = new Set();
  const validated = [];
  for (const [index, item] of (manifest.items ?? []).entries()) {
    const context = `items[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push(`${context} must be an object`); continue; }
    const itemKeys = new Set(['slot', 'order', 'id', 'variant', 'label', 'path', 'dimensions', 'pivot', 'sha256', 'approvalVerdict']);
    for (const key of Object.keys(item)) if (!itemKeys.has(key)) errors.push(`${context} has unsupported field: ${key}`);
    if (!Number.isInteger(item.slot) || item.slot < 0 || item.slot >= CONTACT_SHEET.expectedCount) errors.push(`${context}.slot must be an integer from 0 to 6`);
    else if (slots.has(item.slot)) errors.push(`${context}.slot duplicates ${item.slot}`);
    else slots.add(item.slot);
    if (!Number.isInteger(item.order) || item.order < 0 || item.order >= CONTACT_SHEET.expectedCount) errors.push(`${context}.order must be an integer from 0 to 6`);
    else if (orders.has(item.order)) errors.push(`${context}.order duplicates ${item.order}`);
    else orders.add(item.order);
    if (typeof item.id !== 'string' || !/^[a-z0-9_]+$/.test(item.id)) errors.push(`${context}.id must be lowercase snake_case`);
    if (typeof item.variant !== 'string' || !/^[a-z0-9_]+$/.test(item.variant)) errors.push(`${context}.variant must be lowercase snake_case`);
    if (Number.isInteger(item.slot) && item.slot >= 0 && item.slot < EXPECTED_ITEMS.length) {
      const expected = EXPECTED_ITEMS[item.slot];
      if (item.order !== item.slot) errors.push(`${context}.order must equal its canonical Batch A slot ${item.slot}`);
      if (item.id !== expected.id || item.variant !== expected.variant) errors.push(`${context} must identify ${expected.id}/${expected.variant}`);
      if (isPositivePair(item.dimensions) && (item.dimensions[0] !== expected.dimensions[0] || item.dimensions[1] !== expected.dimensions[1])) {
        errors.push(`${context}.dimensions must be ${expected.dimensions.join('x')} for ${expected.id}/${expected.variant}`);
      }
      if (Array.isArray(item.pivot) && (item.pivot[0] !== expected.pivot[0] || item.pivot[1] !== expected.pivot[1])) {
        errors.push(`${context}.pivot must be [${expected.pivot}] for ${expected.id}/${expected.variant}`);
      }
    }
    const identity = `${item.id}/${item.variant}`;
    if (identities.has(identity)) errors.push(`${context} duplicates identity ${identity}`);
    identities.add(identity);
    if (typeof item.label !== 'string' || item.label.length < 1 || item.label.length > 30 || [...item.label.toUpperCase()].some((character) => !FONT[character])) {
      errors.push(`${context}.label must be 1-30 supported bitmap characters`);
    }
    if (Number.isInteger(item.slot) && item.slot >= 0 && item.slot < SLOTS.length && typeof item.label === 'string'
      && textWidth(item.label, 2) > SLOTS[item.slot].cardRight - SLOTS[item.slot].cardLeft - 32) {
      errors.push(`${context}.label is too wide for slot ${item.slot}`);
    }
    if (!isPositivePair(item.dimensions)) errors.push(`${context}.dimensions must be two positive integers`);
    if (isPositivePair(item.dimensions) && !isPivot(item.pivot, item.dimensions)) errors.push(`${context}.pivot must lie inside the declared dimensions`);
    if (!APPROVAL_VERDICTS.includes(item.approvalVerdict)) errors.push(`${context}.approvalVerdict is not an allowed approval verdict`);
    if (typeof item.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.sha256)) errors.push(`${context}.sha256 must be a lowercase SHA-256`);
    if (typeof item.path !== 'string' || item.path.length === 0) { errors.push(`${context}.path must be a non-empty string`); continue; }
    if (path.isAbsolute(item.path)) { errors.push(`${context}.path must be relative to the manifest`); continue; }

    const imagePath = path.resolve(manifestDir, item.path);
    if (!fs.existsSync(imagePath)) { errors.push(`${context}.path does not exist: ${item.path}`); continue; }
    let image;
    try { image = readPng(imagePath); }
    catch (error) { errors.push(`${context}.path is not a readable PNG: ${error.message}`); continue; }
    if (isPositivePair(item.dimensions) && (image.width !== item.dimensions[0] || image.height !== item.dimensions[1])) {
      errors.push(`${context}.dimensions declare ${item.dimensions.join('x')} but PNG is ${image.width}x${image.height}`);
    }
    const actualHash = sha256(imagePath);
    if (/^[0-9a-f]{64}$/.test(item.sha256 ?? '') && actualHash !== item.sha256) errors.push(`${context}.sha256 does not match ${item.path}`);
    validated.push({ item, imagePath, image, actualHash });
  }
  if (slots.size === CONTACT_SHEET.expectedCount && [...slots].sort((a, b) => a - b).some((value, index) => value !== index)) errors.push('slots must cover 0 through 6');
  if (orders.size === CONTACT_SHEET.expectedCount && [...orders].sort((a, b) => a - b).some((value, index) => value !== index)) errors.push('orders must cover 0 through 6');
  if (errors.length) throw new Error(`Invalid contact-sheet manifest:\n- ${errors.join('\n- ')}`);
  return { resolvedManifest, manifest, entries: validated.sort((a, b) => a.item.order - b.item.order) };
}

export function buildReviewContactSheet(manifestPath, options = {}) {
  const validated = validateManifest(manifestPath); // Complete validation happens before any output path is touched.
  const outputPath = path.resolve(options.outputPath ?? path.join('.tmp', 'review-contact-sheet', `${validated.manifest.id}.png`));
  const reportPath = path.resolve(options.reportPath ?? outputPath.replace(/\.png$/i, '.json'));
  if (outputPath === reportPath) throw new Error('PNG output and JSON report paths must differ');
  const protectedPaths = new Set([validated.resolvedManifest, ...validated.entries.map((entry) => entry.imagePath)]);
  if (protectedPaths.has(outputPath) || protectedPaths.has(reportPath)) throw new Error('Output paths must not overwrite the manifest or an input PNG');

  const sheet = { width: CONTACT_SHEET.width, height: CONTACT_SHEET.height, colorType: 6, data: new Uint8Array(CONTACT_SHEET.width * CONTACT_SHEET.height * 4) };
  fillRect(sheet, 0, 0, sheet.width, sheet.height, COLORS.background);
  drawCenteredText(sheet, 'ELDORIA BATCH A ANCHORS', sheet.width / 2, 10, 3, COLORS.text);
  drawCenteredText(sheet, 'EXACT RUNTIME PIXELS AT UNIFORM 8X', sheet.width / 2, 38, 2, COLORS.muted);

  for (const slot of SLOTS) {
    const row = ROWS[slot.row];
    fillRect(sheet, slot.cardLeft, row.cardTop, slot.cardRight - slot.cardLeft, row.cardBottom - row.cardTop, COLORS.card);
    strokeRect(sheet, slot.cardLeft, row.cardTop, slot.cardRight - slot.cardLeft, row.cardBottom - row.cardTop, COLORS.border);
    const stageLeft = slot.centerX - 128;
    for (let y = row.stageTop; y < row.stageBottom; y += 16) for (let x = stageLeft; x < stageLeft + 256; x += 16) {
      fillRect(sheet, x, y, 16, 16, (((x - stageLeft) / 16) + ((y - row.stageTop) / 16)) % 2 === 0 ? COLORS.checkerA : COLORS.checkerB);
    }
    fillRect(sheet, stageLeft, row.baselineY, 256, 1, COLORS.baseline);
  }

  const itemGeometry = [];
  for (const entry of validated.entries) {
    const slot = SLOTS[entry.item.slot];
    const row = ROWS[slot.row];
    const left = slot.centerX - entry.item.pivot[0] * CONTACT_SHEET.scale;
    const top = row.baselineY - entry.item.pivot[1] * CONTACT_SHEET.scale;
    const right = left + entry.image.width * CONTACT_SHEET.scale;
    const bottom = top + entry.image.height * CONTACT_SHEET.scale;
    const stageLeft = slot.centerX - 128;
    if (left < stageLeft || right > stageLeft + 256 || top < row.stageTop || bottom > row.stageBottom) {
      throw new Error(`Slot ${entry.item.slot} cannot contain ${entry.item.id}/${entry.item.variant} at uniform 8x with its declared pivot`);
    }
    compositeScaled(sheet, entry.image, left, top, CONTACT_SHEET.scale);
    drawCenteredText(sheet, entry.item.label, slot.centerX, row.labelTop, 2, COLORS.text);
    itemGeometry.push({
      slot: entry.item.slot,
      order: entry.item.order,
      id: entry.item.id,
      variant: entry.item.variant,
      label: entry.item.label,
      approvalVerdict: entry.item.approvalVerdict,
      source: portable(path.dirname(validated.resolvedManifest), entry.imagePath),
      dimensions: entry.item.dimensions,
      pivot: entry.item.pivot,
      sha256: entry.actualHash,
      row: slot.row,
      scaledBounds: [left, top, right - left, bottom - top],
      pivotSheetPx: [slot.centerX, row.baselineY]
    });
  }

  drawCenteredText(sheet, 'REVIEW ONLY - NOT PACKED OR RUNTIME INTEGRATED - NO DEVICE OR CHILD CLAIM', sheet.width / 2, 1042, 1, COLORS.muted);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  writePng(outputPath, sheet);
  const report = {
    version: 1,
    id: validated.manifest.id,
    manifest: portable(process.cwd(), validated.resolvedManifest),
    output: portable(process.cwd(), outputPath),
    geometry: {
      dimensions: [CONTACT_SHEET.width, CONTACT_SHEET.height],
      nearestNeighborScale: CONTACT_SHEET.scale,
      rows: ROWS,
      slots: SLOTS,
      items: itemGeometry
    },
    hashes: {
      outputSha256: sha256(outputPath),
      inputs: itemGeometry.map(({ id, variant, sha256: hash }) => ({ id, variant, sha256: hash }))
    },
    claims: CLAIMS
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Review contact sheet generated: ${outputPath} (${CONTACT_SHEET.width}x${CONTACT_SHEET.height}, ${itemGeometry.length} assets at ${CONTACT_SHEET.scale}x)`);
  return { outputPath, reportPath, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.manifest || !args.out) throw new Error('Usage: node scripts/build-review-contact-sheet.mjs --manifest <path> --out <png> [--report <json>]');
    buildReviewContactSheet(args.manifest, { outputPath: args.out, reportPath: args.report });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
