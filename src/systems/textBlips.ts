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
