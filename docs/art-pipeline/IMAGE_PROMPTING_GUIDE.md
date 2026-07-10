# Image Prompting Guide for Eldoria-V2 Source Art

Eldoria uses AI-generated images as **source art**, not final runtime assets. Final repo-ready PNGs must be produced through the asset normalization pipeline.

## Core rule

```text
Prompt for clean source art -> audit result -> normalize through manifest -> validate output -> then integrate
```

Do not assume generated images are final game assets.

## What image generation does well

AI image generation is useful for:

- art direction
- style exploration
- source sprite sheets
- source building/prop images
- character, crop, monster, and VFX concepts
- readable high-resolution pixel-art source material

## What image generation does not reliably guarantee

Do not rely on generation for:

- exact tiny runtime dimensions like `32x32`, `128x96`, or `192x128`
- mathematically exact background color
- true transparent backgrounds
- perfect grid discipline
- perfectly empty unused cells
- exact asset-scale consistency
- no background noise
- no edge artifacts

The normalizer and validator are responsible for final dimensions and transparency.

## Standard source-art prompt rules

Every production source prompt should include:

- source art for an automated normalization pipeline
- not a presentation sheet
- no text unless explicitly allowed
- no labels
- no arrows
- no captions
- no UI
- no decorative frame
- no checkerboard
- no shadows unless intentionally part of the sprite
- no ground tile unless intentionally part of the sprite
- no sprite bleeding into adjacent cells
- flat magenta background requested as `RGB 255,0,255, hex #FF00FF`
- wide padding around every sprite
- readable at the intended runtime size

## Grid sprite sheet rules

For sprite sheets, use:

```text
strict invisible grid
```

Avoid saying:

```text
visually separated cells
```

That phrase can cause the model to draw grid lines or borders.

Use wording like:

```text
The grid is layout-only. Do not draw grid lines, borders, dividers, white lines, or outlines between cells.
```

For 6x4 sheets, prefer a 3:2 aspect ratio.

For 6x2 sheets, prefer a 3:1 aspect ratio.

The generated source size does not need to equal runtime size, but it should divide cleanly into the declared source grid.

## Background cleanup lesson

Even when prompted for pure `#FF00FF`, generated backgrounds usually contain nearby magenta-family colors instead of one exact color.

Typical observed backgrounds:

```text
#FB03FA
#FC03FA
#FA03F9
#FA02F7
```

Use manifest color-key tolerance rather than tolerance `0`.

Suggested starting values:

```json
{
  "mode": "color_key",
  "color": "#FB03FA",
  "tolerance": 10
}
```

For noisy backgrounds or edge artifacts, use edge-flood cleanup when enclosed key-colored sprite pixels must be preserved:

```json
{
  "mode": "edge_flood_color_key",
  "color": "#FB03FA",
  "tolerance": 20
}
```

## Asset sizing lessons

### Small animated mobs

Example: Practice Slime

- Source sheet: 6x4
- Source aspect ratio: 3:2
- Runtime target: 192x128
- Runtime cells: 32x32
- Prompt for centered sprites with consistent baseline.
- Keep unused cells empty magenta.
- Avoid shadows and ground ovals.

### Crop overlays

Crops need more padding than expected.

Use:

```text
Each crop should occupy only the center 40-50% of its invisible cell.
Do not draw anything in the outer 25% margin of any cell.
```

This prevents beautiful but oversized crop illustrations.

### Buildings and large props

Buildings should use larger runtime targets when detail matters.

A detailed shop should likely use:

```text
192x144
```

rather than:

```text
128x96
```

Use the variable-size pipeline instead of forcing every asset into small cells.

## Required audit after generation

Before committing source art, audit:

- aspect ratio
- source dimensions
- grid divisibility
- background color family
- visible grid lines or borders
- text/label artifacts
- edge contact
- sprite bleed between cells
- whether detail survives at runtime size
- whether the target runtime size should change

## Decision categories

Use one of these after every source-art audit:

```text
APPROVED SOURCE CANDIDATE
Use as source art; proceed to manifest/normalization.
```

```text
STYLE REFERENCE ONLY
Good art direction, but not clean enough for pipeline use.
```

```text
REGENERATE
Prompt failed major production constraints.
```

```text
CHANGE TARGET SIZE
Art is good, but the intended runtime size is too small.
```

## Current learned examples

### Practice Slime

Status: approved source and normalized runtime asset committed; runtime display is pending.

Prompting lesson:

- invisible grid wording worked
- no grid lines appeared
- background still required color-key tolerance
- final runtime target remains 32x32 cells in a 6x4 sheet
- edge-flood cleanup with asset-specific tolerance removed the generated magenta fringe while preserving enclosed poof colors

### Crop overlays

Status: promising but not locked.

Prompting lesson:

- crops must be much smaller than intuitive
- use 40-50% cell occupancy
- wide magenta padding is essential
- background tolerance or edge-flood cleanup is needed

### Village General Store

Status: approved art direction.

Prompting lesson:

- excellent as a large building source
- too detailed for 128x96
- better target is likely 192x144
- variable asset sizes are necessary

## Prompting for Stardew-caliber techniques (2026-07-10)

Added following [Stardew-Caliber Visual Research](../research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md) and contract Sections 4a, 8a, 13-15. Not yet exercised against a real generation run; treat as the starting prompt strategy and update this section with the actual learned lesson the first time each is tried.

### Terrain-blend (autotile) tiles

Generating a 1-center + 4-edge + 4-corner blend set (contract Section 13) in one pass is unreliable — models drift on hue/detail between separately-implied variants. Prefer generating the **center tile alone first**, get it approved, then generate each edge/corner variant as its own prompt that explicitly references the approved center tile's described palette and texture, asking for "the same grass texture and palette as tile X, but fading into dirt only along the top edge of the tile" (substitute the correct edge). Treat each variant as its own audited source-art candidate, not as one sheet.

Do not ask the model to draw the blend/gradient itself pixel-perfectly — ask for a soft, small transition band near the relevant edge only; the normalization step should tighten it and the target's `[8, 15]` pivot and `16x16` grid still apply exactly as any other tile.

### Grass/decoration scatter tiles

Prompt each scatter variant (`tile_farm_grass_scatter`) as a small, off-center detail on top of a transparent or magenta-keyed 16x16 cell, explicitly asking for "one small tuft/pebble/flower positioned off-center, not filling the cell, on a flat magenta background" — the crop-overlay lesson above (40-50% cell occupancy, wide padding) applies here too, since scatter decoration that fills its cell will look like a second competing tile grid instead of sparse detail.

### Ground shadows (contract Section 8a)

Do not bake a ground shadow into animated actor/NPC source art — the shadow is drawn by engine code under the `actors_feet` layer so it can move and resize independently of the sprite. Baking it into the sprite sheet would double it or make it move incorrectly during animation.

For static, single-image assets that never move (buildings, large props), a baked shadow following the same upper-left light (so the shadow falls down-right) is acceptable and often looks better than one drawn in code.

### Lighting neutrality in source art

Always prompt for the contract's consistent upper-left key light on any new source art (Section 4). Do not prompt for a warm/gold or otherwise tinted ambient wash baked into the sprite or tile itself — the atmosphere tint described in contract Section 14 is applied once, at the scene level, in code. Baking a scene-level tint into individual source art would double it inconsistently as lighting conditions change per scene.
