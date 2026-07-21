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
// Derive-over-generate production classes (PR #123 adjudication): anchor =
// genuinely new identity/silhouette/material; derived = deterministic
// recombination of locked approved inputs; procedural = runtime presentation
// without an independent generated source-art family. Optional per target;
// absent means unclassified legacy and remains valid.
const productionClasses = new Set(['anchor', 'derived', 'procedural']);

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
    targetPaletteRequests: [],
    palettes: [],
    deferredPaletteFamilyReferences: [],
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

  if (hasOwn(target, 'productionClass')
    && (typeof target.productionClass !== 'string' || !productionClasses.has(target.productionClass))) {
    addError(ctx, filePath, targetId, 'productionClass must equal one of anchor, derived, procedural');
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

  if (hasOwn(target, 'paletteFamilies')) {
    if (!Array.isArray(target.paletteFamilies) || target.paletteFamilies.length === 0) {
      addError(ctx, filePath, targetId, 'paletteFamilies must be a non-empty array when present');
    } else {
      const seen = new Set();
      const validFamilies = [];
      target.paletteFamilies.forEach((family, familyIndex) => {
        if (typeof family !== 'string' || !idPattern.test(family)) {
          addError(ctx, filePath, targetId, `paletteFamilies[${familyIndex}] must be a lowercase identifier`);
        } else if (seen.has(family)) {
          addError(ctx, filePath, targetId, `paletteFamilies contains duplicate family ${family}`);
        } else {
          seen.add(family);
          validFamilies.push(family);
        }
      });
      if (validFamilies.length > 0) {
        ctx.targetPaletteRequests.push({ filePath, targetId, atlasFamily: target.atlasFamily, families: validFamilies });
      }
    }
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
  'version', 'sourceContract', 'paletteId', 'displayName', 'status', 'lightDirection', 'provenance', 'notes',
  'appliesToAtlasFamilies', 'deferredContractFamilies'
]);

// Known object-shaped fields that are descriptive metadata, not a swatch
// group — their values are plain strings, not hex-swatch arrays, so they
// are explicitly excluded from the generic swatch-group scan below instead
// of being validated (and rejected) as one.
const PALETTE_NON_SWATCH_OBJECT_FIELDS = new Set(['contractFamilyMapping', 'familyAliases']);

export function validatePalette(ctx, filePath, document) {
  ctx.paletteCount += 1;
  const paletteId = typeof document.paletteId === 'string' ? document.paletteId : 'palette';
  const directFamilies = new Set();
  const aliases = new Map();
  const deferredFamilies = new Set();
  const atlasFamilies = new Set();

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
    for (const family of Object.keys(document.families)) {
      if (!family.startsWith('_') && idPattern.test(family)) directFamilies.add(family);
    }
  }

  if (!Array.isArray(document.appliesToAtlasFamilies) || document.appliesToAtlasFamilies.length === 0) {
    addError(ctx, filePath, paletteId, 'appliesToAtlasFamilies must be a non-empty array');
  } else {
    document.appliesToAtlasFamilies.forEach((atlasFamily, index) => {
      if (typeof atlasFamily !== 'string' || !idPattern.test(atlasFamily)) {
        addError(ctx, filePath, paletteId, `appliesToAtlasFamilies[${index}] must be a lowercase identifier`);
      } else if (atlasFamilies.has(atlasFamily)) {
        addError(ctx, filePath, paletteId, `appliesToAtlasFamilies contains duplicate atlas family ${atlasFamily}`);
      } else {
        atlasFamilies.add(atlasFamily);
      }
    });
  }

  if (hasOwn(document, 'familyAliases')) {
    if (!document.familyAliases || typeof document.familyAliases !== 'object' || Array.isArray(document.familyAliases)) {
      addError(ctx, filePath, paletteId, 'familyAliases must be an object when present');
    } else {
      for (const [alias, destination] of Object.entries(document.familyAliases)) {
        if (!idPattern.test(alias)) {
          addError(ctx, filePath, paletteId, `familyAliases key ${alias} must be a lowercase identifier`);
          continue;
        }
        if (typeof destination !== 'string' || !idPattern.test(destination)) {
          addError(ctx, filePath, paletteId, `familyAliases.${alias} must be a lowercase family identifier`);
          continue;
        }
        if (!directFamilies.has(destination)) {
          addError(ctx, filePath, paletteId, `familyAliases.${alias} references missing direct family ${destination}`);
        } else if (directFamilies.has(alias)) {
          addError(ctx, filePath, paletteId, `familyAliases.${alias} must not shadow a direct family`);
        } else {
          aliases.set(alias, destination);
        }
      }
    }
  }

  if (hasOwn(document, 'deferredContractFamilies')) {
    if (!Array.isArray(document.deferredContractFamilies) || document.deferredContractFamilies.length === 0) {
      addError(ctx, filePath, paletteId, 'deferredContractFamilies must be a non-empty array when present');
    } else {
      const seen = new Set();
      document.deferredContractFamilies.forEach((family, index) => {
        if (typeof family !== 'string' || !idPattern.test(family)) {
          addError(ctx, filePath, paletteId, `deferredContractFamilies[${index}] must be a lowercase identifier`);
        } else if (seen.has(family)) {
          addError(ctx, filePath, paletteId, `deferredContractFamilies contains duplicate family ${family}`);
        } else {
          seen.add(family);
          deferredFamilies.add(family);
        }
      });
    }
  }

  for (const [field, value] of Object.entries(document)) {
    if (field === 'families' || PALETTE_METADATA_FIELDS.has(field) || PALETTE_NON_SWATCH_OBJECT_FIELDS.has(field)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    validateSwatchGroup(ctx, filePath, paletteId, field, value);
  }

  for (const family of deferredFamilies) {
    if (directFamilies.has(family) || aliases.has(family)) {
      addError(ctx, filePath, paletteId, `deferredContractFamilies family ${family} overlaps a direct family or alias`);
    }
  }

  ctx.palettes.push({ filePath, paletteId, atlasFamilies, directFamilies, aliases, deferredFamilies });
}

function reconcileScopedPalettes(ctx) {
  const claims = new Map();
  for (const palette of ctx.palettes) {
    for (const atlasFamily of palette.atlasFamilies) {
      const claimants = claims.get(atlasFamily) ?? [];
      claimants.push(palette);
      claims.set(atlasFamily, claimants);
    }
  }

  for (const [atlasFamily, claimants] of claims) {
    if (claimants.length < 2) continue;
    const sorted = [...claimants].sort((a, b) => `${a.paletteId}:${fileLabel(a.filePath)}`.localeCompare(`${b.paletteId}:${fileLabel(b.filePath)}`));
    addError(
      ctx,
      sorted[0].filePath,
      sorted[0].paletteId,
      `atlas family ${atlasFamily} is claimed by multiple palettes: ${sorted.map((palette) => palette.paletteId).join(', ')}`
    );
  }

  for (const request of ctx.targetPaletteRequests) {
    const applicable = claims.get(request.atlasFamily) ?? [];
    if (applicable.length === 0) continue;
    if (applicable.length > 1) {
      addError(ctx, request.filePath, request.targetId, `palette scope for atlas family ${request.atlasFamily} is ambiguous`);
      continue;
    }
    const palette = applicable[0];
    for (const family of request.families) {
      if (palette.deferredFamilies.has(family)) {
        ctx.deferredPaletteFamilyReferences.push({ ...request, family, paletteId: palette.paletteId });
      } else if (!palette.directFamilies.has(family) && !palette.aliases.has(family)) {
        addError(ctx, request.filePath, request.targetId, `paletteFamilies references unresolved family ${family} for atlas family ${request.atlasFamily}`);
      }
    }
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

  reconcileScopedPalettes(ctx);

  return {
    errors: ctx.errors,
    jsonFiles,
    targetCount: ctx.targetCount,
    paletteCount: ctx.paletteCount,
    deferredPaletteFamilyReferences: ctx.deferredPaletteFamilyReferences
  };
}

/** Test-only entry point: validates a single in-memory palette document without touching disk. */
export function validatePaletteDocument(document, filePath = '<test palette>') {
  const ctx = createValidationContext();
  validatePalette(ctx, filePath, document);
  reconcileScopedPalettes(ctx);
  return ctx.errors;
}

/** Test-only entry point for optional target palette-family metadata and palette alias resolution. */
export function validateTargetPaletteFamiliesDocument(target, palette, filePath = '<test target>') {
  const ctx = createValidationContext();
  validatePalette(ctx, '<test palette>', palette);
  validateTarget(ctx, filePath, target, 0);
  reconcileScopedPalettes(ctx);
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
