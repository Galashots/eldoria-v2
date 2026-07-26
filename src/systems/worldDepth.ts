/**
 * Feet-based ("y-sort") render depth for world actors.
 *
 * Every world actor used to sit at a fixed depth: the player at 3, the
 * Practice Slime at 2, Mira's silhouette at 3.5. A fixed order is correct
 * from exactly one side and wrong from the other — the player drew in front
 * of the slime even while standing north of (behind) it, and behind Mira even
 * while standing south of (in front of) her.
 *
 * Sorting instead by ground-contact y makes the order true from every
 * approach: whoever's feet sit lower on screen is nearer the camera, so they
 * draw in front. This is the standard painter's-algorithm depth cue for a
 * top-down world, and it is the prerequisite for any future occluding prop
 * (a tree, a shop front) that the hero should be able to walk behind.
 *
 * Depth bands either side of the actor range are unchanged:
 *
 *   0          tile layers (Ground / Decor) and the Farm decor scatter
 *   1          ground shadows and the screen-fixed vignette
 *   1.5        ambient dust motes — above shadows, beneath every actor
 *   [2, 3.5]   ACTORS, sorted by ground-contact y  ← this module. The hero,
 *              world NPCs and creatures, and structures: a building Y-sorts
 *              here too, by the ground line of its own footprint, so the hero
 *              can pass behind it (owner decision 2026-07-26, recorded in
 *              docs/VISUAL_ASSET_CONTRACT.md under "Buildings and props").
 *   4+         quest glows, marker glyphs, affordance rings, the objective
 *              chevron, and every interaction VFX (crop-bonus burst 6, slime
 *              strike bursts 8) — meant to read over everything
 *
 * The band holds actors and nothing else, deliberately: anything else parked
 * inside it would layer above or below a given actor depending on where on the
 * map that actor happened to be standing, which is an accident, not a design.
 * Two objects were evicted when the band was introduced — the ambient motes
 * (2 → 1.5) and the crop-bonus burst (3 → 6) — both of which had been given
 * their old values back when the hero was itself pinned at a fixed 3.
 *
 * One world pixel is 0.001 of depth, so the band spans 1500 world px. Every
 * registered map is comfortably inside that (the tallest, the Farm, is
 * 1280 px); `worldActorDepth` clamps rather than escaping its band, and a
 * unit test guards the margin so a taller map cannot silently flatten the
 * sort into a tie.
 */

/** Depth of an actor standing at world y = 0. Above ground shadows (1). */
export const WORLD_ACTOR_DEPTH_MIN = 2;

/** Ceiling of the actor band. Below the floating indicator layer (4). */
export const WORLD_ACTOR_DEPTH_MAX = 3.5;

/** Depth added per world pixel of ground-contact y. */
export const WORLD_ACTOR_DEPTH_PER_PIXEL = 0.001;

/** Widest world height the band can sort without clamping, in world px. */
export const WORLD_ACTOR_DEPTH_SORTABLE_HEIGHT =
  (WORLD_ACTOR_DEPTH_MAX - WORLD_ACTOR_DEPTH_MIN) / WORLD_ACTOR_DEPTH_PER_PIXEL;

/**
 * Separation for decoration pinned to one actor (the Ranger's back/front
 * accent layers). A quarter of a pixel step, so it orders those layers around
 * their own actor without ever reordering two actors a whole pixel apart.
 */
export const WORLD_ACTOR_DEPTH_EPSILON = WORLD_ACTOR_DEPTH_PER_PIXEL / 4;

/**
 * Render depth for an actor whose feet touch the ground at `groundY`
 * (world px, y down). Non-finite input falls back to the band floor rather
 * than poisoning the display list with NaN.
 */
export function worldActorDepth(groundY: number): number {
  if (!Number.isFinite(groundY)) return WORLD_ACTOR_DEPTH_MIN;
  const depth = WORLD_ACTOR_DEPTH_MIN + Math.max(0, groundY) * WORLD_ACTOR_DEPTH_PER_PIXEL;
  return Math.min(depth, WORLD_ACTOR_DEPTH_MAX);
}

/**
 * Ground-contact y of a sprite, derived from its displayed bounds rather
 * than its origin, so it is correct for both the bottom-origin hero sprite
 * and the centre-origin physics sprite the Ranger still renders as.
 * Allocation-free — this runs every frame.
 */
export function spriteGroundY(sprite: {
  y: number;
  displayHeight: number;
  originY: number;
}): number {
  return sprite.y + sprite.displayHeight * (1 - sprite.originY);
}
