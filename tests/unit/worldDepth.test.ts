import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  WORLD_ACTOR_DEPTH_EPSILON,
  WORLD_ACTOR_DEPTH_MAX,
  WORLD_ACTOR_DEPTH_MIN,
  WORLD_ACTOR_DEPTH_PER_PIXEL,
  WORLD_ACTOR_DEPTH_SORTABLE_HEIGHT,
  spriteGroundY,
  worldActorDepth
} from '../../src/systems/worldDepth';
import { MAP_IDS, MAP_REGISTRY } from '../../src/data/maps';
import { GAME_SCALE, sy } from '../../src/gameDimensions';

/** Ground-contact world y of the Farm's Practice Slime (Tiled 704,320). */
const FARM_SLIME_GROUND_Y = 320 * GAME_SCALE;
/** Ground-contact world y of Farm Mira (Tiled 416,256), on her drawn ellipse. */
const FARM_MIRA_GROUND_Y = 256 * GAME_SCALE + sy(5);

describe('worldActorDepth', () => {
  it('sorts a lower ground contact in front of a higher one', () => {
    expect(worldActorDepth(600)).toBeGreaterThan(worldActorDepth(400));
    expect(worldActorDepth(401)).toBeGreaterThan(worldActorDepth(400));
  });

  it('places an actor at world y 0 on the band floor', () => {
    expect(worldActorDepth(0)).toBe(WORLD_ACTOR_DEPTH_MIN);
  });

  it('stays inside the band either side of the sortable range', () => {
    expect(worldActorDepth(-500)).toBe(WORLD_ACTOR_DEPTH_MIN);
    expect(worldActorDepth(WORLD_ACTOR_DEPTH_SORTABLE_HEIGHT)).toBe(WORLD_ACTOR_DEPTH_MAX);
    expect(worldActorDepth(WORLD_ACTOR_DEPTH_SORTABLE_HEIGHT * 10)).toBe(WORLD_ACTOR_DEPTH_MAX);
  });

  it('falls back to the band floor rather than writing NaN to the display list', () => {
    expect(worldActorDepth(Number.NaN)).toBe(WORLD_ACTOR_DEPTH_MIN);
    expect(worldActorDepth(Number.POSITIVE_INFINITY)).toBe(WORLD_ACTOR_DEPTH_MIN);
  });

  it('keeps the whole band clear of the shadow layer below and indicators above', () => {
    // Ground shadows draw at 1; quest glows, marker glyphs, affordance rings
    // and the objective chevron draw at 4+. Actors must never cross either.
    expect(WORLD_ACTOR_DEPTH_MIN).toBeGreaterThan(1);
    expect(WORLD_ACTOR_DEPTH_MAX).toBeLessThan(4);
  });
});

describe('the two fixed-depth orderings this replaces', () => {
  // Regression for the Practice Slime, which was pinned at depth 2 — below
  // the player's fixed 3 — so the player drew in front of it from every
  // approach, including from the north where the slime is nearer the camera.
  it('puts the hero behind the Practice Slime when standing north of it', () => {
    expect(worldActorDepth(FARM_SLIME_GROUND_Y - 32))
      .toBeLessThan(worldActorDepth(FARM_SLIME_GROUND_Y));
  });

  it('puts the hero in front of the Practice Slime when standing south of it', () => {
    expect(worldActorDepth(FARM_SLIME_GROUND_Y + 32))
      .toBeGreaterThan(worldActorDepth(FARM_SLIME_GROUND_Y));
  });

  // Regression for Mira, whose silhouette was pinned at 3.5 — above the
  // player's fixed 3 — so she drew over the player even from the south.
  it('puts the hero in front of Mira when standing south of her', () => {
    expect(worldActorDepth(FARM_MIRA_GROUND_Y + 32))
      .toBeGreaterThan(worldActorDepth(FARM_MIRA_GROUND_Y));
  });

  it('puts the hero behind Mira when standing north of her', () => {
    expect(worldActorDepth(FARM_MIRA_GROUND_Y - 32))
      .toBeLessThan(worldActorDepth(FARM_MIRA_GROUND_Y));
  });
});

describe('WORLD_ACTOR_DEPTH_EPSILON', () => {
  it('is finer than one world pixel, so it cannot reorder two actors', () => {
    expect(WORLD_ACTOR_DEPTH_EPSILON).toBeGreaterThan(0);
    expect(WORLD_ACTOR_DEPTH_EPSILON).toBeLessThan(WORLD_ACTOR_DEPTH_PER_PIXEL);
  });

  it('keeps the Ranger accent layers around their own sprite only', () => {
    // Two actors one world pixel apart must still sort cleanly even with the
    // nearer one's back accent and the further one's front accent between.
    const near = worldActorDepth(600);
    const far = worldActorDepth(601);
    expect(far - WORLD_ACTOR_DEPTH_EPSILON).toBeGreaterThan(near + WORLD_ACTOR_DEPTH_EPSILON);
  });
});

describe('spriteGroundY', () => {
  it('reads the displayed bottom of a centre-origin sprite', () => {
    // The Ranger renders as the 32x32 physics sprite itself at GAME_SCALE.
    expect(spriteGroundY({ y: 500, displayHeight: 64, originY: 0.5 })).toBe(532);
  });

  it('reads the displayed bottom of a bottom-origin sprite', () => {
    expect(spriteGroundY({ y: 500, displayHeight: 96, originY: 1 })).toBe(500);
  });

  it('agrees with where the Mage sprite is actually drawn', () => {
    // HeroPresentationController offsets the bottom-origin Mage sprite by
    // verticalOffset from the physics sprite's centre; both must resolve to
    // the same ground line or the two profiles would sort differently.
    const physicsY = 500;
    const physicsGround = spriteGroundY({ y: physicsY, displayHeight: 32 * GAME_SCALE, originY: 0.5 });
    const mageGround = spriteGroundY({ y: physicsY + sy(16), displayHeight: 48 * GAME_SCALE, originY: 1 });
    expect(mageGround).toBe(physicsGround);
  });
});

describe('band capacity against the real maps', () => {
  it('sorts every registered map end to end without clamping', () => {
    type TiledJson = { height: number; tileheight: number };

    for (const mapId of MAP_IDS) {
      const definition = MAP_REGISTRY[mapId];
      const json = JSON.parse(
        readFileSync(join(process.cwd(), 'public', definition.jsonPath), 'utf-8')
      ) as TiledJson;
      const worldHeight = json.height * json.tileheight * GAME_SCALE;

      expect(
        worldHeight,
        `${mapId} is ${worldHeight}px tall, past the ${WORLD_ACTOR_DEPTH_SORTABLE_HEIGHT}px the actor `
          + 'depth band can sort. Widen the band (worldDepth.ts) or actors at the bottom of this map '
          + 'will clamp to the same depth and stop sorting.'
      ).toBeLessThanOrEqual(WORLD_ACTOR_DEPTH_SORTABLE_HEIGHT);

      // The bottom row must still land strictly inside the band, not on it.
      expect(worldActorDepth(worldHeight)).toBeLessThanOrEqual(WORLD_ACTOR_DEPTH_MAX);
      expect(worldActorDepth(worldHeight)).toBeGreaterThan(WORLD_ACTOR_DEPTH_MIN);
    }
  });
});
