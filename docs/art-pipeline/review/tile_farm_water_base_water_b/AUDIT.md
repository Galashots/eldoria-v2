# Batch B audit — `tile_farm_water_base` / `water_b`

Date: 2026-07-17
Scope: deterministic runtime-master derivation, canonical-source reconstruction, review-only
normalization, and family-compatibility evidence. **Source/review work only — no runtime, map, or
production-manifest integration.**

Collaboration: ChatGPT led the constraints, the delta-rule adaptation, and the formal visual-QA
verdict; Claude Code (repo agent) performed the deterministic derivation and ingestion. Produced
during the overnight ChatGPT + Claude closed-loop session.

## 1. Verdict

`water_b` is accepted as an **APPROVED RUNTIME MASTER** (verdict assigned by ChatGPT via a direct
change-map / pixel audit).

It is a quiet second base-water variant derived from the approved `water_a` runtime pixels through a
deterministic, recorded interior-only recipe:

- exact runtime canvas: `16×16` RGBA;
- 18 pair swaps / 36 changed pixels;
- all swaps adjacent (Manhattan distance 1);
- no border or 1px-buffer pixels changed;
- no new colors introduced;
- the complete 256-pixel color histogram is preserved exactly;
- alpha remains 255 for all pixels;
- changes distributed across all four interior quadrants (`[4,4,5,5]`);
- 0 isolated specks; max changed-run 3 (no streak > 3); max cluster 4; no filled 2×2 blocks.

The deterministic recipe is retained in `water_b.recipe.json`.

## 2. Recorded adaptation (required note)

`water_b` required a justified adaptation of the standard deterministic variant recipe because the
approved `water_a` is **near-uniform at the swatch-family level**: 255 of 256 pixels resolve to
swatch `#0A6089`, with a single `#3E9DC6` light accent pixel. Only **3** delta-1 interior
adjacencies exist in the whole tile, so the standard "nearest-swatch index delta ±1 only" rule is
infeasible.

Per ChatGPT's confirmed adaptation, **delta ≤ 1** was used: mostly **delta-0 within-swatch
micro-shimmer** swaps (17) plus **one delta-1** swap relocating the single light accent pixel from
`(13,5)` to `(13,4)`, with **no delta > 1** swaps. This is the quietest available variation for a
near-uniform water tile.

Forward-looking pipeline note (from ChatGPT, not a blocker): deterministic siblinging on this water
family has limited headroom; additional water variety may later require a different approved base, a
richer canonical source, or a runtime shimmer/overlay solution.

## 3. Source and runtime identity

| Field | Value |
| --- | --- |
| Target / variant | `tile_farm_water_base` / `water_b` |
| Runtime master | `water_b.approved-runtime-master.png` |
| Runtime dimensions | `16×16` RGBA |
| Runtime PNG SHA-256 | `1dc2ba4627c4937d41b8858c2a78a8e4de8d2a616b91b4e545772975f9e28bf3` |
| Canonical source | `assets/source/generated/tile_farm_water_base/water_b.png` |
| Canonical dimensions | `1024×1024` RGBA |
| Canonical PNG SHA-256 | `a1bb569e5c6389b3a33a220515f906f48e66466eeaa582899b21f0ffb3b69543` |
| Construction | exact `64×` nearest-neighbour block replication |
| Derivation base | `water_a.review-normalized.png` (`c719103c…d2878048`) |
| Review round-trip PNG SHA-256 | `1dc2ba4627c4937d41b8858c2a78a8e4de8d2a616b91b4e545772975f9e28bf3` |
| Runtime-master / review decoded-RGBA mismatches | `0 / 256` |

The real normalization pipeline (`npm run review:asset`) returns the exact master with zero drift.

## 4. Verification

| Check | Result |
| --- | --- |
| Pair swaps | `18` |
| Changed runtime pixels | `36 / 256` |
| Border pixels changed | `0 / 60` |
| 1px inner-buffer pixels changed | `0` |
| New RGB colors | `0` |
| Histogram drift | `0` |
| Alpha drift | `0` |
| Swatch-index delta per swap | `≤1 (17 delta-0, 1 delta-1)` |
| Quadrant distribution | `[4, 4, 5, 5]` |
| Isolated specks | `0` |
| Max changed run (H/V) | `3` (no streak > 3) |
| Max changed-cluster size | `4` |
| Filled 2×2 blocks | `0` |

## 5. Seam and palette metrics (`npm run review:asset`, families `arcane,forest`, tol 40)

| Metric | water_b | approved water_a (baseline) |
| --- | ---: | ---: |
| Horizontal wrap/internal ratio | `1.125` | `1.153` |
| Vertical wrap/internal ratio | `0.976` | `1.004` |
| Palette pixels within tolerance 40 | `253 / 256` | `253 / 256` |
| Palette min / median / max | `4.899 / 19.545 / 48.218` | `4.899 / 19.545 / 48.218` |

`water_b` is **equal-or-better than approved `water_a` on both seam axes**. The horizontal ratio > 1
is intrinsic to this near-uniform tile (the interior is so smooth that any small seam step exceeds
it) and is already present in `water_a`. The palette profile is identical to `water_a` because the
color multiset is only permuted; the 3 out-of-tolerance pixels are `water_a`'s own approved pixels.

## 6. Review evidence

| Purpose | File |
| --- | --- |
| Exact runtime master | `water_b.approved-runtime-master.png` |
| Deterministic recipe | `water_b.recipe.json` |
| Real-pipeline output | `water_b.review-normalized.png` |
| One-tile enlargement | `water_b.preview-20x.png` |
| 3×3 repetition | `water_b.tile-3x3-8x.png` |
| water_a / water_b comparison panel | `water_b.comparison-panel.png` |
| Native water_a | water_b side-by-side | `water_b.ab-sidebyside-16x.png` |
| 5×5 mixed A/B seam mosaic | `water_b.mixed-5x5-seam.png` |
| Review manifest | `water_b.review.manifest.json` |

## 7. Integration status

`tile_farm_water_base` now has two approved variants (`water_a`, `water_b`). This audit produces
**no** production `tile_farm_water_base` manifest, packed sheet, shimmer-clip assembly, Phaser
loading, `public/maps/farm.json` change, or any runtime/collision/save/quest/curriculum/profile/
reward/dependency change.
