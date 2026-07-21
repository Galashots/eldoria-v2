// Deterministic decor-scatter placement primitive (Model Council issue #115,
// decision D6-A2; execution surface: issue #120).
//
// Pure policy, no Phaser import, no Math.random: identical config always
// produces identical placements, so generated decor layers are diff-gated —
// a re-run that changes nothing produces a byte-identical result.
//
// Painterliness doctrine: decoration is a Decor-layer achievement above the
// ground plane. Terrain transitions stay Farm-only via resolveTransitionCell
// and are out of scope here.

export interface DecorScatterConfig {
  /** Grid width in tiles. */
  width: number;
  /** Grid height in tiles. */
  height: number;
  /** Seed string; every output is a pure function of the full config. */
  seed: string;
  /** Target fraction (0..1) of eligible cells that receive a decal. */
  density: number;
  /** Cells that must stay clear, as "x,y" keys (collision, objectives, bridge decor). */
  excluded: ReadonlySet<string>;
  /** Decal ids to distribute; placeholder ids until the art masters land. */
  decals: readonly string[];
  /** Optional minimum Chebyshev distance between any two placements. */
  minSpacing?: number;
}

export interface DecorPlacement {
  x: number;
  y: number;
  decal: string;
}

/** xmur3 string hash: seeds the PRNG from the config's seed string. */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32: small deterministic PRNG, plenty for placement jitter. */
function mulberry32(state: number): () => number {
  let a = state;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically scatter decals across the eligible cells of a grid.
 *
 * Output is sorted by row then column so committed artifacts diff stably.
 * With minSpacing set, the greedy pass places as many decals as fit; the
 * exact-count contract applies only to unconstrained scatters.
 */
export function scatterDecor(config: DecorScatterConfig): DecorPlacement[] {
  const { width, height, seed, density, excluded, decals, minSpacing } = config;

  const eligible: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!excluded.has(`${x},${y}`)) {
        eligible.push({ x, y });
      }
    }
  }

  const targetCount = Math.min(eligible.length, Math.round(eligible.length * density));
  if (targetCount <= 0) {
    return [];
  }
  if (decals.length === 0) {
    throw new Error('scatterDecor: positive density requires at least one decal id');
  }

  const random = mulberry32(hashSeed(seed));

  // Deterministic Fisher-Yates over the row-major eligible list.
  for (let i = eligible.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  const taken: Array<{ x: number; y: number }> = [];
  for (const cell of eligible) {
    if (taken.length >= targetCount) {
      break;
    }
    if (minSpacing !== undefined) {
      const tooClose = taken.some(
        (t) => Math.max(Math.abs(t.x - cell.x), Math.abs(t.y - cell.y)) < minSpacing,
      );
      if (tooClose) {
        continue;
      }
    }
    taken.push(cell);
  }

  const placements = taken.map((cell) => ({
    x: cell.x,
    y: cell.y,
    decal: decals[Math.floor(random() * decals.length)],
  }));

  placements.sort((p, q) => p.y - q.y || p.x - q.x);
  return placements;
}
