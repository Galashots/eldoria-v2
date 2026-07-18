# Family audit — `tile_farm_water_shore` deterministic blend family

Date: 2026-07-17 (v1); revised 2026-07-17 (v2 material correction, per ChatGPT's PR #99 blocking review); finalized 2026-07-17 (ChatGPT's second visual verdict: **APPROVED**, head `1991093f291d726b31f24b2870fcf3f5cf0a52f8`)
Scope: deterministic terrain-blend compositor extension (`shoreline_bands` mode) + complete 13-cell shoreline family (source, review evidence, packed sheet). **Source/review work only — no Phaser loading, map, Wangset, collision, runtime animation/shimmer, or gameplay change.**

Implements `docs/art-pipeline/TERRAIN_BLEND_COMPOSITOR_SPEC_V1.md` §10 (shoreline extension). **Status: APPROVED at the source/review/packed-sheet gate.** ChatGPT's second visual + implementation verdict (recorded 2026-07-17 against exact head `1991093f291d726b31f24b2870fcf3f5cf0a52f8`) accepts the 12 generated shoreline transition cells as **APPROVED RUNTIME MASTERS**; `center` retains its existing approved `water_a` identity. See §0b for the verdict record.

## 0. v2 correction (2026-07-17)

ChatGPT's independent visual review of v1 found the shoreline read as **a continuous high-contrast mustard/gold outline around the water**, with the inner-corner island reading as a **bullseye/halo**, and moss effectively absent. ChatGPT diagnosed the root cause precisely — `#D5A342` dominant in the inner-sand band, `#B98535` dominant in the outer-sand band, moss usually falling back to unmodified grass — and prescribed an exact corrective material-selection recipe (band geometry, topology, seed, and palette all unchanged). That recipe is implemented verbatim in `composeShorelineCell()` (§4 below) and verified per-pixel against ChatGPT's literal formulas by a dedicated test.

**Measured effect:** comparing the v1 and v2 packed sheets pixel-for-pixel, `297/342` (86.8%) of sand-classified pixels changed colour; mean luminance across all sand-swatch pixels dropped from `145.35` to `125.05` (**14.0% darker**) — see `ab-v1-vs-v2-comparison.png` for a direct side-by-side of the mixed-tiling preview and contact sheet.

**Honest observation, not a self-certified fix:** the v2 correction only changes *which swatch* is selected within each existing q-band — it does not change band width or topology (per ChatGPT's explicit instruction to preserve those). At `8×` the shoreline still reads as a continuous ring around the water with a visible ring around the inner-corner grass island; the ring is measurably darker/more muted but its *silhouette continuity* is not materially broken by this correction alone. This implementation is faithful to ChatGPT's exact prescribed formula, verified byte-for-byte; whether the result now clears the visual bar (or needs a v3, e.g. varying band width or breaking inner-sand continuity more aggressively) is ChatGPT's call, not self-certified here. The previous audit's claim that the evidence showed "no hard outline … or halo" is withdrawn — see the A/B evidence for the actual rendered pixels.

## 0b. Final verdict — APPROVED (2026-07-17, head `1991093f291d726b31f24b2870fcf3f5cf0a52f8`)

ChatGPT's second, independent visual + implementation review of exact head `1991093f291d726b31f24b2870fcf3f5cf0a52f8` reached a formal verdict: **v2 is sufficient; no v3 is required.**

**Visual finding:** the shoreline still has a continuous bank silhouette — the §0 honest observation stands and is not being walked back. What changed is the *judgment* on that observation: at native/likely runtime scales (1×–4×) the contour reads as a subdued, intentional earthy pond bank rather than the bright mustard/gold outline seen in v1; bright sand (`#D5A342`) is no longer dominant and instead functions as a restrained highlight; the outer band feathers into grass/moss enough to avoid a beach-like double stripe; the inner-corner island remains ring-shaped at `8×` but reads as a compact, readable grassy island bank rather than an objectionable bullseye at gameplay-relevant scale. The continuous silhouette is visually obvious specifically at `8×` nearest-neighbour magnification, which exaggerates every single-pixel boundary — that is an artifact of the review magnification, not of the target-scale read. ChatGPT judged that a v3 aimed solely at erasing the contour would trade away useful material/readability separation and expand scope into geometry changes without a demonstrated defect at target scale.

**Independent implementation verification:** ChatGPT independently reconstructed all 13 runtime cells from the committed compositor formula plus approved `water_a`/`grass_a`, and every reconstructed RGBA cell's SHA-256 matched the corresponding cell in `family-report.json` / the packed-sheet extraction — including all four edges, all four outer corners, and all four inner corners. The exhaustive 100-pair adjacency coverage, the hard-throw mismatch gates, the `test:terrain-blend` CI wiring, and the green exact-head CI run `29619336225` were all independently confirmed as passing.

**Result:** the complete 13-cell `tile_farm_water_shore` family is **APPROVED at the source/review/packed-sheet gate**. All 12 generated transition cells (`edge_north`, `edge_south`, `edge_west`, `edge_east`, `corner_ne`, `corner_nw`, `corner_se`, `corner_sw`, `inner_corner_ne`, `inner_corner_nw`, `inner_corner_se`, `inner_corner_sw`) are recorded as **APPROVED RUNTIME MASTERS**. `center` retains its existing approved `water_a` identity (it was never regenerated — always an exact byte copy). This finalization is documentation-only: no compositor logic, thresholds, seed, swatch rules, generated pixels, canonical sources, manifest ordering, packed sheet, tests, or CI configuration changed to reach this record. `runtimeIntegrated: false`, `mapIntegrated: false`, `physicalIpadValidated: false`, `childValidated: false` remain unchanged — this approval is for the source/review/packed-sheet family only, not runtime or map integration.

## 1. Status — APPROVED at the source/review/packed-sheet gate

The complete reduced 13-tile shoreline family is generated deterministically by compositing approved `tile_farm_water_base / water_a` (foreground/water) against approved `tile_farm_grass_base / grass_a` (background/land), using the same four-corner integer-bilinear mask as the merged dirt compositor, reinterpreted as a five-band q-classifier (water / inner sand / outer sand / moss / grass) with a locked, edge-excluded hashed material variation.

Machine-checked result: **all per-tile, band, and family gates pass**; packed sheet round-trips with **zero drift**; `center` is **byte-identical** to approved `water_a`; the merged dirt family's generated pixels and packed sheet are **unchanged** (regression-tested against the actual committed dirt files). The shared-edge band-class and sand-to-sand RGB gates are now **hard failures** in the compositor itself (`assertNoSharedEdgeMismatches`), not just reported fields, and coverage is **exhaustive** — all 14 usable corner codes (13 topology + `0000`), all 50 directed horizontal + 50 directed vertical compatible pairs, all 16 shared positions each.

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

## 4. Band model (new, shoreline-only) — v2 material-selection formulas

Band membership (q-thresholds) is unchanged from v1 and from `docs/art-pipeline/TERRAIN_BLEND_COMPOSITOR_SPEC_V1.md` §10. Only which swatch is selected *within* each band changed, per ChatGPT's exact v2 correction:

```
q ≥ 0        → water        (exact water_a pixel, unchanged)
−30 ≤ q < 0  → inner sand   (edge/base #B98535; interior hash%11==0 → #D5A342)
−60 ≤ q<−30  → outer sand   (edge/base #926B2A; interior: hash%4==0 → exact grass_a pixel; else hash%3==0 → #6C8B15; else #926B2A)
−90 ≤ q<−60  → moss         (edge: exact grass_a, unchanged; interior: hash%5==0 → #926B2A; else hash%3==0 → #6C8B15; else hash%7==0 → #427118; else exact grass_a)
q < −90      → grass        (exact grass_a pixel, unchanged)
```

Hash: the same locked `hashPixel(x, y, seed)` (Math.imul/XOR/unsigned-shift) already used by dirt's fringe, with shoreline seed `22282` (`0x0000570A`), unchanged from v1. **No fringe inversion is applied to shoreline** — sand/moss variation only ever selects among these named swatches, never crosses a band boundary, so water is never scattered into land and sand is never scattered into water.

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

Shared-edge/adjacency (v2: exhaustive, not sampled): **100 directed compatible pairs — exactly 50 horizontal + 50 vertical — across all 14 usable corner codes (13 topology + `0000`, saddle codes excluded), 0 band-class mismatches** at every one of the 16 shared positions per pair (matching corner bits give the exact same `q`, hence the exact same band — proven for every compatible pair including `1111`-to-`1111` and `0000`-to-`0000`, not just a lattice sample). **0 sand-to-sand RGB mismatches** — sand base swatches are fixed constants (never image-sampled, never hash-varied at an edge), so any two sand-classified shared positions are colour-identical by construction. **Both counters are hard gates**: `assertNoSharedEdgeMismatches()` throws if either is nonzero — this is enforced in the compositor itself, not just recorded in the report, and is directly unit-tested. Water- and grass-band shared-edge RGB equality is **not** required or claimed (those pixels are sampled from the approved source at each tile's own local coordinate — per spec, opposite edges of `water_a`/`grass_a` are not guaranteed byte-identical); instead, the actual measured seam step is reported against the sources' own self-wrap baseline (§7).

Mixed preview: deterministic `7×7` field containing the centre, all four edges, all four outer corners, all four inner corners, pure-water neighbours (`1111`), and pure-grass neighbours (`0000`) — **0 incompatible shared edges**; no saddle code present. The rendered field shows a continuous ring around the water and around the inner-corner grass island at `8×`; per ChatGPT's final verdict (§0b) that ring reads as an intentional earthy bank at native/1×–4× scale, not the bright halo the earlier v1 claim of "no hard outline … or halo" incorrectly asserted.

Determinism: same recipe/inputs → byte-identical buffers; packed-sheet SHA `281c2f63…091daaff` stable across two clean recompositions; **dirt regression proven** — recomposing the merged `dirt.compositor.recipe.json` after this change reproduces the exact same packed-sheet SHA and the exact same 12 canonical-source SHAs already committed on `main`.

## 6. Palette

Locked shoreline swatches only (no new colours) — same 5 hex values as v1; v2 changes only which role/band defaults to which value:

| Hex | v1 role | v2 role |
| --- | --- | --- |
| `#D5A342` | Inner sand base (dominant) | Inner sand rare interior accent (`hash%11==0`) |
| `#B98535` | Inner sand rare accent / outer sand base | Inner sand base (dominant) |
| `#926B2A` | Outer sand rare accent (unused as a base) | Outer sand base (dominant) + moss-band interior interlock (`hash%5==0`) |
| `#6C8B15` | Moss light accent | Outer-sand interior feather (`hash%3==0`) + moss-band light accent (`hash%3==0`) |
| `#427118` | Moss dark accent | Moss-band dark accent (`hash%7==0`), unchanged role |

`validateShorelineRecipe` rejects any recipe attempting to override a locked swatch value or introduce an unknown swatch key. No new colour was introduced for the v2 correction.

## 7. Seam measurement vs. source baselines

| Metric | Value |
| --- | --- |
| `water_a` self horizontal wrap ratio | `1.153` |
| `water_a` self vertical wrap ratio | `1.004` |
| `grass_a` self horizontal wrap ratio | `0.683` |
| `grass_a` self vertical wrap ratio | `0.791` |
| Shoreline water-to-water shared-edge mean RGB step | `10.68` (800 samples) |
| Shoreline grass-to-grass shared-edge mean RGB step | `20.30` (728 samples) |

For reference, `water_a`'s own internal (non-wrap) step averages `9.1–10.8`, and `grass_a`'s own internal step averages `26.8–28.4`. The shoreline's measured water-to-water and grass-to-grass shared-edge steps (`10.68`, `20.30`) sit within that native internal-step range — **no seam penalty relative to the sources' own texture**. Sample counts rose from v1 (768/528) to v2 (800/728) because the v2 outer-sand feathering (`hash%4==0 → exact grass_a`) increases how many shared-edge positions land in the grass-band comparison bucket; this is an accounting artifact of the new material mix, not a seam-quality change.

## 8. Visual read (implementation-side observation) — v2, resolved by §0b

At `8×` nearest-neighbour (contact sheet, mixed-tiling preview, and `ab-v1-vs-v2-comparison.png`): the sand band is measurably darker and more muted than v1 (§0: 14.0% mean luminance drop across sand pixels, 86.8% of sand pixels recoloured), and outer-sand pixels now occasionally show exact grass or light-moss colour (the "feathering" ChatGPT specified). Moss remains sparse — most moss-band pixels still fall back to plain grass, per the locked v2 formula's own priority order (grass is the `else` branch in all three evaluated conditions).

**Resolved by ChatGPT's final verdict (§0b):** the shoreline still reads as a continuous ring around the water and around the inner-corner grass island at `8×` — that visual character was muted, not eliminated, because v2 only changes swatch selection within existing q-bands and deliberately does not touch band width, topology, or geometry (per ChatGPT's explicit instruction to preserve those). ChatGPT's independent review judged this sufficient: the `8×` ring is a magnification artifact, and at native/1×–4× the family reads as an intentional, readable earthy bank rather than a beach or halo. No v3 was requested.

**Other visual checks, per the originally requested risk callouts:**

- ChatGPT's second review specifically addressed "pinched inner corners" (found readable, not materially pinched) and did not flag shoreline thickness as excessive.
- No new sand/moss colour was needed or added for v2; the same 5 locked `wood_leather`/`forest` swatches were sufficient, only their band-role assignment changed.

## 9. Artifacts

| Purpose | Path |
| --- | --- |
| Compositor extension (same file as dirt; dirt path untouched) | `scripts/compose-terrain-blend-family.mjs` |
| Focused shoreline tests (16 groups, incl. dirt non-regression, exhaustive adjacency, hard-throw unit test) | `scripts/test-shoreline-terrain-blend.mjs` |
| Recipe (v2 notes inline) | `docs/art-pipeline/review/tile_farm_water_shore_family/shoreline.compositor.recipe.json` |
| Family report | `docs/art-pipeline/review/tile_farm_water_shore_family/family-report.json` |
| Band sheet | `bands-13x1.png` |
| Labelled contact sheet (v2) | `family-contact-sheet.png` |
| Mixed-tiling preview (v2) | `mixed-tiling-preview.png` |
| **v1-vs-v2 A/B comparison (new)** | `ab-v1-vs-v2-comparison.png` |
| Canonical sources (`1024×1024`, RGB) | `assets/source/generated/tile_farm_water_shore/<variant>.png` (`center.png` is an exact byte copy of the approved `water_a.png` canonical) |
| Production manifest | `assets/manifests/tile_farm_water_shore.manifest.json` |
| Packed sheet (`208×16`) | `assets/tilesets/tile_farm_water_shore.png` (SHA `281c2f63…091daaff`) |
| CI (new) | `.github/workflows/ci.yml` now runs `npm run test:terrain-blend` as a named step |

Per-cell runtime masters are `.tmp`/CI artifacts (SHAs recorded in the report), not committed, per the evidence-retention policy.

## 10. Integration status (unchanged)

`runtimeIntegrated: false`, `mapIntegrated: false`, `physicalIpadValidated: false`, `childValidated: false`. No production Phaser preload, no `public/maps/farm.json` change, no Wangset/Tiled wiring, no collision/save/quest/curriculum/mastery/reward/dependency change, no shimmer/animation. No shoreline decals, reeds, stones, foam, or lily pads were added — those remain separate, out-of-scope targets.
