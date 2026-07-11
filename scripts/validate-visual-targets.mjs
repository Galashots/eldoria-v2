import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const targetDirectory = resolve('docs/visual-targets');
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
const hexPattern = /^#[0-9a-fA-F]{6}$/;
const errors = [];
const targetLocations = new Map();
const references = [];
let targetCount = 0;
let paletteCount = 0;

function fileLabel(filePath) {
  return relative(process.cwd(), filePath).replaceAll('\\', '/');
}

function addError(filePath, targetId, message) {
  const targetLabel = targetId ? ` [${targetId}]` : '';
  errors.push(`${fileLabel(filePath)}${targetLabel}: ${message}`);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isNumberPair(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every((entry) => Number.isFinite(entry));
}

function validateClip(filePath, targetId, clip, index) {
  if (!clip || typeof clip !== 'object' || Array.isArray(clip)) {
    addError(filePath, targetId, `requiredClips[${index}] must be an object`);
    return;
  }

  if (typeof clip.name !== 'string' || clip.name.length === 0) {
    addError(filePath, targetId, `requiredClips[${index}].name must be a non-empty string`);
  }
  if (!isNumberPair(clip.frames) || clip.frames[0] > clip.frames[1]) {
    addError(filePath, targetId, `requiredClips[${index}].frames must be [min, max] with min <= max`);
  }
  if (typeof clip.loop !== 'boolean') {
    addError(filePath, targetId, `requiredClips[${index}].loop must be a boolean`);
  }
}

function validateTarget(filePath, target, index) {
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    addError(filePath, null, `targets[${index}] must be an object`);
    return;
  }

  const targetId = typeof target.id === 'string' ? target.id : `targets[${index}]`;
  targetCount += 1;

  for (const field of targetFields) {
    if (!hasOwn(target, field)) addError(filePath, targetId, `missing required field ${field}`);
  }

  if (typeof target.id !== 'string' || !idPattern.test(target.id)) {
    addError(filePath, targetId, 'id must be lowercase snake_case');
  } else if (targetLocations.has(target.id)) {
    addError(filePath, targetId, `duplicate id; first declared in ${targetLocations.get(target.id)}`);
  } else {
    targetLocations.set(target.id, fileLabel(filePath));
  }

  if (hasOwn(target, 'status') && target.status !== 'target_only') {
    addError(filePath, targetId, 'status must equal target_only');
  }
  if (hasOwn(target, 'category') && (typeof target.category !== 'string' || target.category.length === 0)) {
    addError(filePath, targetId, 'category must be a non-empty string');
  }

  for (const field of ['canvasPx', 'footprintPx', 'pivotPx']) {
    if (hasOwn(target, field) && !isNumberPair(target[field])) {
      addError(filePath, targetId, `${field} must contain exactly two finite numbers`);
    }
  }

  if (hasOwn(target, 'ppu') && target.ppu !== 16) addError(filePath, targetId, 'ppu must equal 16');
  if (hasOwn(target, 'runtimeExport') && target.runtimeExport !== 'png') {
    addError(filePath, targetId, 'runtimeExport must equal png');
  }
  if (hasOwn(target, 'preferredSource') && target.preferredSource !== 'aseprite') {
    addError(filePath, targetId, 'preferredSource must equal aseprite');
  }
  if (hasOwn(target, 'atlasFamily') && (typeof target.atlasFamily !== 'string' || target.atlasFamily.length === 0)) {
    addError(filePath, targetId, 'atlasFamily must be a non-empty string');
  }

  if (hasOwn(target, 'notes')) {
    const notesValid = Array.isArray(target.notes)
      && target.notes.length > 0
      && target.notes.some((note) => typeof note === 'string'
        && (note.includes('Specification only') || note.includes('No runtime behavior')));
    if (!notesValid) {
      addError(filePath, targetId, 'notes must be non-empty and include spec-only or no-runtime wording');
    }
  }

  if (target.collision && hasOwn(target.collision, 'hitboxes') && !Array.isArray(target.collision.hitboxes)) {
    addError(filePath, targetId, 'collision.hitboxes must be an array');
  }
  if (target.gameplayPolicy && hasOwn(target.gameplayPolicy, 'learningGate')
    && target.gameplayPolicy.learningGate !== 'never') {
    addError(filePath, targetId, 'gameplayPolicy.learningGate must equal never');
  }

  if (hasOwn(target, 'requiredClips')) {
    if (!Array.isArray(target.requiredClips)) {
      addError(filePath, targetId, 'requiredClips must be an array');
    } else {
      target.requiredClips.forEach((clip, clipIndex) => validateClip(filePath, targetId, clip, clipIndex));
    }
  }

  if (hasOwn(target, 'syncClips')) {
    const syncClipsValid = Array.isArray(target.syncClips)
      && target.syncClips.length > 0
      && target.syncClips.every((clip) => typeof clip === 'string' && clip.length > 0);
    if (!syncClipsValid) addError(filePath, targetId, 'syncClips must be a non-empty string array');
  }

  if (hasOwn(target, 'inheritsTarget')) {
    references.push({ filePath, targetId, field: 'inheritsTarget', value: target.inheritsTarget });
  }
}

function validateHexArray(filePath, paletteId, label, swatches) {
  if (!Array.isArray(swatches) || swatches.length === 0) {
    addError(filePath, paletteId, `${label} must be a non-empty array of #rrggbb hex strings`);
    return;
  }
  swatches.forEach((hex, index) => {
    if (typeof hex !== 'string' || !hexPattern.test(hex)) {
      addError(filePath, paletteId, `${label}[${index}] must be a #rrggbb hex string`);
    }
  });
}

function validatePalette(filePath, document) {
  paletteCount += 1;
  const paletteId = typeof document.paletteId === 'string' ? document.paletteId : 'palette';

  if (typeof document.paletteId !== 'string' || !idPattern.test(document.paletteId)) {
    addError(filePath, paletteId, 'paletteId must be lowercase snake_case');
  }
  if (document.status !== 'locked') {
    addError(filePath, paletteId, 'status must equal locked');
  }
  if (!document.families || typeof document.families !== 'object' || Array.isArray(document.families)
    || Object.keys(document.families).length === 0) {
    addError(filePath, paletteId, 'families must be a non-empty object');
  } else {
    for (const [familyName, swatches] of Object.entries(document.families)) {
      validateHexArray(filePath, paletteId, `families.${familyName}`, swatches);
    }
  }

  if (hasOwn(document, 'wildbloomAccents')) {
    const accents = document.wildbloomAccents;
    if (!accents || typeof accents !== 'object' || Array.isArray(accents)) {
      addError(filePath, paletteId, 'wildbloomAccents must be an object');
    } else {
      for (const [key, value] of Object.entries(accents)) {
        if (key.startsWith('_')) continue; // metadata keys such as _source
        validateHexArray(filePath, paletteId, `wildbloomAccents.${key}`, value);
      }
    }
  }
}

function collectTopLevelReference(filePath, document, field) {
  if (hasOwn(document, field)) {
    references.push({ filePath, targetId: null, field, value: document[field] });
  }
}

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
    addError(filePath, null, `invalid JSON: ${error.message}`);
    continue;
  }

  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    addError(filePath, null, 'top level must be an object');
    continue;
  }
  if (document.version !== 1) addError(filePath, null, 'version must equal 1');
  if (document.sourceContract !== expectedSourceContract) {
    addError(filePath, null, `sourceContract must equal ${expectedSourceContract}`);
  }

  if (hasOwn(document, 'targets')) {
    if (!Array.isArray(document.targets) || document.targets.length === 0) {
      addError(filePath, null, 'targets must be a non-empty array');
    } else {
      document.targets.forEach((target, index) => validateTarget(filePath, target, index));
    }
  }

  if (hasOwn(document, 'paletteId')) validatePalette(filePath, document);

  collectTopLevelReference(filePath, document, 'baseTarget');
  collectTopLevelReference(filePath, document, 'inheritsTarget');
}

for (const reference of references) {
  if (typeof reference.value !== 'string' || reference.value.length === 0) {
    addError(reference.filePath, reference.targetId, `${reference.field} must be a non-empty target ID`);
  } else if (!targetLocations.has(reference.value)) {
    addError(reference.filePath, reference.targetId, `${reference.field} references missing target ${reference.value}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Visual target validation passed: ${jsonFiles.length} files, ${targetCount} targets, ${paletteCount} palettes.`);
}
