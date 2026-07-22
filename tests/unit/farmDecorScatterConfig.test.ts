import { describe, expect, it } from 'vitest';
import targetsDoc from '../../docs/visual-targets/farm_village_tile_targets.json';
import farmMap from '../../public/maps/farm.json';
import { MAP_REGISTRY } from '../../src/data/maps';
import { WILDBLOOM_SPOTS } from '../../src/data/wildbloomSpots';
import { deriveDecorEligibility } from '../../src/systems/decorExclusions';
import { scatterDecor } from '../../src/systems/decorScatter';
import {
  FARM_SCATTER_CELL_ORDER,
  FARM_SCATTER_WEIGHTS,
  FARM_SCATTER_DENSITY,
  FARM_SCATTER_MIN_SPACING,
  FARM_SCATTER_SEED,
  FARM_SCATTER_TEXTURE_KEY,
  buildWeightedDecalPool,
  buildFarmDecorScatterPlan,
  assertDeclaredCellOrderMatches,
  assertValidFarmDecorScatterWeighting,
  assertValidFarmDecorScatterDensity,
  assertValidFarmDecorScatterSpacing,
} from '../../src/data/farmDecorScatterConfig';

type Target = { id: string; variants?: string[] };
const SCATTER_TARGET = (targetsDoc.targets as Target[]).find((t) => t.id === 'tile_farm_grass_scatter');

describe('Farm decor-scatter config vs the approved target', () => {
  it('has a declared target', () => {
    expect(SCATTER_TARGET).toBeDefined();
  });

  it("cell order matches the approved target's declared variants exactly", () => {
    expect(FARM_SCATTER_CELL_ORDER).toEqual(SCATTER_TARGET!.variants);
    expect(FARM_SCATTER_CELL_ORDER).toEqual(['tuft_a', 'tuft_b', 'pebble_a', 'flower_a']);
  });

  it('texture key is a non-empty stable string', () => {
    expect(FARM_SCATTER_TEXTURE_KEY).toBe('farm-grass-scatter');
  });
});

describe('assertDeclaredCellOrderMatches', () => {
  it('does not throw when the arrays match', () => {
    expect(() => assertDeclaredCellOrderMatches(['a', 'b'], ['a', 'b'])).not.toThrow();
  });

  it('throws on a reordered declared order', () => {
    expect(() => assertDeclaredCellOrderMatches(['b', 'a'], ['a', 'b'])).toThrow(/does not match/);
  });

  it('throws on a length mismatch', () => {
    expect(() => assertDeclaredCellOrderMatches(['a'], ['a', 'b'])).toThrow(/does not match/);
  });
});

describe('assertValidFarmDecorScatterWeighting', () => {
  const order = FARM_SCATTER_CELL_ORDER;

  it('accepts the real exported weighting', () => {
    expect(() => assertValidFarmDecorScatterWeighting(FARM_SCATTER_WEIGHTS, order)).not.toThrow();
  });

  it('throws on an unknown configured variant', () => {
    const bad = { ...FARM_SCATTER_WEIGHTS, weed_a: 1 } as unknown as Record<string, number>;
    expect(() => assertValidFarmDecorScatterWeighting(bad, order)).toThrow(/unknown variant/);
  });

  it('throws when a declared variant has no weight', () => {
    const { flower_a: _drop, ...rest } = FARM_SCATTER_WEIGHTS;
    expect(() => assertValidFarmDecorScatterWeighting(rest as Record<string, number>, order)).toThrow(
      /missing declared variant/,
    );
  });

  it('throws on a zero or negative weight', () => {
    const bad = { ...FARM_SCATTER_WEIGHTS, tuft_a: 0 };
    expect(() => assertValidFarmDecorScatterWeighting(bad, order)).toThrow(/positive integer/);
  });

  it('throws on a non-integer weight', () => {
    const bad = { ...FARM_SCATTER_WEIGHTS, tuft_a: 1.5 };
    expect(() => assertValidFarmDecorScatterWeighting(bad, order)).toThrow(/positive integer/);
  });
});

describe('assertValidFarmDecorScatterDensity', () => {
  it('accepts the real exported density', () => {
    expect(() => assertValidFarmDecorScatterDensity(FARM_SCATTER_DENSITY)).not.toThrow();
  });

  it.each([0, -0.1, 1.1, Number.NaN])('rejects invalid density %s', (density) => {
    expect(() => assertValidFarmDecorScatterDensity(density)).toThrow(/density/);
  });
});

describe('assertValidFarmDecorScatterSpacing', () => {
  it('accepts the real exported minSpacing', () => {
    expect(() => assertValidFarmDecorScatterSpacing(FARM_SCATTER_MIN_SPACING)).not.toThrow();
  });

  it.each([-1, 1.5])('rejects invalid minSpacing %s', (spacing) => {
    expect(() => assertValidFarmDecorScatterSpacing(spacing)).toThrow(/minSpacing/);
  });
});

describe('buildWeightedDecalPool', () => {
  it('expands tuft_a:tuft_b:pebble_a:flower_a at 2:2:1:1 (tufts combined = 4:1 over flowers)', () => {
    const pool = buildWeightedDecalPool(FARM_SCATTER_WEIGHTS);
    expect(pool).toEqual(['tuft_a', 'tuft_a', 'tuft_b', 'tuft_b', 'pebble_a', 'flower_a']);
    const tufts = pool.filter((id) => id === 'tuft_a' || id === 'tuft_b').length;
    const flowers = pool.filter((id) => id === 'flower_a').length;
    expect(tufts / flowers).toBe(4);
  });
});

describe('buildFarmDecorScatterPlan', () => {
  it('is deterministic', () => {
    expect(buildFarmDecorScatterPlan()).toEqual(buildFarmDecorScatterPlan());
  });

  it('only ever assigns declared cell-order variants', () => {
    for (const placement of buildFarmDecorScatterPlan()) {
      expect(FARM_SCATTER_CELL_ORDER).toContain(placement.decal);
    }
  });

  // Hard pin on the density/seed/spacing constants themselves (not just their
  // internal consistency): the committed 38-placement plan
  // (tests/unit/decorPlacementProof.test.ts) was produced with exactly these
  // three values. If a future edit changes any of them, this fails loudly
  // here instead of silently drifting the in-game plan away from what was
  // reviewed — D3 DoD #5 "configuration that cannot produce the committed
  // deterministic plan" and DoD #6 "preserve the existing 38-placement plan".
  it('pins the density/seed/minSpacing that produced the committed 38-placement plan', () => {
    expect(FARM_SCATTER_DENSITY).toBe(0.12);
    expect(FARM_SCATTER_SEED).toBe('farm-v1');
    expect(FARM_SCATTER_MIN_SPACING).toBe(2);
  });

  it('selects the exact same cells as the equal-weight placeholder plan (weighting changes only the decal label per cell, never cell selection)', () => {
    const farm = MAP_REGISTRY['farm'];
    const { eligible } = deriveDecorEligibility(farmMap, {
      collisionGids: farm.collisionGids,
      registrySpawnsWorldPx: Object.values(farm.spawns),
      wildbloomSpotsWorldPx: WILDBLOOM_SPOTS.map((s) => ({ x: s.x, y: s.y })),
      scatterable: { tilesetName: 'farm-terrain-proof', localIds: [0, 1] },
    });
    const eligibleSet = new Set(eligible);
    const excluded = new Set<string>();
    for (let y = 0; y < farmMap.height; y += 1) {
      for (let x = 0; x < farmMap.width; x += 1) {
        const key = `${x},${y}`;
        if (!eligibleSet.has(key)) excluded.add(key);
      }
    }
    const placeholderCells = scatterDecor({
      width: farmMap.width,
      height: farmMap.height,
      seed: FARM_SCATTER_SEED,
      density: FARM_SCATTER_DENSITY,
      excluded,
      decals: [...FARM_SCATTER_CELL_ORDER],
      minSpacing: FARM_SCATTER_MIN_SPACING,
    }).map((p) => `${p.x},${p.y}`);

    const weightedCells = buildFarmDecorScatterPlan().map((p) => `${p.x},${p.y}`);
    expect(weightedCells).toEqual(placeholderCells);
    expect(weightedCells.length).toBe(38);
  });

  // Hard pin against the literal cell set committed in
  // tests/unit/decorPlacementProof.test.ts (independent of whatever this
  // module's own constants currently are) — two independently-written
  // expectations have to agree for this to pass, the same cross-check
  // rationale tests/unit/decorExclusions.test.ts documents for its own
  // independent-audit numbers.
  it('matches the literal 38-cell set pinned in decorPlacementProof.test.ts', () => {
    const pinnedCells = [
      '3,1', '8,1', '13,1', '20,1', '25,1', '10,2', '28,2', '2,3', '19,3', '22,3',
      '27,4', '9,5', '11,5', '25,5', '19,6', '2,7', '11,7', '22,8', '27,8', '4,12',
      '10,12', '15,12', '23,12', '26,12', '1,13', '17,13', '13,14', '21,14', '26,14', '28,14',
      '24,15', '11,16', '13,16', '9,17', '17,17', '22,17', '24,17', '2,18',
    ].sort((a, b) => {
      const [ax, ay] = a.split(',').map(Number);
      const [bx, by] = b.split(',').map(Number);
      return ay - by || ax - bx;
    });
    const weightedCells = buildFarmDecorScatterPlan()
      .map((p) => `${p.x},${p.y}`)
      .sort((a, b) => {
        const [ax, ay] = a.split(',').map(Number);
        const [bx, by] = b.split(',').map(Number);
        return ay - by || ax - bx;
      });
    expect(weightedCells).toEqual(pinnedCells);
  });

  it('throws on an invalid density override', () => {
    expect(() => buildFarmDecorScatterPlan({ density: 0 })).toThrow(/density/);
  });

  it('throws on an invalid weights override (unknown variant)', () => {
    const bad = { ...FARM_SCATTER_WEIGHTS, weed_a: 1 } as unknown as Record<string, number>;
    expect(() => buildFarmDecorScatterPlan({ weights: bad })).toThrow(/unknown variant/);
  });
});
