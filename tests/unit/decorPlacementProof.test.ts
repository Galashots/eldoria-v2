// End-to-end placement proof for the decor-scatter primitive (issue #120):
// the real farm map + registry + Wildbloom constants flow through
// deriveDecorEligibility into scatterDecor with the placeholder decal set,
// and the full deterministic result is pinned here. Any drift in the map,
// the registry, the spot constants, the derivation, or the PRNG breaks a
// committed number below — this is the diff gate for the whole pipeline
// until the tile_farm_grass_scatter masters land (council #115 D6-A1).
import { describe, expect, it } from 'vitest';
import farmMap from '../../public/maps/farm.json';
import { MAP_REGISTRY } from '../../src/data/maps';
import { WILDBLOOM_SPOTS } from '../../src/data/wildbloomSpots';
import { deriveDecorEligibility } from '../../src/systems/decorExclusions';
import { scatterDecor } from '../../src/systems/decorScatter';

const FARM_WIDTH = 30;
const FARM_HEIGHT = 20;
const PLACEHOLDER_DECALS = ['tuft_a', 'tuft_b', 'pebble_a', 'flower_a'] as const;

const farm = MAP_REGISTRY['farm'];

function farmEligibility() {
  return deriveDecorEligibility(farmMap, {
    collisionGids: farm.collisionGids,
    registrySpawnsWorldPx: Object.values(farm.spawns),
    wildbloomSpotsWorldPx: WILDBLOOM_SPOTS.map((s) => ({ x: s.x, y: s.y })),
    scatterable: { tilesetName: 'farm-terrain-proof', localIds: [0, 1] },
  });
}

function farmPlacements() {
  const { eligible } = farmEligibility();
  const eligibleSet = new Set(eligible);
  const excluded = new Set<string>();
  for (let y = 0; y < FARM_HEIGHT; y += 1) {
    for (let x = 0; x < FARM_WIDTH; x += 1) {
      const key = `${x},${y}`;
      if (!eligibleSet.has(key)) excluded.add(key);
    }
  }
  return scatterDecor({
    width: FARM_WIDTH,
    height: FARM_HEIGHT,
    seed: 'farm-v1',
    density: 0.12,
    excluded,
    decals: [...PLACEHOLDER_DECALS],
    minSpacing: 2,
  });
}

describe('farm decor plan end-to-end (diff gate)', () => {
  it('derives exactly 316 eligible grass cells on the committed farm map', () => {
    expect(farmEligibility().eligible.length).toBe(316);
  });

  it('places exactly 38 placeholder decals (round(316 * 0.12), spacing unconstrained)', () => {
    expect(farmPlacements().length).toBe(38);
  });

  it('pins the complete deterministic placement array for the farm-v1 seed', () => {
    // The whole 38-placement result (every coordinate + decal assignment) is
    // pinned literally, so any drift anywhere in the pipeline fails this gate.
    expect(farmPlacements()).toEqual([
      { x: 3, y: 1, decal: 'tuft_b' },
      { x: 8, y: 1, decal: 'flower_a' },
      { x: 13, y: 1, decal: 'pebble_a' },
      { x: 20, y: 1, decal: 'tuft_a' },
      { x: 25, y: 1, decal: 'tuft_b' },
      { x: 10, y: 2, decal: 'tuft_b' },
      { x: 28, y: 2, decal: 'pebble_a' },
      { x: 2, y: 3, decal: 'tuft_b' },
      { x: 19, y: 3, decal: 'tuft_a' },
      { x: 22, y: 3, decal: 'flower_a' },
      { x: 27, y: 4, decal: 'pebble_a' },
      { x: 9, y: 5, decal: 'tuft_a' },
      { x: 11, y: 5, decal: 'pebble_a' },
      { x: 25, y: 5, decal: 'pebble_a' },
      { x: 19, y: 6, decal: 'tuft_a' },
      { x: 2, y: 7, decal: 'pebble_a' },
      { x: 11, y: 7, decal: 'tuft_b' },
      { x: 22, y: 8, decal: 'flower_a' },
      { x: 27, y: 8, decal: 'pebble_a' },
      { x: 4, y: 12, decal: 'pebble_a' },
      { x: 10, y: 12, decal: 'tuft_a' },
      { x: 15, y: 12, decal: 'tuft_a' },
      { x: 23, y: 12, decal: 'pebble_a' },
      { x: 26, y: 12, decal: 'pebble_a' },
      { x: 1, y: 13, decal: 'flower_a' },
      { x: 17, y: 13, decal: 'tuft_a' },
      { x: 13, y: 14, decal: 'tuft_b' },
      { x: 21, y: 14, decal: 'pebble_a' },
      { x: 26, y: 14, decal: 'tuft_b' },
      { x: 28, y: 14, decal: 'tuft_b' },
      { x: 24, y: 15, decal: 'tuft_a' },
      { x: 11, y: 16, decal: 'flower_a' },
      { x: 13, y: 16, decal: 'flower_a' },
      { x: 9, y: 17, decal: 'tuft_b' },
      { x: 17, y: 17, decal: 'pebble_a' },
      { x: 22, y: 17, decal: 'flower_a' },
      { x: 24, y: 17, decal: 'flower_a' },
      { x: 2, y: 18, decal: 'pebble_a' },
    ]);
  });

  it('places only on derived eligible cells, repeatably', () => {
    const eligibleSet = new Set(farmEligibility().eligible);
    const a = farmPlacements();
    const b = farmPlacements();
    expect(a).toEqual(b);
    for (const placement of a) {
      expect(eligibleSet.has(`${placement.x},${placement.y}`)).toBe(true);
    }
  });

  it('keeps the placeholder decal list config-driven (art swap = config change, D6-A2)', () => {
    for (const placement of farmPlacements()) {
      expect(PLACEHOLDER_DECALS).toContain(placement.decal);
    }
  });
});
