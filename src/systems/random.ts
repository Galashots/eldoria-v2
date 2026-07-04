// Small, dependency-free RNG helpers so the curriculum layer (question
// templates, question selection) does not need to import the whole `phaser`
// package just for `Phaser.Math.Between` / `Phaser.Utils.Array.GetRandom`.
// Behavior mirrors those Phaser helpers so callers see no change:
//   - randomInt(min, max) is inclusive of both bounds, like Phaser.Math.Between.
//   - pickRandom(items) picks uniformly, like Phaser.Utils.Array.GetRandom.

/** Returns a random integer in the inclusive range [min, max]. */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/** Returns a uniformly random element from a non-empty array. */
export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickRandom called with an empty array');
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Returns a new array containing the same elements in a uniformly random
 * order (Fisher-Yates shuffle). Does not mutate the input array.
 */
export function shuffled<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
