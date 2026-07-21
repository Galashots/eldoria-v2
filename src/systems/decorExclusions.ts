// Exclusion-set derivation for the deterministic decor-scatter placement
// primitive (Model Council issue #115, decision D6-A2; execution surface:
// issue #120; source inventory: the Kimi audit in issue #120 comment 1).
//
// Pure policy, no Phaser import, no RNG: the same committed map + sources
// always derive the same cell sets, so downstream scatter output is
// diff-gated. All coordinates are tile cells keyed "x,y" (0-indexed,
// col,row). Decisions encoded here trace to the audit's open questions:
//
// - Q1 (footprint rounding): every px footprint is covered in full —
//   floor(min/tile) .. floor((min+size-1)/tile) per axis, so objects that
//   straddle tile boundaries (e.g. CropBonus at map px x=240 covers cols
//   7-8) exclude every touched cell.
// - Q2 (collision filter): keyed on the registry's collisionGids (runtime
//   blocking semantics), not on any non-zero Collision cell.
// - Q3 (Decor layer): all authored non-empty Decor cells are excluded,
//   colliding or not.
// - Q4/Q5 (scatterable ground): an explicit allowlist by tileset NAME +
//   local tile ids (grass only today). Dirt road/path, water, and the
//   uncategorised placeholder gids (fence base, crop field, structure
//   base) are all non-scatterable by construction.
// - Q6/Q10 (derivation layer): static — derived from the committed map +
//   code constants only, independent of save/defeat/reveal state. The
//   Practice Slime's cell stays excluded even after defeat.
// - Q7 (Wildbloom constants): imported from the Phaser-free data module
//   (data/wildbloomSpots), never duplicated.
// - Q8/Q9 (padding): object footprints get a 1-cell Chebyshev ring (kids
//   cluster around interactables; decor must not crowd them). Collision,
//   decor, spawns, spots, and terrain exclusions carry NO ring.
// - Q11 (gid stability): scatterable gids resolve through the tileset's
//   declared firstgid, never raw literals.
//
// World-px sources (registry spawns, Wildbloom spots) are converted with
// GAME_SCALE: map px = world px / GAME_SCALE, then one-tile anchored
// footprints, matching how the runtime anchors objects at their top-left.

import { GAME_SCALE } from '../gameDimensions';

/** Tiled encodes its four transformation flags (horizontal/vertical/diagonal
 * flip, hexagonal 120-degree rotation) in the high nibble of a gid; mask all
 * of them off before comparing tile ids. */
const TILE_ID_MASK = 0x0fffffff;

export interface TiledObjectLike {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  type?: string;
}

export interface TiledLayerLike {
  type: string;
  name: string;
  data?: number[];
  width?: number;
  height?: number;
  objects?: TiledObjectLike[];
}

/** Minimal structural shape of a parsed Tiled JSON this derivation reads. */
export interface TiledMapLike {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  tilesets: readonly { firstgid: number; name: string }[];
  layers: readonly TiledLayerLike[];
}

export interface DecorExclusionSources {
  /** Registry-authoritative impassable gids on the map's Collision layer. */
  collisionGids: readonly number[];
  /** Named registry spawns, already in world px (map px * GAME_SCALE). */
  registrySpawnsWorldPx: readonly { x: number; y: number }[];
  /** Wildbloom secret-spot anchors in world px (from data/wildbloomSpots). */
  wildbloomSpotsWorldPx: readonly { x: number; y: number }[];
  /** Ground allowlist, resolved by tileset name + local tile ids. */
  scatterable: { tilesetName: string; localIds: readonly number[] };
}

export interface DecorEligibilityBreakdown {
  /** Collision-layer cells whose gid is in collisionGids. */
  collision: string[];
  /** All non-empty authored Decor-layer cells. */
  decor: string[];
  /** Full-coverage footprints of every Objects-layer object (incl. exits). */
  objects: string[];
  /** Registry spawn cells (world-px anchors, one-tile footprint). */
  spawns: string[];
  /** Wildbloom spot cells (world-px anchors, one-tile footprint). */
  wildbloom: string[];
}

export interface DecorEligibility {
  breakdown: DecorEligibilityBreakdown;
  /** Scatterable cells minus every exclusion, row-major, deterministic. */
  eligible: string[];
}

const cellKey = (x: number, y: number): string => `${x},${y}`;

function byRowMajor(a: string, b: string): number {
  const [ax, ay] = a.split(',').map(Number);
  const [bx, by] = b.split(',').map(Number);
  return ay - by || ax - bx;
}

/** Adds every cell touched by a px rectangle (inclusive both axes). */
function addFootprint(
  out: Set<string>,
  px: number,
  py: number,
  widthPx: number,
  heightPx: number,
  tilewidth: number,
  tileheight: number,
): void {
  const x0 = Math.floor(px / tilewidth);
  const x1 = Math.floor((px + Math.max(widthPx, 1) - 1) / tilewidth);
  const y0 = Math.floor(py / tileheight);
  const y1 = Math.floor((py + Math.max(heightPx, 1) - 1) / tileheight);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      out.add(cellKey(x, y));
    }
  }
}

function findLayer(map: TiledMapLike, name: string): TiledLayerLike | undefined {
  return map.layers.find((layer) => layer.name === name);
}

function deriveCollisionCells(map: TiledMapLike, collisionGids: readonly number[]): Set<string> {
  const cells = new Set<string>();
  const layer = findLayer(map, 'Collision');
  if (!layer?.data) return cells;
  const blocking = new Set(collisionGids);
  const stride = layer.width ?? map.width;
  layer.data.forEach((rawGid, index) => {
    const gid = rawGid & TILE_ID_MASK;
    if (gid !== 0 && blocking.has(gid)) {
      cells.add(cellKey(index % stride, Math.floor(index / stride)));
    }
  });
  return cells;
}

function deriveDecorCells(map: TiledMapLike): Set<string> {
  const cells = new Set<string>();
  const layer = findLayer(map, 'Decor');
  if (!layer?.data) return cells;
  const stride = layer.width ?? map.width;
  layer.data.forEach((rawGid, index) => {
    if ((rawGid & TILE_ID_MASK) !== 0) {
      cells.add(cellKey(index % stride, Math.floor(index / stride)));
    }
  });
  return cells;
}

function deriveObjectCells(map: TiledMapLike): Set<string> {
  const cells = new Set<string>();
  const layer = findLayer(map, 'Objects');
  for (const obj of layer?.objects ?? []) {
    // Tiled omits size on point objects; runtime anchors sit at the top-left
    // of one tile, so a missing size means one full tile.
    addFootprint(
      cells,
      obj.x ?? 0,
      obj.y ?? 0,
      obj.width && obj.width > 0 ? obj.width : map.tilewidth,
      obj.height && obj.height > 0 ? obj.height : map.tileheight,
      map.tilewidth,
      map.tileheight,
    );
  }
  return cells;
}

/** World-px point anchors (spawns, Wildbloom spots) with a one-tile footprint. */
function deriveWorldAnchorCells(map: TiledMapLike, pointsWorldPx: readonly { x: number; y: number }[]): Set<string> {
  const cells = new Set<string>();
  for (const point of pointsWorldPx) {
    addFootprint(
      cells,
      point.x / GAME_SCALE,
      point.y / GAME_SCALE,
      map.tilewidth,
      map.tileheight,
      map.tilewidth,
      map.tileheight,
    );
  }
  return cells;
}

/** The 1-cell Chebyshev neighbourhood around a set of cells (inclusive). */
function addRing(ring: Set<string>, cells: ReadonlySet<string>): void {
  for (const key of cells) {
    const [cx, cy] = key.split(',').map(Number);
    for (let y = cy - 1; y <= cy + 1; y += 1) {
      for (let x = cx - 1; x <= cx + 1; x += 1) {
        ring.add(cellKey(x, y));
      }
    }
  }
}

/**
 * Derives the decor-scatter exclusion set and the resulting eligible cells
 * from a committed Tiled map plus its registry/code-constant sources.
 * Throws on a missing Ground layer or an unknown scatterable tileset name —
 * both are authoring errors that must fail loudly, not silently mis-derive.
 */
export function deriveDecorEligibility(
  map: TiledMapLike,
  sources: DecorExclusionSources,
): DecorEligibility {
  const ground = findLayer(map, 'Ground');
  if (!ground?.data) {
    throw new Error('deriveDecorEligibility: map has no Ground tile layer data');
  }
  const tileset = map.tilesets.find((candidate) => candidate.name === sources.scatterable.tilesetName);
  if (!tileset) {
    throw new Error(
      `deriveDecorEligibility: scatterable tileset ${sources.scatterable.tilesetName} not among the map's tilesets`,
    );
  }
  const scatterableGids = new Set(sources.scatterable.localIds.map((id) => tileset.firstgid + id));

  const collision = deriveCollisionCells(map, sources.collisionGids);
  const decor = deriveDecorCells(map);
  const objects = deriveObjectCells(map);
  const spawns = deriveWorldAnchorCells(map, sources.registrySpawnsWorldPx);
  const wildbloom = deriveWorldAnchorCells(map, sources.wildbloomSpotsWorldPx);

  const objectRing = new Set<string>();
  addRing(objectRing, objects);

  const excluded = new Set<string>([
    ...collision,
    ...decor,
    ...objects,
    ...spawns,
    ...wildbloom,
    ...objectRing,
  ]);

  const groundStride = ground.width ?? map.width;
  const eligible: string[] = [];
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const gid = ground.data[y * groundStride + x] & TILE_ID_MASK;
      if (!scatterableGids.has(gid)) continue;
      const key = cellKey(x, y);
      if (!excluded.has(key)) {
        eligible.push(key);
      }
    }
  }

  return {
    breakdown: {
      collision: [...collision].sort(byRowMajor),
      decor: [...decor].sort(byRowMajor),
      objects: [...objects].sort(byRowMajor),
      spawns: [...spawns].sort(byRowMajor),
      wildbloom: [...wildbloom].sort(byRowMajor),
    },
    eligible,
  };
}
