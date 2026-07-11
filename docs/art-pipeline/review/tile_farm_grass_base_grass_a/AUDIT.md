# Batch A audit — `tile_farm_grass_base` / `grass_a`

Date: 2026-07-11
Branch: `claude/beautification-phase2-batch-a-grass-a`
Scope: source acceptance, review-only normalization, and seam/repetition audit for the first Batch A candidate. **Source-art processing and review only — no runtime, map, or production-manifest work.**

## 1. Source identity and provenance

| Field | Value |
| --- | --- |
| Target ID / variant | `tile_farm_grass_base` / `grass_a` |
| Declared spec | `docs/visual-targets/farm_village_tile_targets.json` — canvas `16×16`, footprint `16×16`, pivot `[8,15]`, `renderLayer: terrain`, `paletteFamilies: ["forest"]`, category A (full-cell seamless terrain) per `FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md` §3 |
| ChatGPT source verdict | **APPROVED SOURCE CANDIDATE** (given prior to this task; re-confirmed here against the actual received binary) |
| Received format | PNG |
| Received dimensions | 1254 × 1254 |
| Received mode | 8-bit RGB (no alpha channel), non-interlaced |
| Received SHA-256 | `19da7c6154634fd96b94e676b594efff32d80a870494c1f7c13b1b2312c2b044` |
| Expected SHA-256 (per task) | `19da7c6154634fd96b94e676b594efff32d80a870494c1f7c13b1b2312c2b044` — **match** |
| Committed source path | `assets/source/generated/tile_farm_grass_base/grass_a.png` |
| Commit method | Byte-for-byte copy; verified identical via `sha256sum` and `cmp` immediately after copy |

The approved source was **not** cropped, recolored, sharpened, denoised, resaved, or otherwise altered. It remains exactly the received binary.

## 2. Packed-sheet status

The production target `tile_farm_grass_base` is a deterministic **3×1** sheet (`grass_a`, `grass_b`, `grass_c`) per `FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md` §5.1. **Only `grass_a` exists.** No `grass_b`/`grass_c` source, manifest, or output was created or invented. No production manifest, no final `1×1` manifest pretending the target is complete, and no `3×1` sheet with placeholder/duplicated cells was committed. The canonical production paths (`assets/manifests/tile_farm_grass_base.manifest.json`, `assets/tilesets/tile_farm_grass_base.png`) do not exist and were not created.

## 3. Review-only normalization strategy

Everything in this section lives under `docs/art-pipeline/review/tile_farm_grass_base_grass_a/` — **not** under `assets/manifests/` or `assets/tilesets/` — specifically so it cannot be mistaken for the production manifest/sheet. It exercises the real pipeline scripts (`normalize-asset-sheet.mjs`, `validate-asset-sheet.mjs`), not a parallel implementation.

Category A settings used, per the handoff:

- background mode: `alpha` (preserve source)
- trim: `none`
- anchor: `top_left`
- fit: `fill`

### Pipeline limitation — fixed generically (2026-07-11)

Originally, `scripts/normalize-asset-sheet.mjs` rejected a source frame under `background.mode: "alpha"` unless the source PNG already had an alpha channel (`colorType 6`), and `collectManifestErrors` only accepted `fit: "contain"` even though the handoff's Category A guidance specifies `fit: "fill"`. This review manifest originally worked around the first issue with a byte-exact RGBA round-trip copy (`grass_a.rgba-adapter.png`) and worked around the second by relying on the fact that a square source into a square cell makes `contain` and `fill` numerically identical.

Per ChatGPT's review comment on PR #72, both gaps have now been fixed generically in `scripts/normalize-asset-sheet.mjs` rather than left as a per-source workaround:

- `background.mode: "alpha"` now explicitly accepts an RGB (alpha-less) source; `readPng()` already synthesizes a fully-opaque (alpha=255) RGBA buffer for RGB PNGs, so no new architecture was needed — only the validation gate that previously rejected this case.
- `fit: "fill"` is now implemented in `paste()`: it scales independently in X and Y to exactly the destination cell size (`dw = cw`, `dh = ch`), using the same nearest-neighbour sampling as `contain`, fully covering the cell with no transparent padding. `fit: "contain"` is unchanged. An unknown `fit` value (e.g. `"cover"`) is still rejected.
- Two new focused tests were added to `scripts/test-asset-pipeline.mjs` covering both changes (RGB+alpha normalization; `contain` vs `fill` on a non-square source; rejection of an unknown `fit` value).

This manifest was updated to match: `sources.grass_a_source.path` now points **directly** at the approved source (`assets/source/generated/tile_farm_grass_base/grass_a.png`, resolved via a relative path from this manifest's directory), `background.mode` remains `"alpha"`, and `frames[0].fit` is now `"fill"`. `grass_a.rgba-adapter.png` was deleted — it is no longer needed.

**Regenerated output is byte-identical to the prior adapter-based output.** Before regenerating, the prior `grass_a.review-normalized.png` SHA-256 was recorded as `40655a11051d5afaf61f5972b471c82419fda0f7e31793b3a2976498e6b5fddb`. After regenerating through the fixed pipeline (real source, `fit: "fill"`), the new output's SHA-256 is the same: `40655a11051d5afaf61f5972b471c82419fda0f7e31793b3a2976498e6b5fddb`. This is expected — the source is square (1254×1254) and the destination cell is square (16×16), so `fill` and `contain` compute the identical scale factor in both axes, and the RGBA-adapter copy was already byte-exact to the real source's RGB values with alpha=255. All seam/gradient/palette findings in this document (computed from the normalized pixel data) therefore still hold unchanged; the four evidence preview images below were regenerated (nearest-neighbour only, same method) from those identical pixels.

### Files

| Purpose | Path |
| --- | --- |
| Review manifest | `docs/art-pipeline/review/tile_farm_grass_base_grass_a/grass_a.review.manifest.json` |
| Approved source used directly by the review manifest | `assets/source/generated/tile_farm_grass_base/grass_a.png` |
| Normalized 16×16 review output | `docs/art-pipeline/review/tile_farm_grass_base_grass_a/grass_a.review-normalized.png` |

`npm run normalize:asset -- --manifest docs/art-pipeline/review/tile_farm_grass_base_grass_a/grass_a.review.manifest.json` and `npm run validate:asset -- --manifest ...` both pass (see command log in the PR report). Output confirmed **16×16, RGBA, alpha uniformly 255** (no unexpected transparency).

## 4. Visual evidence

All nearest-neighbor only — no Lanczos, bilinear, bicubic, antialiasing, or smoothing at any stage (verified by construction: the evidence-generation script does per-pixel nearest-source-index copies only).

| # | Requirement | File |
| --- | --- | --- |
| 1 | Original approved source | `assets/source/generated/tile_farm_grass_base/grass_a.png` (already committed; not duplicated) |
| 2 | Exact normalized 16×16 candidate | `grass_a.review-normalized.png` |
| 3 | Nearest-neighbour enlarged preview, ≥16× | `grass_a.preview-20x.png` (20×, 320×320) |
| 4 | 3×3 tiled repetition | `grass_a.tile-3x3-8x.png` (raw 3×3 = 48×48, enlarged 8× to 384×384 for legibility) |
| 5 | Larger field preview, ≥12×8 cells | `grass_a.field-12x8-3x.png` (raw 12×8 = 192×128, enlarged 3× to 576×384) |
| 6 | Comparison panel (source / enlarged 16×16 / 3×3 repeat) | `grass_a.comparison-panel.png` (three 288×288 nearest-neighbor cells) |

## 5. Seam and repetition audit

### Visual inspection

- **Comparison panel / 3×3 / field previews**: no hard grid lines, no cross-shaped or checkerboard artifact at any tile boundary; the mottled texture reads continuously across every internal seam.
- **No baked objects**: no flowers, rocks, dirt, paths, weeds, footprints, or decorative border/perimeter anywhere in the 16×16 result — pure mottled grass texture, consistent with the Category A "full-bleed, no perimeter" rule.
- **No dominant repeated stamp**: at runtime (16×16) size, the texture reads as generic pixel-level mottling, not a single repeated "V"-shaped tuft or other identifiable motif.
- **Quietness**: colors are mid-tone, muted greens (see palette check below) — reads as quieter than an actor/prop would, consistent with a base terrain layer.
- **Expected single-tile repetition**: because only `grass_a` exists, the 3×3 and 12×8 previews do show the *same* 16×16 tile repeating at a fixed period — that is expected and is exactly why `grass_b`/`grass_c` exist (map-level variation breaks up single-tile repetition; that's Batch B work, out of scope here). The audit finding here is the absence of a *seam*, not the absence of repetition from a lone variant.

### Deterministic edge/wrap check

Computed directly from the normalized 16×16 RGBA pixel data (not eyeballed):

| Metric | Value |
| --- | --- |
| Average column-wrap step (col 15 → col 0, i.e. the actual horizontal tile-boundary transition) | 19.41 (RGB Euclidean distance) |
| Average internal column step (adjacent columns within the tile) | 28.41 |
| **Wrap ÷ internal ratio (horizontal)** | **0.683** |
| Average row-wrap step (row 15 → row 0) | 21.21 |
| Average internal row step | 26.81 |
| **Wrap ÷ internal ratio (vertical)** | **0.791** |

A seam would show up as the wrap step being *much larger* than the typical internal step (an abrupt jump not seen anywhere else in the texture). Here the wrap step is **smaller** than the average internal step in both axes (ratios < 1), i.e. the tile boundary is at least as smooth as an arbitrary internal pixel-to-pixel transition. No seam signature.

### Directional brightness gradient check

Per-row and per-column average luminance (Rec. 601-ish weights) was computed and correlated against row/column index:

- Row-luminance range: 15.13 (≈15.7% of the tile's mean luminance), correlation with row index: **-0.199**
- Column-luminance range: 20.86 (≈21.6% of mean), correlation with column index: **0.053**

Both correlations are close to 0 (far from ±1), meaning the luminance variation across the tile is textural noise, not a monotonic left-to-right/top-to-bottom lightening or darkening trend. No directional gradient that would expose repetition.

### Palette compatibility (`forest` family)

`farm_environment_palette_v1.json` locks `forest` to `["#0A3521", "#174F1D", "#325E19", "#427118", "#6C8B15", "#91A513"]`. For every one of the 256 pixels in the normalized tile, the nearest-forest-swatch RGB Euclidean distance was computed: **min 2.8, median 10.7, max 26.6 — all 256/256 pixels within 40 units of a locked forest swatch.** The candidate reads as natural shading/variation of the locked palette, not off-family color.

### Format checks

- No JPEG artifacts possible: source and normalized output are both PNG (lossless) end-to-end; confirmed via `file` and the pipeline's own PNG decoder.
- No unexpected alpha: normalized output alpha channel is uniformly 255 (fully opaque) across all 256 pixels.
- Runtime smoothing: not applicable at this stage — no runtime integration occurred (out of scope for this task). The project-wide engine setting is nearest/point sampling (`VISUAL_ASSET_CONTRACT.md` §3); this was not independently re-verified here since nothing was loaded into Phaser.

## 6. Verdict

- **Source-audit status: APPROVED SOURCE CANDIDATE** (re-confirmed against the actual received binary — format, dimensions, and hash all match exactly).
- **Review-only normalization: produced and passes the pipeline's own `normalize`/`validate` scripts.** Seam, gradient, and palette checks all pass, both visually and deterministically.
- **Final runtime approval: NOT granted and not applicable yet.** `tile_farm_grass_base` is a 3-cell packed target and only 1 of 3 cells (`grass_a`) exists. This candidate is **not** a `NORMALIZED RUNTIME ASSET` and is **not** `RUNTIME-INTEGRATED` — it has not been placed at a production manifest/output path, has not been loaded in Phaser, and has not touched `public/maps/farm.json`.
- **Next step is ChatGPT's final review of the pipeline fix described above**, not further generation. `grass_b`/`grass_c` and `tile_farm_path_dirt` remain out of scope until that review completes.

## 7. Pipeline note for the next author

Both script/doc mismatches noted in earlier revisions of this document have now been fixed generically in `scripts/normalize-asset-sheet.mjs` (see §3 above): `background.mode: "alpha"` accepts RGB sources, and `fit: "fill"` is implemented alongside `fit: "contain"`. Future full-bleed terrain sources (dirt, water, tilled soil, etc.) can declare `background.mode: "alpha"` and `fit: "fill"` directly against their approved RGB source with no adapter step required.
