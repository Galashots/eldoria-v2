// Targeting for the hero's ranged cast — the thing ACTION does when there is
// nothing within arm's reach.
//
// Before this, pressing ACTION away from an interactable played the hero's cast
// animation and nothing else happened: no projectile, no sound, no reaction
// anywhere in the world. The button was inert most of the time, which is most
// of what made the game feel like a menu with walking between the menus.
//
// ## The rule: you can hit things, you cannot shout at people
//
// A cast reaches things a child would expect to *hit* — a Sleepy Sprout, the
// Practice Slime, the Mossy Stone. It deliberately does NOT reach anyone you
// would *talk to* (Mira, Baker Pell, the Notice Board) or a bonus you harvest
// by hand (the Crop Patch). Two reasons, one design and one engineering:
//
//   - A spark that opens a conversation from three tiles away reads as a bug,
//     and it would let a player skip walking to Mira, which is the objective
//     the game is actually asking for.
//   - Dialogue and quest handoffs assume the hero is standing at the target.
//     Keeping them out of range means quest routing, objective state and save
//     behaviour are untouched by this feature.
//
// Phaser-free so the whole rule is unit-testable without a scene.

/** Interaction ids a cast is allowed to reach. Everything else needs a walk. */
export const CASTABLE_TARGET_IDS = [
  'practice-slime',
  'sprout-1',
  'sprout-2',
  'sprout-3',
  'mossy-stone'
] as const;

export type CastableTargetId = (typeof CASTABLE_TARGET_IDS)[number];

export type CastFacing = 'front' | 'back' | 'left' | 'right';

export type CastCandidate = {
  id: string;
  x: number;
  y: number;
};

/**
 * How far a cast travels, in world px. Three tiles at GAME_SCALE 2 — a real
 * extension of the ~84px walk-up interaction range, but nowhere near far
 * enough to cross a map and trivialise exploration.
 */
export const CAST_RANGE = 192;

/**
 * Half-width of the cast corridor, in world px. Generous on purpose: this is
 * for a seven-year-old aiming with a thumb, not a twitch shooter. Roughly one
 * tile either side of centre.
 */
export const CAST_HALF_WIDTH = 56;

/** Unit vector for a facing. Screen coordinates, so 'back' is negative y. */
export function castDirection(facing: CastFacing): { x: number; y: number } {
  switch (facing) {
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
    case 'back': return { x: 0, y: -1 };
    default: return { x: 0, y: 1 };
  }
}

export function isCastable(id: string): id is CastableTargetId {
  return (CASTABLE_TARGET_IDS as readonly string[]).includes(id);
}

/**
 * The nearest castable target inside the corridor the hero is facing along, or
 * null when the cast flies off into empty grass (which is a perfectly good
 * outcome — it still sparks and fizzles).
 *
 * "Inside the corridor" means: ahead of the hero, no further than CAST_RANGE
 * along the facing axis, and no further than CAST_HALF_WIDTH off centre.
 */
export function resolveCastHit(
  origin: { x: number; y: number },
  facing: CastFacing,
  candidates: readonly CastCandidate[],
  range = CAST_RANGE,
  halfWidth = CAST_HALF_WIDTH
): CastCandidate | null {
  const direction = castDirection(facing);
  let best: CastCandidate | null = null;
  let bestAlong = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!isCastable(candidate.id)) continue;

    const dx = candidate.x - origin.x;
    const dy = candidate.y - origin.y;
    // Distance along the facing axis, and perpendicular offset from it.
    const along = dx * direction.x + dy * direction.y;
    const across = Math.abs(dx * direction.y - dy * direction.x);

    if (along <= 0 || along > range || across > halfWidth) continue;
    if (along < bestAlong) {
      best = candidate;
      bestAlong = along;
    }
  }

  return best;
}

/**
 * Where the projectile should stop: the target it hits, or the far end of the
 * corridor when it hits nothing.
 */
export function castImpactPoint(
  origin: { x: number; y: number },
  facing: CastFacing,
  hit: CastCandidate | null,
  range = CAST_RANGE
): { x: number; y: number } {
  if (hit) return { x: hit.x, y: hit.y };
  const direction = castDirection(facing);
  return { x: origin.x + direction.x * range, y: origin.y + direction.y * range };
}
