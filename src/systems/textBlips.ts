/**
 * Read-aloud "blip" policy (Council issue #115, D5).
 *
 * A pure, deterministic decision layer for the per-character typewriter blip:
 * given a line of dialogue it returns the exact set of character indices that
 * should emit a soft tick, and given a single reveal it decides whether that
 * tick actually plays. No RNG (the no-non-deterministic-rewards invariant is
 * trivially preserved), no Phaser, no audio — those live in DialogueBox.
 *
 * Design: blips are a *texture that voices the text* for the pre-reader, so
 * they land on spoken glyphs only. Whitespace and terminal punctuation are
 * skipped (they read as pauses, not sounds), and among the remaining eligible
 * glyphs every `throttle`-th one blips so it stays a rhythm rather than a
 * machine-gun. Keying the throttle off the running eligible count (not the raw
 * index) keeps the cadence steady across words instead of desyncing at spaces.
 */

/** Characters that read as a pause, never a voiced tick. */
const SILENT_BLIP_CHARS = new Set([
  ' ', '\t', '\n', '\r',
  '.', ',', '!', '?', ';', ':', '…', '—', '–', '-',
  '"', "'", '’', '“', '”', '(', ')'
]);

export const DEFAULT_BLIP_THROTTLE = 2;

/**
 * Typewriter reveal pacing (ms per character). Single source of truth, imported
 * by DialogueBox for its reveal timer. Exported here (in the Phaser-free policy
 * module) so the cadence↔cooldown invariant below is unit-testable without
 * pulling in the scene.
 */
export const TYPEWRITER_MS_PER_CHAR = 24;

/**
 * Dedicated cooldown for the `sfx-text-blip` key, deliberately *below* the
 * minimum spacing between two emitted blips so the audible cadence equals the
 * documented one (every `DEFAULT_BLIP_THROTTLE`-th voiced glyph).
 *
 * Why this exists: blips route through the scene's per-key SFX cooldown (which
 * defaults to 90ms to stop enthusiastic tap-spam from buzzing). At throttle 2 a
 * blip is emitted every `2 × 24 = 48ms` in a dense word, so the 90ms default
 * would silently swallow every other one — audible ≈ every 4th glyph, not the
 * documented 2nd. A 40ms cooldown clears the 48ms spacing (8ms margin) while
 * still preventing true machine-gun stacking. The invariant
 * `TEXT_BLIP_COOLDOWN_MS < DEFAULT_BLIP_THROTTLE × TYPEWRITER_MS_PER_CHAR`
 * (40 < 48) is asserted in the tests.
 */
export const TEXT_BLIP_COOLDOWN_MS = 40;

/** True when a glyph is voiced (eligible to blip), i.e. not a pause character. */
export function isBlipEligible(char: string): boolean {
  return char.length > 0 && !SILENT_BLIP_CHARS.has(char);
}

/**
 * The exact set of character indices in `text` that should emit a blip.
 * Eligible glyphs are counted; every `throttle`-th eligible glyph (1st,
 * 1+throttle, …) blips. Deterministic and total.
 */
export function computeBlipIndices(text: string, throttle: number = DEFAULT_BLIP_THROTTLE): Set<number> {
  const step = Number.isInteger(throttle) && throttle > 0 ? throttle : DEFAULT_BLIP_THROTTLE;
  const indices = new Set<number>();
  let eligibleSeen = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (!isBlipEligible(text[index] ?? '')) continue;
    if (eligibleSeen % step === 0) indices.add(index);
    eligibleSeen += 1;
  }
  return indices;
}

/**
 * Whether the blip for `index` should actually play. Suppressed entirely when
 * the line is being TTS-voiced (Council D5: one voice per line — Mage
 * `autoRead` lets the speech synthesizer be the voice; Ranger reader-mode and
 * manual playback get blips).
 */
export function blipShouldPlay(index: number, blipIndices: ReadonlySet<number>, lineVoiced: boolean): boolean {
  if (lineVoiced) return false;
  return blipIndices.has(index);
}

/** Fires the injected player as reveal indices land; nothing else. */
export type BlipEmitter = {
  onReveal(index: number): void;
};

/**
 * Bundles the per-line blip decision so the owning presentation layer stays a
 * thin adapter and the production path is unit-testable without Phaser.
 *
 * Given a line's `text`, whether it's TTS-`voiced`, and an injected `play`
 * (which the scene routes through its cooldown + global mute), the returned
 * emitter fires `play` exactly on the emitted indices — and only for reveals it
 * is actually fed. That last point is what makes early completion safe: when a
 * child taps to finish a line mid-reveal, the reveal loop simply stops calling
 * `onReveal`, so no further blips play. No RNG, no Phaser, no audio here.
 */
export function createBlipEmitter(
  text: string,
  options: { voiced: boolean; play: () => void; throttle?: number }
): BlipEmitter {
  const { voiced, play, throttle = DEFAULT_BLIP_THROTTLE } = options;
  const indices = computeBlipIndices(text, throttle);
  return {
    onReveal(index: number): void {
      if (blipShouldPlay(index, indices, voiced)) play();
    }
  };
}
