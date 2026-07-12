# Sprite Asset Pipeline

Eldoria treats AI-generated images as **source art**, not final runtime assets.

Image generation can be excellent for style, concepts, and source sheets, but the repo needs deterministic files with exact dimensions, exact grid structure, true transparency, and repeatable validation. The asset-sheet pipeline converts approved source PNGs into packed runtime PNGs for Phaser.

## Pipeline rule

```text
AI source image -> manifest -> normalize -> validate -> repo asset
```

Concept sheets are for style approval only. Runtime assets should come from production source sheets or source frames.

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

## Runtime-first environment generation lessons

The accepted grass, dirt, and water cells established a stricter review rule for small environment art:

1. **Audit the actual runtime cell first.** For a `16×16` target, the decisive image is the normalized `16×16` output, not the high-resolution generation. Always inspect it at 1x and in nearest-neighbour 3x or larger previews, then inspect tiled repetition.
2. **Treat enlarged source art as supporting evidence only.** Attractive high-resolution texture may disappear, alias, form accidental symbols, or create visible repetition after normalization.
3. **Use explicit anti-pattern language in prompts.** Name the failure modes to avoid: no checkerboards, plus/cross motifs, repeated rows, obvious parity patterns, isolated symbols, hard border lines, painted frames, or decorative details that compete with the player at runtime size.
4. **Approve the simplest clean runtime result.** Once a cell is readable, palette-compatible, and acceptably seamless at runtime size, stop regenerating. More source detail is not inherently better.
5. **Promote accepted runtime pixels when necessary.** When the runtime result is correct but the original high-resolution source contains disqualifying detail, classify the normalized cell as an **APPROVED RUNTIME MASTER** and derive the production source by deterministic nearest-neighbour upscaling.
6. **Require deterministic proof.** The upscaled production source must normalize back to the approved runtime master with zero pixel differences. Record hash, dimensions, alpha counts, seam metrics, palette distance, and tiled evidence.
7. **Keep approval separate from integration.** Source acceptance does not authorize production-sheet packing, map edits, manifest activation, or Phaser loading. Those remain later milestone gates.

Recommended candidate wording for small terrain cells:

```text
Design for the final <width>x<height> runtime cell first. Keep the silhouette and color grouping readable after nearest-neighbour reduction. Avoid checkerboards, plus/cross motifs, repeated rows, parity patterns, isolated symbols, visible border frames, and decorative micro-detail. The result must tile without an obvious seam or repeated focal mark.
```

For trees and other larger props, retain the same runtime-first principle but judge silhouette, pivot, occupied bounds, player overlap, and readability against the target cell dimensions rather than forcing terrain-specific seam criteria.

## Approved Runtime Master workflow

Sometimes the AI-generated high-resolution source cannot be used directly, even after an otherwise-approved candidate normalizes cleanly to its runtime size — for example, high-resolution motifs that violate the art spec but disappear once downscaled. In that case:

- The **runtime-approved normalized asset** (the exact pixel data that passed visual review at its real runtime size) becomes the **canonical master**, not the original high-resolution generation.
- The canonical high-resolution **production source** is then generated from that master by **deterministic nearest-neighbour upscaling only** (`scripts/upscale-nearest-neighbor.mjs`) — every master pixel becomes one solid-color square block in the output. No filtering, interpolation, sharpening, antialiasing, color modification, or palette change.
- Required verification before this source is treated as approved:
  - **byte-identical round-trip** — normalizing the upscaled source back down through the real pipeline (`fit: "fill"`) must reproduce the original runtime-approved master with zero pixel differences;
  - **seam audit** — wrap-boundary color step vs. average internal step, on both axes;
  - **palette verification** — every pixel within tolerance of the target's locked palette families;
  - **review evidence** — the same evidence set as any other candidate (normalized output, enlarged inspection preview, tiled-repeat previews, comparison panel), plus an `AUDIT.md` recording the above checks.

See `docs/art-pipeline/review/tile_farm_path_dirt_center/AUDIT.md` and `docs/art-pipeline/review/tile_farm_water_base_water_a/AUDIT.md` for worked examples.

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
npm run review:asset -- --manifest <path> --palette docs/visual-targets/farm_environment_palette_v1.json --families forest,wood_leather
```

`review:asset` normalizes and validates the manifest, then writes four nearest-neighbour evidence images and `review.json` under `.tmp/asset-review/<asset_id>/` by default. The JSON records output dimensions, frame count, SHA-256, alpha counts, horizontal/vertical wrap-step ratios, and optional locked-palette distance metrics.

For a multi-cell production sheet, create a one-cell review manifest for the candidate being approved; seam/repetition metrics across an entire packed sheet are not meaningful. Review output is derived evidence: normally commit only the concise audit verdict plus one useful comparison panel when line-level Git review needs visual context. Keep the other generated previews temporary or attach them as CI/PR artifacts instead of committing a full evidence bundle for every candidate.

Run its focused test with:

```bash
npm run test:asset-review
```

## Manifest basics

A manifest declares the target sheet, the source art, and the exact source-to-destination frame mapping.

Manifest paths are resolved relative to the manifest file. A source can define a uniform `grid` for `sourceCell` extraction, while individual frames can instead declare an exact `sourceRect`. Every frame maps to one `destCell` and may choose alpha trimming plus `center`, `center_bottom`, or `top_left` placement.

Background modes are:

- `alpha`: preserve source alpha.
- `color_key`: remove every pixel matching the configured color and tolerance.
- `edge_flood_color_key`: remove matching pixels connected to the source frame/rectangle edge while preserving enclosed matches.

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
