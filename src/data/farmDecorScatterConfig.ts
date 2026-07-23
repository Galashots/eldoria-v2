// Farm-only decor-scatter production configuration: composes the
// deterministic D6-A2 scatter primitive (src/systems/decorScatter.ts,
// src/systems/decorExclusions.ts) with the approved tile_farm_grass_scatter
// family (docs/art-pipeline/review/tile_farm_grass_scatter_family/AUDIT.md).
// Phaser-free and pure so it is directly unit-testable; WorldScene consumes
// buildFarmDecorScatterPlan(), FARM_SCATTER_CELL_ORDER, and
// FARM_SCATTER_TEXTURE_KEY only — see src/scenes/WorldScene.ts.
//
// This module receives the Farm's parsed Tiled map data as a parameter
// rather than importing public/maps/farm.json: Vite does not allow
// production code to import files from public/, since those are served
// as-is and never bundled. WorldScene already holds the identical parsed
// JSON via Phaser's tilemap cache (populated by PreloadScene's
// this.load.tilemapTiledJSON) and passes it in — see
// WorldScene.renderFarmDecorScatter(). Repository-authority cross-validation
// against the approved target JSON lives in
// tests/unit/farmDecorScatterConfig.test.ts, not in this production module.
import { MAP_REGISTRY } from './maps';
import { WILDBLOOM_SPOTS } from './wildbloomSpots';
import { deriveDecorEligibility, type TiledMapLike } from '../systems/decorExclusions';
import { scatterDecor, type DecorPlacement } from '../systems/decorScatter';

/** Stable Phaser cache key for the packed runtime spritesheet. See
 * scripts/compose-farm-scatter-tileset.mjs and PreloadScene.ts. */
export const FARM_SCATTER_TEXTURE_KEY = 'farm-grass-scatter';

/**
 * Fixed row-major pack/frame order. Frame index in the packed spritesheet =
 * index in this array. Cross-checked against the approved target's declared
 * `variants` field below (assertDeclaredCellOrderMatches at module load) —
 * see this file's own test for the failure-mode proof.
 */
export const FARM_SCATTER_CELL_ORDER = ['tuft_a', 'tuft_b', 'pebble_a', 'flower_a'] as const;
export type FarmScatterVariant = (typeof FARM_SCATTER_CELL_ORDER)[number];

/**
 * Relative family weighting: initial visual hypothesis is tufts dominant
 * (combined 4:1 over flowers), pebbles and flowers both restrained accents.
 * Tune here after reviewing in-game density evidence (D3 DoD #4) — nothing
 * else needs to change; buildFarmDecorScatterPlan() re-reads this constant.
 */
export const FARM_SCATTER_WEIGHTS: Record<FarmScatterVariant, number> = {
  tuft_a: 2,
  tuft_b: 2,
  pebble_a: 1,
  flower_a: 1,
};

export const FARM_SCATTER_DENSITY = 0.12;
export const FARM_SCATTER_SEED = 'farm-v1';
export const FARM_SCATTER_MIN_SPACING = 2;

/** Throws if `actual` (a declared cell order) does not exactly equal
 * `expected` (the approved target's ground truth) — same content, same
 * sequence. D3 DoD #5 "wrong declared cell order". */
export function assertDeclaredCellOrderMatches(actual: readonly string[], expected: readonly string[]): void {
  const matches = actual.length === expected.length && actual.every((id, i) => id === expected[i]);
  if (!matches) {
    throw new Error(
      `Farm decor scatter: declared cell order ${JSON.stringify(actual)} does not match the approved target's order ${JSON.stringify(expected)}`,
    );
  }
}

/** Throws on an unknown configured variant, a declared variant with no
 * weight, or a non-positive/non-integer weight. D3 DoD #5. */
export function assertValidFarmDecorScatterWeighting(
  weights: Readonly<Record<string, number>>,
  order: readonly string[],
): void {
  const known = new Set(order);
  for (const [id, weight] of Object.entries(weights)) {
    if (!known.has(id)) {
      throw new Error(`Farm decor scatter: weights declares unknown variant '${id}'`);
    }
    if (!Number.isInteger(weight) || weight <= 0) {
      throw new Error(`Farm decor scatter: weight for '${id}' must be a positive integer, got ${weight}`);
    }
  }
  for (const id of order) {
    if (!(id in weights)) {
      throw new Error(`Farm decor scatter: weights is missing declared variant '${id}'`);
    }
  }
}

/** Throws on an invalid density. D3 DoD #5. */
export function assertValidFarmDecorScatterDensity(density: number): void {
  if (!Number.isFinite(density) || density <= 0 || density > 1) {
    throw new Error(`Farm decor scatter: density must be a finite number in (0, 1], got ${density}`);
  }
}

/** Throws on an invalid minSpacing. D3 DoD #5. */
export function assertValidFarmDecorScatterSpacing(minSpacing: number): void {
  if (!Number.isInteger(minSpacing) || minSpacing < 0) {
    throw new Error(`Farm decor scatter: minSpacing must be a non-negative integer, got ${minSpacing}`);
  }
}

/** Expands the weights record into a decal-id pool in FARM_SCATTER_CELL_ORDER
 * order, each id repeated `weight` times — scatterDecor's uniform-random pick
 * over this pool reproduces the declared ratio. Pure and deterministic. */
export function buildWeightedDecalPool(
  weights: Readonly<Record<FarmScatterVariant, number>>,
  order: readonly FarmScatterVariant[] = FARM_SCATTER_CELL_ORDER,
): FarmScatterVariant[] {
  const pool: FarmScatterVariant[] = [];
  for (const id of order) {
    for (let i = 0; i < weights[id]; i += 1) pool.push(id);
  }
  return pool;
}

export interface FarmDecorScatterPlanOptions {
  density?: number;
  seed?: string;
  minSpacing?: number;
  weights?: Readonly<Record<string, number>>;
}

/** Composes deriveDecorEligibility + scatterDecor into the real Farm
 * placement plan. Validated on every call (not just at module load) so a
 * bad override fails loudly at the call site, not silently downstream.
 * `farmMapData` is the Farm's parsed Tiled JSON — the caller supplies it
 * (WorldScene reads it from Phaser's already-loaded tilemap cache; tests
 * import public/maps/farm.json directly) rather than this module importing
 * it itself. */
export function buildFarmDecorScatterPlan(
  farmMapData: TiledMapLike,
  options: FarmDecorScatterPlanOptions = {},
): DecorPlacement[] {
  const density = options.density ?? FARM_SCATTER_DENSITY;
  const seed = options.seed ?? FARM_SCATTER_SEED;
  const minSpacing = options.minSpacing ?? FARM_SCATTER_MIN_SPACING;
  const weights = options.weights ?? FARM_SCATTER_WEIGHTS;

  assertValidFarmDecorScatterDensity(density);
  assertValidFarmDecorScatterSpacing(minSpacing);
  assertValidFarmDecorScatterWeighting(weights, FARM_SCATTER_CELL_ORDER);

  const farm = MAP_REGISTRY.farm;
  const { eligible } = deriveDecorEligibility(farmMapData, {
    collisionGids: farm.collisionGids,
    registrySpawnsWorldPx: Object.values(farm.spawns),
    wildbloomSpotsWorldPx: WILDBLOOM_SPOTS.map((s) => ({ x: s.x, y: s.y })),
    scatterable: { tilesetName: 'farm-terrain-proof', localIds: [0, 1] },
  });
  const eligibleSet = new Set(eligible);
  const excluded = new Set<string>();
  for (let y = 0; y < farmMapData.height; y += 1) {
    for (let x = 0; x < farmMapData.width; x += 1) {
      const key = `${x},${y}`;
      if (!eligibleSet.has(key)) excluded.add(key);
    }
  }

  return scatterDecor({
    width: farmMapData.width,
    height: farmMapData.height,
    seed,
    density,
    excluded,
    decals: buildWeightedDecalPool(weights as Record<FarmScatterVariant, number>),
    minSpacing,
  });
}

// --- self-validation: the real exported config must always be valid -------
// (constants only — no map/target JSON import needed for these three)
assertValidFarmDecorScatterWeighting(FARM_SCATTER_WEIGHTS, FARM_SCATTER_CELL_ORDER);
assertValidFarmDecorScatterDensity(FARM_SCATTER_DENSITY);
assertValidFarmDecorScatterSpacing(FARM_SCATTER_MIN_SPACING);
// Cross-validation of FARM_SCATTER_CELL_ORDER against the approved target's
// declared variants (docs/visual-targets/farm_village_tile_targets.json)
// runs in tests/unit/farmDecorScatterConfig.test.ts, not here — production
// code must not import build-time/public authority files. See this file's
// header comment.
