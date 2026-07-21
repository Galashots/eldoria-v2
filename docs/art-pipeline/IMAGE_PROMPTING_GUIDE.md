# Image Prompting Guide for Eldoria-V2 Source Art

**Status:** Durable source-generation guidance  
**Current asset status:** [`../CURRENT_STATE.md`](../CURRENT_STATE.md)

Eldoria uses generated images as source material, not as automatically finished game assets. Approval is based on the exact normalized runtime result and the applicable visual contract.

## Core workflows

Normal source path:

```text
approved direction -> source generation -> source audit -> manifest -> normalize -> validate -> runtime preview -> integration evidence
```

Runtime-master path for tiny assets:

```text
approved direction -> source generation -> exact runtime normalization -> runtime audit -> approved runtime master -> deterministic nearest-neighbour canonical source -> zero-drift round trip
```

Do not skip the source/runtime verdict merely because a high-resolution candidate looks attractive.

## Verdict vocabulary

Use exactly one:

- **APPROVED SOURCE CANDIDATE** — clean source suitable for manifest input.
- **APPROVED RUNTIME MASTER** — exact runtime pixels pass, while the generated high-resolution source is unsuitable as the canonical source.
- **STYLE REFERENCE ONLY** — useful direction, not production input.
- **HOLD** — promising but awaiting one named deterministic test or correction.
- **REGENERATE** — material production constraints failed.
- **CHANGE TARGET SIZE** — identity/projection is viable but the declared runtime canvas is unsuitable.

After normalization distinguish:

- **NORMALIZED RUNTIME ASSET** — exact validated output exists.
- **RUNTIME-INTEGRATED ASSET** — the asset is loaded and verified in the game.

## Standard prompt requirements

Every production prompt should state:

- source art for an automated normalization pipeline;
- exact target ID, subject, variant, direction/state, and runtime canvas;
- required source dimensions or grid layout;
- intended player-readable result at runtime size;
- approved palette family and upper-left light;
- approved perspective, footprint, pivot, and scale language;
- stable identity and proportions across related frames;
- no text, labels, arrows, captions, UI, decorative frame, watermark, checkerboard, or unrelated scenery;
- no cell bleed or content touching the image edge;
- no baked shadow for dynamic or Y-sorted assets;
- true alpha or a flat clean key background as specified by the target.

The prompt should describe what must remain simple, not only what to add. Explicit anti-patterns are often more reliable than words such as “beautiful,” “natural,” or “seamless.”

## Design for runtime size

Place the runtime requirement near the start of the prompt. Example:

```text
At 16×16, the player should perceive calm pond water with broad irregular depth variation and only sparse broken highlights.
```

A candidate is not approved because its large source preview is attractive. Inspect the exact runtime cell, silhouette, palette, occupancy, repetition, and environmental context.

## One asset versus a sheet

Default to one generated image per variant.

A sheet is acceptable only when every cell shares:

- source and runtime geometry;
- scale and pivot logic;
- background treatment;
- palette and perspective;
- a declared row/column layout.

Use:

```text
strict invisible grid
```

and state that no lines, borders, dividers, or framing may be drawn. Never generate a mixed-size production sheet.

## Background and padding

For isolated padded assets, request either true alpha or a flat uniform key background, normally exact `#FF00FF`, with wide empty margins. Generated key colours often drift, so inspect the real source before choosing `color_key` or `edge_flood_color_key` tolerance.

Use edge-flood cleanup when enclosed key-coloured pixels are legitimate internal details. Never choose a tolerance by assumption alone.

Full-bleed seamless terrain has no key-colour padding and fills the cell edge-to-edge.

## Category-specific prompting

### Quiet terrain centres

Require:

- one dominant material mass;
- broad, low-contrast irregular variation;
- very sparse accents;
- no decorative perimeter;
- no flowers, stones, lilies, reeds, shore, or props;
- no directional gradient;
- no repeated rows, columns, diamonds, scales, rings, crosses, rosettes, ripples, streaks, or wallpaper motifs.

Both a 3×3 repeat and a larger field repeat are required. Decoration belongs in separate Decor, shore, flora, prop, or shimmer assets.

### Terrain edges and corners

Use the approved centre material and change only the declared boundary topology. Do not rotate or mirror lit assets when that reverses the upper-left light. Validate the complete declared topology family and adjacency.

### Decals, crops, flowers, and scatter

- keep the subject sparse and normally within the central 40–60% of the cell;
- preserve a broad empty outer margin;
- use asymmetry and off-centre placement when the target calls for it;
- prevent the family from creating a second visible tile grid;
- review related variants together before runtime scatter wiring.

### Trees and tall props

- use a canvas taller than the gameplay footprint;
- ground the base in the lower footprint band;
- leave clean empty space above and around the silhouette;
- use the shared elevated three-quarter “pop-up” projection, not true isometric or pure top-down;
- no baked shadow when the object Y-sorts or receives an engine shadow;
- prioritize broad silhouette and material clusters over foliage or surface confetti.

### Buildings and large props

Use variable-size targets rather than squeezing important detail into an arbitrary small cell. Entrances and interaction points must remain readable. Choose **CHANGE TARGET SIZE** when exact runtime readability fails.

### Characters, NPCs, creatures, armor, and weapons

Follow [`../visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](../visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md).

Every character prompt must state:

- one elevated three-quarter camera across all directions;
- visible top planes in down/front, up/back, and side facings;
- down/front is foreshortened, not direct frontal elevation;
- left/right are three-quarter side views, not pure profiles;
- one apparent height, body scale, ground-contact line, and bottom-centre pivot;
- stable identity, equipment placement, handedness, and upper-left lighting;
- no per-frame automatic scaling;
- no armor/outfit family before the base geometry and timing are approved.

The first experiment is a bounded four-idle-direction perspective proof, not a complete animation library. Compare a same-sheet approach with direction-anchored generation when practical, and judge exact runtime previews on both Farm and Woods backgrounds.

## Runtime-master rescue

Use an **APPROVED RUNTIME MASTER** only when:

- the exact runtime identity, silhouette, projection, and composition already pass;
- remaining corrections are narrow and deterministic;
- corrected runtime pixels are re-audited;
- the canonical source is deterministic nearest-neighbour replication;
- the real pipeline reproduces the runtime master with zero pixel differences.

Do not use rescue to hide wrong perspective, identity drift, major proportion errors, missing modular geometry, or detail collapse. Those require regeneration or target-size change.

## Required audit

Record as applicable:

- target ID and variant;
- source dimensions and grid divisibility;
- key colour/alpha and edge contact;
- text, border, UI, checkerboard, watermark, or scenery contamination;
- perspective, light, palette, silhouette, identity, and family consistency;
- exact normalized dimensions and alpha state;
- visible bounding box, occupancy, footprint, and pivot;
- `1×` and enlarged nearest-neighbour readability;
- repeat, adjacency, or modular-connection evidence;
- palette-distance and contamination metrics;
- whether the high-resolution source is canonical-quality;
- whether the target size remains viable;
- one formal verdict.

Metrics support visual judgment; they do not replace it.

## Status and production order

The durable Farm order is [`FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`](FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md). Current completed assets, active candidate, and next work are authoritative only in [`../CURRENT_STATE.md`](../CURRENT_STATE.md), committed manifests, and audit records.

Do not copy a temporary “next asset” list into this guide.
