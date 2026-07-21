import { describe, expect, it } from 'vitest';
import {
  blipShouldPlay,
  computeBlipIndices,
  createBlipEmitter,
  DEFAULT_BLIP_THROTTLE,
  isBlipEligible,
  TEXT_BLIP_COOLDOWN_MS,
  TYPEWRITER_MS_PER_CHAR
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

describe('createBlipEmitter (production-path wiring)', () => {
  // These stand in for the DialogueBox reveal loop without a Phaser scene: the
  // emitter is exactly what DialogueBox.onTypewriterCharacter delegates to, so
  // driving it with reveal indices proves the shipped behavior, not a re-derivation.
  function driveFullReveal(text: string, voiced: boolean): number[] {
    const played: number[] = [];
    let cursor = 0;
    const emitter = createBlipEmitter(text, { voiced, play: () => played.push(cursor) });
    for (cursor = 0; cursor < text.length; cursor += 1) emitter.onReveal(cursor);
    return played;
  }

  it('fires the injected player on exactly the emitted glyphs of a non-voiced line', () => {
    // 'Hi, there!' emits at {0,4,6,8}; the reveal walks every index 0..9.
    expect(driveFullReveal('Hi, there!', false)).toEqual([0, 4, 6, 8]);
  });

  it('plays nothing when the line is TTS-voiced (Mage autoRead is the voice)', () => {
    expect(driveFullReveal('Hi, there!', true)).toEqual([]);
  });

  it('stops emitting when a line is completed early (child taps to finish)', () => {
    // Reveal only the first 5 of 10 chars, as an ACTION-to-complete would: the
    // loop stops feeding onReveal, so only the prefix's blips ({0,4}) fire.
    const played: number[] = [];
    let at = 0;
    const emitter = createBlipEmitter('Hi, there!', { voiced: false, play: () => played.push(at) });
    for (at = 0; at < 5; at += 1) emitter.onReveal(at);
    expect(played).toEqual([0, 4]); // 6 and 8 never reached — no phantom blips
  });

  it('honors a custom throttle end to end', () => {
    const played: number[] = [];
    let i = 0;
    const emitter = createBlipEmitter('abcde', { voiced: false, throttle: 1, play: () => played.push(i) });
    for (i = 0; i < 5; i += 1) emitter.onReveal(i);
    expect(played).toEqual([0, 1, 2, 3, 4]); // throttle 1 = every glyph
  });
});

describe('audible cadence == documented cadence (cooldown timeline)', () => {
  // Replays the reveal on the real clock: char i lands at i × TYPEWRITER_MS_PER_CHAR,
  // and the scene's per-key cooldown drops any blip requested within cooldownMs of
  // the last one that played. This is the combined reveal+cooldown timeline the
  // review asked for — it proves what a player actually hears.
  function audibleIndices(text: string, cooldownMs: number, throttle = DEFAULT_BLIP_THROTTLE): number[] {
    const emitted = [...computeBlipIndices(text, throttle)].sort((a, b) => a - b);
    const audible: number[] = [];
    let lastPlayedAt = Number.NEGATIVE_INFINITY;
    for (const index of emitted) {
      const t = index * TYPEWRITER_MS_PER_CHAR;
      if (t - lastPlayedAt >= cooldownMs) {
        audible.push(index);
        lastPlayedAt = t;
      }
    }
    return audible;
  }

  it('keeps the cooldown strictly below the minimum blip spacing', () => {
    // The tightest gap between two emitted blips is throttle × ms/char (adjacent
    // eligible glyphs). The dedicated cooldown must clear it or blips are lost.
    expect(TEXT_BLIP_COOLDOWN_MS).toBeLessThan(DEFAULT_BLIP_THROTTLE * TYPEWRITER_MS_PER_CHAR);
  });

  it('plays every emitted blip at the dedicated 40ms cooldown (audible == every 2nd glyph)', () => {
    for (const text of ['adventurer', 'Welcome to Eldoria', 'aaaaaaaaaa']) {
      expect(audibleIndices(text, TEXT_BLIP_COOLDOWN_MS)).toEqual(
        [...computeBlipIndices(text)].sort((a, b) => a - b)
      );
    }
  });

  it('documents the bug the fix closes: the old 90ms cooldown halved a dense run', () => {
    // 'aaaaaaaaaa' emits at {0,2,4,6,8}; at 90ms only ~every other one survives,
    // so the audible cadence collapsed to ~every 4th glyph.
    const emitted = [...computeBlipIndices('aaaaaaaaaa')].sort((a, b) => a - b);
    const audibleOld = audibleIndices('aaaaaaaaaa', 90);
    expect(emitted).toEqual([0, 2, 4, 6, 8]);
    expect(audibleOld).toEqual([0, 4, 8]); // gaps of 2 chars (48ms) dropped under 90ms
    expect(audibleOld.length).toBeLessThan(emitted.length);
  });
});
