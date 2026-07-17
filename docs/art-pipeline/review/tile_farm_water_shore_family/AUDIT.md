# Family audit — `tile_farm_water_shore` deterministic blend family

Date: 2026-07-17
Scope: deterministic terrain-blend compositor extension (`shoreline_bands` mode) + complete 13-cell shoreline family (source, review evidence, packed sheet). **Source/review work only — no Phaser loading, map, Wangset, collision, runtime animation/shimmer, or gameplay change.**

Implements `docs/art-pipeline/TERRAIN_BLEND_COMPOSITOR_SPEC_V1.md` §10 (shoreline extension). **This audit records the deterministic implementation and machine-checked gates only. Final formal visual verdict is ChatGPT's and is not yet recorded — do not treat any cell here as an APPROVED RUNTIME MASTER.**

## 1. Status — implementation complete, awaiting ChatGPT's visual verdict

The complete reduced 13-tile shoreline family is generated deterministically by compositing approved `tile_farm_water_base / water_a` (foreground/water) against approved `tile_farm_grass_base / grass_a` (background/land), using the same four-corner integer-bilinear mask as the merged dirt compositor, reinterpreted as a five-band q-classifier (water / inner sand / outer sand / moss / grass) with a locked, edge-excluded hashed material variation.

Machine-checked result: **all per-tile, band, and family gates pass**; packed sheet round-trips with **zero drift**; `center` is **byte-identical** to approved `water_a`; the merged dirt family's generated pixels and packed sheet are **unchanged** (regression-tested against the actual committed dirt files).

## 2. Inputs (approved, exact `16×16`)

| Role | Path | SHA-256 |
| --- | --- | --- |
| foreground (water) | `docs/art-pipeline/review/tile_farm_water_base_water_a/water_a.review-normalized.png` | `c719103c…ed2878048` |
| background (grass) | `docs/art-pipeline/review/tile_farm_grass_base_grass_a/grass_a.review-normalized.png` | `40655a11…b5fddb` |
| approved centre canonical (reused, not modified) | `assets/source/generated/tile_farm_water_base/water_a.png` | `5772b427…053f6d` |

All three decode cleanly; the two 16×16 runtime inputs are fully opaque. Neither approved input file was modified, redrawn, resampled, or regenerated.

## 3. Mask model (reused unchanged)

Same corner order `[nw, ne, se, sw]`, same integer formula, `1` = water:

```
score = nw·(15−x)(15−y) + ne·x(15−y) + se·x·y + sw·(15−x)·y
q     = 2·score − 225
```

`qValue()`, `TOPOLOGY`, and `SADDLE_CODES` are the exact same exports used by the merged dirt compositor — not copied, not modified.

## 4. Band model (new, shoreline-only)

```
q ≥ 0        → water        (exact water_a pixel)
−30 ≤ q < 0  → inner sand   (base #D5A342, interior hash%4==0 → #B98535)
−60 ≤ q<−30  → outer sand   (base #B98535, interior hash%6==0 → #926B2A)
−90 ≤ q<−60  → moss         (interior: hash%11==0 → #427118, else hash%5==0 → #6C8B15, else exact grass_a pixel)
q < −90      → grass        (exact grass_a pixel)
```

Hash: the same locked `hashPixel(x, y, seed)` (Math.imul/XOR/unsigned-shift) already used by dirt's fringe, with shoreline seed `22282` (`0x0000570A`). **No fringe inversion is applied to shoreline** — sand/moss variation only ever selects among same-band swatches, never crosses a band boundary, so water is never scattered into land and sand is never scattered into water.

**Outer-row/column pixels never receive hashed variation** — they always resolve to the band's base material (water/grass verbatim, or the sand base swatch). This is what makes shared-edge classification reliable and seam-safe.

Deterministic pre-variation band counts (verified exactly, band membership is purely geometric — independent of hashing):

| Topology | water | inner sand | outer sand | moss | grass |
| --- | ---: | ---: | ---: | ---: | ---: |
| center | 256 | 0 | 0 | 0 | 0 |
| each edge | 128 | 16 | 16 | 16 | 80 |
| each outer corner | 41 | 15 | 14 | 17 | 169 |
| each inner corner | 215 | 9 | 8 | 9 | 15 |
| `0000` (unshipped) | 0 | 0 | 0 | 0 | 256 |

## 5. Gates (all pass)

Per tile (13/13): exactly `16×16`; alpha `256 opaque / 0 partial / 0 transparent`; **`center` byte-identical to `water_a`** (0/1024 channel mismatches); **every output pixel is the exact `water_a`/`grass_a` pixel at that coordinate, or one of the 5 locked hex swatches — 0 unexpected colours** on every cell; exact band occupancy (table above, verified per cell); **0 hashed-variation violations** on any outer row/column (enforced as a hard failure in the compositor itself, not just a report field); canonical-source `64×` block exactness; **0 decoded-RGBA drift** after real-pipeline normalization and packed-sheet extraction.

Shared-edge/adjacency: **84 shared-edge pairs, 0 band-class mismatches** (matching corner bits give the exact same `q`, hence the exact same band, at every one of the 16 shared positions — proven for all compatible pairs including `1111`-to-`1111` and `0000`-to-`0000`). **0 sand-to-sand RGB mismatches** — sand base swatches are fixed constants (never image-sampled, never hash-varied at an edge), so any two sand-classified shared positions are colour-identical by construction, confirmed empirically. Water- and grass-band shared-edge RGB equality is **not** required or claimed (those pixels are sampled from the approved source at each tile's own local coordinate — per spec, opposite edges of `water_a`/`grass_a` are not guaranteed byte-identical); instead, the actual measured seam step is reported against the sources' own self-wrap baseline (§7).

Mixed preview: deterministic `7×7` field containing the centre, all four edges, all four outer corners, all four inner corners, pure-water neighbours (`1111`), and pure-grass neighbours (`0000`) — **0 incompatible shared edges**; no saddle code present; no hard outline, checkerboard, rosette, halo, decorative border, or baked object in the rendered evidence.

Determinism: same recipe/inputs → byte-identical buffers; packed-sheet SHA `a334a598…9eb6e09` stable across two clean recompositions; **dirt regression proven** — recomposing the merged `dirt.compositor.recipe.json` after this change reproduces the exact same packed-sheet SHA and the exact same 12 canonical-source SHAs already committed on `main`.

## 6. Palette

Locked shoreline swatches only (no new colours):

| Role | Hex |
| --- | --- |
| Inner sand base | `#D5A342` |
| Outer sand base / inner-sand alt | `#B98535` |
| Dark sand accent (outer-sand alt) | `#926B2A` |
| Light moss | `#6C8B15` |
| Dark moss | `#427118` |

`validateShorelineRecipe` rejects any recipe attempting to override a locked swatch value or introduce an unknown swatch key.

## 7. Seam measurement vs. source baselines

| Metric | Value |
| --- | --- |
| `water_a` self horizontal wrap ratio | `1.153` |
| `water_a` self vertical wrap ratio | `1.004` |
| `grass_a` self horizontal wrap ratio | `0.683` |
| `grass_a` self vertical wrap ratio | `0.791` |
| Shoreline water-to-water shared-edge mean RGB step | `10.68` (768 samples) |
| Shoreline grass-to-grass shared-edge mean RGB step | `20.30` (528 samples) |

For reference, `water_a`'s own internal (non-wrap) step averages `~9.1–10.8`, and `grass_a`'s own internal step averages `~26.8–28.4`. The shoreline's measured water-to-water and grass-to-grass shared-edge steps (`10.68`, `20.30`) sit within or below that native internal-step range — **no material seam penalty relative to the sources' own texture**.

## 8. Visual read (implementation-side observation, not a verdict)

At `8×` nearest-neighbour (contact sheet, mixed-tiling preview): the pond reads as a subdued bank — a narrow light-tan edge, a slightly darker outer band, and grass dissolving in with only occasional moss fleck. The 13-cell mixed field forms a natural, rounded, non-rectangular pond with a correctly-read grass island around the inner-corner hole.

**Uncertainty flagged for ChatGPT's visual judgment, per the requested risk callouts:**

- Moss is very sparse by design (`hash%11==0` / `hash%5==0` against ~9–17 moss-band pixels per tile, so most cells show only 0–4 actual moss-tinted pixels — the rest of the moss band falls back to plain grass). This satisfies "sparse moss dissolving into grass," but it may read as *almost no moss at all* rather than a visible transition layer — worth a deliberate look at whether that's the intended amount or too subtle.
- No dedicated visual check was performed for "bright sand reading as tropical beach," "concentric halo/bullseye at corners," "pinched inner corners," or "shoreline thicker than intended" beyond the machine gates and the implementer's own read above — these are exactly the kind of judgment calls reserved for ChatGPT's formal audit, not self-certified here.
- No new sand/moss colour was needed or added; the locked `wood_leather`/`forest` swatches were sufficient for this read.

## 9. Artifacts

| Purpose | Path |
| --- | --- |
| Compositor extension (same file as dirt; dirt path untouched) | `scripts/compose-terrain-blend-family.mjs` |
| Focused shoreline tests (14 groups, incl. dirt non-regression) | `scripts/test-shoreline-terrain-blend.mjs` |
| Recipe | `docs/art-pipeline/review/tile_farm_water_shore_family/shoreline.compositor.recipe.json` |
| Family report | `docs/art-pipeline/review/tile_farm_water_shore_family/family-report.json` |
| Band sheet | `bands-13x1.png` |
| Labelled contact sheet | `family-contact-sheet.png` |
| Mixed-tiling preview | `mixed-tiling-preview.png` |
| Canonical sources (`1024×1024`, RGB) | `assets/source/generated/tile_farm_water_shore/<variant>.png` (`center.png` is an exact byte copy of the approved `water_a.png` canonical) |
| Production manifest | `assets/manifests/tile_farm_water_shore.manifest.json` |
| Packed sheet (`208×16`) | `assets/tilesets/tile_farm_water_shore.png` (SHA `a334a598…9eb6e09`) |

Per-cell runtime masters are `.tmp`/CI artifacts (SHAs recorded in the report), not committed, per the evidence-retention policy.

## 10. Integration status (unchanged)

`runtimeIntegrated: false`, `mapIntegrated: false`, `physicalIpadValidated: false`, `childValidated: false`. No production Phaser preload, no `public/maps/farm.json` change, no Wangset/Tiled wiring, no collision/save/quest/curriculum/mastery/reward/dependency change, no shimmer/animation. No shoreline decals, reeds, stones, foam, or lily pads were added — those remain separate, out-of-scope targets.
