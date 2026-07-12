# Image Prompting Guide for Eldoria-V2 Source Art

Eldoria uses generated images as **source material**, not as final game assets. Repository-ready PNGs must pass the manifest-driven normalization and validation pipeline.

## Core workflow

```text
approved direction -> clean source generation -> source audit verdict -> manifest -> normalize -> validate -> runtime-scale preview -> integrate
```

For tiny terrain and other assets where the generated high-resolution image is not trustworthy, use the runtime-first branch:

```text
approved direction -> source generation -> exact runtime normalization -> runtime audit -> approved runtime master -> deterministic nearest-neighbour canonical source
```

Do not skip the source-audit or runtime-audit verdict. Do not describe concept art, a style sheet, or a generated mock-up as production source art merely because it looks attractive.

## Asset-status vocabulary

Use one explicit verdict after every generation:

- **APPROVED SOURCE CANDIDATE** — the high-resolution source itself is clean enough to become manifest input.
- **APPROVED RUNTIME MASTER** — the exact normalized runtime pixels pass review, but the original high-resolution generation is not suitable as the canonical production source. Use the documented deterministic upscale and zero-drift round-trip workflow.
- **STYLE REFERENCE ONLY** — useful direction, but not exact or clean enough for normalization.
- **REGENERATE** — failed important production constraints.
- **CHANGE TARGET SIZE** — viable art, but the declared runtime canvas is unsuitable.

After normalization, distinguish:

- **NORMALIZED RUNTIME ASSET** — exact output exists and validates.
- **RUNTIME-INTEGRATED ASSET** — the normalized asset is loaded and browser-verified in the game.

A runtime master is not a shortcut around quality review. It is an exact, reviewed source of truth for cases where the runtime pixels are good and the high-resolution generation is not.

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
- strict palette adherence even when only specific hex values are requested;
- absence of repeated motifs, wallpaper structure, or directional bands;
- detail that survives at runtime size.

The manifest, normalizer, validator, review tooling, and human runtime preview are responsible for those guarantees.

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

## Prompt construction lessons from the first farm terrain assets

The first approved grass, dirt, and water candidates established several rules that should be applied before generating more environment art.

### Design for the runtime result, not the high-resolution preview

State the intended runtime canvas near the top of the prompt and describe what the player should perceive at that size. For example:

```text
At 16×16, the player should perceive only calm blue pond water.
```

The high-resolution image may look attractive while the `16×16` result is noisy, streaked, or periodic. Approval must be based on the exact normalized pixels.

### Quiet base tiles should be intentionally boring

The generator tends to make base materials “interesting” by adding repeated highlights, ripples, scales, rosettes, crosses, cobbles, or other motifs. Base terrain should instead use:

- one dominant colour mass;
- a small amount of broad, irregular secondary variation;
- very sparse accent pixels;
- more empty calm area than visible texture.

Decoration belongs in separate scatter, shore, prop, flora, shimmer, and landmark assets.

### Use positive composition limits and explicit anti-patterns

Percentages help constrain visual density:

```text
85–90% calm base material
8–12% broad low-contrast variation
2–3% tiny accents
```

Also list forbidden structures explicitly when they are common failure modes. For terrain this includes diamonds, scales, shingles, rings, rosettes, crosses, checkerboards, wave rows, ripple rows, vertical streaks, horizontal streaks, repeated blobs, periodic spacing, and wallpaper patterns.

Do not rely only on “seamless” or “natural.” Those words do not prevent structural repetition.

### Prefer broad amorphous masses over named micro-patterns

Words such as “ripples,” “scales,” “woven,” “pebbled,” or “sparkling” often cause regular motifs. Prefer language such as:

```text
broad amorphous depth masses
soft irregular value variation
sparse broken highlights
no connected lines or repeated spacing
```

### Stop regenerating when the exact runtime cell is already good

When repeated high-resolution attempts contain forbidden motifs but one normalized runtime cell passes seam, palette, readability, and repetition review, freeze those exact pixels and classify them **APPROVED RUNTIME MASTER**. Use deterministic nearest-neighbour upscaling and prove the round trip instead of continuing an open-ended generation loop.

### Audit more than the 3×3 repeat

A 3×3 repeat catches hard seams. A larger field repeat catches softer periodic mottling, stripes, clusters, and fixed-frequency motifs. Both are required for terrain.

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
- Make the outer silhouette and major canopy/trunk colour clusters readable at the exact runtime size before adding bark or leaf texture.
- Keep branches and leaf gaps bold enough to survive normalization; avoid high-frequency foliage confetti.

### Buildings and large props

Use the variable-size pipeline rather than squeezing important detail into an arbitrary small target. If detail fails at 1x, choose **CHANGE TARGET SIZE** instead of hiding the problem with blurry runtime scaling.

## Terrain production rules

### Centre tiles first

Generate and approve the centre tile before any edges or corners.

A centre tile must:

- be seamless in a 3×3 repeat;
- remain natural in a larger field repeat;
- contain no perimeter grass, shore, flowers, rocks, lilies, or border treatment;
- avoid a large directional gradient that exposes repetition;
- avoid periodic motifs or regularly spaced accent clusters;
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

For quiet pond water:

- begin with a nearly uniform medium-blue base;
- use only two or three broad amorphous darker depth masses;
- use very few low-contrast broken highlights;
- do not connect highlights into rows, lines, curves, rings, or repeated clusters;
- avoid bright isolated cyan pixels that dominate at `16×16`;
- keep the interesting motion for later shimmer frames rather than baking it into the base tile.

## Lighting and shadows

- Use one consistent upper-left key light.
- Do not bake a scene-level warm/gold ambient wash into source art; atmosphere is applied once in code.
- Dynamic actors, NPCs, monsters, interactive props, and Y-sorted objects use engine-drawn grounding shadows.
- A baked shadow is acceptable only for a truly static asset whose target specification explicitly permits it.

## Required source and runtime audit

Before committing source art, record:

- target ID and variant;
- source dimensions and aspect ratio;
- grid divisibility, if applicable;
- background/key-colour family;
- text, border, UI, checkerboard, or watermark artifacts;
- edge contact or cell bleed;
- perspective, light, palette, silhouette, and identity consistency;
- exact normalized runtime dimensions and alpha state;
- seamless 3×3 result for terrain;
- larger-field repetition result for terrain;
- 1x and enlarged nearest-neighbour runtime preview readability;
- palette-distance results where a locked palette applies;
- whether the high-resolution source itself is suitable as canonical input;
- whether the declared target size remains viable;
- one explicit verdict from the approved vocabulary.

An **APPROVED SOURCE CANDIDATE** proceeds directly to a production-source manifest. An **APPROVED RUNTIME MASTER** proceeds only through the documented deterministic upscale, block-exactness, and zero-drift round-trip workflow in `SPRITE_ASSET_PIPELINE.md`.

Use the automated one-cell review command where applicable:

```bash
npm run review:asset -- --manifest <path> --palette docs/visual-targets/farm_environment_palette_v1.json --families <comma-separated-families>
```

Human visual review remains mandatory; metrics support the verdict but do not replace it.

## Current farm-environment direction

The approved external farm style-lock is **STYLE REFERENCE ONLY**. It establishes palette direction, material language, painterly pixel-art finish, outline weight, upper-left lighting, flattened 3/4 perspective, vegetation density, and magical-landmark treatment. It is not committed, cropped, normalized, or treated as a production sheet.

The authoritative production order is:

[`FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`](FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md)

The palette source of truth is:

- `docs/visual-targets/farm_environment_palette_v1.json`
- `docs/visual-targets/FARM_ENVIRONMENT_PALETTE_V1.md`

Batch A status:

- `tile_farm_grass_base / grass_a` — approved;
- `tile_farm_path_dirt / center` — approved runtime master;
- `tile_farm_water_base / water_a` — approved runtime master;
- `env_farm_tree / oak` — next;
- horizontal fence segment — pending;
- medium landmark rock — pending;
- revealed Root-Star landmark — pending.

Do not batch-generate the remaining farm kit until all Batch A anchors are approved at source size and in exact runtime previews.
