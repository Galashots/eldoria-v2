import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BAKER_PELL_SHOP,
  VILLAGE_SHOP_CELL_ORDER,
  buildVillageShopPlan,
  type VillageShopDefinition
} from '../../src/data/villageShopBuilding';
import { GAME_SCALE } from '../../src/gameDimensions';
import { WORLD_ACTOR_DEPTH_MAX, WORLD_ACTOR_DEPTH_MIN, worldActorDepth } from '../../src/systems/worldDepth';

/**
 * Frame order as actually packed, read from the sidecar
 * scripts/compose-village-shop-tileset.mjs writes. Read as JSON rather than
 * imported from the .mjs because vitest's TypeScript transform chokes on the
 * script's own dependency chain.
 */
function packedCellOrder(): { cellPx: number; cellOrder: string[] } {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'assets', 'tilesets', 'tile_village_shop.cells.json'), 'utf-8')
  ) as { cellPx: number; cellOrder: string[] };
}

type TiledJson = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: {
    type: string;
    name: string;
    data?: number[];
    objects?: { name: string; x: number; y: number }[];
  }[];
};

function villageMap(): TiledJson {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'public', 'maps', 'eldoria-village.json'), 'utf-8')
  ) as TiledJson;
}

const WORLD_TILE_PX = 32 * GAME_SCALE;

describe('the runtime spritesheet contract', () => {
  it('names its cells in exactly the order the compose script packs them', () => {
    // A silent reorder on either side would swap thatch for stone in the game
    // with nothing else failing, because both sides are just index lookups.
    expect([...VILLAGE_SHOP_CELL_ORDER]).toEqual(packedCellOrder().cellOrder);
  });

  it('was packed at the cell size PreloadScene slices it with', () => {
    // PreloadScene loads this sheet with frameWidth/frameHeight 32 (the 16px
    // approved masters upscaled 2x). A composer that changed UPSCALE without
    // that being noticed would silently misalign every frame.
    expect(packedCellOrder().cellPx).toBe(32);
  });

  it('resolves every layout cell to a frame index inside the sheet', () => {
    const plan = buildVillageShopPlan(BAKER_PELL_SHOP, WORLD_TILE_PX);
    for (const placement of plan.placements) {
      expect(placement.frame).toBeGreaterThanOrEqual(0);
      expect(placement.frame).toBeLessThan(VILLAGE_SHOP_CELL_ORDER.length);
      expect(VILLAGE_SHOP_CELL_ORDER[placement.frame]).toBe(placement.cell);
    }
  });
});

describe('buildVillageShopPlan', () => {
  it('lays the grid out row-major from the origin tile', () => {
    const plan = buildVillageShopPlan(BAKER_PELL_SHOP, WORLD_TILE_PX);
    expect(plan.placements).toHaveLength(16);
    expect(plan.placements[0]).toMatchObject({ cell: 'roof_ridge', x: 8 * 64, y: 1 * 64 });
    expect(plan.placements[15]).toMatchObject({ cell: 'wall_wood_trim', x: 11 * 64, y: 4 * 64 });
  });

  it('takes the ground contact from the bottom edge of the last row', () => {
    const plan = buildVillageShopPlan(BAKER_PELL_SHOP, WORLD_TILE_PX);
    expect(plan.groundY).toBe((1 + 4) * 64);
  });

  it('makes only the bottom rows solid and leaves the rest overhanging', () => {
    const plan = buildVillageShopPlan(BAKER_PELL_SHOP, WORLD_TILE_PX);
    expect(plan.solid).toEqual({ x: 8 * 64, y: 3 * 64, width: 4 * 64, height: 2 * 64 });
    expect(plan.overhang).toEqual({ x: 8 * 64, y: 1 * 64, width: 4 * 64, height: 2 * 64 });
    // The overhang is what a hero can be hidden by; a structure with none can
    // never occlude anything, which would defeat the point of the composition.
    expect(plan.overhang!.height).toBeGreaterThan(0);
  });

  it('rejects a ragged grid', () => {
    const ragged = {
      ...BAKER_PELL_SHOP,
      rows: [['roof_ridge', 'roof_ridge'], ['wall_stone_base']]
    } as VillageShopDefinition;
    expect(() => buildVillageShopPlan(ragged, WORLD_TILE_PX)).toThrow(/rectangular/);
  });

  it('rejects a door parked under the overhanging roof', () => {
    // A door on an overhanging row cannot be approached — the hero would have
    // to stand inside the building's own footprint to reach it.
    const unreachable = {
      ...BAKER_PELL_SHOP,
      rows: [
        ['roof_ridge', 'door_closed', 'roof_ridge', 'roof_ridge'],
        ['roof_thatch_base', 'roof_thatch_base', 'roof_thatch_base', 'roof_thatch_base'],
        ['wall_stone_base', 'wall_stone_base', 'wall_stone_base', 'wall_stone_base'],
        ['wall_stone_base', 'wall_stone_base', 'wall_stone_base', 'wall_stone_base']
      ]
    } as VillageShopDefinition;
    expect(() => buildVillageShopPlan(unreachable, WORLD_TILE_PX)).toThrow(/solid front face/);
  });

  it('rejects a solidRows value outside the grid', () => {
    expect(() => buildVillageShopPlan({ ...BAKER_PELL_SHOP, solidRows: 0 }, WORLD_TILE_PX)).toThrow(/solidRows/);
    expect(() => buildVillageShopPlan({ ...BAKER_PELL_SHOP, solidRows: 5 }, WORLD_TILE_PX)).toThrow(/solidRows/);
  });

  it('rejects a non-positive tile size', () => {
    expect(() => buildVillageShopPlan(BAKER_PELL_SHOP, 0)).toThrow(/worldTilePx/);
  });
});

describe('placement against the real committed Village map', () => {
  it('fits entirely inside the map bounds', () => {
    const map = villageMap();
    const plan = buildVillageShopPlan(BAKER_PELL_SHOP, map.tilewidth * GAME_SCALE);
    const worldWidth = map.width * map.tilewidth * GAME_SCALE;
    const worldHeight = map.height * map.tileheight * GAME_SCALE;
    for (const placement of plan.placements) {
      expect(placement.x).toBeGreaterThanOrEqual(0);
      expect(placement.y).toBeGreaterThanOrEqual(0);
      expect(placement.x + map.tilewidth * GAME_SCALE).toBeLessThanOrEqual(worldWidth);
      expect(placement.y + map.tileheight * GAME_SCALE).toBeLessThanOrEqual(worldHeight);
    }
  });

  it('does not cover a tile the map already marks impassable', () => {
    // Double collision is not a crash, but it means the composition is sitting
    // on top of existing map geometry rather than in clear ground — which is a
    // placement mistake worth failing on.
    const map = villageMap();
    const collision = map.layers.find((l) => l.name === 'Collision')?.data ?? [];
    const occupied: string[] = [];
    for (let row = 0; row < BAKER_PELL_SHOP.rows.length; row += 1) {
      for (let col = 0; col < BAKER_PELL_SHOP.rows[0].length; col += 1) {
        const tileX = BAKER_PELL_SHOP.originTile.x + col;
        const tileY = BAKER_PELL_SHOP.originTile.y + row;
        if (collision[tileY * map.width + tileX] !== 0) occupied.push(`${tileX},${tileY}`);
      }
    }
    expect(occupied, `shop cells sit on impassable map tiles: ${occupied.join(' ')}`).toEqual([]);
  });

  it('does not bury any interaction target or the player spawn under the structure', () => {
    const map = villageMap();
    const objects = map.layers.find((l) => l.type === 'objectgroup')?.objects ?? [];
    const plan = buildVillageShopPlan(BAKER_PELL_SHOP, map.tilewidth * GAME_SCALE);
    const { x, y, width, height } = plan.solid;
    const buried = objects.filter((object) => {
      const worldX = object.x * GAME_SCALE;
      const worldY = object.y * GAME_SCALE;
      return worldX >= x && worldX < x + width && worldY >= y && worldY < y + height;
    });
    expect(buried.map((o) => o.name), 'objects inside the shop footprint').toEqual([]);
  });

  it('puts the door in Baker Pell\'s own column, just up-map of him', () => {
    // The placement is meant to be derived from where the shopkeeper stands,
    // not chosen freehand — if either moves, this is the assertion that says so.
    const map = villageMap();
    const worldTilePx = map.tilewidth * GAME_SCALE;
    const pell = (map.layers.find((l) => l.type === 'objectgroup')?.objects ?? [])
      .find((object) => object.name === 'Baker Pell');
    expect(pell, 'Baker Pell is missing from the Village Objects layer').toBeDefined();

    const plan = buildVillageShopPlan(BAKER_PELL_SHOP, worldTilePx);
    const door = plan.placements.find((placement) => placement.cell.startsWith('door_'));
    expect(door, 'the shop layout has no door').toBeDefined();

    const pellWorldX = pell!.x * GAME_SCALE;
    const pellWorldY = pell!.y * GAME_SCALE;
    expect(pellWorldX).toBeGreaterThanOrEqual(door!.x - worldTilePx / 2);
    expect(pellWorldX).toBeLessThanOrEqual(door!.x + worldTilePx * 1.5);
    // He stands in front of the shop, i.e. further down the map than its base.
    expect(pellWorldY).toBeGreaterThan(plan.groundY);
  });

  it('sorts inside the actor band', () => {
    const map = villageMap();
    const plan = buildVillageShopPlan(BAKER_PELL_SHOP, map.tilewidth * GAME_SCALE);
    const depth = worldActorDepth(plan.groundY);
    expect(depth).toBeGreaterThan(WORLD_ACTOR_DEPTH_MIN);
    expect(depth).toBeLessThan(WORLD_ACTOR_DEPTH_MAX);
  });
});

describe('the target contract for structures', () => {
  type TargetDoc = { targets: { id: string; renderLayer: string }[] };

  function targetDoc(file: string): TargetDoc {
    return JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'visual-targets', file), 'utf-8')
    ) as TargetDoc;
  }

  it('declares every shop family as actors_body, never terrain', () => {
    // Owner decision (Leo, 2026-07-26): structures are actors, not terrain —
    // see docs/VISUAL_ASSET_CONTRACT.md "Buildings and props". A family that
    // drifted back to terrain would draw beneath the hero and silently stop
    // occluding, with the composition and every other test still passing.
    const shopTargets = targetDoc('farm_village_tile_targets.json').targets
      .filter((target) => target.id.startsWith('tile_village_shop_'));
    expect(shopTargets.length).toBeGreaterThan(0);
    for (const target of shopTargets) {
      expect(target.renderLayer, `${target.id} render layer`).toBe('actors_body');
    }
  });

  it('agrees with the tall-object families that already used actors_body', () => {
    // The decision generalized an existing convention rather than inventing
    // one; if those families ever move off actors_body the contract has split.
    for (const file of ['farm_vegetation_targets.json', 'farm_props_targets.json']) {
      const tall = targetDoc(file).targets.filter((target) => target.renderLayer === 'actors_body');
      expect(tall.length, `${file} tall-object families`).toBeGreaterThan(0);
    }
  });
});
