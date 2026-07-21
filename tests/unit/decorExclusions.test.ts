// Exclusion derivation for the decor-scatter primitive (issue #120).
// Expected values below are cross-model verification: they come from the
// independent Kimi audit of the same sources (issue #120 comment 1), so a
// derivation bug and an audit error would have to agree to slip through.
import { describe, expect, it } from 'vitest';
import farmMap from '../../public/maps/farm.json';
import { MAP_REGISTRY } from '../../src/data/maps';
import { WILDBLOOM_SPOTS } from '../../src/presentation/WildbloomDiscoveryController';
import { deriveDecorEligibility } from '../../src/systems/decorExclusions';

const farm = MAP_REGISTRY['farm'];

function derive() {
  return deriveDecorEligibility(farmMap, {
    collisionGids: farm.collisionGids,
    registrySpawnsWorldPx: Object.values(farm.spawns),
    wildbloomSpotsWorldPx: WILDBLOOM_SPOTS.map((s) => ({ x: s.x, y: s.y })),
    scatterable: { tilesetName: 'farm-terrain-proof', localIds: [0, 1] },
  });
}

describe('deriveDecorEligibility breakdown (vs independent Kimi audit)', () => {
  it('finds exactly the 127 collision cells, keyed on registry gids', () => {
    const { breakdown } = derive();
    expect(breakdown.collision.length).toBe(127);
    expect(breakdown.collision).toContain('0,0'); // fence corner
    // Gate mouths are walkable gaps in the fence, NOT collision cells:
    for (const gate of ['0,9', '0,10', '29,9', '29,10']) {
      expect(breakdown.collision).not.toContain(gate);
    }
  });

  it('covers all six authored Decor-layer cells', () => {
    const { breakdown } = derive();
    expect(new Set(breakdown.decor)).toEqual(
      new Set(['16,4', '13,8', '28,8', '10,5', '24,12', '18,13']),
    );
  });

  it('derives object footprints with full pixel coverage', () => {
    const { breakdown } = derive();
    const objects = new Set(breakdown.objects);
    expect(objects.has('7,13')).toBe(true); // crop-bonus straddles cols 7-8
    expect(objects.has('8,13')).toBe(true);
    expect(objects.has('15,2')).toBe(true); // sprout-1 2x2 block corners
    expect(objects.has('16,3')).toBe(true);
    expect(objects.has('13,8')).toBe(true); // Mira anchor
    expect(objects.has('22,10')).toBe(true); // Practice Slime (stays excluded post-defeat)
    expect(objects.has('5,8')).toBe(true); // PlayerSpawn object
    // Both gate exits:
    for (const gate of ['0,9', '0,10', '29,9', '29,10']) {
      expect(objects.has(gate)).toBe(true);
    }
  });

  it('derives registry spawn cells from world-px coordinates (divide by 64, coverage on half-tiles)', () => {
    const { breakdown } = derive();
    const spawns = new Set(breakdown.spawns);
    expect(spawns.has('5,8')).toBe(true); // default (320,512)
    expect(spawns.has('27,10')).toBe(true); // from-woods (1760,640) half-tile straddle
    expect(spawns.has('28,10')).toBe(true);
    expect(spawns.has('2,10')).toBe(true); // from-village (160,640) half-tile straddle
    expect(spawns.has('3,10')).toBe(true);
  });

  it('covers the three Wildbloom spot cells', () => {
    const { breakdown } = derive();
    const wb = new Set(breakdown.wildbloom);
    expect(wb.has('17,4')).toBe(true); // root-star (1120,288)
    expect(wb.has('10,15')).toBe(true); // moonwell-echo (672,960)
    expect(wb.has('25,14')).toBe(true); // foxfire-seed (1600,928)
  });
});

describe('deriveDecorEligibility eligible set', () => {
  it('is deterministic', () => {
    expect(derive().eligible).toEqual(derive().eligible);
  });

  it('is non-empty and entirely grass cells (allowlist, gids 9/10)', () => {
    const { eligible } = derive();
    expect(eligible.length).toBeGreaterThan(0);
    const groundLayer = farmMap.layers.find((l: { name: string }) => l.name === 'Ground') as {
      data: number[];
      width: number;
    };
    for (const key of eligible) {
      const [x, y] = key.split(',').map(Number);
      const gid = groundLayer.data[y * groundLayer.width + x];
      expect([9, 10], `cell ${key} has non-grass gid ${gid}`).toContain(gid);
    }
  });

  it('excludes a 1-cell ring around object footprints (slime neighbourhood)', () => {
    const { eligible } = derive();
    const eligibleSet = new Set(eligible);
    for (let x = 21; x <= 23; x += 1) {
      for (let y = 9; y <= 11; y += 1) {
        expect(eligibleSet.has(`${x},${y}`), `${x},${y} should be ring-excluded`).toBe(false);
      }
    }
  });

  it('keeps rings out of terrain-only exclusions (no ring around plain dirt)', () => {
    const { eligible } = derive();
    const eligibleSet = new Set(eligible);
    // Row 8 col 20 is grass adjacent to the dirt road (rows 9-10) and to no
    // object; terrain exclusion carries no ring, so it must stay eligible.
    expect(eligibleSet.has('20,8')).toBe(true);
  });
});
