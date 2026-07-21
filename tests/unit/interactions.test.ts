import { describe, expect, it } from 'vitest';
import { resolveInteractionId, getTiledProperty, interactionDisplayName, isInteractionId, INTERACTION_IDS } from '../../src/data/interactions';

describe('isInteractionId guard', () => {
  it('accepts every registered id', () => {
    for (const id of INTERACTION_IDS) {
      expect(isInteractionId(id)).toBe(true);
    }
  });

  it('rejects mistyped, unregistered, and non-string candidates', () => {
    expect(isInteractionId('mria')).toBe(false); // transposition typo
    expect(isInteractionId('Mira')).toBe(false); // display name, not an id
    expect(isInteractionId('crop_bonus')).toBe(false);
    expect(isInteractionId('')).toBe(false);
    expect(isInteractionId(undefined)).toBe(false);
    expect(isInteractionId(null)).toBe(false);
    expect(isInteractionId(42)).toBe(false);
    expect(isInteractionId({ id: 'mira' })).toBe(false);
  });
});

describe('resolveInteractionId fallback', () => {
  it('resolves mapped display names to stable ids', () => {
    expect(resolveInteractionId('Mira')).toBe('mira');
    expect(resolveInteractionId('CropBonus')).toBe('crop-bonus');
    expect(resolveInteractionId('Practice Slime')).toBe('practice-slime');
  });

  it('falls back to generic-bonus for unmapped names', () => {
    expect(resolveInteractionId('Unknown Target')).toBe('generic-bonus');
  });
});

describe('getTiledProperty helper', () => {
  it('extracts values from flat objects', () => {
    const obj = {
      properties: {
        interactionId: 'mira',
        customVal: 42
      }
    };
    expect(getTiledProperty(obj, 'interactionId')).toBe('mira');
    expect(getTiledProperty(obj, 'customVal')).toBe(42);
    expect(getTiledProperty(obj, 'nonexistent')).toBeUndefined();
  });

  it('extracts values from Tiled property array structure', () => {
    const obj = {
      properties: [
        { name: 'interactionId', type: 'string', value: 'practice-slime' },
        { name: 'customVal', type: 'int', value: 100 }
      ]
    };
    expect(getTiledProperty(obj, 'interactionId')).toBe('practice-slime');
    expect(getTiledProperty(obj, 'customVal')).toBe(100);
    expect(getTiledProperty(obj, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined if properties field is missing', () => {
    const obj = {};
    expect(getTiledProperty(obj, 'interactionId')).toBeUndefined();
  });
});

describe('interactionDisplayName', () => {
  it('maps stable ids to kid-friendly display names', () => {
    expect(interactionDisplayName('crop-bonus', 'CropBonus')).toBe('Crop Patch');
    expect(interactionDisplayName('practice-slime', 'Practice Slime')).toBe('Practice Slime');
    expect(interactionDisplayName('mossy-stone', 'MossyStone')).toBe('Mossy Stone');
    expect(interactionDisplayName('mira', 'Mira')).toBe('Mira');
  });

  it('falls back to the target label when no display name is curated', () => {
    expect(interactionDisplayName('generic-bonus', 'Old Crate')).toBe('Old Crate');
  });
});

describe('interactionId decoupling validation', () => {
  it('prefers custom interactionId over display label, enabling display name changes without breaking logic', () => {
    const obj = {
      name: 'Mira the Elder', // Display name changed
      properties: [
        { name: 'interactionId', type: 'string', value: 'mira' }
      ]
    };

    const customId = getTiledProperty(obj, 'interactionId');
    const resolvedId = customId || resolveInteractionId(obj.name);

    // Resolved ID remains 'mira' despite name change
    expect(resolvedId).toBe('mira');
  });
});
