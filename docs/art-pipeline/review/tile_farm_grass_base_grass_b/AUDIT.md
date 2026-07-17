# Batch B audit — `tile_farm_grass_base` / `grass_b`

Date: 2026-07-17  
Scope: deterministic runtime-master creation, canonical-source reconstruction, review-only normalization, and family-compatibility evidence. **Source/review work only — no runtime, map, or production-manifest integration.**

## 1. Verdict

`grass_b` is accepted as an **APPROVED RUNTIME MASTER**.

It is a quiet second base-grass variant derived from the approved `grass_a` runtime pixels through a deterministic, recorded interior-only recipe:

- exact runtime canvas: `16×16` RGBA;
- 24 pair swaps / 48 changed pixels;
- no border pixels changed;
- no new colors introduced;
- the complete 256-pixel color histogram is preserved exactly;
- alpha remains 255 for all pixels;
- the same locked `forest` palette coverage is preserved;
- the variant changes only micro-detail and remains quieter than actors, props, crops, and interaction markers.

The deterministic recipe is retained in `grass_b.recipe.json`.

## 2. Source and runtime identity

| Field | Value |
| --- | --- |
| Target / variant | `tile_farm_grass_base` / `grass_b` |
| Runtime master | `grass_b.approved-runtime-master.png` |
| Runtime dimensions | `16×16` RGBA |
| Runtime PNG SHA-256 | `cac925dc5316d644d15b451b897650bec4184f3b029eff56fe19cb367ecc6610` |
| Canonical source | `assets/source/generated/tile_farm_grass_base/grass_b.png` |
| Canonical dimensions | `1024×1024` RGBA |
| Canonical PNG SHA-256 | `e31d3fc343d15b2b60c0eb0667544bdc3ab53f9b2e9ff725821790568f9f694a` |
| Construction | exact `64×` nearest-neighbour block replication |
| Source block mismatches | `0 / 1,048,576` |
| Review round-trip PNG SHA-256 | `cac925dc5316d644d15b451b897650bec4184f3b029eff56fe19cb367ecc6610` |
| Runtime-master / review decoded-RGBA mismatches | `0 / 256` |

The canonical source contains no interpolation, smoothing, sharpening, recoloring, resampling, alpha modification, or invented pixels. Every runtime pixel is reproduced as one solid `64×64` source block.

## 3. Family derivation and variation proof

The approved `grass_a` runtime pixels are the sole derivation base. The recipe changes only interior coordinates and swaps existing colors in pairs.

| Check | Result |
| --- | --- |
| Pair swaps | `24` |
| Changed runtime pixels | `48 / 256` |
| Border pixels changed | `0 / 60` |
| New RGB colors | `0` |
| Histogram drift | `0` |
| Alpha drift | `0` |
| Exact grass_a/grass_b top edge match | pass |
| Exact grass_a/grass_b bottom edge match | pass |
| Exact grass_a/grass_b left edge match | pass |
| Exact grass_a/grass_b right edge match | pass |

Because all four borders are byte-identical to `grass_a`, any A/B adjacency has the same boundary transition as the already-approved `grass_a` tile.

The differences are intentionally subtle. `grass_b.comparison-panel.png` shows `grass_a`, `grass_b`, and an exaggerated difference view. The exact runtime tiles remain visually coherent rather than reading as different biomes or lighting conditions.

## 4. Seam and gradient metrics

Computed from the exact `16×16` `grass_b` runtime pixels:

| Metric | Value |
| --- | ---: |
| Horizontal wrap step | `19.412242` |
| Average internal horizontal step | `28.342614` |
| Horizontal wrap/internal ratio | `0.684914` |
| Vertical wrap step | `21.208274` |
| Average internal vertical step | `26.688571` |
| Vertical wrap/internal ratio | `0.794658` |
| Row luminance range | `14.686500` |
| Column luminance range | `21.193688` |
| Row luminance/index correlation | `0.000196` |
| Column luminance/index correlation | `0.004026` |

Both wrap ratios remain below `1`, so tile boundaries are smoother than average internal pixel transitions. Both directional correlations are effectively zero, indicating mottled texture rather than a monotonic lighting gradient.

## 5. Palette and content checks

Locked `forest` swatches:

`#0A3521`, `#174F1D`, `#325E19`, `#427118`, `#6C8B15`, `#91A513`

| Palette metric | Value |
| --- | ---: |
| Minimum nearest-swatch distance | `2.828` |
| Median nearest-swatch distance | `10.677` |
| Maximum nearest-swatch distance | `26.627` |
| Pixels within tolerance 40 | `256 / 256` |

Visual inspection at exact runtime size and nearest-neighbour enlargement confirms:

- no flowers, rocks, dirt, footprints, weeds, paths, objects, or decorative perimeter;
- no hard grid line, cross, checkerboard, or dominant identifiable stamp;
- no directional highlight or shadow that would imply a different light source;
- no alpha holes or edge contamination;
- no increased contrast that competes with actors or interactables.

## 6. Review evidence

| Purpose | File |
| --- | --- |
| Exact runtime master | `grass_b.approved-runtime-master.png` |
| Deterministic recipe | `grass_b.recipe.json` |
| Real-pipeline output | `grass_b.review-normalized.png` |
| One-tile enlargement | `grass_b.preview-20x.png` |
| 3×3 repetition | `grass_b.tile-3x3-8x.png` |
| A/B/exaggerated-difference panel | `grass_b.comparison-panel.png` |
| Review manifest | `grass_b.review.manifest.json` |

All evidence enlargements use nearest-neighbour replication only.

## 7. Packed-family and integration status

`tile_farm_grass_base` remains incomplete:

- `grass_a` — approved;
- `grass_b` — approved by this audit;
- `grass_c` — not yet created.

Therefore:

- no production `assets/manifests/tile_farm_grass_base.manifest.json`;
- no production `assets/tilesets/tile_farm_grass_base.png`;
- no Phaser preload or animation registration;
- no `public/maps/farm.json` changes;
- no runtime, collision, save, quest, curriculum, profile, mastery, reward, or dependency change.

The next canonical asset is `tile_farm_grass_base / grass_c`, subject to the same one-cell seam, palette, repetition, and quietness gates.
