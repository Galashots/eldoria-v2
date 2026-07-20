# Map Authoring Guide

How to add a new map to Eldoria without reading the scene code. This document owns the multi-map contract: Tiled conventions, the map registry, spawns, exits, collision, and tileset wiring.

Durable rules live in [`AGENTS.md`](../AGENTS.md); volatile status lives in [`docs/CURRENT_STATE.md`](CURRENT_STATE.md).

## Architecture in one paragraph

`WorldScene` is map-agnostic. It reads everything map-specific from the registry in [`src/data/maps.ts`](../src/data/maps.ts) — the tilemap cache key, JSON path, display name, tileset wiring, music key, named spawns, collision GIDs, and validated objective-routing hints. Exit geometry is **not** in the registry: exits remain `type: "exit"` objects on each map's own Tiled Objects layer, so a map file stays the single source of truth for its own gates. `PreloadScene` loads every registered map's JSON in a loop. Adding a map is therefore: a Tiled JSON + a registry entry (+ optionally new art through the asset pipeline).

## Checklist for a new map

1. Author `public/maps/<map-id>.json` following the layer/object conventions below.
2. Add the `MapId` union member and the `MAP_REGISTRY` entry in `src/data/maps.ts`.
3. Add `interactionId` values for any new interactables to `src/data/interactions.ts` and register handlers in `WorldScene.interactionHandlers`.
4. Add exit objects on **both** maps (out and back), with arrival spawns offset clear of the opposing exit zone.
5. Add flavor lines to `src/data/flavor.ts` if the map has flavor interactables.
6. Add the new destination to every reachable map's `nextHop` table and add that map's own first-hop routes. The route validator checks these declarations against the real exit graph.
7. Run `npm run typecheck`, `npm run test:unit` (registry and route validation cross-check the real JSON automatically), then `npx playwright test`.
8. Update `docs/CURRENT_STATE.md` and add a changelog entry per `AGENTS.md`.

## Tiled conventions

The map must be 32px tiles. World pixels = map pixels × `GAME_SCALE` (2). A 20×14 map is 640×448 map px = 1280×896 world px.

### Required layers

| Layer | Type | Purpose |
| --- | --- | --- |
| `Ground` | tile layer | Terrain. Drawn from every registered tileset. |
| `Decor` | tile layer | Non-colliding overlays (walk-behind trees, signposts). |
| `Collision` | tile layer | Impassable tiles. Rendered invisible at runtime; only the GIDs listed in the registry's `collisionGids` actually block. |
| `Objects` | object group | Spawn point, interactables, and exits. |

Layer names are matched exactly. A missing optional layer is tolerated; a missing `Ground` layer produces an empty map.

### Objects layer

**Player spawn** — one point object named `PlayerSpawn`, any type. Used as the fallback arrival position when no explicit spawn was requested and no same-map save exists.

**Interactables** — point objects with:

- `type`: `npc` | `bonus` | `enemy` — this becomes the prompt's `BonusContext` (`quest` | `farm` | `combat` respectively).
- `name`: display label shown on the marker and in prompt titles.
- property `interactionId` (string): the stable id dispatched through `WorldScene.interactionHandlers`. Unmapped ids fall back to `generic-bonus` (opens a plain bonus prompt).

**Exits** — rectangle objects with:

- `type`: `exit`
- property `targetMap` (string): a registered `MapId`. Unregistered targets are dropped at runtime and fail the unit-test validator.
- property `targetSpawn` (string): a spawn name on the destination map.
- property `requiresQuestFlag` (string, optional): **reserved and currently unused.** Documented so map authors can annotate intent; the runtime ignores it today.

An exit triggers when the player's centre enters the rectangle. On trigger: input locks, the camera fades out (300ms), the scene restarts on the destination map at `targetSpawn`, then fades in and shows the entry banner. Re-entry is guarded by a `transitioning` flag.

## Registry entry

```ts
'wildbloom-woods': {
  id: 'wildbloom-woods',
  tiledKey: 'wildbloom-woods',            // Phaser cache key (unique)
  jsonPath: 'maps/wildbloom-woods.json',  // relative to public/ (unique)
  displayName: 'Wildbloom Woods',         // shown on the entry banner
  tilesets: STANDARD_TILESETS,            // Tiled tileset name -> preloaded image key
  musicKey: 'bgm-farm',                   // must be a preloaded audio key
  spawns: { 'from-farm': { x: 320, y: 448 } },  // WORLD px
  defaultSpawn: 'from-farm',
  collisionGids: [3, 4],
  nextHop: {                              // first gate to take per destination
    farm: 'farm',
    'eldoria-village': 'farm'
  }
}
```

### Objective routing (`nextHop`)

`nextHop` is a partial destination-to-first-exit table: `nextHop[destination] = exitMap`. It does not duplicate exit coordinates, spawn names, or gate rectangles. Those stay in Tiled. For example, Wildbloom Woods reaches Eldoria Village by first taking its real exit to the farm, so its entry declares `'eldoria-village': 'farm'`.

`validateMapRoutes()` builds the directed graph from the committed maps' real `exit` objects. Every declared hop must be a registered map with a direct exit from the source, and it must equal the first hop found by breadth-first search. Missing routes are allowed and make objective guidance hide safely; incorrect or stale routes fail unit tests. Same-map objectives never need a table entry.

### Spawns

Spawn coordinates are **world pixels** (map px × 2), matching player and interaction coordinates. Place each arrival spawn at least two tiles clear of the exit zone that leads back, or the player bounces straight back through it on arrival.

Placement priority when the scene starts:

1. An explicit `spawnId` from a transition or scripted boot.
2. A saved player position, **if** the save's map matches the map being loaded.
3. The map's `PlayerSpawn` object.
4. The registry `defaultSpawn`.

### Collision GIDs

`collisionGids` are the GIDs on that map's `Collision` layer that block. GIDs are tileset-relative to the map's own `firstgid` values, so **check your map's tileset order** — the farm and woods happen to share `eldoria-placeholder` (firstgid 1) and `farm-terrain-proof` (firstgid 9).

Note the player's physics body is 72×72 world px (36 design px × `GAME_SCALE`), noticeably wider than one 64px world tile. Leave at least one clear tile of walking room in corridors, and expect the sprite centre to stop ~68px short of a blocking tile's near edge.

### Music

`musicKey` must already be preloaded in `PreloadScene`. Reusing an existing track is acceptable; **any new track must be a real reviewed asset** registered in the manifest — no silent-failure audio.

## Art rules

Use only approved/committed art. New or recoloured art must go through the deterministic asset pipeline with formal verdicts — see [`docs/art-pipeline/`](art-pipeline/) and the closed-loop workflow. Do not merge placeholder or unreviewed art.

## Validation

`validateMapRegistry()` and `validateMapRoutes()` in `src/data/maps.ts` are exercised by `tests/unit/maps.test.ts` against the **real committed map JSONs**. They enforce:

- registry key matches definition id; unique `tiledKey` and `jsonPath`;
- non-empty `displayName`, `musicKey`, `tilesets`, `collisionGids`;
- `defaultSpawn` is a declared spawn;
- every spawn lies inside that map's world bounds;
- every declared tileset name exists in the map JSON;
- every `exit` object's `targetMap` and `targetSpawn` resolve in the registry.
- every `nextHop` names a real direct exit and matches the exit graph's breadth-first first hop.

A new map is covered automatically once its registry entry exists — no test edits required.

## Saves

The current map persists in the pre-existing `lastArea` save field; the saved player position is map-local and doubles as the arrival placement on reload. There is **no save-schema version bump**: old saves wrote `lastArea: 'farm'` and resolve unchanged, and any unknown value falls back to the farm. Quitting on map B and reloading returns to map B.

## Worked example

`public/maps/wildbloom-woods.json` (20×14) is the reference implementation: dense collidable tree border with a two-tile gate gap, interior clumps shaping a clearing, a dirt path to the gate, walk-behind `Decor` trees, two quest-free interactables (`whispering-flower` pure flavor, `mossy-stone` opt-in practice), and a `GateToFarm` exit paired with the farm's `GateToWoods`.
