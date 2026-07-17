# Family audit — `tile_farm_path_dirt` deterministic blend family

Date: 2026-07-17
Scope: deterministic terrain-blend compositor + complete 13-cell dirt family (source, review evidence, packed sheet). **Source/review work only — no Phaser loading, map, Wangset, collision, save, gameplay, quest, curriculum, or dependency integration.**

Implements `docs/art-pipeline/TERRAIN_BLEND_COMPOSITOR_SPEC_V1.md`. This audit records the deterministic implementation, machine-checked gates, and ChatGPT's formal visual verdict.

## 1. Verdict — APPROVED

The complete reduced 13-tile dirt family is generated deterministically by compositing the approved `tile_farm_path_dirt / center` dirt over approved `tile_farm_grass_base / grass_a`, using a four-corner code with integer bilinear interpolation plus a one-pixel deterministic material interlock. Every output pixel is copied verbatim from one of the two approved inputs at the same coordinate — no image generation, interpolation, antialiasing, SDF, palette invention, or per-variant randomness.

Machine-checked result: **all per-tile, complementary-edge, and family gates pass**; packed sheet round-trips with **zero drift**; the approved centre is **byte-identical** to its approved input.

**ChatGPT formal visual + implementation review — approved**, on head `530b62109a83de09bafc72175d77abf43fcf9d4f` (PR #98). The 12 generated transition cells pass as **APPROVED RUNTIME MASTERS**; the complete 13-cell `tile_farm_path_dirt` family passes the source/review family gate; the existing `center` retains its prior approved status. ChatGPT independently rebuilt the exact 7×7 mixed lattice from the committed packed sheet and approved `grass_a` pixels, confirming the outer corners, four edges, four concave inner corners, centre, and pure-grass neighbours join without hard grid lines or material discontinuities, and that the one-pixel interlock breaks the mathematical contour without becoming noisy or decorative. Independent RGB seam check on the rebuilt field: horizontal shared-edge mean `14.577` vs. same-material internal mean `19.656` (ratio `0.742`); vertical shared-edge mean `14.454` vs. internal `19.370` (ratio `0.746`) — no seam outlier. Exact-head CI run `29591676568` confirmed green (one unrelated Playwright Wildbloom-discovery smoke flake passed on rerun). Approval was conditioned only on a procedural restack onto `main` (after the water_b merge) and a documentation update recording this verdict — no compositor parameters, generated pixels, recipes, or packed ordering changed.

## 2. Inputs (approved, exact `16×16`)

| Role | Path | SHA-256 | Colours |
| --- | --- | --- | --- |
| foreground (dirt) | `docs/art-pipeline/review/tile_farm_path_dirt_center/center.review-normalized.png` | `5a505606…3fb003` | 205 |
| background (grass) | `docs/art-pipeline/review/tile_farm_grass_base_grass_a/grass_a.review-normalized.png` | `40655a11…b5fddb` | 252 |

Both decode as `16×16`, fully opaque RGBA.

## 3. Mask model (four-corner code, integer bilinear)

Corner order `[nw, ne, se, sw]`; `1` = dirt (foreground). For each pixel `(x, y)`, `x,y ∈ [0,15]`:

```
score = nw·(15−x)(15−y) + ne·x(15−y) + se·x·y + sw·(15−x)·y
q     = 2·score − 225
foreground = q ≥ 0
```

Weight total is `225` (odd) so `q` is never zero — no tie-break. Integer-only. Outer-edge samples depend only on that edge's two corner bits, so matching shared corners give identical shared-edge classification, and complementary codes give exact inverse core masks (`q(complement) = −q(original)`).

## 4. Topology and deterministic occupancy

Packed order and expected core-foreground counts:

| Idx | Variant | `[nw,ne,se,sw]` | Core count |
| ---: | --- | --- | ---: |
| 0 | center | `1111` | 256 |
| 1–4 | edge_{north,south,west,east} | one edge | 128 |
| 5–8 | corner_{ne,nw,se,sw} | one corner | 41 |
| 9–12 | inner_corner_{ne,nw,se,sw} | one grass corner | 215 |

All 13 counts verified exactly. The two diagonal saddle codes (`1010`, `0101`) are rejected as production variants and excluded from the mixed preview.

## 5. Material interlock (fringe)

A pixel is fringe-eligible only when `x ∈ [1,14]`, `y ∈ [1,14]`, and `|q| ≤ 30`. For eligible pixels a locked unsigned-32-bit hash (`Math.imul`/XOR/unsigned-shift, seed `0x0000D17A` = `53626`) inverts the material selection when `hash % 3 === 0`. Never touches the outer row/column, never creates a colour, single pass. Because `center`'s `q` is nowhere fringe-eligible, `center` stays byte-identical to the dirt input. Fringe-eligible/changed counts per variant are recorded in `family-report.json` (edges 28 eligible / 6–7 changed; corners & inner corners 20 eligible / 2–10 changed; centre 0/0).

## 6. Gates (all pass)

Per tile (13/13): exactly `16×16`; alpha `256 opaque / 0 partial / 0 transparent`; **0 unexpected colours** (every pixel is a foreground- or background-input pixel); **256/256 within RGB distance 40** of the locked `forest + wood_leather` swatches (max nearest-swatch distance ≈ `32.5`); exact core occupancy; no fringe outside the declared band; canonical-source `64×` block exactness; **zero decoded-RGBA drift** after real-pipeline normalization and after extraction from the packed sheet.

Complementary-edge: across the mixed lattice, **84 shared-edge pairs, 0 material-class mismatches**; no fringe pixel on any shared outer edge (fringe excludes the border by construction).

Family: 13 unique variants in authoritative order; packed sheet exactly **`208×16`**; every packed cell hash matches its generated runtime cell; deterministic mask sheet; labelled nearest-neighbour contact sheet; deterministic irregular mixed-tiling preview (`7×7` field: centre, all four outer corners, all four edges, all four inner corners, and pure-grass neighbours) with **0 incompatible shared edges**; no visible grid line, checkerboard, lattice, rosette, decorative border, or baked object. Dirt reads quiet.

Determinism: same recipe + inputs produce byte-identical buffers; the packed sheet SHA is stable across two clean recompositions (`b9da641b…dddf7a`).

## 7. Artifacts

| Purpose | Path |
| --- | --- |
| Compositor | `scripts/compose-terrain-blend-family.mjs` |
| Focused tests (14 groups) | `scripts/test-terrain-blend-compositor.mjs` |
| Recipe | `docs/art-pipeline/review/tile_farm_path_dirt_family/dirt.compositor.recipe.json` |
| Family report | `docs/art-pipeline/review/tile_farm_path_dirt_family/family-report.json` |
| Mask sheet | `masks-13x1.png` |
| Labelled contact sheet | `family-contact-sheet.png` |
| Mixed-tiling preview | `mixed-tiling-preview.png` |
| Canonical sources (`1024×1024`, RGB) | `assets/source/generated/tile_farm_path_dirt/<variant>.png` (12 new; `center.png` unchanged) |
| Production manifest | `assets/manifests/tile_farm_path_dirt.manifest.json` |
| Packed sheet (`208×16`) | `assets/tilesets/tile_farm_path_dirt.png` (SHA `b9da641b…dddf7a`) |

Per-cell runtime masters and exhaustive crops are `.tmp`/CI artifacts (SHAs recorded in the report), not committed, per the evidence-retention policy.

## 8. Integration status (unchanged)

`runtimeIntegrated: false`, `mapIntegrated: false`, `physicalIpadValidated: false`, `childValidated: false`. No production Phaser preload, no `public/maps/farm.json` change, no Wangset/Tiled wiring, no collision/save/quest/curriculum/mastery/reward/dependency change. The shoreline family is intentionally **not** in this PR; the compositor's generic corner-code interface is preserved for it (water-as-foreground) per spec §10.
