# Farm Water And Shoreline Targets

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md), Sections 13 (Terrain Blending), 4a (Perspective Discipline), and 14 (Lighting And Atmosphere).

Plan reference: [`docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`](../beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md), Phase 2 — "Water and shoreline" required kit.

## Purpose

Define the pond water, shoreline blend, and water-decoration targets required before Phase 2 art generation or Phase 3 map integration. The pond is a planned Phase 3 navigation landmark (northwest or similarly strong location) and the future home of the Moonwell Echo Wildbloom secret.

## Scope

Target specifications only. No art, runtime behavior, map edits, collision, or gameplay changes.

## Shared Baseline

- Tile canvas and footprint: `16x16` pixels unless noted (reeds extend upward per the flattened perspective rule).
- Pivot: `[8, 15]` in top-left canvas coordinates for flat tiles; taller props use bottom-center of their footprint.
- PPU: `16`.
- View: top-down 3/4 world grammar for the water plane; height objects (reeds) use the flattened "pop-up book" convention (Section 4a).
- Lighting: consistent upper-left key light — no baked scene tint (Section 14 applies the atmosphere tint once, at the scene level).
- Runtime export: PNG. Preferred editable source: `.aseprite`/`.ase`.
- Atlas family: `environment_farm`.
- Colors: draw only from the locked `water` (contract `arcane`), `forest`, `wood_leather`, and `metal_stone` (contract `metal`) hex values in [`FARM_ENVIRONMENT_PALETTE_V1.md`](FARM_ENVIRONMENT_PALETTE_V1.md) / [`farm_environment_palette_v1.json`](farm_environment_palette_v1.json).

## Targets

### `tile_farm_water_base`

Calm pond water with two low-contrast variants and a subtle looping shimmer clip — the plan's "one subtle looping shimmer or water animation" requirement. This is the project's first *animated terrain tile*, a new category distinct from Section 13's static neighbor-blending and `tile_farm_tilled_soil`'s same-cell state swap; the runtime loop mechanism (Tiled animated tile vs. a lightweight texture-swap) is a Phase 3 integration decision, not decided by this spec.

### `tile_farm_water_shore`

The grass-to-water blend set, following the exact full reduced 13-tile pattern (1 center + 4 edges + 4 outer corners `corner_*` + 4 inner corners `inner_corner_*`) also declared on `tile_farm_path_dirt`. Do not redesign the blend approach; reuse it for a second terrain boundary. The inner corners are what let the pond read as a natural, concave, irregular shoreline instead of a convex rectangular pool.

### `tile_farm_water_lily` / `tile_farm_water_flower`

Sparse, off-center water-surface decals (lily pads, small water flowers) following the same scatter discipline as `tile_farm_grass_scatter` — roughly 40-50% cell occupancy, never filling the cell or reading as a second tile grid.

### `env_farm_shore_rock`

A small, low-profile rock cluster anchoring the shoreline as a landmark accent. Solidity/collision is explicitly deferred to Phase 3.

### `env_farm_reed`

Tall, thin shoreline plants using the flattened perspective rule — the canvas extends upward from a `16x16` footprint rather than lying flat, matching how trees and fences are meant to read against the ground plane.

## Future Art PR Acceptance Checklist

- [ ] Uses the correct target ID.
- [ ] Uses the declared canvas/footprint/pivot for each target (not the farm/village tile defaults where they differ, e.g. `env_farm_reed`).
- [ ] Declares and follows the target palette families.
- [ ] Uses consistent upper-left lighting; no baked scene-level tint.
- [ ] Remains readable and low-noise at 1x and 3x.
- [ ] Includes every declared variant.
- [ ] Water/grass boundary uses all 13 declared blend variants (center/edge/outer-corner/inner-corner), not a hard grid edge; inner corners give the pond a concave, non-rectangular outline.
- [ ] Lily pads and water flowers stay sparse and off-center, not a second visible grid.
- [ ] Reeds and shore rocks follow the flattened "pop-up book" perspective (Section 4a) rather than true top-down or true isometric.
- [ ] Shimmer clip stays subtle — a gentle highlight ripple, not a bright animated effect.
- [ ] Adds no unrelated runtime, map, collision, save, quest, curriculum, or mastery changes.

The machine-readable source is [`farm_water_shoreline_targets.json`](farm_water_shoreline_targets.json).
