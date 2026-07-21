import { describe, expect, it } from 'vitest';
import {
  blipShouldPlay,
  computeBlipIndices,
  DEFAULT_BLIP_THROTTLE,
  isBlipEligible
} from '../../src/systems/textBlips';

describe('computeBlipIndices', () => {
  it('skips whitespace and terminal punctuation, blipping every 2nd voiced glyph', () => {
    // "Hi, there!" — eligible glyphs (skip space, comma, '!'):
    // index: 0 H, 1 i, 4 t, 5 h, 6 e, 7 r, 8 e   (2 ',', 3 ' ', 9 '!' skipped)
    // every 2nd eligible → the 1st, 3rd, 5th, 7th eligible = H, t, e, e
    expect([...computeBlipIndices('Hi, there!')].sort((a, b) => a - b)).toEqual([0, 4, 6, 8]);
  });

  it('keeps a steady cadence across a space rather than desyncing on raw index', () => {
    // "ab cd" — eligible: 0 a, 1 b, 3 c, 4 d (index 2 is a space, skipped).
    // every 2nd eligible → 1st (a@0) and 3rd (c@3).
    expect([...computeBlipIndices('ab cd')].sort((a, b) => a - b)).toEqual([0, 3]);
  });

  it('honors a custom throttle (every glyph when throttle=1)', () => {
    expect([...computeBlipIndices('cat', 1)].sort((a, b) => a - b)).toEqual([0, 1, 2]);
    // throttle 3 over 5 letters → 1st and 4th eligible.
    expect([...computeBlipIndices('abcde', 3)].sort((a, b) => a - b)).toEqual([0, 3]);
  });

  it('is empty for all-silent input and total for arbitrary strings', () => {
    expect(computeBlipIndices('   .,!?').size).toBe(0);
    expect(computeBlipIndices('').size).toBe(0);
  });

  it('falls back to the default throttle for invalid values', () => {
    expect(computeBlipIndices('abcd', 0)).toEqual(computeBlipIndices('abcd', DEFAULT_BLIP_THROTTLE));
    expect(computeBlipIndices('abcd', -2)).toEqual(computeBlipIndices('abcd', DEFAULT_BLIP_THROTTLE));
    expect(computeBlipIndices('abcd', 1.5)).toEqual(computeBlipIndices('abcd', DEFAULT_BLIP_THROTTLE));
  });

  it('classifies eligibility correctly', () => {
    expect(isBlipEligible('a')).toBe(true);
    expect(isBlipEligible('5')).toBe(true);
    for (const silent of [' ', '\n', '.', ',', '!', '?', '—', '“']) {
      expect(isBlipEligible(silent)).toBe(false);
    }
  });
});

describe('blipShouldPlay', () => {
  const indices = computeBlipIndices('Hi, there!'); // {0,4,6,8}

  it('plays only on emit indices when the line is not TTS-voiced', () => {
    expect(blipShouldPlay(0, indices, false)).toBe(true);
    expect(blipShouldPlay(4, indices, false)).toBe(true);
    expect(blipShouldPlay(1, indices, false)).toBe(false); // 'i' — not an emit index
    expect(blipShouldPlay(3, indices, false)).toBe(false); // space
  });

  it('suppresses every blip while the line is TTS-voiced (one voice per line)', () => {
    for (const index of indices) {
      expect(blipShouldPlay(index, indices, true)).toBe(false);
    }
  });
});
