# Sprite Asset Pipeline

Eldoria treats AI-generated images as **source art**, not final runtime assets.

Image generation can be excellent for style, concepts, and source sheets, but the repo needs deterministic files with exact dimensions, exact grid structure, true transparency, and repeatable validation. The asset-sheet pipeline converts approved source PNGs into packed runtime PNGs for Phaser.

## Pipeline rule

```text
AI source image -> source/runtime audit -> manifest -> normalize -> validate -> runtime review -> repo asset -> integration
```

Concept sheets are for style approval only. Runtime assets should come from production source sheets or approved runtime masters that have been deterministically converted into canonical production sources.

## What the normalizer does

`scripts/normalize-asset-sheet.mjs` reads a manifest and writes an exact PNG sheet.

It supports:

- variable target cell sizes,
- variable sheet rows and columns,
- source sheets with a uniform grid,
- source rectangles,
- transparent PNG sources,
- pure color-key backgrounds such as `#ff00ff`,
- edge-flood color-key cleanup that removes only matching pixels connected to a frame edge,
- nearest-neighbor scaling,
- alpha trimming,
- empty unused cells.

It is intentionally manifest-driven. Do not hardcode Practice Slime, hero, tile, tree, or building assumptions into the script.

## What the normalizer does not do

This pipeline deliberately limits cleanup to deterministic alpha and color-key operations.

Out of scope:

- checkerboard removal,
- automatic object segmentation,
- background guessing,
- AI-style correction,
- motif removal,
- seam repair,
- palette reinterpretation,
- animation timing,
- Phaser runtime integration.

For reliable cleanup, source art must use either true transparency or a deliberate pure color key. Use `color_key` to remove every matching pixel. Use `edge_flood_color_key` when matching colors enclosed inside the sprite must remain visible; it flood-fills each source frame or rectangle from its edges.

## Prompting rules for ChatGPT source sheets

For production source sheets, prompt for:

- no text,
- no labels,
- no borders,
- no UI,
- no presentation-board layout,
- uniform rows and columns,
- consistent cell alignment,
- no shadows or effects outside sprite cells,
- unused cells fully filled with the background/key,
- pure magenta `#ff00ff` background when true alpha is not reliable,
- crisp pixel art with nearest-neighbor-friendly shapes.

For 6x4 sprite sheets, prefer a **3:2 generated source image**. Common high-resolution outputs with a 3:2 shape divide cleanly into 6 columns and 4 rows.

Detailed generation and audit wording lives in `IMAGE_PROMPTING_GUIDE.md`.

## Approval gates

Do not treat a generated image as production-ready until both source-scale and runtime-scale review have been completed.

### Source-scale gate

Check:

- correct subject, state, and variant;
- no text, border, UI, checkerboard, watermark, or unrelated scenery;
- no edge contact or cell bleed;
- correct palette direction, perspective, upper-left light, and silhouette;
- no forbidden high-resolution motif that would make the source unsuitable as canonical production art.

### Runtime-scale gate

Check the exact normalized pixels, not a filtered preview:

- declared dimensions and alpha mode;
- silhouette and major colour clusters at `1×`;
- enlarged nearest-neighbour inspection preview;
- palette-distance metrics where a locked palette applies;
- seam and repetition evidence for terrain;
- contact-sheet or family consistency where multiple related assets exist.

For terrain, a 3×3 repeat catches hard seams while a larger field repeat catches soft stripes, clusters, directional drift, and fixed-frequency motifs. Both matter.

Metrics support the verdict but do not replace human visual review.

## Approved Runtime Master workflow

Sometimes the AI-generated high-resolution source cannot be used directly, even after an otherwise-promising candidate normalizes cleanly to its runtime size—for example, high-resolution plus/cross motifs, rosettes, ripples, scales, or other patterns that disappear once downscaled. In that case:

- The **runtime-approved normalized asset**—the exact pixel data that passed visual review at its real runtime size—becomes the **canonical master**, not the original high-resolution generation.
- Classify it explicitly as **APPROVED RUNTIME MASTER**, not **APPROVED SOURCE CANDIDATE**.
- The canonical high-resolution **production source** is then generated from that master by **deterministic nearest-neighbour upscaling only** with `scripts/upscale-nearest-neighbor.mjs`. Every master pixel becomes one solid-colour square block in the output. No filtering, interpolation, sharpening, antialiasing, colour modification, or palette change is allowed.
- Required verification before this source is treated as approved:
  - **block exactness**—every high-resolution output pixel matches the expected source-master block;
  - **zero-drift round trip**—normalizing the upscaled source back down through the real pipeline with `fit: "fill"` reproduces all original runtime-master pixels exactly;
  - **palette verification**—every pixel is measured against the target's locked palette families and any tolerance exceptions are recorded;
  - **type-specific visual audit**—terrain receives wrap-boundary seam metrics plus `3×3` and large-field repetition views; modular fences/walls receive a repeated strip and connection-edge view; isolated props receive alpha/bounds, footprint/pivot, exact `1×`, and enlarged nearest-neighbour inspection;
  - **review evidence**—normalized output, the applicable type-specific previews, and a concise `AUDIT.md` with hashes, measurements, reviewed paths, and verdict.

The upscaler reads image data through `readPng()`, which always exposes an RGBA-expanded buffer even for RGB source PNGs. It therefore always uses a four-byte read stride. The default `rgb` mode writes an opaque RGB canonical source; `--mode rgba` preserves every source alpha value and writes an RGBA canonical source. Regression tests protect both paths, including transparent and semitransparent block replication.

Worked examples:

- `docs/art-pipeline/review/tile_farm_path_dirt_center/AUDIT.md`
- `docs/art-pipeline/review/tile_farm_water_base_water_a/AUDIT.md`

Use this workflow when the exact runtime result is already good. Do not continue indefinite image regeneration solely to make the discarded high-resolution generation look cleaner.

## Lessons from the first farm terrain approvals

The approved grass, dirt, and water work established these operating rules:

1. **A beautiful high-resolution image is not the acceptance target.** The exact runtime pixels are.
2. **Quiet terrain must remain quieter than actors and interactables.** Decorative interest belongs in separate scatter, shore, flora, prop, shimmer, and landmark assets.
3. **The generator may invent palette intermediates even when exact hex values are requested.** Measure the normalized pixels instead of trusting the prompt.
4. **“Seamless” is insufficient wording.** Inspect wrap-step metrics and repeat images.
5. **Hard seams and periodic motifs are different failures.** A tile may have acceptable opposite edges but still reveal repeated mottling across a large field.
6. **One-cell review manifests are the unit of approval for terrain variants.** Packed-sheet-wide seam metrics are not meaningful.
7. **Source verdict and runtime verdict can differ.** Record that distinction explicitly.
8. **Do not create a production packed sheet until the required variant family is complete.** Approved individual cells remain review-only sources until then.

## Recommended folders

Future asset PRs should use folders like:

```text
assets/source/generated/<asset_id>/
assets/sprites/
assets/tilesets/
assets/buildings/
assets/manifests/
```

Example:

```text
assets/source/generated/mob_slime_practice_v001/source_sheet.png
assets/manifests/mob_slime_practice_v001.manifest.json
assets/sprites/mob_slime_practice_v001.png
```

Review-only evidence should remain clearly separated from production manifests and packed outputs, for example:

```text
docs/art-pipeline/review/<asset_id>_<variant>/
```

A review manifest must not imply that an incomplete target family is production-complete.

## Commands

Normalize one asset:

```bash
npm run normalize:asset -- --manifest <path>
```

Validate one asset:

```bash
npm run validate:asset -- --manifest <path>
```

Run the pipeline self-test:

```bash
npm run test:asset-pipeline
```

Generate review evidence and deterministic metrics in one pass:

```bash
npm run review:asset -- --manifest <path> --palette docs/visual-targets/farm_environment_palette_v1.json --atlas-family environment_farm --families forest,wood_leather
```

`review:asset` normalizes and validates the manifest, then writes four nearest-neighbour evidence images and `review.json` under `.tmp/asset-review/<asset_id>/` by default. The JSON records output dimensions, frame count, SHA-256, alpha counts, horizontal/vertical wrap-step ratios, and optional locked-palette distance metrics.

When a palette declares `appliesToAtlasFamilies`, review requires the matching `--atlas-family`; this prevents farm aliases from leaking into character or creature review. Inside that scope, palette-family requests resolve either a direct key under `families` or one executable `familyAliases` hop. Unresolved and scoped-deferred names fail instead of silently contributing no swatches. Assets with separately locked identity colors may add an exact swatch-group path:

```bash
npm run review:asset -- --manifest <path> --palette docs/visual-targets/farm_environment_palette_v1.json --atlas-family environment_farm --families forest,metal_stone --exact-group wildbloomAccents.root_star
```

With `--exact-group`, `palette.pixels` and the ordinary tolerance statistics cover non-transparent pixels that are not exact accents. `palette.exact` has this additive schema:

```json
{
  "group": "wildbloomAccents.root_star",
  "colors": [
    { "hex": "#FFD666", "fullyOpaqueCount": 1, "nonTransparentCount": 1 }
  ],
  "coverage": {
    "nonTransparentPixels": 100,
    "exactMatchPixels": 2,
    "baseTolerancePixels": 98,
    "uncoveredPixels": 0
  }
}
```

Every color listed by the exact group must occur in at least one fully opaque runtime pixel. Near substitutes do not count. Every non-transparent runtime pixel must either match an exact accent or fall within the requested base-family tolerance; otherwise review fails. Omitting `--exact-group` preserves the ordinary tolerance-only report and behavior.

For a modular fence, wall, or rail, add `--modular-axis horizontal` or `--modular-axis vertical`. The review then also writes a five-cell repeated strip on a checkerboard background and a `20×` crop spanning four runtime pixels on each side of one connection. `review.json` records alpha-aware contact coordinates, shared contiguous runs, and contacts that occur on only one connection edge. Review the strip and connection crop together: matching contact runs diagnose boundary topology, but do not replace the human check for doubled posts, endcaps, wrong orientation, or a complete self-contained panel.

```bash
npm run review:asset -- --manifest <path> --palette docs/visual-targets/farm_environment_palette_v1.json --atlas-family environment_farm --families wood_leather --modular-axis horizontal
```

For a multi-cell production sheet, create a one-cell review manifest for the candidate being approved; seam/repetition metrics across an entire packed sheet are not meaningful. Review output is derived evidence. Normally commit only the concise audit verdict plus one useful comparison panel when line-level Git review needs visual context. Keep the other generated previews temporary or attach them as CI/PR artifacts instead of committing a full evidence bundle for every candidate. Existing early review bundles remain valid historical evidence.

Run its focused test with:

```bash
npm run test:asset-review
```

### Batch A review contact sheet

After all seven Batch A anchors have their own approved exact runtime pixels, build one deterministic comparison sheet with:

```bash
npm run review:contact-sheet -- --manifest <review-contact-sheet.json> --out <contact-sheet.png> --report <contact-sheet.json>
```

The command is deliberately review-only. It places grass, dirt, water, and oak in the first row and fence, rock, and Root-Star in the centred second row. The fixed `1312×1072` layout uses `304×472` cards, `16px` gutters, a `256×384` evidence stage in every card, uniform `8×` nearest-neighbour scale, and a common pivot baseline within each comparison row. Deterministic bitmap header, labels, baselines, and footer avoid host-font drift. Its companion JSON records sheet/slot geometry, input and output SHA-256 values, approval verdicts, and explicit `packedSheet: false`, `targetFamiliesComplete: false`, `runtimeIntegrated: false`, and device/child-validation claims.

The input manifest is strict and must declare `version: 1`, `expectedCount: 7`, and exactly seven items. Every item requires a unique `slot` and `order` covering `0` through `6`, a unique `id`/`variant`, a short bitmap-safe `label`, relative PNG `path`, exact `dimensions`, in-bounds `pivot`, lowercase SHA-256, and either `APPROVED SOURCE CANDIDATE` or `APPROVED RUNTIME MASTER`. The builder validates every file, dimension, hash, count, slot, order, and verdict before creating either output.

This tool does not approve assets, infer verdicts, normalize sources, create a production packed sheet, load anything in Phaser, or modify the map. Do not create the real Batch A manifest until all seven individual approval gates have passed. Run the synthetic regression suite with:

```bash
npm run test:contact-sheet
```

For an Approved Runtime Master, create the canonical high-resolution source with:

```bash
node scripts/upscale-nearest-neighbor.mjs --in <approved-runtime-master.png> --out <canonical-source.png> --scale <integer-scale>
```

Add `--mode rgba` when the approved master contains transparency that must survive the deterministic upscale. Omitting `--mode` preserves the historical opaque RGB behavior.

Then normalize the canonical source back to the declared runtime size and verify zero pixel differences before committing it.

## Manifest basics

A manifest declares the target sheet, the source art, and the exact source-to-destination frame mapping.

Manifest paths are resolved relative to the manifest file. A source can define a uniform `grid` for `sourceCell` extraction, while individual frames can instead declare an exact `sourceRect`. Every frame maps to one `destCell` and may choose alpha trimming plus `center`, `center_bottom`, or `top_left` placement.

For an isolated colour-keyed frame, `sourceRect` describes the complete padded frame, not the tight visible-object bounds. Keep connected key-colour padding on all four sides of the subject inside the rectangle. `edge_flood_color_key` begins at that rectangle's edges, ignores pixels outside it, removes only connected key-colour background inside it, and preserves enclosed matching pixels. Category-C props then use `trim: "alpha"` and `anchor: "center_bottom"` so the cleaned visible subject is grounded in the destination cell. If a crop cannot retain padding on every side, regenerate or repack the source rather than tightening the rectangle around the subject.

Background modes are:

- `alpha`: preserve source alpha. RGB sources are accepted; the reader synthesizes opaque alpha for normalization.
- `color_key`: remove every pixel matching the configured colour and tolerance.
- `edge_flood_color_key`: remove matching pixels connected to the source frame/rectangle edge while preserving enclosed matches.

Placement modes include:

- `fit: "contain"`—preserve aspect ratio and fit inside the target cell;
- `fit: "fill"`—nearest-neighbour scale independently on both axes to cover the full target cell, appropriate for exact full-bleed terrain cells.

Target dimensions are computed from:

```text
target width = target.cellPx[0] * target.cols
target height = target.cellPx[1] * target.rows
```

A Practice Slime sheet can therefore target:

```text
cell: 32x32
grid: 6x4
output: 192x128
```

A building can target:

```text
cell: 128x96
grid: 1x1
output: 128x96
```

Larger trees, buildings, bosses, VFX, or multi-cell sheets should use the same manifest pattern with larger target cells or larger target grids.

## Practice Slime

Practice Slime v001 has been produced with this pipeline. Its committed files are:

```text
assets/source/generated/mob_slime_practice_v001/source_sheet.png
assets/manifests/mob_slime_practice_v001.manifest.json
assets/sprites/mob_slime_practice_v001.png
```

The runtime sheet is `192x128` with `32x32` cells in a `6x4` grid. See [`docs/CURRENT_STATE.md`](../CURRENT_STATE.md) for current runtime-integration status. The example manifest under `docs/art-pipeline/examples/` remains illustrative only.
