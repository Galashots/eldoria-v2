/**
 * Multi-map world registry (2026-07 world-building foundation).
 *
 * Every map the game can load is declared here; WorldScene, PreloadScene,
 * and SaveSystem consumers read this registry instead of hardcoding any
 * map-specific key, path, tileset, collision GID, spawn, or music. Adding a
 * map = one registry entry + a Tiled JSON (see docs/MAP_AUTHORING.md).
 *
 * Exits are NOT declared here: they live as `type: "exit"` objects on each
 * map's Tiled Objects layer (properties `targetMap`/`targetSpawn`), so the
 * map file remains the single source of truth for its own geometry. The
 * unit-test layer cross-validates that every exit in every map JSON resolves
 * against this registry.
 */

export type MapId = 'farm' | 'wildbloom-woods' | 'eldoria-village';

export type MapSpawn = {
  /** World px (map px * GAME_SCALE), matching player/interaction coordinates. */
  x: number;
  y: number;
};

export type MapDefinition = {
  id: MapId;
  /** Phaser cache key for the tilemap JSON. */
  tiledKey: string;
  /** Load path relative to the public root. */
  jsonPath: string;
  /** Shown on the map entry banner. */
  displayName: string;
  /** Tiled tileset name -> preloaded image cache key. */
  tilesets: { tiledName: string; imageKey: string }[];
  musicKey: string;
  /** Named arrival points in world px. */
  spawns: Record<string, MapSpawn>;
  defaultSpawn: string;
  /** Impassable GIDs on this map's Collision layer. */
  collisionGids: readonly number[];
  /** First exit-map to take when travelling toward another registered map. */
  nextHop: Partial<Record<MapId, MapId>>;
};

// Shared by all current maps: the placeholder structural tileset plus the
// approved terrain-proof masters (grass/water/dirt), and the single
// placeholder music loop. New maps may diverge freely.
const STANDARD_TILESETS: MapDefinition['tilesets'] = [
  { tiledName: 'eldoria-placeholder', imageKey: 'tiles' },
  { tiledName: 'farm-terrain-proof', imageKey: 'terrain-tiles' }
];

export const MAP_REGISTRY: Record<MapId, MapDefinition> = {
  farm: {
    id: 'farm',
    tiledKey: 'farm',
    jsonPath: 'maps/farm.json',
    displayName: 'The Farm',
    tilesets: STANDARD_TILESETS,
    musicKey: 'bgm-farm',
    spawns: {
      // The original PlayerSpawn object (160, 256 map px) at GAME_SCALE 2.
      default: { x: 320, y: 512 },
      // On the east road, two tiles west of the woods gate, so arriving
      // from the woods never lands inside the exit zone (no bounce-back).
      'from-woods': { x: 1760, y: 640 },
      // On the west road, two tiles east of the village gate.
      'from-village': { x: 160, y: 640 }
    },
    defaultSpawn: 'default',
    // Fence/water/rock stand-ins on the farm Collision layer (tileset
    // eldoria-placeholder). Moved here from WorldScene's old
    // FARM_COLLISION_TILE_GIDS constant.
    collisionGids: [3, 4, 6],
    nextHop: {
      'wildbloom-woods': 'wildbloom-woods',
      'eldoria-village': 'eldoria-village'
    }
  },
  'wildbloom-woods': {
    id: 'wildbloom-woods',
    tiledKey: 'wildbloom-woods',
    jsonPath: 'maps/wildbloom-woods.json',
    displayName: 'Wildbloom Woods',
    tilesets: STANDARD_TILESETS,
    // Reusing the farm loop is an accepted placeholder for this milestone;
    // a dedicated woods track must be a real reviewed asset first.
    musicKey: 'bgm-farm',
    spawns: {
      // On the gate path, two tiles east of the west exit zone.
      'from-farm': { x: 320, y: 448 }
    },
    defaultSpawn: 'from-farm',
    // Trees block on the woods Collision layer (water reserved for later).
    collisionGids: [3, 4],
    nextHop: {
      farm: 'farm',
      'eldoria-village': 'farm'
    }
  },
  'eldoria-village': {
    id: 'eldoria-village',
    tiledKey: 'eldoria-village',
    jsonPath: 'maps/eldoria-village.json',
    displayName: 'Eldoria Village',
    tilesets: STANDARD_TILESETS,
    // Reusing the farm loop is the accepted placeholder (same as the woods);
    // a dedicated village track must be a real reviewed asset first.
    musicKey: 'bgm-farm',
    spawns: {
      // Two tiles west of the east gate (GateToFarm), so arriving from the
      // farm never lands inside the exit zone.
      'from-farm': { x: 1120, y: 448 }
    },
    defaultSpawn: 'from-farm',
    collisionGids: [3, 4],
    nextHop: {
      farm: 'farm',
      'wildbloom-woods': 'farm'
    }
  }
};

export const MAP_IDS = Object.keys(MAP_REGISTRY) as MapId[];

export const DEFAULT_MAP_ID: MapId = 'farm';

function isMapId(candidate: unknown): candidate is MapId {
  return typeof candidate === 'string' && candidate in MAP_REGISTRY;
}

/**
 * Resolves an untrusted map-id candidate (scene init data, the persisted
 * `lastArea` save field) to a registered MapId, falling back to the farm.
 * Old saves wrote `lastArea: 'farm'`, which resolves unchanged — and any
 * unknown value (corrupt save, removed map) safely lands on the farm too.
 */
export function resolveMapId(candidate: unknown): MapId {
  return isMapId(candidate) ? candidate : DEFAULT_MAP_ID;
}

export function getMapDefinition(mapId: MapId): MapDefinition {
  return MAP_REGISTRY[mapId];
}

/** Resolves a spawn by name with a defaultSpawn fallback. */
export function resolveSpawn(mapDef: MapDefinition, spawnId: string | undefined): MapSpawn {
  const spawn = (spawnId !== undefined ? mapDef.spawns[spawnId] : undefined)
    ?? mapDef.spawns[mapDef.defaultSpawn];
  if (!spawn) {
    throw new Error(`Map ${mapDef.id} has no resolvable spawn (requested: ${spawnId ?? '<default>'})`);
  }
  return spawn;
}

/**
 * Minimal shape of a parsed Tiled JSON that the registry validator needs.
 * The unit-test layer reads the real files from public/maps and passes them
 * in; runtime code never calls this.
 */
export type TiledMapSummary = {
  width: number;
  height: number;
  tilewidth: number;
  tilesets: { name: string }[];
  exits: { targetMap: unknown; targetSpawn: unknown }[];
};

/**
 * Cross-validates the registry (and, when map JSON summaries are supplied,
 * the maps themselves): unique ids/keys/paths, defaultSpawn resolves, every
 * spawn lies inside its map's world bounds, tileset names match the JSON,
 * and every exit's targetMap/targetSpawn resolve in the registry. Throws
 * with a specific message on the first violation. GAME_SCALE relation:
 * spawns are world px = map px * worldScale.
 */
export function validateMapRegistry(
  registry: Record<string, MapDefinition> = MAP_REGISTRY,
  mapSummaries?: Partial<Record<string, TiledMapSummary>>,
  worldScale = 2
): void {
  const definitions = Object.values(registry);
  const seenTiledKeys = new Set<string>();
  const seenPaths = new Set<string>();

  for (const [key, def] of Object.entries(registry)) {
    if (key !== def.id) throw new Error(`Registry key ${key} does not match definition id ${def.id}`);
    if (seenTiledKeys.has(def.tiledKey)) throw new Error(`Duplicate tiledKey: ${def.tiledKey}`);
    seenTiledKeys.add(def.tiledKey);
    if (seenPaths.has(def.jsonPath)) throw new Error(`Duplicate jsonPath: ${def.jsonPath}`);
    seenPaths.add(def.jsonPath);

    if (!def.displayName.trim()) throw new Error(`Map ${def.id} has an empty displayName`);
    if (!def.musicKey.trim()) throw new Error(`Map ${def.id} has an empty musicKey`);
    if (def.tilesets.length === 0) throw new Error(`Map ${def.id} declares no tilesets`);
    if (!(def.defaultSpawn in def.spawns)) {
      throw new Error(`Map ${def.id} defaultSpawn ${def.defaultSpawn} is not a declared spawn`);
    }
    if (def.collisionGids.length === 0) {
      throw new Error(`Map ${def.id} declares no collision GIDs`);
    }

    const summary = mapSummaries?.[def.id];
    if (!summary) continue;

    if (!Number.isInteger(summary.width) || summary.width <= 0
      || !Number.isInteger(summary.height) || summary.height <= 0
      || !Number.isInteger(summary.tilewidth) || summary.tilewidth <= 0) {
      throw new Error(`Map ${def.id} has invalid map or tile dimensions`);
    }

    const worldWidth = summary.width * summary.tilewidth * worldScale;
    const worldHeight = summary.height * summary.tilewidth * worldScale;
    for (const [spawnName, spawn] of Object.entries(def.spawns)) {
      if (spawn.x <= 0 || spawn.y <= 0 || spawn.x >= worldWidth || spawn.y >= worldHeight) {
        throw new Error(
          `Map ${def.id} spawn ${spawnName} (${spawn.x}, ${spawn.y}) lies outside world bounds ${worldWidth}x${worldHeight}`
        );
      }
    }

    const jsonTilesetNames = new Set(summary.tilesets.map((tileset) => tileset.name));
    for (const tileset of def.tilesets) {
      if (!jsonTilesetNames.has(tileset.tiledName)) {
        throw new Error(`Map ${def.id} declares tileset ${tileset.tiledName} missing from its JSON`);
      }
    }

    for (const exit of summary.exits) {
      const targetDef = typeof exit.targetMap === 'string' ? registry[exit.targetMap] : undefined;
      if (!targetDef) {
        throw new Error(`Map ${def.id} has an exit to unregistered map ${String(exit.targetMap)}`);
      }
      if (typeof exit.targetSpawn !== 'string' || !(exit.targetSpawn in targetDef.spawns)) {
        throw new Error(
          `Map ${def.id} exit to ${targetDef.id} targets unknown spawn ${String(exit.targetSpawn)}`
        );
      }
    }
  }
}

/**
 * Validates the registry's declarative first-hop routes against the exit
 * graph authored in the real Tiled maps. A route must name a direct exit
 * from its source map and must be the first hop found by breadth-first
 * search, so routing tables cannot drift from map geometry or shortest paths.
 */
export function validateMapRoutes(
  registry: Record<string, MapDefinition>,
  mapSummaries: Partial<Record<string, TiledMapSummary>>
): void {
  const exitGraph = new Map<string, string[]>();

  for (const mapId of Object.keys(registry)) {
    const summary = mapSummaries[mapId];
    if (!summary) throw new Error(`Map ${mapId} has no summary for route validation`);

    const exits: string[] = [];
    for (const exit of summary.exits) {
      if (typeof exit.targetMap === 'string' && exit.targetMap in registry) {
        exits.push(exit.targetMap);
      }
    }
    exitGraph.set(mapId, exits);
  }

  for (const [sourceMap, definition] of Object.entries(registry)) {
    const directExits = exitGraph.get(sourceMap) ?? [];
    for (const [destinationMap, declaredHop] of Object.entries(definition.nextHop)) {
      if (!(destinationMap in registry)) {
        throw new Error(`Map ${sourceMap} declares a route to unregistered map ${destinationMap}`);
      }
      if (typeof declaredHop !== 'string' || !directExits.includes(declaredHop)) {
        throw new Error(`Map ${sourceMap} route to ${destinationMap} names non-exit hop ${String(declaredHop)}`);
      }

      const expectedHop = firstBreadthFirstHop(sourceMap, destinationMap, exitGraph);
      if (expectedHop !== declaredHop) {
        throw new Error(
          `Map ${sourceMap} route to ${destinationMap} declares ${declaredHop}; BFS first hop is ${expectedHop ?? '<unreachable>'}`
        );
      }
    }
  }
}

function firstBreadthFirstHop(
  sourceMap: string,
  destinationMap: string,
  exitGraph: ReadonlyMap<string, readonly string[]>
): string | undefined {
  const visited = new Set<string>([sourceMap]);
  const queue: { mapId: string; firstHop: string }[] = [];

  for (const neighbour of exitGraph.get(sourceMap) ?? []) {
    if (visited.has(neighbour)) continue;
    visited.add(neighbour);
    queue.push({ mapId: neighbour, firstHop: neighbour });
  }

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.mapId === destinationMap) return current.firstHop;
    for (const neighbour of exitGraph.get(current.mapId) ?? []) {
      if (visited.has(neighbour)) continue;
      visited.add(neighbour);
      queue.push({ mapId: neighbour, firstHop: current.firstHop });
    }
  }

  return undefined;
}
