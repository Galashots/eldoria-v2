// Eldoria Village's first production structure: Baker Pell's shop, composed
// from the nine approved shop-facade runtime masters
// (docs/art-pipeline/review/village_top_gaps/AUDIT.md — PASS, nine approved
// runtime masters across three families, with map composition explicitly left
// to Claude).
//
// Phaser-free by design, like src/data/farmDecorScatterConfig.ts: the layout is
// declarative data a unit test can validate against the real committed map,
// and WorldScene only renders what this module resolves. No Tiled tileset, no
// gid, no map JSON edit.
//
// ## Why the building is taller than its footprint
//
// The approved art is a front-facing facade — stone courses, a panelled door, a
// lit window, thatch courses and a ridge cap — not a plan-view roof. Laid out
// as a block, the lower rows read as the wall the hero stands in front of and
// the upper rows read as the roof above it.
//
// Only the bottom `solidRows` rows are solid. The rows above them overhang
// walkable ground, so a hero walking along the far side of the shop is up-map
// of its ground line, sorts beneath it in the shared actor band
// (src/systems/worldDepth.ts), and is hidden by the roof. That overhang is the
// entire reason a structure reads as three-dimensional in a top-down world; a
// building whose sprite exactly covers its collision footprint can never
// occlude anything.
//
// ## Structures are actors, not terrain
//
// Owner decision (Leo, 2026-07-26, in session), generalized beyond this
// structure and recorded in `docs/VISUAL_ASSET_CONTRACT.md` under "Buildings
// and props": every building and tall prop Y-sorts against the hero by its
// ground contact. The shop wall and door targets were corrected from
// `renderLayer: "terrain"` to `actors_body` to match — the value tall
// vegetation and props in this repo have always declared. There is no toggle:
// a structure that draws beneath every actor cannot occlude the hero, which is
// the only reason to compose one this way.

/** Phaser texture key for the packed 9-cell runtime spritesheet. */
export const VILLAGE_SHOP_TEXTURE_KEY = 'village-shop';

/**
 * Runtime spritesheet frame order, which MUST stay identical to CELL_ORDER in
 * scripts/compose-village-shop-tileset.mjs — a unit test asserts the two
 * agree, because a silent reorder would swap thatch for stone in the game with
 * nothing failing.
 */
export const VILLAGE_SHOP_CELL_ORDER = [
  'wall_stone_base',
  'wall_wood_trim',
  'wall_window_lit',
  'door_closed',
  'door_highlighted',
  'door_open_optional',
  'roof_thatch_base',
  'roof_thatch_moss',
  'roof_ridge'
] as const;

export type VillageShopCell = (typeof VILLAGE_SHOP_CELL_ORDER)[number];

/**
 * Display-list name prefix for the structure's cell images, and the name of its
 * single invisible collision body. Both exist so the regression suite can find
 * the real rendered objects and the real blocker.
 */
export const VILLAGE_SHOP_OBJECT_PREFIX = 'village-shop-cell-';
export const VILLAGE_SHOP_BLOCKER_NAME = 'village-shop-blocker';

export type VillageShopDefinition = {
  /** Top-left tile of the structure, in the map's own tile coordinates. */
  originTile: { x: number; y: number };
  /** Row-major cell grid, top row first. Every row must be the same length. */
  rows: readonly (readonly VillageShopCell[])[];
  /** How many of the bottom rows are solid; the rest overhang walkable ground. */
  solidRows: number;
};

/**
 * Baker Pell's shop. Four tiles wide, four tall, with the bottom two rows
 * solid.
 *
 * Placement is derived, not invented: Baker Pell stands at Village tile (9, 6)
 * on the dirt road, and this puts the shop directly up-map of him with its door
 * in his column, so the shopkeeper stands in front of his own door. Tiles
 * (8..11, 1..4) are clear of the map's own Collision layer and of every other
 * Objects entry — asserted by tests/unit/villageShopBuilding.test.ts against
 * the committed map, not assumed.
 */
export const BAKER_PELL_SHOP: VillageShopDefinition = {
  originTile: { x: 8, y: 1 },
  rows: [
    ['roof_ridge', 'roof_ridge', 'roof_ridge', 'roof_ridge'],
    ['roof_thatch_base', 'roof_thatch_moss', 'roof_thatch_base', 'roof_thatch_moss'],
    ['wall_stone_base', 'wall_wood_trim', 'wall_window_lit', 'wall_stone_base'],
    ['wall_stone_base', 'door_closed', 'wall_stone_base', 'wall_wood_trim']
  ],
  solidRows: 2
};

export type VillageShopPlacement = {
  cell: VillageShopCell;
  /** Spritesheet frame index for `cell`. */
  frame: number;
  /** Top-left corner in world px. */
  x: number;
  y: number;
};

export type VillageShopPlan = {
  placements: VillageShopPlacement[];
  /**
   * The structure's ground contact in world px: the bottom edge of its last
   * row. This is what the whole building sorts by.
   */
  groundY: number;
  /** Solid block in world px, as a top-left-anchored rect. */
  solid: { x: number; y: number; width: number; height: number };
  /** Overhanging (non-solid) rows in world px, or null when nothing overhangs. */
  overhang: { x: number; y: number; width: number; height: number } | null;
};

export type BodyRect = { left: number; right: number; top: number; bottom: number };

/**
 * Whether a physics body overlaps a structure's solid block.
 *
 * Needed because Arcade Physics static bodies only block a body *moving into*
 * them — they do not eject a body that already overlaps. A save written before
 * a structure existed can restore the hero onto ground the structure now
 * occupies, and the hero would then stand inside the building.
 */
export function overlapsSolid(plan: VillageShopPlan, body: BodyRect): boolean {
  return body.right > plan.solid.x
    && body.left < plan.solid.x + plan.solid.width
    && body.bottom > plan.solid.y
    && body.top < plan.solid.y + plan.solid.height;
}

/**
 * How far down to move a body so it clears a structure's solid block, or 0 when
 * it already does.
 *
 * Down-map rather than any nearest edge, deliberately: the front of a structure
 * is where its door is and where the hero is meant to stand, so this puts a
 * displaced hero exactly where they would have walked to anyway. `margin`
 * leaves a visible gap instead of resting flush against the wall.
 */
export function pushClearOfSolid(plan: VillageShopPlan, body: BodyRect, margin = 8): number {
  if (!overlapsSolid(plan, body)) return 0;
  return plan.solid.y + plan.solid.height + margin - body.top;
}

function validate(definition: VillageShopDefinition): { cols: number; rows: number } {
  const rowCount = definition.rows.length;
  if (rowCount === 0) throw new Error('villageShopBuilding: definition has no rows');
  const cols = definition.rows[0].length;
  if (cols === 0) throw new Error('villageShopBuilding: definition has an empty first row');

  definition.rows.forEach((row, index) => {
    if (row.length !== cols) {
      throw new Error(
        `villageShopBuilding: row ${index} has ${row.length} cells but row 0 has ${cols} — the grid must be rectangular`
      );
    }
    for (const cell of row) {
      if (!VILLAGE_SHOP_CELL_ORDER.includes(cell)) {
        throw new Error(`villageShopBuilding: row ${index} names unknown cell '${cell}'`);
      }
    }
  });

  if (!Number.isInteger(definition.solidRows) || definition.solidRows < 1 || definition.solidRows > rowCount) {
    throw new Error(
      `villageShopBuilding: solidRows must be an integer in 1..${rowCount}, got ${definition.solidRows}`
    );
  }

  // A door the hero cannot reach is a bug, not a style: the door must be in a
  // solid row, so it sits on the front face rather than up under the roof.
  const firstSolidRow = rowCount - definition.solidRows;
  definition.rows.forEach((row, index) => {
    for (const cell of row) {
      if (cell.startsWith('door_') && index < firstSolidRow) {
        throw new Error(
          `villageShopBuilding: '${cell}' sits in row ${index}, which overhangs walkable ground — `
            + `a door must be on the solid front face (rows ${firstSolidRow}..${rowCount - 1})`
        );
      }
    }
  });

  return { cols, rows: rowCount };
}

/**
 * Resolves a definition into world-space placements.
 *
 * `worldTilePx` is the map's tile size already multiplied by GAME_SCALE, the
 * same value WorldScene uses for the Farm decor scatter — one 16px approved
 * master upscaled 2x fills exactly one map tile.
 */
export function buildVillageShopPlan(
  definition: VillageShopDefinition,
  worldTilePx: number
): VillageShopPlan {
  if (!Number.isFinite(worldTilePx) || worldTilePx <= 0) {
    throw new Error(`buildVillageShopPlan: worldTilePx must be positive, got ${worldTilePx}`);
  }
  const { cols, rows } = validate(definition);

  const left = definition.originTile.x * worldTilePx;
  const top = definition.originTile.y * worldTilePx;
  const placements: VillageShopPlacement[] = [];
  definition.rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      placements.push({
        cell,
        frame: VILLAGE_SHOP_CELL_ORDER.indexOf(cell),
        x: left + colIndex * worldTilePx,
        y: top + rowIndex * worldTilePx
      });
    });
  });

  const overhangRows = rows - definition.solidRows;
  return {
    placements,
    groundY: top + rows * worldTilePx,
    solid: {
      x: left,
      y: top + overhangRows * worldTilePx,
      width: cols * worldTilePx,
      height: definition.solidRows * worldTilePx
    },
    overhang: overhangRows > 0
      ? { x: left, y: top, width: cols * worldTilePx, height: overhangRows * worldTilePx }
      : null
  };
}
