# Farm Environment Palette v1

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md), Section 4 (Palette And Lighting) and the [Stardew-Caliber Visual Research](../research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md) Finding 3.

## Purpose

Section 4 of the contract requires a sub-palette's **actual hex values** be locked before production art is committed, so later assets in the same family cannot silently drift. This file is that lock for the farm environment kit. The values are **sampled from the approved external farm-environment style-lock reference** (generated from the approved farm and Waking Gate references).

## Style-lock provenance and boundary

The style-lock image these colors were sampled from is **STYLE REFERENCE ONLY**. It is approved for palette direction, material language, painterly finish, outline weight, upper-left lighting, flattened 3/4 perspective, vegetation density, and magical-landmark treatment. It is **not** production source art, is intentionally **not committed** to this repository, and must not be normalized, cropped, manifested, or integrated. Only the sampled hex values below are locked.

## Environment base swatches

Ordered darkest → lightest. The artist/generator applies the contract's upper-left key light (highlights upper-left, shadows down-right); do not bake a scene-level ambient tint into source art (Section 14 applies that once, in code).

### `forest` — grass, foliage, tree canopy, meadow
`#0A3521` · `#174F1D` · `#325E19` · `#427118` · `#6C8B15` · `#91A513`

### `wood_leather` — dirt path, fences, gates, signposts, crates, logs
`#412E15` · `#674B1F` · `#926B2A` · `#B98535` · `#D5A342`

### `water` — pond water
`#0B4961` · `#0A6089` · `#3E9DC6`

### `metal_stone` — stones, rocks, shore rocks
`#30362E` · `#4E4F41` · `#786F50` · `#A49577` · `#ECE0B1`

## Wildbloom identity accents — preserved exactly, not environment base swatches

Locked by `src/presentation/WildbloomDiscoveryController.ts` (`WILDBLOOM_SPOTS`); authoritative gameplay values. The Wildbloom magical-family art must match these exactly; the surrounding moss/stone draws from the `forest`/`water`/`metal_stone` base swatches.

| Identity | Accent | Secondary |
| --- | --- | --- |
| Root-Star | `#FFD666` | `#8FD14F` |
| Moonwell Echo | `#9FD7FF` | `#8F63FF` |
| Foxfire Seed | `#A9E783` | `#72B95C` |

## Mapping to contract family names

The target JSONs keep the contract's canonical Section 4 family vocabulary in their `paletteFamilies` arrays; this file locks the actual hex for the farm-environment subset:

| This palette | Contract family used in targets |
| --- | --- |
| `forest` | `forest` |
| `wood_leather` | `wood_leather` |
| `water` | `arcane` (cool water range only) |
| `metal_stone` | `metal` |

Village stone/UI colors (`ruins`, `ui_neutral`) and character colors (`skin_hair`) are out of scope and locked when their own art lands. This is not a master-palette redesign.

The machine-readable source is [`farm_environment_palette_v1.json`](farm_environment_palette_v1.json), validated by `npm run validate:visual-targets`.
