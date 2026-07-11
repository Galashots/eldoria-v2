#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { collectVisualTargetErrors, validatePaletteDocument } from './validate-visual-targets.mjs';

function basePalette(overrides = {}) {
  return {
    version: 1,
    sourceContract: 'docs/VISUAL_ASSET_CONTRACT.md',
    paletteId: 'test_palette_v1',
    displayName: 'Test Palette v1',
    status: 'locked',
    lightDirection: 'upper_left',
    provenance: 'test fixture',
    families: {
      forest: ['#0A3521', '#174F1D']
    },
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

console.log('Visual target validation test passed.');
