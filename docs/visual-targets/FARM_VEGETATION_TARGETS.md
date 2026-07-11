# Farm Vegetation And Structure Targets

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md), Sections 4a (Perspective Discipline) and 8a (Grounding And Shadows).

Plan reference: [`docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`](../beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md), Phase 2 — "Vegetation" required kit.

## Purpose

Define the tree, bush, flower, weed, stone, log, fence, and gate targets required before Phase 2 art generation or Phase 3 map integration.

## Scope

Target specifications only. No art, runtime behavior, map edits, collision, or gameplay changes. `collision.solid` values below are target declarations for future authoring convenience (matching the existing `tile_village_shop_wall`/`tile_village_shop_door` pattern); no collision is implemented by this spec.

## Shared Baseline

- Footprint: `16x16` pixels (or `32x16` for the two-tile-wide gate/log). Canvas extends upward from the footprint for anything with height, per Section 4a's flattened "pop-up book" perspective — never true isometric.
- Pivot: bottom-center of the footprint.
- PPU: `16`.
- Lighting: consistent upper-left key light.
- Runtime export: PNG. Preferred editable source: `.aseprite`/`.ase`.
- Atlas family: `environment_farm`.
- Colors: draw only from the locked `forest`/`wood_leather`/`metal`/`arcane` hex values in [`FARM_PALETTE.md`](FARM_PALETTE.md) / [`farm_palette.json`](farm_palette.json).
- Tall objects (`env_farm_tree`, `env_farm_bush_large`, `env_farm_rock_medium`, `env_farm_fence`, `env_farm_gate`) declare `renderLayer: actors_body` so they can Y-sort against the player and NPCs at integration time; this spec makes no Y-sort implementation. Each such target's canvas extends upward from its footprint (drawn height above, grounded footprint below) so the footprint — and therefore collision/gameplay — is unchanged by the taller art.
- Per Section 8a, none of these targets bake a ground shadow into the source art — dynamic Y-sorted props get their shadow drawn by engine code at integration time, the same pattern already used for the player, Mira, and the Practice Slime.

## Targets

### `env_farm_tree`

Three distinct silhouettes (oak, pine, blossom) sharing one canvas/pivot contract so future placement is predictable. Distinct shapes, not recolors — this is the plan's "at least three tree silhouettes" requirement and the acceptance gate's "consistent tree silhouettes" check.

### `env_farm_bush_small` / `env_farm_bush_large`

Two explicit sizes rather than variants of one target, since canvas size is fixed per target in this contract's schema — this satisfies the plan's "bush clusters in multiple sizes" without conflating a size difference with a palette/shape variant.

### `env_farm_flower_cluster` / `env_farm_weed`

Ground-level scatter decoration in the same sparse, non-repeating spirit as `tile_farm_grass_scatter`. Flowers carry four palettes for rhythm across different farm areas; weeds/ferns stay quieter and less colorful.

### `env_farm_stone_small` / `env_farm_rock_medium`

Two scales matching the plan's "small stones and medium rocks" — small stones are flat scatter, the medium rock is a two-tile landmark-scale accent (a candidate feature near the Moonwell Echo Wildbloom spot per the Phase 3 plan).

### `env_farm_log`

A single fallen log spanning two tiles horizontally, lying flat.

### `env_farm_fence` / `env_farm_gate`

One shared weathered-wood material story across posts, rails, corners, a two-tile gate, and explicit broken variants for both, matching the plan's "fence posts, rails, corners, gates, and broken variants" line item. Both sit on `actors_body` and so carry drawn height: the fence is a `16x32` canvas over a `16x16` footprint (`pivot [8,31]`) and the gate a `32x32` canvas over a `32x16` footprint (`pivot [16,31]`), giving posts and rails visible height under the flattened perspective without enlarging their one-tile-deep gameplay footprint.

## Future Art PR Acceptance Checklist

- [ ] Uses the correct target ID.
- [ ] Uses the declared canvas/footprint/pivot for each target.
- [ ] Declares and follows the target palette families.
- [ ] Uses consistent upper-left lighting.
- [ ] Remains readable and low-noise at 1x and 3x.
- [ ] Includes every declared variant.
- [ ] Tree silhouettes are visibly distinct from each other, not recolors of one shape.
- [ ] Scatter/decoration variants (bushes, flowers, weeds, stones) are sparse and non-repeating, not a second visible tile grid.
- [ ] Tall objects follow the flattened "pop-up book" perspective (Section 4a), not true top-down or true isometric.
- [ ] Fence and gate broken variants read as clearly, intentionally damaged.
- [ ] No baked ground shadow on dynamic/Y-sorted props (Section 8a) — shadows are added at integration time by engine code.
- [ ] Adds no unrelated runtime, map, collision, save, quest, curriculum, or mastery changes.

The machine-readable source is [`farm_vegetation_targets.json`](farm_vegetation_targets.json).
