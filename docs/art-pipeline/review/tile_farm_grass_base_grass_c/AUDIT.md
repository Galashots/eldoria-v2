# Batch B audit — `tile_farm_grass_base` / `grass_c`

Date: 2026-07-17
Scope: deterministic runtime-master derivation, canonical-source reconstruction, review-only
normalization, and family-compatibility evidence. **Source/review work only — no runtime, map, or
production-manifest integration.**

Collaboration: ChatGPT led the constraints and the formal visual-QA verdict; Claude Code (repo
agent) performed the deterministic derivation and ingestion. This asset was produced during the
overnight ChatGPT + Claude closed-loop session.

## 1. Verdict

`grass_c` is accepted as an **APPROVED RUNTIME MASTER**.

Verdict assigned by ChatGPT via a direct 16×16 nearest-swatch grid pixel audit (images could not be
attached from the automation context, so the exact runtime pixels were audited as index grids).
ChatGPT independently confirmed: 16×16; 44 changed pixels consistent with 22 pair swaps; exactly
22 `-1` and 22 `+1` swatch deltas; identical histogram; border + 1px inner buffer unchanged;
interior-only edits; no filled 2×2 block; max 4-neighbour changed-cluster size 4; and a change-map
free of letters, faces, checkerboards, or loud repeated structure.

It is a quiet third base-grass variant derived from the approved `grass_a` runtime pixels through a
deterministic, recorded interior-only recipe:

- exact runtime canvas: `16×16` RGBA;
- 22 pair swaps / 44 changed pixels;
- all swaps adjacent (Manhattan distance 1), adjacent-forest-family only (swatch index delta ±1);
- no border or 1px-buffer pixels changed;
- no new colors introduced;
- the complete 256-pixel color histogram is preserved exactly;
- alpha remains 255 for all pixels;
- changes distributed across all four interior quadrants (`[5,6,5,6]`, cap 7 = 35%);
- 0 isolated specks; max changed-cluster size 4; no filled 2×2 blocks.

The deterministic recipe is retained in `grass_c.recipe.json`.

## 2. Source and runtime identity

| Field | Value |
| --- | --- |
| Target / variant | `tile_farm_grass_base` / `grass_c` |
| Runtime master | `grass_c.approved-runtime-master.png` |
| Runtime dimensions | `16×16` RGBA |
| Runtime PNG SHA-256 | `c8e7b09fa2e128be5293d26033cdb74924a76a26f492047d37c418c702cdc4d8` |
| Canonical source | `assets/source/generated/tile_farm_grass_base/grass_c.png` |
| Canonical dimensions | `1024×1024` RGBA |
| Canonical PNG SHA-256 | `da485290cdde3db2e4c4e57e82aa8d33d39da55c6af8802b94c815dcb43c177a` |
| Construction | exact `64×` nearest-neighbour block replication |
| Derivation base | `grass_a.review-normalized.png` (`40655a11…e6b5fddb`) |
| Review round-trip PNG SHA-256 | `c8e7b09fa2e128be5293d26033cdb74924a76a26f492047d37c418c702cdc4d8` |
| Runtime-master / review decoded-RGBA mismatches | `0 / 256` |

The canonical source contains no interpolation, smoothing, sharpening, recoloring, resampling,
alpha modification, or invented pixels. Every runtime pixel is reproduced as one solid `64×64`
source block, and the real normalization pipeline (`npm run review:asset`) returns the exact master
with zero drift.

## 3. Family derivation and variation proof

The approved `grass_a` runtime pixels are the sole derivation base. The recipe changes only interior
coordinates in `x,y ∈ [2,13]` and swaps existing colors in pairs.

| Check | Result |
| --- | --- |
| Pair swaps | `22` |
| Changed runtime pixels | `44 / 256` |
| Border pixels changed | `0 / 60` |
| 1px inner-buffer pixels changed | `0` |
| New RGB colors | `0` |
| Histogram drift | `0` |
| Alpha drift | `0` |
| Swatch-index delta per swap | `±1 (adjacent family)` |
| Quadrant distribution | `[5, 6, 5, 6]` (cap 7) |
| Isolated specks | `0` |
| Max changed-cluster size | `4` |
| Reused `grass_b` coordinates | `0` |

Because all four borders and the 1px inner buffer are byte-identical to `grass_a`, any A/B/C
adjacency has the same boundary transition as the already-approved `grass_a` tile. A `5×5`
randomized mixed A/B/C mosaic (`grass_c.mixed-5x5-seam.png`) shows no visible tile boundaries.

## 4. Seam and palette metrics

From the exact `16×16` `grass_c` runtime pixels (`npm run review:asset`):

| Metric | Value |
| --- | ---: |
| Horizontal wrap/internal ratio | `0.683` |
| Vertical wrap/internal ratio | `0.769` |
| Minimum nearest-swatch distance | `2.828` |
| Median nearest-swatch distance | `10.677` |
| Maximum nearest-swatch distance | `26.627` |
| Pixels within tolerance 40 | `256 / 256` |

Both wrap ratios remain below `1`, so tile boundaries are smoother than average internal pixel
transitions. Palette distribution is identical to `grass_a`/`grass_b` because the color multiset is
only permuted.

## 5. Review evidence

| Purpose | File |
| --- | --- |
| Exact runtime master | `grass_c.approved-runtime-master.png` |
| Deterministic recipe | `grass_c.recipe.json` |
| Real-pipeline output | `grass_c.review-normalized.png` |
| One-tile enlargement | `grass_c.preview-20x.png` |
| 3×3 repetition | `grass_c.tile-3x3-8x.png` |
| A/B/exaggerated-difference panel | `grass_c.comparison-panel.png` |
| 5×5 mixed A/B/C seam mosaic | `grass_c.mixed-5x5-seam.png` |
| Review manifest | `grass_c.review.manifest.json` |

All evidence enlargements use nearest-neighbour replication only.

## 6. Packed-family and integration status

With `grass_c` approved, the `tile_farm_grass_base` family (`grass_a`, `grass_b`, `grass_c`) is
complete at the individual-cell gate. Therefore the next step is the deterministic three-cell family
pack and audit (`docs/CURRENT_STATE.md` immediate-next #2).

This audit still produces **no**:

- production `assets/manifests/tile_farm_grass_base.manifest.json` (that is the family-pack step);
- production `assets/tilesets/tile_farm_grass_base.png`;
- Phaser preload or animation registration;
- `public/maps/farm.json` changes;
- runtime, collision, save, quest, curriculum, profile, mastery, reward, or dependency change.
