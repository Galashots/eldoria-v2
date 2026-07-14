# `env_farm_fence / rail_horizontal` runtime-master audit

## Verdict and approval

**APPROVED RUNTIME MASTER**

The user approved the exact `16×32` runtime pixels on 2026-07-14 after review in the Eldoria-V2 ChatGPT project. The original high-resolution ChatGPT generation was unsuitable as canonical production source art and is neither used nor committed. The approved runtime master is the sole pixel source of truth; this ingestion does not reinterpret, redraw, recolour, crop, or reposition it.

## Identity and contract

- Target: `env_farm_fence`
- Variant: `rail_horizontal`
- Runtime canvas: `16×32`
- Gameplay footprint: lower `16×16`
- Declared pivot: `[8,31]`
- Collision metadata in the target: `[0,16,16,16]` (not integrated by this change)
- Render layer: `actors_body`
- Atlas family: `environment_farm`
- Locked palette family: `wood_leather`
- Light direction: upper-left

This is the Batch A horizontal modular rail: one central post, with both rails reaching the left and right cell boundaries. It is not a complete two-post panel, and no orientation is derived by flipping or rotation.

## Provenance and deterministic source creation

The retained approved master is `rail_horizontal.approved-master-16x32.png`. Its SHA-256 is:

`62f54194234eabb7bc8ee0dda2da22c2b899b5381f849f35c7de4eae26c95b3b`

Following the committed `env_farm_tree / oak` Approved Runtime Master precedent, the canonical production source at `assets/source/generated/env_farm_fence/rail_horizontal.png` was created with exact `32×` alpha-preserving nearest-neighbour block replication:

```bash
node scripts/upscale-nearest-neighbor.mjs --in <approved-runtime-master.png> --out assets/source/generated/env_farm_fence/rail_horizontal.png --scale 32 --mode rgba
```

- Canonical source dimensions: `512×1024` RGBA
- Canonical source SHA-256: `0826b6e6d07d7da0ae8105aa0dcf8ee45bcaba8d8e77360ad6dfb82f4babb330`
- Every approved runtime pixel becomes one uniform `32×32` RGBA block.
- Block-exactness result: **0 mismatched pixels / 524,288 source pixels**.
- No interpolation, filtering, antialiasing, sharpening, alpha modification, palette change, or new pixel information was introduced.

## Manifest and zero-drift round trip

`rail_horizontal.review.manifest.json` is review-only. It reads the canonical source directly and normalizes it through the real asset pipeline using:

- `background.mode: "alpha"`
- `trim: "none"`
- `fit: "fill"`
- `anchor: "top_left"`
- one `16×32` destination cell

Normalization and validation commands:

```bash
npm run normalize:asset -- --manifest docs/art-pipeline/review/env_farm_fence_rail_horizontal/rail_horizontal.review.manifest.json
npm run validate:asset -- --manifest docs/art-pipeline/review/env_farm_fence_rail_horizontal/rail_horizontal.review.manifest.json
```

The normalized output reproduces the approved master exactly:

- Normalized SHA-256: `62f54194234eabb7bc8ee0dda2da22c2b899b5381f849f35c7de4eae26c95b3b`
- File-byte identity: **yes**
- Decoded RGBA mismatch: **0 / 512 pixels**, **0 / 2,048 channels**

The approved master and normalized output are retained separately to make the review input and pipeline round trip independently inspectable even though their bytes are identical.

## Deterministic runtime metrics

Review command:

```bash
npm run review:asset -- --manifest docs/art-pipeline/review/env_farm_fence_rail_horizontal/rail_horizontal.review.manifest.json --out-dir .tmp/asset-review/env_farm_fence_rail_horizontal --palette docs/visual-targets/farm_environment_palette_v1.json --atlas-family environment_farm --families wood_leather --tolerance 40 --modular-axis horizontal
```

### Alpha, bounds, and pivot

- Transparent pixels: `300`
- Partially transparent pixels: `0`
- Opaque pixels: `212`
- Visible bounding box: x `0–15`, y `5–31` (`16×27`)
- Top edge contact: none
- Left and right edge contact: rails only, required for horizontal modular connection
- Bottom edge contact: present within the declared lower footprint
- Declared pivot `[8,31]`: in bounds at the lower-centre baseline
- No baked ground shadow or ground patch

`rail_horizontal.footprint-pivot-20x.png` is a deterministic `20×` nearest-neighbour overlay (SHA-256 `c9d925b217c1fc230dadee55834be86152ba648c867b16cf7f19a40f39a2c90e`). It composites the exact normalized pixels over a `10px` checkerboard (`#D8D8DF` / `#BFC0C8`), draws a `4px` cyan `#00DCFF` rectangle around the declared lower footprint `[0,16,16,16]`, and draws a magenta `#FF00AA` cross at the centre of pivot pixel `[8,31]`. It confirms that the grounded post enters the footprint and the pivot sits on the lower-centre baseline; it does not alter or replace the approved pixels.

### Palette

- Family: `wood_leather`
- Tolerance: `40` RGB distance units, matching the oak Approved Runtime Master precedent
- Within tolerance: `212 / 212` opaque pixels
- Minimum distance: `9.899`
- Median distance: `18.974`
- Maximum distance: `31.129`

### Horizontal modular connectivity

- Left contact rows: `10, 11, 12, 23, 24, 25, 26`
- Right contact rows: `10, 11, 12, 23, 24, 25, 26`
- Shared contiguous runs: `10–12` and `23–26`
- Left-only rows: none
- Right-only rows: none

The retained five-cell strip and connection-edge crop show continuous rails across cell boundaries. The central post repeats once per cell; there are no doubled boundary posts, isolated endcaps, gaps, or one-sided connections.

## Retained evidence

- `rail_horizontal.approved-master-16x32.png` — exact user-approved runtime source of truth
- `rail_horizontal.review-normalized.png` — exact real-pipeline round trip
- `rail_horizontal.preview-20x.png` — enlarged nearest-neighbour inspection
- `rail_horizontal.footprint-pivot-20x.png` — declared lower-footprint and pivot overlay
- `rail_horizontal.strip-horizontal-8x.png` — five-cell modular repetition strip
- `rail_horizontal.connection-edges-horizontal-20x.png` — enlarged connection-boundary inspection
- `rail_horizontal.review.manifest.json` — deterministic review-only normalization recipe

## Visual verdict

At exact runtime size and in the retained nearest-neighbour evidence, the asset reads as a weathered wooden farm fence under upper-left light. The tall central post is grounded in the lower footprint, both rails remain legible, and the repeated strip forms a continuous modular fence without becoming a sequence of complete panels. This matches the user-approved runtime master and the Batch A handoff target.

## Scope and remaining risk

This change accepts and preserves one individual source asset only:

- no packed `env_farm_fence` production sheet or production manifest;
- no other post, vertical, corner, broken, or gate variant;
- no Phaser loader, farm-map placement, collision activation, Y-sort integration, save change, gameplay change, curriculum change, quest change, or profile change;
- no physical-iPad or child-validation claim.

The fence family and Phase 2 environment kit remain incomplete. Runtime integration stays blocked until the full production kit passes its later family/contact-sheet gates.
