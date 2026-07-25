# char_mage_boy_base — four-direction neutral idle (cardinal) — normalization audit

**Family:** `char_mage_boy_base_cardinal_idle_v001`
**Target:** `char_mage_boy_base` (`docs/visual-targets/hero_actor_targets.json`) — 32×48, pivot [16,47], ppu 16, `paletteFamilies: [skin_hair, arcane]`, `lightDirection: upper_left`, `status: target_only`
**Production class:** anchor
**Verdict:** **HOLD** — `named_next_gate: owner (Leo) visual verdict, then ChatGPT independent visual audit`

Machine gates pass and the deterministic evidence package is complete. **Claude does not self-approve art.** The six perspective-lock judgment gates remain `status: open` in `report.json` and are the reviewer's to close.

## Scope of this record

Normalization and evidence only. **No runtime integration:** the normalized sheet stays under
`assets/source/generated/`, is not written to `assets/sprites/`, is not loaded by any scene, and does
not replace the current flat Mage (`char_mage_boy_base_idle_v001`). No animation was produced. No
palette contract or target geometry was changed.

## Accepted source set (bytes committed unchanged)

All four were independently audited during the 2026-07-23 conveyor session; hashes below are the
bytes as committed here, and each matches the accepted original exactly.

| Direction | Committed source | SHA-256 | Recorded source verdict |
|---|---|---|---|
| SOUTH (`front`) | `south_source.png` | `a2c16cbe4300347b5209c3c00cfab3e4a0e5f369a9bf01cacc888268ec88bcb2` | APPROVED SOURCE CANDIDATE — South anchor only |
| NORTH (`back`) | `north_source.png` | `e8ed13f1e126f4331ac363019d7b0950657915ba76659c61ee2bd2699fa44b19` | ACCEPTED SOURCE — projection/identity/isolation, **hair hue deferred to normalization** |
| WEST (`left`) | `west_source.png` | `c02e82f9da8d688a686ecdbc495d7225ce684728a1d3434a77964f2330455327` | APPROVED SOURCE CANDIDATE — West anchor only |
| EAST (`right`) | `east_source.png` | `9bf697fd3694990d738364dbde4be53d088f274ad1c005e79f77d1e72e41edd9` | APPROVED SOURCE CANDIDATE — East anchor only, hair hue deferred |

Each source is 1024×1536, 8-bit **RGB with a flat magenta key** (no alpha channel).

**Runtime output:** `normalized_sheet.png` — 128×48 RGBA
SHA-256 `e928005dce23e1c84858b583044d98b044c1d083500c16bc70f33b3f00995f6f`

## Direction mapping

Packed in the canonical harness order from `hero_actor_targets.json`
(`directions: [front, back, left, right]`), which the target's own notes bind to cardinal headings:

| Cell | destCell | Direction | Source |
|---|---|---|---|
| 0 | `[0,0]` | `front` = **South** | south |
| 1 | `[1,0]` | `back` = **North** | north |
| 2 | `[2,0]` | `left` = **West** | west |
| 3 | `[3,0]` | `right` = **East** | east |

## Transforms (all declared in `assets/manifests/char_mage_boy_base_cardinal_idle_v001.manifest.json`)

1. **Magenta key → alpha** — `color_key` `#fa03f9`, `tolerance: 40`.
2. **Chroma-fringe rejection** — `fringeHueMargin: 20`. The keyed sources leave an anti-aliased blend
   ring that a per-channel tolerance box cannot reach; an RGB-distance test cannot either, because a
   dark fringe blend and a dark subject colour are equidistant from a bright key (measured: raising the
   radius to 250 still left 1–9 stray pixels while eroding up to 17% of real subject pixels). Rejecting
   pixels that retain the key's channel signature (R and B both above G) removed **all** stray pixels
   with **no** subject erosion, because no legitimate Mage colour shares that signature
   (navy r−g = −31, teal −41, hair b−g = −23, skin b−g = −92).
3. **Hair-tone unification** — per-direction `recolor` gains over the top 35% of the alpha bounding box,
   selecting warm pixels (`rMin 30`, `rMax 150`, `minWarmth 10`). Implements the owner's 2026-07-23
   decision to accept projection-good sources and fix hue deterministically at normalization, unified
   across all four directions. Measurement showed the drift is **hair-specific, not a global warm bias**
   (navy/teal/skin already agree across directions), so a whole-image white balance would have been wrong.
   Target is the mean of the two verdict-approved anchors' head-region warm medians — South (68,42,25)
   and West (75,44,21) → **(72,43,23)**. Gains are literal manifest values, never measured at run time.

   | Direction | Source head-region hair | Gain (R,G,B) | Normalized cell hair |
   |---|---|---|---|
   | SOUTH | (68,42,25) | 1.059, 1.024, 0.920 | (74,44,23) |
   | NORTH | (55,37,20) | 1.309, 1.162, 1.150 | (72,43,23) |
   | WEST | (75,44,21) | 0.960, 0.977, 1.095 | (74,44,23) |
   | EAST | (92,40,12) | 0.783, 1.075, 1.917 | (76,45,25) |

   Whole-subject hair spread before: R **55–92**. After: R **72–76**.
4. **Scale to a shared height** — `fit: fixed` with a per-direction `scale`, `anchor: center_bottom`.
   Per-direction scales are required because the accepted sources are framed differently (South's subject
   is 640px tall against West's 828px); one global scale would miss the ±1px height-parity gate by ~10px.
   The source audit explicitly left deterministic crop/scale to normalization, and scaling does not alter
   the accepted perspective or proportions.

   | Direction | Trimmed source | Scale | Normalized |
   |---|---|---|---|
   | SOUTH | 337×640 | 0.070313 | 24×45 |
   | NORTH | 361×803 | 0.056040 | 20×45 |
   | WEST | 348×828 | 0.054348 | 19×45 |
   | EAST | 340×818 | 0.055012 | 19×45 |

Resampling is the normalizer's existing nearest-neighbour point sampling. An area-average alternative was
tried and rejected: it removed the fringe but blurred the face into dark blobs and lost the eyes at 32×48.

## Machine gates — all pass

From `cardinal_idle_v001/report.json` (`machinePassed: true`):

| Gate | Result |
|---|---|
| `geometry` | 128×48, 0 empty directions |
| `binary_alpha` | 0 semi-alpha pixels in all four cells |
| `cell_bleed` | no interior boundary contact in any direction |
| `apparent_height_parity` | heights [45,45,45,45], spread **0** (tolerance 1) |
| `pivot_contact` | contact rows [47,47,47,47] = pivot row 47 |
| `occupancy_bounds` | widths [24,20,19,19] ≤ 26; heights all within [44,46] |

**Deterministic regeneration:** `runs: 2`, `files_compared: 9`, `written_files_byte_identical: true`.

## Evidence artifacts

`docs/art-pipeline/review/char_mage_boy_base_cardinal_idle_v001/trial/`
- `cardinal_idle_v001/preview_1x_farm_bright.png` — exact 1× in-situ on the approved Farm grass master
- `cardinal_idle_v001/preview_1x_woods_bridge.png` — exact 1× in-situ on the darker Woods plate
- `cardinal_idle_v001/sheet_nn8x.png` — whole sheet at 8× nearest-neighbour
- `cardinal_idle_v001/overlay_{front,back,left,right}.png` — 8× cells with pivot/baseline markers
- `cardinal_idle_v001/contact_sheet.png` — four-direction contact sheet
- `cardinal_idle_v001/report.json` — gates, metrics, input/provenance hashes, judgment gates
- `comparison_by_direction.png`, `trial_report.json`

`trial/` holds **only** harness-generated files. The deterministic-regeneration gate compares that
directory against a freshly written tree, so a hand-written file inside it (this audit included) would
fail the gate on re-run — which is why the audit sits one level up. Regenerate with:

```bash
node scripts/compose-perspective-trial-evidence.mjs --manifest assets/manifests/char_mage_boy_base_cardinal_idle_v001.trial.manifest.json
```

## Open judgment gates (reviewer's call, not machine-decidable)

`foreshortened_not_frontal`, `visible_top_planes`, `single_camera_pitch`, `upper_left_key_light`,
`identity_readability`, `embedded_in_environment` — all `status: open`.

## Residual observations for the reviewer

- **Dark speckling in the hair mass**, most visible in `back` and `right` at 8×: nearest-neighbour
  sampling of a 1024px source picks individual dark shadow pixels. Not fringe (zero key-hued pixels
  remain). Deliberately not smoothed — that would alter accepted art beyond the authorized remap.
- **South/West are nudged ~4–5%** in the warm channels by the shared hair target, since one unified tone
  cannot leave two differing approved anchors both untouched. Confirm this is acceptable.
- `skin_hair` still has **no locked hex swatches** anywhere in the repo, so the hair target here is a
  family-local declared value, not a palette contract. Locking `skin_hair` remains an owner decision.
- Camera pitch, foreshortening and identity are unjudged by machine; the 8× overlays and both 1× plates
  are the intended review surface.
