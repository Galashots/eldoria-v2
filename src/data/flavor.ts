import type { BonusContext } from './curriculum';

/**
 * Post-purpose flavor lines (2026-07 game-feel milestone). Once an
 * interactable's quest purpose is fulfilled, repeat interactions show these
 * short world-flavor toasts instead of opening a learning prompt — practice
 * stays available, but becomes player-chosen via the explicit opt-in below.
 *
 * Copy rules: warm, <=8 words where possible, pre-reader friendly (the
 * lines render through the existing toast flow). Lines rotate so repeats
 * aren't identical.
 */
export const POST_PURPOSE_FLAVOR = {
  crop: [
    'The berries glisten in the sun.',
    'Bees hum happily over the crops.',
    'The crop rows sway in the breeze.'
  ],
  sprout: [
    'The sprout hums a sleepy tune.',
    'Little leaves stretch toward the sun.',
    'The sprout wiggles a tiny hello.'
  ],
  mira: [
    'Mira: What a lovely farm day!',
    'Mira: The old magic feels calm now.',
    'Mira: The crops look happy today.'
  ],
  // Wildbloom Woods (quest-free): pure flavor tied to the Wildbloom theme.
  'whispering-flower': [
    'The flower hums an old song.',
    'Petals glow with sleepy light.',
    'It whispers: the woods remember.'
  ],
  // The Mossy Stone is the woods' opt-in practice spot.
  'mossy-stone': [
    'The mossy stone feels warm.',
    'Tiny runes glimmer in the moss.',
    'The stone hums when you touch it.'
  ]
} as const;

/**
 * Appended to a flavor toast when a second ACTION press within
 * PRACTICE_OFFER_WINDOW_MS opens an optional practice prompt. "ACTION" is
 * the on-screen button every profile uses (E/Space map to it on keyboard),
 * matching the hint bar's existing "ACTION •" vocabulary.
 */
export const PRACTICE_OFFER_SUFFIX = 'ACTION again to practice!';

/** How long a flavor toast's practice offer stays open for a second press. */
export const PRACTICE_OFFER_WINDOW_MS = 2000;

/**
 * Mira's opt-in practice rotates through these contexts so combat, farm,
 * and quest mastery all stay reachable by choice now that the Practice
 * Slime's infinite combat-question loop is gone.
 */
export const MIRA_PRACTICE_CONTEXTS: readonly BonusContext[] = ['combat', 'farm', 'quest'];
