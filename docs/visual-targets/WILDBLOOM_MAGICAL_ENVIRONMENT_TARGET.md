# Wildbloom Magical Environment Target

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md), Sections 4 (Palette And Lighting) and 8a (Grounding And Shadows).

Plan reference: [`docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md`](../beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md), Phase 2 — "one magical environmental family suitable for Wildbloom discoveries."

## Purpose

Define the target for a real production replacement of the Wildbloom Sprig discovery loop's current code-drawn moss/stone/rune placeholder (`src/presentation/WildbloomDiscoveryController.ts`), so the three existing secrets (Root-Star Sigil, Moonwell Echo, Foxfire Seed) read as one cohesive magical landmark family instead of primitive Phaser graphics.

## Scope

Target specification only. No art, runtime behavior, quest, save, or discovery-logic changes. `WildbloomDiscoveryController.ts` remains the sole owner of sensing radius, reveal timing, persistence, and inventory keys.

## Why one target with six variants, not three separate targets

All three secrets already share one composition in code (moss base + stone + rune + glow) and one interaction model (sense → reveal). Declaring them as one target with `indicator`/`revealed` state variants per identity keeps that shared visual language explicit and auditable, rather than risking three families that drift apart.

## Targets

### `env_wildbloom_landmark`

Six variants covering the three existing lore identities' two visual states:

- `root_star_indicator` / `root_star_revealed` — gold/green, star rune, "beneath the oldest roots" (a future tree/roots landmark per the Phase 3 plan).
- `moonwell_echo_indicator` / `moonwell_echo_revealed` — blue/violet, waves rune, "ripples... below the soil" (a future water/stone landmark).
- `foxfire_seed_indicator` / `foxfire_seed_revealed` — green/green, flame rune, "a sleeping green flame" (a future meadow/log/flower landmark).

Accent colors and rune motifs are pinned to the exact hex values and identities already live in `WildbloomDiscoveryController.ts`'s `WILDBLOOM_SPOTS` definition — this target does not invent new lore or colors. Those same pinned values are mirrored in [`FARM_ENVIRONMENT_PALETTE_V1.md`](FARM_ENVIRONMENT_PALETTE_V1.md) / [`farm_environment_palette_v1.json`](farm_environment_palette_v1.json) under `wildbloomAccents` as the authoritative cross-reference; the surrounding moss/stone draws from the locked `forest` and `metal_stone` base swatches.

Accordingly, the target's `paletteFamilies` contains exactly `forest` and `metal_stone`: these describe the landmark's base materials. The identity colors are deliberately separate exact-accent data, not an `arcane` base-material declaration. Root-Star review must combine base-family tolerance with exact `wildbloomAccents.root_star` presence and full opaque-pixel coverage.

## Future Art PR Acceptance Checklist

- [ ] Uses the correct target ID and all six variants.
- [ ] Uses the declared canvas/footprint/pivot.
- [ ] Uses the pinned accent colors and rune motifs per identity (do not reinterpret lore/colors).
- [ ] All three identities read as one cohesive family (shared silhouette/material language), not three unrelated props.
- [ ] Indicator state reads as quiet/dormant; revealed state reads as a permanent landmark.
- [ ] Uses consistent upper-left lighting.
- [ ] Remains readable and low-noise at 1x and 3x.
- [ ] No baked ground shadow (Section 8a) — this is a dynamic, Y-sorted world object; shadow stays engine-drawn at integration time.
- [ ] Adds no unrelated runtime, save, quest, curriculum, or mastery changes; `WildbloomDiscoveryController.ts` remains gameplay authority.

The machine-readable source is [`wildbloom_magical_environment_target.json`](wildbloom_magical_environment_target.json).
