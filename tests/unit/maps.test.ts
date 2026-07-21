import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAP_ID,
  MAP_IDS,
  MAP_REGISTRY,
  getMapDefinition,
  resolveMapId,
  resolveSpawn,
  validateMapRoutes,
  validateMapRegistry,
  type MapDefinition,
  type TiledMapSummary
} from '../../src/data/maps';
import { GAME_SCALE } from '../../src/gameDimensions';

type TiledJson = {
  width: number;
  height: number;
  tilewidth: number;
  tilesets: { name: string }[];
  layers: {
    type: string;
    name: string;
    objects?: {
      type?: string;
      properties?: { name: string; value: unknown }[];
    }[];
  }[];
};

/** Reads the real committed map JSONs and reduces them to validator input. */
function loadRealMapSummaries(): Partial<Record<string, TiledMapSummary>> {
  const summaries: Partial<Record<string, TiledMapSummary>> = {};
  for (const def of Object.values(MAP_REGISTRY)) {
    const raw = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'public', def.jsonPath), 'utf8')
    ) as TiledJson;
    const objects = raw.layers.find((layer) => layer.type === 'objectgroup')?.objects ?? [];
    summaries[def.id] = {
      width: raw.width,
      height: raw.height,
      tilewidth: raw.tilewidth,
      tilesets: raw.tilesets,
      exits: objects
        .filter((obj) => obj.type === 'exit')
        .map((obj) => ({
          targetMap: obj.properties?.find((p) => p.name === 'targetMap')?.value,
          targetSpawn: obj.properties?.find((p) => p.name === 'targetSpawn')?.value
        }))
    };
  }
  return summaries;
}

describe('map registry', () => {
  it('validates the real registry against the real committed map JSONs', () => {
    const summaries = loadRealMapSummaries();
    expect(() => validateMapRegistry(MAP_REGISTRY, summaries, GAME_SCALE)).not.toThrow();
    expect(() => validateMapRoutes(MAP_REGISTRY, summaries)).not.toThrow();
  });

  it('resolves known ids and falls back to the farm for anything else', () => {
    expect(resolveMapId('farm')).toBe('farm');
    expect(resolveMapId('not-a-map')).toBe(DEFAULT_MAP_ID);
    expect(resolveMapId(undefined)).toBe(DEFAULT_MAP_ID);
    expect(resolveMapId(42)).toBe(DEFAULT_MAP_ID);
  });

  it('every registered map resolves a default spawn', () => {
    for (const id of MAP_IDS) {
      const def = getMapDefinition(id);
      expect(resolveSpawn(def, undefined)).toEqual(def.spawns[def.defaultSpawn]);
      // Unknown spawn names fall back to the default rather than throwing.
      expect(resolveSpawn(def, 'no-such-spawn')).toEqual(def.spawns[def.defaultSpawn]);
    }
  });
});

describe('validateMapRoutes violations', () => {
  const cloneRegistry = (): typeof MAP_REGISTRY => ({
    farm: { ...MAP_REGISTRY.farm, nextHop: { ...MAP_REGISTRY.farm.nextHop } },
    'wildbloom-woods': {
      ...MAP_REGISTRY['wildbloom-woods'],
      nextHop: { ...MAP_REGISTRY['wildbloom-woods'].nextHop }
    },
    'eldoria-village': {
      ...MAP_REGISTRY['eldoria-village'],
      nextHop: { ...MAP_REGISTRY['eldoria-village'].nextHop }
    }
  });

  it('rejects a first hop that is not a real exit from the source map', () => {
    const registry = cloneRegistry();
    registry['eldoria-village'].nextHop.farm = 'wildbloom-woods';
    expect(() => validateMapRoutes(registry, loadRealMapSummaries())).toThrow(/non-exit hop/);
  });

  it('rejects a real exit that contradicts the BFS first hop', () => {
    const registry = cloneRegistry();
    registry.farm.nextHop['eldoria-village'] = 'wildbloom-woods';
    expect(() => validateMapRoutes(registry, loadRealMapSummaries())).toThrow(/BFS first hop/);
  });
});

describe('validateMapRegistry violations', () => {
  const validDef = (): MapDefinition => ({
    ...MAP_REGISTRY.farm,
    spawns: { ...MAP_REGISTRY.farm.spawns }
  });

  it('rejects a defaultSpawn that is not declared', () => {
    const def = validDef();
    def.defaultSpawn = 'missing';
    expect(() => validateMapRegistry({ farm: def })).toThrow(/defaultSpawn/);
  });

  it('rejects a registry key that does not match the definition id', () => {
    expect(() => validateMapRegistry({ other: validDef() })).toThrow(/does not match/);
  });

  it('rejects a spawn outside world bounds', () => {
    const def = validDef();
    def.spawns.default = { x: 999999, y: 512 };
    const summary: TiledMapSummary = {
      width: 30, height: 20, tilewidth: 32,
      tilesets: def.tilesets.map((tileset) => ({ name: tileset.tiledName })),
      exits: []
    };
    expect(() => validateMapRegistry({ farm: def }, { farm: summary })).toThrow(/outside world bounds/);
  });

  it('rejects missing or non-positive map dimensions', () => {
    const def = validDef();
    const summary = {
      width: 30,
      height: 20,
      tilewidth: undefined,
      tilesets: def.tilesets.map((tileset) => ({ name: tileset.tiledName })),
      exits: []
    } as unknown as TiledMapSummary;
    expect(() => validateMapRegistry({ farm: def }, { farm: summary })).toThrow(/invalid map or tile dimensions/);

    expect(() => validateMapRegistry(
      { farm: def },
      { farm: { ...summary, tilewidth: 32, width: 0 } }
    )).toThrow(/invalid map or tile dimensions/);
  });

  it('rejects a declared tileset missing from the map JSON', () => {
    const def = validDef();
    const summary: TiledMapSummary = {
      width: 30, height: 20, tilewidth: 32,
      tilesets: [{ name: 'something-else' }],
      exits: []
    };
    expect(() => validateMapRegistry({ farm: def }, { farm: summary })).toThrow(/missing from its JSON/);
  });

  it('rejects an exit that targets an unregistered map or unknown spawn', () => {
    const def = validDef();
    const base = {
      width: 30, height: 20, tilewidth: 32,
      tilesets: def.tilesets.map((tileset) => ({ name: tileset.tiledName }))
    };
    expect(() => validateMapRegistry(
      { farm: def },
      { farm: { ...base, exits: [{ targetMap: 'nowhere', targetSpawn: 'default' }] } }
    )).toThrow(/unregistered map/);
    expect(() => validateMapRegistry(
      { farm: def },
      { farm: { ...base, exits: [{ targetMap: 'farm', targetSpawn: 'nope' }] } }
    )).toThrow(/unknown spawn/);
  });
});
