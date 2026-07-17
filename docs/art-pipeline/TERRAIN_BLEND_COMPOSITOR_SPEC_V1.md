# Deterministic Terrain-Blend Compositor Specification v1

**Status:** Approved implementation specification  
**Current implementation scope:** `tile_farm_path_dirt` only  
**Next family after visual approval:** `tile_farm_water_shore`  
**Owner split:** ChatGPT owns mask/art direction and final visual verdict; Claude Code owns deterministic implementation, tests, generated binaries, evidence, and the focused draft PR.

## 1. Objective

Build one deterministic, integer-only terrain compositor that derives the complete reduced 13-tile blend family from approved exact `16×16` runtime pixels.

The first deliverable is the dirt family:

- foreground material: approved `tile_farm_path_dirt / center`;
- background material: approved `tile_farm_grass_base / grass_a`;
- outputs: 1 unchanged centre + 12 generated edge/corner variants;
- canonical source: exact nearest-neighbour upscales of approved/generated runtime cells;
- packed production sheet: deterministic `13×1`, `208×16` PNG;
- no Phaser loading, map, Wangset, collision, save, gameplay, quest, curriculum, or dependency integration.

The compositor must later support the shoreline family without replacing the core topology model.

## 2. Authoritative inputs

Read and preserve:

- `AGENTS.md`;
- `docs/CURRENT_STATE.md`;
- `docs/VISUAL_ASSET_CONTRACT.md` §13;
- `docs/art-pipeline/CLOSED_LOOP_ASSET_GENERATION_WORKFLOW.md`;
- `docs/art-pipeline/FARM_ENVIRONMENT_GENERATION_HANDOFF_V1.md`;
- `docs/art-pipeline/SPRITE_ASSET_PIPELINE.md`;
- `docs/visual-targets/farm_village_tile_targets.json`;
- `docs/visual-targets/farm_water_shoreline_targets.json`;
- `docs/visual-targets/farm_environment_palette_v1.json`.

Exact dirt inputs:

- foreground runtime pixels: `docs/art-pipeline/review/tile_farm_path_dirt_center/center.review-normalized.png`;
- background runtime pixels: `docs/art-pipeline/review/tile_farm_grass_base_grass_a/grass_a.review-normalized.png`;
- existing centre canonical source: `assets/source/generated/tile_farm_path_dirt/center.png`.

Both runtime inputs must decode as exactly `16×16`, fully opaque RGBA-expanded pixel buffers. Do not sample the attractive high-resolution sources to invent new runtime pixels.

## 3. Chosen mask model

Use a **four-corner code with integer bilinear interpolation**. Do not use independently hand-authored masks, floating-point SDFs, antialiasing, or per-variant random geometry.

Corner order is always:

```text
[north_west, north_east, south_east, south_west]
```

A corner value of `1` means the family foreground occupies that corner:

- dirt is foreground for `tile_farm_path_dirt`;
- water will be foreground for `tile_farm_water_shore`.

For every runtime pixel `(x, y)`, where `x` and `y` are integers from `0` through `15`:

```text
score =
    nw * (15 - x) * (15 - y)
  + ne * x        * (15 - y)
  + se * x        * y
  + sw * (15 - x) * y

q = 2 * score - 225
foreground = q >= 0
```

Properties that must be protected by tests:

1. The weight total is exactly `225`; because it is odd, `q` can never be zero and there is no tie-breaking ambiguity.
2. Only integer arithmetic is used.
3. Every outer-edge sample depends only on the two corner bits belonging to that edge.
4. Adjacent tiles with matching shared corner bits therefore have identical foreground/background classifications along the shared edge.
5. Complementary corner codes produce exact inverse core masks because `q(complement) = -q(original)`.
6. The centre is exact foreground identity; code `0000` is exact background identity but is not packed into the 13-tile target.

## 4. Required topology table

Variant names describe where the foreground material occupies the tile.

| Packed index | Variant | `[nw, ne, se, sw]` |
| ---: | --- | --- |
| 0 | `center` | `[1, 1, 1, 1]` |
| 1 | `edge_north` | `[1, 1, 0, 0]` |
| 2 | `edge_south` | `[0, 0, 1, 1]` |
| 3 | `edge_west` | `[1, 0, 0, 1]` |
| 4 | `edge_east` | `[0, 1, 1, 0]` |
| 5 | `corner_ne` | `[0, 1, 0, 0]` |
| 6 | `corner_nw` | `[1, 0, 0, 0]` |
| 7 | `corner_se` | `[0, 0, 1, 0]` |
| 8 | `corner_sw` | `[0, 0, 0, 1]` |
| 9 | `inner_corner_ne` | `[1, 0, 1, 1]` |
| 10 | `inner_corner_nw` | `[0, 1, 1, 1]` |
| 11 | `inner_corner_se` | `[1, 1, 0, 1]` |
| 12 | `inner_corner_sw` | `[1, 1, 1, 0]` |

This order exactly follows the authoritative target JSON and is the production packed-sheet order.

Expected core-mask foreground counts are deterministic:

- `center`: `256`;
- every `edge_*`: `128`;
- every `corner_*`: `41`;
- every `inner_corner_*`: `215`.

The two diagonal saddle codes (`nw+se` and `ne+sw`) are outside the reduced 13-tile contract and must be rejected if supplied as production variants.

## 5. Dirt compositing recipe

### 5.1 Core selection

For each pixel, copy the exact RGBA pixel at the same `(x, y)` coordinate from:

- dirt input when `q >= 0`;
- grass input when `q < 0`.

Never interpolate colours or alpha.

### 5.2 Quiet one-pixel fringe

A perfectly straight eight-pixel edge reads too mechanically at `16×16`. Break the internal contour with a narrow deterministic material interlock while preserving exact shared tile edges.

A pixel is fringe-eligible only when all are true:

```text
x in [1, 14]
y in [1, 14]
abs(q) <= 30
```

For eligible pixels, compute one deterministic unsigned 32-bit hash using `Math.imul`, bitwise XOR, and unsigned shifts. The implementation must expose the hash function and lock its seed in the compositor recipe. Use seed `0x0000D17A` for the dirt family.

When `hash % 3 === 0`, invert the material selection for that one pixel. Otherwise retain the core selection.

Constraints:

- no fringe operation on the outermost row or column;
- no colour creation: inversion means choosing the other approved input pixel at the same coordinate;
- no second fringe pass, morphology, blur, alpha blend, or palette interpolation;
- `center` remains byte-identical to the approved dirt input because its `q` is nowhere fringe-eligible;
- fringe eligibility and changes must be recorded in the deterministic report.

If visual QA finds this interlock too noisy or too straight, change only the declared threshold/modulus/seed and regenerate the whole family. Do not hand-edit individual topology cells.

## 6. Canonical-source and packed-sheet construction

For every generated dirt variant except `center`:

1. Treat the exact composed `16×16` pixels as the candidate runtime master.
2. Produce a `1024×1024` canonical source by exact `64×` nearest-neighbour block replication using the shared approved-runtime-master utility.
3. Use opaque RGB output unless the shared utility or manifest contract requires RGBA; all runtime alpha values must remain `255`.
4. Normalize the canonical source back through the real manifest pipeline with Category-A settings:
   - background: `alpha`;
   - trim: `none`;
   - anchor: `top_left`;
   - fit: `fill`.
5. Require zero decoded-RGBA drift against the original composed `16×16` cell.

Canonical source paths:

```text
assets/source/generated/tile_farm_path_dirt/<variant>.png
```

Do not rewrite `center.png`.

Create the real production manifest only after all 13 cells pass:

```text
assets/manifests/tile_farm_path_dirt.manifest.json
```

Production output:

```text
assets/tilesets/tile_farm_path_dirt.png
```

Packed geometry:

```text
cell: 16×16
cols: 13
rows: 1
sheet: 208×16
```

Every packed cell must be decoded and compared against its expected runtime master after normalization. A packed sheet is not approval by itself.

## 7. Generic compositor interface

Create one manifest-driven script rather than a dirt-only script:

```text
scripts/compose-terrain-blend-family.mjs
```

Required CLI:

```bash
node scripts/compose-terrain-blend-family.mjs --config <recipe.json>
```

The recipe path is resolved first; all paths inside it are resolved relative to the recipe file.

Minimum recipe fields:

```json
{
  "version": 1,
  "id": "tile_farm_path_dirt",
  "mode": "binary_material_interlock",
  "cellPx": [16, 16],
  "foregroundPath": "...",
  "backgroundPath": "...",
  "canonicalSourceDir": "...",
  "runtimeMasterDir": "...",
  "upscale": 64,
  "fringe": {
    "threshold": 30,
    "modulus": 3,
    "selectedRemainder": 0,
    "seed": 53626
  },
  "variants": [
    { "name": "center", "corners": [1, 1, 1, 1] }
  ]
}
```

Reject unknown modes, dimensions other than `16×16` in v1, duplicate names, invalid corner bits, missing target variants, extra production variants, saddle codes, non-opaque inputs, and output paths outside the repository.

The script must export its pure core functions for focused tests and run its CLI only when invoked as the entry module, following existing script conventions.

## 8. Dirt recipe and evidence paths

Create the durable recipe and family audit under:

```text
docs/art-pipeline/review/tile_farm_path_dirt_family/
```

Expected durable files:

```text
dirt.compositor.recipe.json
AUDIT.md
masks-13x1.png
family-contact-sheet.png
mixed-tiling-preview.png
family-report.json
```

Per-cell enlarged previews, adjacency matrices, temporary runtime masters, and exhaustive seam crops may remain CI/PR artifacts or `.tmp` outputs. Commit only evidence needed for durable review, consistent with the evidence-retention policy.

`family-report.json` must contain at least:

- exact input paths and SHA-256 values;
- compositor version/mode and fringe parameters;
- topology bits;
- core foreground count;
- fringe-eligible and fringe-changed counts;
- runtime-master SHA-256 per variant;
- canonical-source SHA-256 per variant;
- zero-drift mismatch count per variant;
- packed cell coordinates and SHA-256;
- alpha counts;
- colour-origin counts (`foreground input`, `background input`, `unexpected`);
- palette-distance summary;
- shared-edge classification results;
- explicit `runtimeIntegrated: false`, `mapIntegrated: false`, `physicalIpadValidated: false`, and `childValidated: false`.

## 9. Acceptance gates

### 9.1 Core algorithm tests

Create:

```text
scripts/test-terrain-blend-compositor.mjs
```

Add package scripts:

```json
"compose:terrain-blend": "node scripts/compose-terrain-blend-family.mjs",
"test:terrain-blend": "node scripts/test-terrain-blend-compositor.mjs"
```

Required tests:

1. Exact topology names, order, and corner codes.
2. Exact core occupancy counts: `256`, `128`, `41`, and `215` as applicable.
3. Centre identity and `0000` background identity.
4. Exact complement property for every tested corner code.
5. Exact 90-degree rotations/reflections of the core masks map to the corresponding named variants.
6. Enumerate compatible horizontal and vertical neighbours, including the unshipped `0000` background code, and prove shared-edge material classifications are identical at all 16 positions.
7. Reject both diagonal saddle codes as production variants.
8. Fringe never changes an outer-edge pixel or a pixel where `abs(q) > 30`.
9. Same recipe and inputs produce byte-identical runtime buffers and stable SHA-256 values across repeated runs.
10. Any one-pixel input change changes the relevant generated output/report hash and is not silently ignored.
11. Wrong dimensions, partial alpha, missing input, duplicate variant, path escape, and invalid recipe version fail loudly.

Golden hashes may protect the fixed v1 masks and synthetic fixtures. Do not lock hashes of production art into the algorithm unit test unless the test is explicitly an integration fixture with clear update instructions.

### 9.2 Per-tile gates

Every tile must pass:

- exactly `16×16`;
- alpha: `256 opaque`, `0 partial`, `0 transparent`;
- no RGB colour outside the exact union of the two approved input pixel sets;
- all `256/256` pixels within RGB distance `40` of `forest + wood_leather` locked swatches;
- expected core occupancy count;
- no fringe modification outside the declared band;
- outer-edge material traces match the mathematical corner code exactly;
- canonical-source block exactness;
- zero decoded-RGBA drift after real-pipeline normalization;
- exact cell identity after extraction from the packed sheet;
- `1×` and enlarged nearest-neighbour visual review.

### 9.3 Complementary-edge gate

For every valid adjacency pair whose shared two corner bits match:

- material-class mismatch count on the shared edge must be `0/16`;
- no fringe pixel may occur on the shared outer edge;
- generate representative two-cell seam crops for human review;
- compare seam step against same-material internal steps and flag large outliers, but do not use one aggregate packed-sheet seam ratio as a substitute for topology validation.

### 9.4 Family gates

The complete dirt family must pass:

- exactly 13 unique variants in authoritative order;
- packed sheet exactly `208×16`;
- each packed cell hash matches its expected generated runtime cell;
- one deterministic mask sheet;
- one labelled nearest-neighbour contact sheet;
- one deterministic irregular mixed-tiling preview containing edges, all four outer corners, all four inner corners, centre, and pure grass neighbours;
- mixed preview adjacency validation reports zero incompatible shared edges;
- no visible hard grid line, checkerboard, lattice, cross, rosette, decorative border, baked object, or excessive fringe noise;
- dirt remains quieter than actors, props, crops, shoreline decoration, and VFX;
- ChatGPT assigns the final formal verdict after inspecting exact runtime pixels and family evidence.

## 10. Shoreline extension after dirt approval

Do not implement this in the dirt PR, but preserve the generic interface for it.

Shoreline uses the same core corner-code model with **water as foreground**:

- foreground runtime input: approved `water_a`;
- background runtime input: approved `grass_a`;
- `center` must be byte-identical to `water_a`;
- water pixels (`q >= 0`) remain exact `water_a` pixels;
- land-side bands use direct locked swatches only, never alpha blending:
  - `-30 <= q < 0`: inner sand;
  - `-60 <= q < -30`: outer sand;
  - `-90 <= q < -60`: sparse moss/grass transition;
  - `q < -90`: exact grass input;
- candidate sand swatches: `#B98535`, `#D5A342`, and restrained `#926B2A`;
- candidate moss swatches: `#427118`, `#6C8B15`, plus exact grass-source pixels;
- exact swatch choice may use a locked deterministic hash, but must remain seam-safe on outer edges and quiet at `1×`.

No new sand colour is authorized. Escalate to Leo only if visual evidence proves the locked `wood_leather` swatches cannot produce a convincing soft shoreline at `16×16`.

## 11. Verification commands

At minimum, the dirt PR must run and report:

```bash
npm ci
npm run test:terrain-blend
npm run test:asset-pipeline
npm run test:asset-review
npm run check
npm run normalize:asset -- --manifest assets/manifests/tile_farm_path_dirt.manifest.json
npm run validate:asset -- --manifest assets/manifests/tile_farm_path_dirt.manifest.json
```

Also run the compositor twice from a clean temporary output and prove stable hashes.

## 12. Stopping condition

Stop and return ownership to ChatGPT when one focused **draft PR** contains:

- the generic compositor and focused tests;
- the dirt recipe;
- all 12 new dirt canonical sources, with existing centre unchanged;
- the real 13-cell production manifest and packed sheet;
- the concise family audit/report and required visual evidence;
- current-state/changelog updates that make no runtime-integration claim;
- fresh green local checks and exact-head CI;
- no shoreline files and no map/runtime integration.

Do not merge until ChatGPT independently inspects the final diff, exact runtime cells, mixed preview, and exact-head CI.