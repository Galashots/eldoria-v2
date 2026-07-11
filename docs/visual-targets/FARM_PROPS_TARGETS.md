# Farm Props Targets

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md), Section 7 (Category Rules — Landscape tiles/Buildings/UI).

Plan reference: [`docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`](../beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md), Phase 2 — "Props" required kit.

## Purpose

Define the signpost, storage/gardening prop family, and crop-row overlay targets required before Phase 2 art generation or Phase 3 map integration.

## Scope

Target specifications only. No art, runtime behavior, map edits, collision, or gameplay changes.

## Shared Baseline

- Footprint: `16x16` pixels.
- Pivot: bottom-center of the footprint (`env_farm_signpost` extends upward per Section 4a; the storage props and crop-row overlay are flat).
- PPU: `16`.
- Lighting: consistent upper-left key light.
- Runtime export: PNG. Preferred editable source: `.aseprite`/`.ase`.
- Atlas family: `environment_farm`.
- Colors: draw only from the locked `wood_leather` hex values in [`FARM_ENVIRONMENT_PALETTE_V1.md`](FARM_ENVIRONMENT_PALETTE_V1.md) / [`farm_environment_palette_v1.json`](farm_environment_palette_v1.json).

## Targets

### `env_farm_signpost`

A landmark-scale wooden signpost reusing the existing `sign` interaction kind already declared on `tile_village_interaction_sign`, so both share one non-verbal navigation language for Grade 2 audio-first play. On its `16x32` canvas (footprint `16x16`, pivot `[8,31]`) the interaction box sits on the lower `[0,16,16,16]` footprint, not the drawn post height above it.

### `env_farm_storage_prop`

Crate, barrel, and basket variants sharing `env_farm_fence`'s weathered-wood material story — the plan's "small crate/barrel or gardening prop family."

### `tile_farm_crop_row`

A furrow-line overlay for `tile_farm_tilled_soil` that reads as an organized row of crops from a distance. This is additive to, not a replacement for, the already-specified `tile_farm_crop_sprout` and `tile_farm_crop_harvest` overlays — those still carry the actual growth-state readability requirement.

## Future Art PR Acceptance Checklist

- [ ] Uses the correct target ID.
- [ ] Uses the declared canvas/footprint/pivot for each target.
- [ ] Declares and follows the target palette families.
- [ ] Uses consistent upper-left lighting.
- [ ] Remains readable and low-noise at 1x and 3x.
- [ ] Includes every declared variant.
- [ ] Signpost is visually obvious as a landmark and reuses the existing `sign` interaction language.
- [ ] Storage props share the fence kit's material story rather than introducing a new one.
- [ ] Crop-row overlay does not obscure `tile_farm_tilled_soil`/`tile_farm_crop_sprout`/`tile_farm_crop_harvest` readability.
- [ ] Adds no unrelated runtime, map, collision, save, quest, curriculum, or mastery changes.

The machine-readable source is [`farm_props_targets.json`](farm_props_targets.json).
