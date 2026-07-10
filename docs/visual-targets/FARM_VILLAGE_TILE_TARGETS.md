# Farm And Village Tile Targets

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md), Sections 13 (Terrain Blending) and 8a (Grounding And Shadows).

Research reference: [Stardew-Caliber Visual Research](../research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md), Finding 1 — this is the concrete target list for the highest-leverage visual fix identified there.

## Purpose

Define the first Farm/Village production tile targets before any art generation or replacement work.

## Scope

These are target specifications only. They add no art, runtime behavior, map edits, collision implementation, farming mechanics, UI, or gameplay changes.

## Shared Baseline

- Tile canvas and footprint: `16x16` pixels.
- Pivot: `[8, 15]` in top-left canvas coordinates.
- PPU: `16`.
- View: top-down 3/4 world grammar.
- Lighting: consistent upper-left key light.
- Runtime export: PNG.
- Preferred editable source: `.aseprite` or `.ase`.
- Atlas family: `environment_farm`.
- Readability: low-noise and child-friendly at 1x and 3x.

## Targets

### `tile_farm_grass_base`

Low-noise `forest` grass with three subtle variants. It must tile without obvious seams and remain quieter than actors or crop overlays. Per Section 13, its boundary against `tile_farm_path_dirt` must use the shared blend variants declared on that target rather than meeting it at a hard grid edge.

### `tile_farm_grass_scatter`

A `decals_low` scatter layer of small, non-repeating detail (grass tufts, pebbles, tiny flowers) painted sparsely over `tile_farm_grass_base` to break up grid monotony, the same role decoration scatter plays in Stardew-caliber tile art. Must remain quieter than actors and crop overlays and must not obstruct walkability or interaction reads. 4-6 variants scattered at low, irregular density; no variant should tile in an obviously repeating pattern.

### `tile_farm_path_dirt`

Walkable dirt using `wood_leather` and `forest`, with center, edge, and corner variants that connect cleanly to grass and village tiles. Per Section 13, this is the project's reference terrain-blend set: 1 center + 4 edge + 4 corner variants (the reduced ~13-tile blend approach, not the full 47-tile blob set) authored for use with Tiled's Terrain Brush.

### `tile_farm_tilled_soil`

Tilled soil with dry, wet, and seeded states that remain distinct at 1x. Its full-tile `farm_soil` interaction box is metadata only.

### `tile_farm_crop_sprout`

A small `decals_low` sprout overlay with two variants. It must preserve soil-state readability and must not look harvest-ready. `crop_growing` is metadata only.

### `tile_farm_crop_harvest`

A clearly harvest-ready `decals_low` crop overlay with two ready variants and one optional subtle sparkle. The sparkle must never imply that learning is mandatory. `crop_harvest` is metadata only.

### `tile_village_shop_wall`

A solid shop-facade tile with stone, wood-trim, and lit-window variants. It follows the shared building projection and upper-left light; solidity is a target declaration, not implemented collision.

### `tile_village_shop_door`

An immediately recognizable entrance with closed, highlighted, and optional open variants. The `door` interaction box is metadata only and adds no transition or interaction behavior.

### `tile_village_interaction_sign`

A non-verbal `world_ui` sign marker with idle and attention variants. It supports Grade 2 audio-first navigation without adding UI code; `sign` interaction is metadata only.

## Future Art PR Acceptance Checklist

- [ ] Uses the correct target ID.
- [ ] Uses the inherited `16x16` canvas/footprint and `[8,15]` pivot.
- [ ] Declares and follows the target palette families.
- [ ] Uses consistent upper-left lighting.
- [ ] Remains readable and low-noise at 1x and 3x.
- [ ] Includes every declared variant.
- [ ] Collision and interaction metadata match the JSON target.
- [ ] Grass/path/building edges prove seamlessness and alignment where relevant.
- [ ] Grass/path boundary uses declared blend variants (center/edge/corner), not a hard grid edge (Section 13).
- [ ] Scatter/decoration variants are sparse and non-repeating, not a second visible tile grid.
- [ ] Crop overlays preserve soil readability.
- [ ] Door and sign are visually obvious but add no runtime behavior.
- [ ] Adds no unrelated runtime, map, farming, UI, save, quest, curriculum, or mastery changes.

The machine-readable source is [`farm_village_tile_targets.json`](farm_village_tile_targets.json).
