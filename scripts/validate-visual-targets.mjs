import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HEX_COLOR_PATTERN } from './lib/hex-color.mjs';

const expectedSourceContract = 'docs/VISUAL_ASSET_CONTRACT.md';
const targetFields = [
  'id',
  'status',
  'category',
  'canvasPx',
  'footprintPx',
  'pivotPx',
  'ppu',
  'runtimeExport',
  'preferredSource',
  'atlasFamily',
  'notes'
];
const idPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const hexPattern = HEX_COLOR_PATTERN;

function fileLabel(filePath) {
  return relative(process.cwd(), filePath).replaceAll('\\', '/');
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isNumberPair(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every((entry) => Number.isFinite(entry));
}

// Threads accumulated errors/state through validation instead of closing
// over shared module-level mutable state, so validatePalette/validateTarget
// are safe to call directly (e.g. from tests) without state leaking between
// calls or requiring a real file on disk.
function createValidationContext() {
  return {
    errors: [],
    targetLocations: new Map(),
    references: [],
    targetCount: 0,
    paletteCount: 0
  };
}

function addError(ctx, filePath, targetId, message) {
  const targetLabel = targetId ? ` [${targetId}]` : '';
  ctx.errors.push(`${fileLabel(filePath)}${targetLabel}: ${message}`);
}

function validateClip(ctx, filePath, targetId, clip, index) {
  if (!clip || typeof clip !== 'object' || Array.isArray(clip)) {
    addError(ctx, filePath, targetId, `requiredClips[${index}] must be an object`);
    return;
  }

  if (typeof clip.name !== 'string' || clip.name.length === 0) {
    addError(ctx, filePath, targetId, `requiredClips[${index}].name must be a non-empty string`);
  }
  if (!isNumberPair(clip.frames) || clip.frames[0] > clip.frames[1]) {
    addError(ctx, filePath, targetId, `requiredClips[${index}].frames must be [min, max] with min <= max`);
  }
  if (typeof clip.loop !== 'boolean') {
    addError(ctx, filePath, targetId, `requiredClips[${index}].loop must be a boolean`);
  }
}

export function validateTarget(ctx, filePath, target, index) {
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    addError(ctx, filePath, null, `targets[${index}] must be an object`);
    return;
  }

  const targetId = typeof target.id === 'string' ? target.id : `targets[${index}]`;
  ctx.targetCount += 1;

  for (const field of targetFields) {
    if (!hasOwn(target, field)) addError(ctx, filePath, targetId, `missing required field ${field}`);
  }

  if (typeof target.id !== 'string' || !idPattern.test(target.id)) {
    addError(ctx, filePath, targetId, 'id must be lowercase snake_case');
  } else if (ctx.targetLocations.has(target.id)) {
    addError(ctx, filePath, targetId, `duplicate id; first declared in ${ctx.targetLocations.get(target.id)}`);
  } else {
    ctx.targetLocations.set(target.id, fileLabel(filePath));
  }

  if (hasOwn(target, 'status') && target.status !== 'target_only') {
    addError(ctx, filePath, targetId, 'status must equal target_only');
  }
  if (hasOwn(target, 'category') && (typeof target.category !== 'string' || target.category.length === 0)) {
    addError(ctx, filePath, targetId, 'category must be a non-empty string');
  }

  for (const field of ['canvasPx', 'footprintPx', 'pivotPx']) {
    if (hasOwn(target, field) && !isNumberPair(target[field])) {
      addError(ctx, filePath, targetId, `${field} must contain exactly two finite numbers`);
    }
  }

  if (hasOwn(target, 'ppu') && target.ppu !== 16) addError(ctx, filePath, targetId, 'ppu must equal 16');
  if (hasOwn(target, 'runtimeExport') && target.runtimeExport !== 'png') {
    addError(ctx, filePath, targetId, 'runtimeExport must equal png');
  }
  if (hasOwn(target, 'preferredSource') && target.preferredSource !== 'aseprite') {
    addError(ctx, filePath, targetId, 'preferredSource must equal aseprite');
  }
  if (hasOwn(target, 'atlasFamily') && (typeof target.atlasFamily !== 'string' || target.atlasFamily.length === 0)) {
    addError(ctx, filePath, targetId, 'atlasFamily must be a non-empty string');
  }

  if (hasOwn(target, 'notes')) {
    const notesValid = Array.isArray(target.notes)
      && target.notes.length > 0
      && target.notes.some((note) => typeof note === 'string'
        && (note.includes('Specification only') || note.includes('No runtime behavior')));
    if (!notesValid) {
      addError(ctx, filePath, targetId, 'notes must be non-empty and include spec-only or no-runtime wording');
    }
  }

  if (target.collision && hasOwn(target.collision, 'hitboxes') && !Array.isArray(target.collision.hitboxes)) {
    addError(ctx, filePath, targetId, 'collision.hitboxes must be an array');
  }
  if (target.gameplayPolicy && hasOwn(target.gameplayPolicy, 'learningGate')
    && target.gameplayPolicy.learningGate !== 'never') {
    addError(ctx, filePath, targetId, 'gameplayPolicy.learningGate must equal never');
  }

  if (hasOwn(target, 'requiredClips')) {
    if (!Array.isArray(target.requiredClips)) {
      addError(ctx, filePath, targetId, 'requiredClips must be an array');
    } else {
      target.requiredClips.forEach((clip, clipIndex) => validateClip(ctx, filePath, targetId, clip, clipIndex));
    }
  }

  if (hasOwn(target, 'syncClips')) {
    const syncClipsValid = Array.isArray(target.syncClips)
      && target.syncClips.length > 0
      && target.syncClips.every((clip) => typeof clip === 'string' && clip.length > 0);
    if (!syncClipsValid) addError(ctx, filePath, targetId, 'syncClips must be a non-empty string array');
  }

  if (hasOwn(target, 'inheritsTarget')) {
    ctx.references.push({ filePath, targetId, field: 'inheritsTarget', value: target.inheritsTarget });
  }
}

function validateHexArray(ctx, filePath, paletteId, label, swatches) {
  if (!Array.isArray(swatches) || swatches.length === 0) {
    addError(ctx, filePath, paletteId, `${label} must be a non-empty array of #rrggbb hex strings`);
    return;
  }
  swatches.forEach((hex, index) => {
    if (typeof hex !== 'string' || !hexPattern.test(hex)) {
      addError(ctx, filePath, paletteId, `${label}[${index}] must be a #rrggbb hex string`);
    }
  });
}

// Any top-level field whose value is a plain object is treated as a swatch
// group: every non-underscore-prefixed entry must be a non-empty array of
// hex strings. This is generic on purpose — a future field following the
// same shape as `wildbloomAccents` (an object of named hex-swatch arrays,
// with optional `_`-prefixed metadata keys such as `_source`) is validated
// automatically instead of silently passing until a matching hardcoded
// branch is added. A non-array entry (other than an underscore-prefixed
// metadata key) is an ERROR, not silently skipped — a malformed swatch like
// `"root_star": "#FFD666"` (a bare string instead of an array) must fail
// validation rather than pass through unnoticed.
function validateSwatchGroup(ctx, filePath, paletteId, groupName, group) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    addError(ctx, filePath, paletteId, `${groupName} must be an object`);
    return;
  }
  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith('_')) continue; // metadata keys such as _source, _note
    if (!Array.isArray(value)) {
      addError(ctx, filePath, paletteId, `${groupName}.${key} must be a non-empty array of #rrggbb hex strings`);
      continue;
    }
    validateHexArray(ctx, filePath, paletteId, `${groupName}.${key}`, value);
  }
}

// Palette document fields with a known, non-swatch shape: string/enum
// metadata already validated individually below.
const PALETTE_METADATA_FIELDS = new Set([
  'version', 'sourceContract', 'paletteId', 'displayName', 'status', 'lightDirection', 'provenance', 'notes'
]);

// Known object-shaped fields that are descriptive metadata, not a swatch
// group — their values are plain strings, not hex-swatch arrays, so they
// are explicitly excluded from the generic swatch-group scan below instead
// of being validated (and rejected) as one.
const PALETTE_NON_SWATCH_OBJECT_FIELDS = new Set(['contractFamilyMapping']);

export function validatePalette(ctx, filePath, document) {
  ctx.paletteCount += 1;
  const paletteId = typeof document.paletteId === 'string' ? document.paletteId : 'palette';

  if (typeof document.paletteId !== 'string' || !idPattern.test(document.paletteId)) {
    addError(ctx, filePath, paletteId, 'paletteId must be lowercase snake_case');
  }
  if (document.status !== 'locked') {
    addError(ctx, filePath, paletteId, 'status must equal locked');
  }
  if (!document.families || typeof document.families !== 'object' || Array.isArray(document.families)
    || Object.keys(document.families).length === 0) {
    addError(ctx, filePath, paletteId, 'families must be a non-empty object');
  } else {
    validateSwatchGroup(ctx, filePath, paletteId, 'families', document.families);
  }

  for (const [field, value] of Object.entries(document)) {
    if (field === 'families' || PALETTE_METADATA_FIELDS.has(field) || PALETTE_NON_SWATCH_OBJECT_FIELDS.has(field)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    validateSwatchGroup(ctx, filePath, paletteId, field, value);
  }
}

function collectTopLevelReference(ctx, filePath, document, field) {
  if (hasOwn(document, field)) {
    ctx.references.push({ filePath, targetId: null, field, value: document[field] });
  }
}

/**
 * Validates every `*.json` file in `targetDirectory` and returns the
 * accumulated result. Pure/side-effect-free (no console output, no
 * process.exitCode) so it can be called directly from tests.
 */
export async function collectVisualTargetErrors(targetDirectory) {
  const ctx = createValidationContext();

  const entries = await readdir(targetDirectory, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(targetDirectory, entry.name))
    .sort();

  for (const filePath of jsonFiles) {
    let document;
    try {
      document = JSON.parse(await readFile(filePath, 'utf8'));
    } catch (error) {
      addError(ctx, filePath, null, `invalid JSON: ${error.message}`);
      continue;
    }

    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      addError(ctx, filePath, null, 'top level must be an object');
      continue;
    }
    if (document.version !== 1) addError(ctx, filePath, null, 'version must equal 1');
    if (document.sourceContract !== expectedSourceContract) {
      addError(ctx, filePath, null, `sourceContract must equal ${expectedSourceContract}`);
    }

    if (hasOwn(document, 'targets')) {
      if (!Array.isArray(document.targets) || document.targets.length === 0) {
        addError(ctx, filePath, null, 'targets must be a non-empty array');
      } else {
        document.targets.forEach((target, index) => validateTarget(ctx, filePath, target, index));
      }
    }

    if (hasOwn(document, 'paletteId')) validatePalette(ctx, filePath, document);

    collectTopLevelReference(ctx, filePath, document, 'baseTarget');
    collectTopLevelReference(ctx, filePath, document, 'inheritsTarget');
  }

  for (const reference of ctx.references) {
    if (typeof reference.value !== 'string' || reference.value.length === 0) {
      addError(ctx, reference.filePath, reference.targetId, `${reference.field} must be a non-empty target ID`);
    } else if (!ctx.targetLocations.has(reference.value)) {
      addError(ctx, reference.filePath, reference.targetId, `${reference.field} references missing target ${reference.value}`);
    }
  }

  return { errors: ctx.errors, jsonFiles, targetCount: ctx.targetCount, paletteCount: ctx.paletteCount };
}

/** Test-only entry point: validates a single in-memory palette document without touching disk. */
export function validatePaletteDocument(document, filePath = '<test palette>') {
  const ctx = createValidationContext();
  validatePalette(ctx, filePath, document);
  return ctx.errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targetDirectory = resolve('docs/visual-targets');
  const result = await collectVisualTargetErrors(targetDirectory);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log(`Visual target validation passed: ${result.jsonFiles.length} files, ${result.targetCount} targets, ${result.paletteCount} palettes.`);
  }
}
