#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { collectVisualTargetErrors, validatePaletteDocument, validateTargetPaletteFamiliesDocument } from './validate-visual-targets.mjs';

function basePalette(overrides = {}) {
  return {
    version: 1,
    sourceContract: 'docs/VISUAL_ASSET_CONTRACT.md',
    paletteId: 'test_palette_v1',
    displayName: 'Test Palette v1',
    status: 'locked',
    appliesToAtlasFamilies: ['environment_farm'],
    lightDirection: 'upper_left',
    provenance: 'test fixture',
    families: {
      forest: ['#0A3521', '#174F1D']
    },
    notes: ['Specification only; no art is included.'],
    ...overrides
  };
}

function baseTarget(overrides = {}) {
  return {
    id: 'test_target',
    status: 'target_only',
    category: 'env',
    canvasPx: [16, 16],
    footprintPx: [16, 16],
    pivotPx: [8, 15],
    ppu: 16,
    runtimeExport: 'png',
    preferredSource: 'aseprite',
    atlasFamily: 'environment_farm',
    notes: ['Specification only; no art is included.'],
    ...overrides
  };
}

{
  // The real, committed farm environment palette must pass validation
  // end-to-end (including its contractFamilyMapping descriptive-metadata
  // field and its wildbloomAccents swatch group).
  const result = await collectVisualTargetErrors(path.resolve('docs/visual-targets'));
  assert.deepEqual(result.errors, [], `expected the real visual-target docs to validate cleanly, got: ${result.errors.join('; ')}`);
  assert.ok(result.paletteCount >= 1, 'expected at least one palette to be validated');
  assert.deepEqual(
    [...new Set(result.deferredPaletteFamilyReferences.map((reference) => reference.family))].sort(),
    ['ui_neutral'],
    'remaining scoped farm families without swatches must be reported as deferred rather than falsely resolved'
  );
}

{
  const palette = basePalette({ familyAliases: { arcane: 'forest' } });
  const errors = validatePaletteDocument(palette);
  assert.deepEqual(errors, [], `familyAliases must be treated as executable metadata, not a swatch group: ${errors.join('; ')}`);
}

{
  const palette = basePalette({ familyAliases: { arcane: 'missing_family' } });
  const errors = validatePaletteDocument(palette);
  assert.ok(errors.some((error) => error.includes('familyAliases.arcane references missing direct family missing_family')));
}

{
  const malformedKey = validatePaletteDocument(basePalette({ familyAliases: { Arcane: 'forest' } }));
  assert.ok(malformedKey.some((error) => error.includes('familyAliases key Arcane')));
  const malformedDestination = validatePaletteDocument(basePalette({ familyAliases: { arcane: 'Forest' } }));
  assert.ok(malformedDestination.some((error) => error.includes('familyAliases.arcane must be a lowercase family identifier')));
  const shadow = validatePaletteDocument(basePalette({ familyAliases: { forest: 'forest' } }));
  assert.ok(shadow.some((error) => error.includes('must not shadow a direct family')));
}

{
  const palette = basePalette({ deferredContractFamilies: ['ruins', 'ui_neutral'] });
  assert.deepEqual(validatePaletteDocument(palette), []);
  assert.deepEqual(validateTargetPaletteFamiliesDocument(baseTarget({ paletteFamilies: ['ruins'] }), palette), []);
  const duplicate = validatePaletteDocument(basePalette({ deferredContractFamilies: ['ruins', 'ruins'] }));
  assert.ok(duplicate.some((error) => error.includes('deferredContractFamilies contains duplicate family ruins')));
  const malformed = validatePaletteDocument(basePalette({ deferredContractFamilies: ['UI Neutral'] }));
  assert.ok(malformed.some((error) => error.includes('deferredContractFamilies[0] must be a lowercase identifier')));
  const overlap = validatePaletteDocument(basePalette({ deferredContractFamilies: ['forest'] }));
  assert.ok(overlap.some((error) => error.includes('overlaps a direct family or alias')));
}

{
  const palette = basePalette({ familyAliases: { arcane: 'forest' } });
  assert.deepEqual(
    validateTargetPaletteFamiliesDocument(baseTarget({ paletteFamilies: ['forest', 'arcane'] }), palette),
    [],
    'direct family names and one-hop aliases must resolve'
  );
  assert.deepEqual(
    validateTargetPaletteFamiliesDocument(baseTarget(), palette),
    [],
    'paletteFamilies remains optional'
  );
}

{
  const palette = basePalette();
  assert.deepEqual(
    validateTargetPaletteFamiliesDocument(baseTarget({ atlasFamily: 'characters', paletteFamilies: ['arcane'] }), palette),
    [],
    'a target with no applicable palette receives syntax validation only; farm aliases must not leak into characters'
  );
  const scopedUnknown = validateTargetPaletteFamiliesDocument(
    baseTarget({ atlasFamily: 'environment_farm', paletteFamilies: ['unknown_family'] }),
    palette
  );
  assert.ok(scopedUnknown.some((error) => error.includes('unresolved family unknown_family for atlas family environment_farm')));
}

{
  const missing = validatePaletteDocument(basePalette({ appliesToAtlasFamilies: undefined }));
  assert.ok(missing.some((error) => error.includes('appliesToAtlasFamilies must be a non-empty array')));
  const malformed = validatePaletteDocument(basePalette({ appliesToAtlasFamilies: ['Environment Farm'] }));
  assert.ok(malformed.some((error) => error.includes('appliesToAtlasFamilies[0] must be a lowercase identifier')));
  const duplicate = validatePaletteDocument(basePalette({ appliesToAtlasFamilies: ['environment_farm', 'environment_farm'] }));
  assert.ok(duplicate.some((error) => error.includes('duplicate atlas family environment_farm')));
}

{
  const palette = basePalette({ familyAliases: { arcane: 'forest' } });
  const empty = validateTargetPaletteFamiliesDocument(baseTarget({ paletteFamilies: [] }), palette);
  assert.ok(empty.some((error) => error.includes('paletteFamilies must be a non-empty array')));
  const malformed = validateTargetPaletteFamiliesDocument(baseTarget({ paletteFamilies: ['Forest'] }), palette);
  assert.ok(malformed.some((error) => error.includes('must be a lowercase identifier')));
  const duplicate = validateTargetPaletteFamiliesDocument(baseTarget({ paletteFamilies: ['forest', 'forest'] }), palette);
  assert.ok(duplicate.some((error) => error.includes('duplicate family forest')));
  const unresolved = validateTargetPaletteFamiliesDocument(baseTarget({ paletteFamilies: ['unknown_family'] }), palette);
  assert.ok(unresolved.some((error) => error.includes('unresolved family unknown_family')));
}

{
  // A future top-level swatch group (following the same shape as
  // wildbloomAccents: an object of named hex-swatch arrays, with an
  // underscore-prefixed metadata key) is validated generically with no
  // code change required.
  const palette = basePalette({
    seasonalAccents: {
      _source: 'metadata key, not a swatch — must be ignored',
      autumn: ['#D97B29', '#B85C1F']
    }
  });
  const errors = validatePaletteDocument(palette);
  assert.deepEqual(errors, [], `expected a well-formed future swatch group to pass, got: ${errors.join('; ')}`);
}

{
  // An invalid hex string inside a generically-discovered swatch group fails.
  const palette = basePalette({
    seasonalAccents: {
      autumn: ['#D97B29', 'not-a-hex-color']
    }
  });
  const errors = validatePaletteDocument(palette);
  assert.ok(
    errors.some((e) => e.includes('seasonalAccents.autumn[1]') && e.includes('#rrggbb')),
    `expected a hex-format error for seasonalAccents.autumn[1], got: ${errors.join('; ')}`
  );
}

{
  // A string where a swatch array is expected (the exact malformed shape
  // called out in review — e.g. "root_star": "#FFD666" instead of an
  // array) is an error, not silently skipped.
  const palette = basePalette({
    wildbloomAccents: {
      root_star: '#FFD666'
    }
  });
  const errors = validatePaletteDocument(palette);
  assert.ok(
    errors.some((e) => e.includes('wildbloomAccents.root_star') && e.includes('non-empty array')),
    `expected a non-array-swatch error for wildbloomAccents.root_star, got: ${errors.join('; ')}`
  );
}

{
  // contractFamilyMapping (plain descriptive strings, not hex swatches)
  // remains accepted as non-swatch metadata and produces no errors.
  const palette = basePalette({
    contractFamilyMapping: {
      _note: 'maps environment family names onto contract vocabulary',
      forest: 'forest',
      water: 'arcane (cool water range only)'
    }
  });
  const errors = validatePaletteDocument(palette);
  assert.deepEqual(errors, [], `expected contractFamilyMapping to be accepted as metadata, got: ${errors.join('; ')}`);
}

{
  // families and wildbloomAccents (the two originally-hardcoded fields)
  // continue passing unchanged when well-formed.
  const palette = basePalette({
    wildbloomAccents: {
      _source: 'test',
      root_star: ['#FFD666', '#8FD14F']
    }
  });
  const errors = validatePaletteDocument(palette);
  assert.deepEqual(errors, [], `expected well-formed families + wildbloomAccents to pass, got: ${errors.join('; ')}`);
}

{
  const root = path.resolve('.tmp', 'visual-target-order-test');
  fs.rmSync(root, { recursive: true, force: true });

  const firstPalette = basePalette({ paletteId: 'first_palette' });
  const secondPalette = basePalette({ paletteId: 'second_palette', families: { water: ['#123456'] } });
  const targetDocument = {
    version: 1,
    sourceContract: 'docs/VISUAL_ASSET_CONTRACT.md',
    targets: [baseTarget({ paletteFamilies: ['forest'] })]
  };

  const validateOrder = async (directory, firstPalette, secondPalette) => {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'a_palette.json'), `${JSON.stringify(firstPalette, null, 2)}\n`);
    fs.writeFileSync(path.join(directory, 'b_palette.json'), `${JSON.stringify(secondPalette, null, 2)}\n`);
    fs.writeFileSync(path.join(directory, 'c_target.json'), `${JSON.stringify(targetDocument, null, 2)}\n`);
    return collectVisualTargetErrors(directory);
  };

  const firstOrder = await validateOrder(path.join(root, 'first-order'), firstPalette, secondPalette);
  const reversedOrder = await validateOrder(path.join(root, 'reversed-order'), secondPalette, firstPalette);
  for (const result of [firstOrder, reversedOrder]) {
    assert.equal(result.errors.length, 2, `expected duplicate-scope and target ambiguity errors, got: ${result.errors.join('; ')}`);
    assert.ok(result.errors.some((error) => error.includes('atlas family environment_farm is claimed by multiple palettes: first_palette, second_palette')));
    assert.ok(result.errors.some((error) => error.includes('palette scope for atlas family environment_farm is ambiguous')));
  }
  fs.rmSync(root, { recursive: true, force: true });
}

{
  // productionClass (derive-over-generate policy, PR #123 adjudication):
  // optional; when present it must be exactly one of the three declared
  // production classes. Absent means unclassified legacy and stays valid.
  const palette = basePalette();
  for (const productionClass of ['anchor', 'derived', 'procedural']) {
    assert.deepEqual(
      validateTargetPaletteFamiliesDocument(baseTarget({ productionClass }), palette),
      [],
      `productionClass ${productionClass} must pass`
    );
  }
  assert.deepEqual(
    validateTargetPaletteFamiliesDocument(baseTarget(), palette),
    [],
    'absent productionClass remains valid (unclassified legacy default)'
  );
  const unknown = validateTargetPaletteFamiliesDocument(baseTarget({ productionClass: 'generated' }), palette);
  assert.ok(
    unknown.some((error) => error.includes('productionClass must equal one of anchor, derived, procedural')),
    `expected an invalid productionClass to fail, got: ${unknown.join('; ')}`
  );
  const nonString = validateTargetPaletteFamiliesDocument(baseTarget({ productionClass: ['anchor'] }), palette);
  assert.ok(
    nonString.some((error) => error.includes('productionClass must equal one of anchor, derived, procedural')),
    `expected a non-string productionClass to fail, got: ${nonString.join('; ')}`
  );
}

console.log('Visual target validation test passed.');
