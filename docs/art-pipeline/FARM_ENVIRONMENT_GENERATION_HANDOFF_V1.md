# Farm Environment Production-Generation Handoff v1

This document translates the corrected Phase 2 farm-environment **target specifications** into an exact, ordered ChatGPT image-generation sequence, so production source art can be generated cleanly and then flow through the existing normalization pipeline.

- Governing specs (machine-readable source of truth): `docs/visual-targets/farm_village_tile_targets.json`, `farm_water_shoreline_targets.json`, `farm_vegetation_targets.json`, `farm_props_targets.json`, `wildbloom_magical_environment_target.json`.
- Palette lock: `docs/visual-targets/farm_environment_palette_v1.json` / `FARM_ENVIRONMENT_PALETTE_V1.md`.
- Pipeline mechanics: `docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`, `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md`.
- Contract: `docs/VISUAL_ASSET_CONTRACT.md` (Sections 4, 4a, 8a, 13, 14).

## 0. Style-lock boundary (read first)

An approved external farm-environment style-lock reference exists and defines the approved **palette direction, material language, painterly pixel-art finish, outline weight, upper-left lighting, flattened 3/4 "pop-up book" perspective, vegetation density, and magical-landmark treatment.** It is **STYLE REFERENCE ONLY.**

Do **not**: commit that image; normalize it; crop sprites from it; create manifests for it; integrate it into Phaser or the map; or treat its mixed-size layout as a source grid. It is ~1774×887, not evenly divisible into its display grid, uses near-magenta rather than exact `#FF00FF`, and its terrain cells include decorative perimeter content rather than seamless centre tiles. The only thing carried into the repo from it is the sampled hex in `farm_environment_palette_v1.json`.

No production farm-environment art exists yet. Generation has not started. This handoff is the input to that next step.

## 1. Global production rules

1. **One asset per generated image**, OR one same-size family sheet **only** where every cell shares the same source and runtime geometry (see each target's "Gen format" below). **Never** create mixed-size production sheets.
2. **Terrain centre tiles must be seamless** and contain **no** perimeter grass, shoreline, flowers, rocks, lilies, or decorative border. Full-bleed texture, edge-to-edge, tileable.
3. **Water-base tiles must contain only water texture and subtle highlights** — no lilies, reeds, rocks, or shore.
4. **Generate approved centre tiles before their edge or corner variants.** Edge/corner prompts must explicitly reference the approved centre asset ("the same grass texture and palette as the approved `tile_farm_grass_base/grass_a`, fading into dirt only along the north edge").
5. **Tall props use transparent or magenta-keyed space above their footprint** (the drawn height sits above the grounded footprint on the lower part of the canvas).
6. **No baked ground shadows on dynamic or Y-sorted objects** (Section 8a) — the engine draws those. A baked shadow is acceptable only on a static, never-moving asset, and none of the Phase 2 targets are in that category.
7. **No text, labels, UI, borders, grid lines, checkerboards, presentation framing, or scenery** around the subject.
8. Every result must be audited as **APPROVED SOURCE CANDIDATE**, **STYLE REFERENCE ONLY**, **REGENERATE**, or **CHANGE TARGET SIZE** (per `IMAGE_PROMPTING_GUIDE.md`) before normalization.
9. **Do not integrate any generated asset before its runtime-scale (1x and 3x) preview is approved.**
10. Colours must come only from `farm_environment_palette_v1.json`. Do not bake a scene-level warm/gold ambient tint (contract Section 14 applies that once, in code). Keep the consistent upper-left key light (Section 4).

## 2. Pipeline and naming conventions

The pipeline is unchanged: **approved source image → manifest → normalize → validate → repo asset** (`SPRITE_ASSET_PIPELINE.md`).

For a target with id `<id>`, the conventional paths are:

- **Source art (uncommitted-until-approved, then committed as source):** `assets/source/generated/<id>/source_sheet.png`
- **Manifest:** `assets/manifests/<id>.manifest.json`
- **Normalized runtime output (`target.outputPath` in the manifest):**
  - tiles (`tile_*`): `assets/tilesets/<id>.png`
  - props / actors / landmarks (`env_*`): `assets/sprites/<id>.png`

Magenta background is requested as exact `#FF00FF` but generators drift toward near-magenta; use manifest `color_key` (tolerance ~10) or `edge_flood_color_key` (tolerance ~20) cleanup, never tolerance 0. **Full-bleed seamless terrain tiles have no magenta at all** — they are edge-to-edge texture and need no colour key (background `alpha`, no trim).

## 3. Asset categories (drive padding + normalization)

Every target falls into one of three categories. This determines padding, background handling, and anchor.

- **A. Full-cell seamless terrain** — `tile_farm_grass_base`, `tile_farm_path_dirt` (all 13), `tile_farm_water_base`, `tile_farm_water_shore` (all 13), `tile_farm_tilled_soil`.
  - Full-bleed, no magenta padding, seamless/tileable. Normalize: background `alpha`, `trim: none`, `anchor: top_left`, `fit: fill`. Edge/corner blend tiles are still full-cell (grass on one side transitioning to dirt/water on the other), not padded sprites.
- **B. Transparent/magenta-padded decals** (overlays that sit on top of terrain) — `tile_farm_grass_scatter`, `tile_farm_crop_sprout`, `tile_farm_crop_harvest`, `tile_farm_crop_row`, `tile_farm_water_lily`, `tile_farm_water_flower`, `env_farm_bush_small`, `env_farm_flower_cluster`, `env_farm_weed`, `env_farm_stone_small`, `env_farm_shore_rock`, `env_farm_log`.
  - Small subject occupying ~40–60% of the cell, wide magenta padding, off-centre where the target's visualRule says so. Normalize: `edge_flood_color_key`, `trim: alpha`, `anchor: center` (or `center_bottom` for the log/rock), `fit: contain`.
- **C. Tall magenta-padded props** (drawn height above a grounded footprint) — `env_farm_tree`, `env_farm_bush_large`, `env_farm_rock_medium`, `env_farm_reed`, `env_farm_fence`, `env_farm_gate`, `env_farm_signpost`, `env_wildbloom_landmark`.
  - Subject grounded on the lower footprint band with magenta/transparent space above for the drawn height. Normalize: `edge_flood_color_key`, `trim: alpha`, `anchor: center_bottom`, `fit: contain`. No baked shadow.

## 4. Generation batches

Geometry columns below repeat the authoritative target JSON values for convenience; the JSON remains the source of truth. "Gen format" is **single** (one image) or **sheet Nx1/NxM** (a same-size family sheet). Paths follow §2. Cat = category from §3.

### Batch A — foundational production candidates

Generate and get each approved as an **APPROVED SOURCE CANDIDATE** at 1x and 3x **before** any other batch. These prove palette, material, outline, lighting, perspective, and seamlessness once, cheaply.

| Target ID | Variant | Canvas / Foot / Pivot | Layer | Cat | Gen format | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `tile_farm_grass_base` | `grass_a` | 16×16 / 16×16 / [8,15] | terrain | A | single | `assets/tilesets/tile_farm_grass_base.png` |
| `tile_farm_path_dirt` | `center` | 16×16 / 16×16 / [8,15] | terrain | A | single | `assets/tilesets/tile_farm_path_dirt.png` |
| `tile_farm_water_base` | `water_a` | 16×16 / 16×16 / [8,15] | terrain | A | single | `assets/tilesets/tile_farm_water_base.png` |
| `env_farm_tree` | `oak` | 32×48 / 16×16 / [16,47] | actors_body | C | single | `assets/sprites/env_farm_tree.png` |
| `env_farm_fence` | `rail_horizontal` | 16×32 / 16×16 / [8,31] | actors_body | C | single | `assets/sprites/env_farm_fence.png` |
| `env_farm_rock_medium` | `rock_a` | 32×32 / 16×16 / [16,31] | actors_body | C | single | `assets/sprites/env_farm_rock_medium.png` |
| `env_wildbloom_landmark` | `root_star_revealed` | 32×32 / 16×16 / [16,31] | actors_body | C | single | `assets/sprites/env_wildbloom_landmark.png` |

Audit criteria (Batch A):
- **grass_a:** seamless when tiled 3×3 (no visible seam, no directional lighting gradient across the tile that would reveal repetition); low-noise; quieter than actors; forest hex only; no flowers/scatter baked in.
- **path_dirt/center:** seamless; walkable-reading dirt; wood_leather + forest hex; **no** grass fringe or perimeter (that belongs to the edge variants).
- **water_a:** seamless; calm; only water + subtle highlight; water hex only; no lily/reed/rock/shore.
- **tree/oak:** flattened "pop-up book" silhouette, grounded on the lower footprint, magenta above; canopy reads at 1x; no baked shadow; distinct broad-oak shape.
- **fence/rail_horizontal:** upper-left light correct (not derived by flipping); grounded footprint on lower 16px; magenta above; weathered-wood material.
- **rock_medium/rock_a:** metal_stone hex; grounded; magenta above; reads as a landmark rock at 1x.
- **root_star_revealed:** matches pinned Root-Star accents exactly (`#FFD666` / `#8FD14F`), star rune; moss/stone base from forest/metal_stone; grounded; reads as one cohesive magical-landmark family member.

Batch A is the **gate**: if palette, seamlessness, perspective, or outline weight are wrong here, fix the prompt strategy before proceeding. Do not batch-generate B–F until A is approved.

### Batch B — terrain variations

Generate **after** the Batch A centres are approved; every edge/corner prompt references the approved centre.

| Target ID | Variants | Canvas / Foot / Pivot | Layer | Cat | Gen format | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `tile_farm_grass_base` | `grass_b`, `grass_c` | 16×16 / 16×16 / [8,15] | terrain | A | single each | (same output; add cells) |
| `tile_farm_path_dirt` | `edge_north/south/west/east`, `corner_ne/nw/se/sw`, `inner_corner_ne/nw/se/sw` | 16×16 / 16×16 / [8,15] | terrain | A | single each, centre-referenced | `assets/tilesets/tile_farm_path_dirt.png` |
| `tile_farm_water_base` | `water_b` | 16×16 / 16×16 / [8,15] | terrain | A | single | `assets/tilesets/tile_farm_water_base.png` |
| `tile_farm_water_shore` | `center`, `edge_north/south/west/east`, `corner_ne/nw/se/sw`, `inner_corner_ne/nw/se/sw` | 16×16 / 16×16 / [8,15] | terrain | A | single each, centre-referenced | `assets/tilesets/tile_farm_water_shore.png` |

Audit criteria (Batch B):
- Every edge/corner joins its centre **seamlessly** with no hard grid line; the reduced 13-tile set is complete (1 centre + 4 edges + 4 outer corners + 4 inner corners). Inner corners must produce a natural concave join so the path/pond can be irregular, not a convex rectangle.
- Grass variants read as the same grass at different micro-detail, not different greens.
- Shore tiles transition grass→water as a soft sandy/mossy band, not a hard edge; water side uses the approved `water_a` texture.

### Batch C — vegetation

| Target ID | Variants | Canvas / Foot / Pivot | Layer | Cat | Gen format | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `env_farm_tree` | `pine`, `blossom` | 32×48 / 16×16 / [16,47] | actors_body | C | single each | `assets/sprites/env_farm_tree.png` |
| `env_farm_bush_small` | `cluster_a`, `cluster_b` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 2×1 ok | `assets/sprites/env_farm_bush_small.png` |
| `env_farm_bush_large` | `cluster_a`, `cluster_b` | 32×32 / 16×16 / [16,31] | actors_body | C | single each | `assets/sprites/env_farm_bush_large.png` |
| `env_farm_flower_cluster` | `gold`, `violet`, `crimson`, `blue` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 4×1 ok | `assets/sprites/env_farm_flower_cluster.png` |
| `env_farm_weed` | `weed_a`, `fern_a`, `fern_b` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 3×1 ok | `assets/sprites/env_farm_weed.png` |
| `env_farm_stone_small` | `stone_a`, `stone_b` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 2×1 ok | `assets/sprites/env_farm_stone_small.png` |
| `env_farm_log` | `log_a` | 32×16 / 32×16 / [16,15] | decals_low | B | single | `assets/sprites/env_farm_log.png` |

Audit criteria (Batch C):
- The three trees are **visibly distinct silhouettes** (broad oak, tall pine, flowering blossom), not recolors, and share the tree canvas/pivot with the approved oak.
- Bushes, flowers, weeds, stones are sparse and off-centre, quieter than actors, no obvious repeated stamp; flower palettes match the four locked flora hues via `forest`/`water` ranges (gold/violet/crimson/blue as approved).
- Log lies flat, low profile; no baked shadow.

### Batch D — structures and props

| Target ID | Variants | Canvas / Foot / Pivot | Layer | Cat | Gen format | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `env_farm_fence` | remaining: `post`, `rail_vertical`, `corner_ne/nw/se/sw`, `broken_horizontal`, `broken_vertical` | 16×32 / 16×16 / [8,31] | actors_body | C | single each (no rotation/mirror) | `assets/sprites/env_farm_fence.png` |
| `env_farm_gate` | `closed`, `broken` | 32×32 / 32×16 / [16,31] | actors_body | C | single each | `assets/sprites/env_farm_gate.png` |
| `env_farm_signpost` | `idle` | 16×32 / 16×16 / [8,31] | actors_body | C | single | `assets/sprites/env_farm_signpost.png` |
| `env_farm_storage_prop` | `crate`, `barrel`, `basket` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 3×1 ok | `assets/sprites/env_farm_storage_prop.png` |
| `tile_farm_crop_row` | `furrow_a`, `furrow_b` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 2×1 ok | `assets/tilesets/tile_farm_crop_row.png` |

Audit criteria (Batch D):
- **Fence orientations are each authored, never flipped/rotated** — verify the upper-left key light is consistent on `rail_vertical`, all four `corner_*`, and both `broken_*` (a mirrored rail would light from the wrong side). Grounded footprint on lower 16px, magenta above.
- Gate matches fence material; `broken` reuses the fence damage language; collision/interaction read on the lower `[0,16,32,16]` footprint (metadata only).
- Signpost reads as a landmark at 1x; interaction on lower `[0,16,16,16]` footprint.
- Storage props share the fence's weathered-wood story; crop-row furrows read as organized rows and do not obscure soil state.

### Batch E — water decoration

| Target ID | Variants | Canvas / Foot / Pivot | Layer | Cat | Gen format | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `tile_farm_water_lily` | `lily_a`, `lily_b` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 2×1 ok | `assets/tilesets/tile_farm_water_lily.png` |
| `tile_farm_water_flower` | `flower_a`, `flower_b` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 2×1 ok | `assets/tilesets/tile_farm_water_flower.png` |
| `env_farm_reed` | `reed_a`, `reed_b` | 16×32 / 16×16 / [8,31] | decals_low | C | single each | `assets/sprites/env_farm_reed.png` |
| `env_farm_shore_rock` | `cluster_a`, `cluster_b` | 16×16 / 16×16 / [8,15] | decals_low | B | sheet 2×1 ok | `assets/sprites/env_farm_shore_rock.png` |
| `tile_farm_water_base` | shimmer frames (`shimmer` clip, 3–4 frames) | 16×16 / 16×16 / [8,15] | terrain | A | sheet 1×N (same geometry) | `assets/tilesets/tile_farm_water_base.png` |

Audit criteria (Batch E):
- Lilies/water-flowers sparse and off-centre (~40–50% cell), read as floating on the approved `water_a`, not a second grid.
- Reeds use flattened perspective (tall over a 16×16 footprint), sit at the shoreline.
- Shore rocks low-profile, wet-look, sit at the water/grass boundary.
- Shimmer frames are a **subtle** looping highlight ripple over the same water texture — small amplitude, no bright animated flash; frames must be seamless with `water_a`.

### Batch F — Wildbloom family

| Target ID | Variants | Canvas / Foot / Pivot | Layer | Cat | Gen format | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `env_wildbloom_landmark` | `root_star_indicator`, `moonwell_echo_indicator`, `foxfire_seed_indicator`, `moonwell_echo_revealed`, `foxfire_seed_revealed` (root_star_revealed done in Batch A) | 32×32 / 16×16 / [16,31] | actors_body | C | single each | `assets/sprites/env_wildbloom_landmark.png` |

Audit criteria (Batch F):
- All three identities read as **one cohesive family** (shared moss/stone silhouette) with the approved `root_star_revealed` from Batch A.
- Accents match the pinned values exactly: Root-Star `#FFD666`/`#8FD14F` (star rune), Moonwell Echo `#9FD7FF`/`#8F63FF` (waves rune), Foxfire Seed `#A9E783`/`#72B95C` (flame rune).
- `indicator` states read as quiet/dormant (small hum/glow); `revealed` states read as a permanent landmark. No baked shadow.

### Addendum — pre-specified farm targets not enumerated in Batches A–F

These were specified before this handoff (in `farm_village_tile_targets.json`) and are part of the farm plot, but the reviewer's batch list did not place them. Recommended slotting (please confirm — see §6):

| Target ID | Variants | Canvas / Foot / Pivot | Layer | Cat | Suggested batch |
| --- | --- | --- | --- | --- | --- |
| `tile_farm_grass_scatter` | `tuft_a`, `tuft_b`, `pebble_a`, `flower_a` | 16×16 / 16×16 / [8,15] | decals_low | B | with Batch C (grass decoration) |
| `tile_farm_tilled_soil` | `dry`, `wet`, `seeded` | 16×16 / 16×16 / [8,15] | terrain | A | with Batch D (crop plot family) |
| `tile_farm_crop_sprout` | `sprout_a`, `sprout_b` | 16×16 / 16×16 / [8,15] | decals_low | B | with Batch D |
| `tile_farm_crop_harvest` | `ready_a`, `ready_b`, `sparkle_optional` | 16×16 / 16×16 / [8,15] | decals_low | B | with Batch D |

Village targets (`tile_village_shop_wall`/`door`, `tile_village_interaction_sign`) are **out of scope** for the farm environment kit and this handoff.

## 5. Manifest hints per category

When authoring `assets/manifests/<id>.manifest.json` after source approval:

- **Category A (seamless terrain):** `target.cellPx: [16,16]`; `cols/rows` = variant count layout; per-frame `background: { mode: "alpha" }`, `trim: "none"`, `anchor: "top_left"`, `fit: "fill"`. No colour key (full-bleed).
- **Category B (decals):** `cellPx: [16,16]` (or `[32,16]` for the log); `background: { mode: "edge_flood_color_key", color: "#FB03FA", tolerance: 20 }`; `trim: "alpha"`; `anchor: "center"` (`center_bottom` for log); `fit: "contain"`.
- **Category C (tall props):** `cellPx` = the target canvas (e.g. `[16,32]`, `[32,32]`, `[32,48]`); `background: edge_flood_color_key`; `trim: "alpha"`; `anchor: "center_bottom"`; `fit: "contain"`. Footprint/pivot per the target JSON.

Follow the committed `mob_slime_practice_v001.manifest.json` as the working reference for structure.

## 6. Remaining ambiguity to resolve before Batch A

1. **Addendum slotting (§4 addendum):** confirm `tile_farm_grass_scatter`, `tile_farm_tilled_soil`, `tile_farm_crop_sprout`, and `tile_farm_crop_harvest` should generate alongside Batches C/D as suggested (they are required for a complete farm but were not in the A–F list).
2. **Multi-variant output packing:** several targets output to a single PNG holding all variants (e.g. all 13 dirt tiles in `tile_farm_path_dirt.png`). Confirm the preferred runtime layout (single packed sheet per target vs. one file per variant) so manifest `cols/rows` can be fixed; this handoff assumes one packed sheet per target ID.
3. **Water shimmer runtime mechanism** is deferred to Phase 3 (Tiled animated tile vs. lightweight texture swap); the shimmer frames are authored here but their runtime loop is not decided.
4. **`env_farm_shore_rock` vs `env_farm_rock_medium` distinction** at 16×16 vs 32×32 — confirm shore rocks stay small decals (Category B) while the medium rock is the landmark (Category C), as specified.

None of these block authoring the palette/target specs; they only need answering before the first production images are generated.
