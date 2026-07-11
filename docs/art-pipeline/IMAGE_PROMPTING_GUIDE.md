# Image Prompting Guide for Eldoria-V2 Source Art

Eldoria uses generated images as **source material**, not as final game assets. Repository-ready PNGs must pass the manifest-driven normalization and validation pipeline.

## Core workflow

```text
approved direction -> clean source generation -> source audit verdict -> manifest -> normalize -> validate -> runtime-scale preview -> integrate
```

Do not skip the source-audit verdict. Do not describe concept art, a style sheet, or a generated mock-up as production source art merely because it looks attractive.

## Asset-status vocabulary

Use one explicit verdict after every generation:

- **APPROVED SOURCE CANDIDATE** — clean enough to become manifest input.
- **STYLE REFERENCE ONLY** — useful direction, but not exact or clean enough for normalization.
- **REGENERATE** — failed important production constraints.
- **CHANGE TARGET SIZE** — viable art, but the declared runtime canvas is unsuitable.

After normalization, distinguish:

- **NORMALIZED RUNTIME ASSET** — exact output exists and validates.
- **RUNTIME-INTEGRATED ASSET** — the normalized asset is loaded and browser-verified in the game.

## What generation is good at

- visual direction and style exploration;
- readable high-resolution pixel-art source material;
- isolated character, creature, prop, crop, building, tile, and VFX candidates;
- same-geometry sprite sheets and animation strips;
- producing a controlled family from an approved seed.

## What generation does not reliably guarantee

- exact tiny runtime dimensions;
- mathematically exact background colour;
- true transparency;
- perfect grid divisibility or empty cells;
- exact scale consistency across independently generated images;
- seamless tiling;
- clean edges or absence of background contamination;
- correct pivot, footprint, or collision metadata;
- detail that survives at runtime size.

The manifest, normalizer, validator, and human runtime preview are responsible for those guarantees.

## Standard production prompt rules

Every production source prompt should state:

- source art for an automated normalization pipeline;
- production asset, not a poster, gameplay screenshot, or presentation board;
- exact subject, variant, direction/state, and intended runtime canvas;
- same approved identity, palette family, outline language, perspective, and upper-left light;
- no text, labels, arrows, captions, UI, decorative frame, or watermark;
- no checkerboard;
- no unrelated scenery;
- no sprite bleeding into adjacent cells;
- no baked ground shadow for dynamic or Y-sorted objects;
- readable silhouette and major colour clusters at intended runtime size.

For isolated padded assets, request a flat uniform key background:

```text
RGB 255,0,255 / #FF00FF
```

Also request wide padding and no contact with the image edge.

For full-bleed seamless terrain, do **not** request magenta padding. Request an edge-to-edge tileable texture with no decorative perimeter.

## One asset versus a sheet

Default to **one generated image per asset variant**.

A family sheet is acceptable only when every cell shares:

- the same source and runtime geometry;
- the same scale and pivot logic;
- the same background treatment;
- a clearly declared row/column layout.

Never build a mixed-size production sheet.

For a production sheet, use the phrase:

```text
strict invisible grid
```

Also state:

```text
The grid is layout-only. Do not draw grid lines, borders, dividers, white lines, or outlines between cells.
```

Avoid “visually separated cells,” which often causes drawn borders.

The generated dimensions must divide cleanly by the declared grid. Common source shapes:

- 6×4 sheet: 3:2 aspect ratio;
- 6×2 sheet: 3:1 aspect ratio;
- horizontal animation strip: exact frame count and equal slot widths.

## Background cleanup

Generated “#FF00FF” backgrounds often drift into nearby values such as:

```text
#FB03FA
#FC03FA
#FA03F9
#FA02F7
```

Do not assume tolerance `0` will work.

Typical starting point:

```json
{
  "mode": "color_key",
  "color": "#FB03FA",
  "tolerance": 10
}
```

Use edge-flood cleanup when enclosed key-coloured pixels must remain:

```json
{
  "mode": "edge_flood_color_key",
  "color": "#FB03FA",
  "tolerance": 20
}
```

Audit the actual image before choosing the key colour and tolerance.

## Size and occupancy rules

### Small animated actors and creatures

- Generate the whole strip or same-geometry sheet together to reduce drift.
- Keep a consistent baseline and bottom-centre anchor.
- Keep unused cells fully key-coloured.
- Do not include ground ovals or effects outside the declared cells.

The Practice Slime is the working reference: approved source, normalized `192×128` sheet with `32×32` cells, and runtime integration complete.

### Decals, crops, flowers, and scatter

These need more padding than intuitive.

Use language such as:

```text
The subject occupies only the centre 40–50% of the invisible cell.
Leave the outer 25% margin empty.
```

Scatter should be sparse and often off-centre. It must not create a second visible tile grid.

### Trees and tall props

- Use a canvas taller than the gameplay footprint.
- Ground the base in the lower footprint band.
- Leave clean key-coloured space above and around the silhouette.
- Use the flattened 3/4 “pop-up book” perspective, not true isometric or true top-down.
- Do not bake a shadow when the object will Y-sort or receive an engine-drawn shadow.

### Buildings and large props

Use the variable-size pipeline rather than squeezing important detail into an arbitrary small target. If detail fails at 1x, choose **CHANGE TARGET SIZE** instead of hiding the problem with blurry runtime scaling.

## Terrain production rules

### Centre tiles first

Generate and approve the centre tile before any edges or corners.

A centre tile must:

- be seamless in a 3×3 repeat;
- contain no perimeter grass, shore, flowers, rocks, lilies, or border treatment;
- avoid a large directional gradient that exposes repetition;
- remain quieter than actors and interactable objects.

### Edges and corners

Generate each edge or corner from the approved centre language. The prompt should say, for example:

```text
Use the same texture, palette, density, and light as the approved centre tile. Change only the north edge into a narrow soft grass-to-dirt transition.
```

Do not rely on rotating or mirroring lit assets when that would reverse the approved upper-left light.

For the farm's reduced terrain set, author all 13 variants:

- 1 centre;
- 4 edges;
- 4 outer corners;
- 4 inner corners.

### Water

A water-base tile contains only water texture and subtle highlights. Lilies, flowers, reeds, rocks, shoreline, and shimmer frames are separate targets.

## Lighting and shadows

- Use one consistent upper-left key light.
- Do not bake a scene-level warm/gold ambient wash into source art; atmosphere is applied once in code.
- Dynamic actors, NPCs, monsters, interactive props, and Y-sorted objects use engine-drawn grounding shadows.
- A baked shadow is acceptable only for a truly static asset whose target specification explicitly permits it.

## Required source audit

Before committing source art, record:

- target ID and variant;
- source dimensions and aspect ratio;
- grid divisibility, if applicable;
- background/key-colour family;
- text, border, UI, checkerboard, or watermark artifacts;
- edge contact or cell bleed;
- perspective, light, palette, silhouette, and identity consistency;
- seamless 3×3 result for terrain;
- 1x and 3x runtime preview readability;
- whether the declared target size remains viable;
- one explicit verdict from the approved vocabulary.

Only an **APPROVED SOURCE CANDIDATE** proceeds to a manifest.

## Current farm-environment direction

The approved external farm style-lock is **STYLE REFERENCE ONLY**. It establishes palette direction, material language, painterly pixel-art finish, outline weight, upper-left lighting, flattened 3/4 perspective, vegetation density, and magical-landmark treatment. It is not committed, cropped, normalized, or treated as a production sheet.

The authoritative production order is:

[`FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`](FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md)

The palette source of truth is:

- `docs/visual-targets/farm_environment_palette_v1.json`
- `docs/visual-targets/FARM_ENVIRONMENT_PALETTE_V1.md`

Batch A must establish the process before later generation:

- seamless grass centre;
- seamless dirt centre;
- seamless water centre;
- oak tree;
- horizontal fence segment;
- medium landmark rock;
- revealed Root-Star landmark.

Do not batch-generate the remaining farm kit until Batch A is approved at source size and in 1x/3x previews.

## Learned examples

### Practice Slime

- Approved source, normalized asset, and runtime integration complete.
- Invisible-grid wording worked.
- Background cleanup still required asset-specific edge-flood tolerance.
- Consistent baseline and whole-sheet generation reduced frame drift.

### Crop and scatter candidates

- Attractive generations often occupy too much of the cell.
- Use 40–50% occupancy, wide padding, and a runtime preview before approval.

### Village General Store direction

- Useful art direction, but important building detail requires a larger variable target.
- Treat any earlier mock-up according to its recorded audit status rather than assuming it is production-ready.

Update this guide only when a repeated production lesson becomes durable. Keep one-off asset status in `docs/CURRENT_STATE.md`, target specs, manifests, or PR evidence.
