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

The runtime sheet is `192x128` with `32x32` cells in a `6x4` grid. Runtime loading and world display remain separate work. The example manifest under `docs/art-pipeline/examples/` remains illustrative only.
