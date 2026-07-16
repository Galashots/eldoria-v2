# env_farm_rock_medium / rock_a — Approved Runtime Master Audit

## Verdict

**APPROVED RUNTIME MASTER**

The high-resolution generation produced a strong landmark-rock composition, but was not retained as canonical source because exact runtime normalization exposed colour-key fringe pixels. A padded Category-C `sourceRect` `[160,160,1000,805]` with `trim: none` preserves transparent lateral breathing room and corrects the original undersized/floating normalization. ChatGPT then replaced only six contaminated, out-of-tolerance, or visibly off-hue runtime pixels with directly adjacent sampled stone colours. No silhouette, plane geometry, occupancy, lighting, or subject structure was redrawn.

## Authoritative target

- Runtime canvas: `32×32`
- Footprint: centred lower `16×16`, `[8,16,16,16]`
- Pivot: `[16,31]`
- Render layer: `actors_body`
- Palette: farm `metal_stone` (`metal` alias)
- Light: upper-left
- Collision/runtime integration: unchanged and absent

## Deterministic source and round trip

- Approved master SHA-256: `d315f3397c7b8f6972095e20e430c60ee8ed63607a6a149d0a3b1a0ab38f2de0`
- Canonical `1024×1024` RGBA source SHA-256: `0b7dc0c016d75ce735581a8e416335c805a09a0f0d87b80b020813852a510d4f`
- Canonical source: exact `32×` alpha-preserving nearest-neighbour replication
- Canonical block mismatches: `0 / 1,048,576`
- Review-normalized SHA-256: `d315f3397c7b8f6972095e20e430c60ee8ed63607a6a149d0a3b1a0ab38f2de0`
- Runtime round trip: byte-identical PNG and `0 / 1,024` decoded-RGBA pixel mismatches

## Runtime audit

- Alpha: `594` transparent, `0` partial, `430` opaque
- Visible bounds: x `3–29`, y `10–31`
- Bottom contact: x `6–25`; no top, left, or right canvas contact
- Palette tolerance: `430 / 430` opaque pixels within `40` RGB units of `metal_stone`
- Palette distance: min `2.828`, median `17.292`, max `37.027`
- Lighting: broad upper-left highlight and down-right dark planes
- Silhouette: one broad asymmetric medium landmark rock, visibly larger/taller than scatter stones
- No baked ground patch, shadow, moss, plants, ore, rune, face, or unrelated scenery

`rock_a.footprint-pivot-20x.png` overlays the exact runtime pixels on a checkerboard, the declared lower footprint in cyan, and the pivot in magenta. The rock enters and spans the footprint, contacts the lower baseline, and preserves a readable upper silhouette.

## Narrow correction log

The transient correction step verified each expected pre-correction RGBA value before writing. The generated high-resolution input and transient script are not retained in the branch, so this table is a provenance record, not a fresh-checkout reproduction recipe; the corrected runtime master is the retained source of truth.

| Runtime pixel | Before RGBA | After RGBA | Basis |
| --- | --- | --- | --- |
| `17,10` | `199,176,118,255` | `190,171,115,255` | Adjacent upper plane |
| `14,14` | `195,176,124,255` | `190,172,117,255` | Adjacent upper plane |
| `23,16` | `156,49,146,255` | `89,88,62,255` | Removed key-colour fringe from adjacent dark plane |
| `25,19` | `151,85,117,255` | `124,114,79,255` | Removed key-colour fringe from adjacent mid plane |
| `27,21` | `81,58,69,255` | `69,72,52,255` | Removed visually purple fringe from adjacent dark plane |
| `25,31` | `32,65,35,255` | `47,51,36,255` | Removed visibly green off-hue baseline pixel from adjacent dark plane |

## Retained evidence

- `rock_a.approved-master-32x32.png` — exact corrected runtime source of truth
- `rock_a.review-normalized.png` — exact real-pipeline round trip
- `rock_a.preview-20x.png` — nearest-neighbour silhouette/palette inspection
- `rock_a.footprint-pivot-20x.png` — declared footprint and pivot overlay
- `rock_a.review.manifest.json` — deterministic review-only recipe

## Scope

This accepts one individual source asset only. It does not create the packed two-variant rock sheet, invent `rock_b`, load the asset in Phaser, change the farm map or collision, or modify saves, gameplay, quests, curriculum, mastery, profiles, economy, or interactions.
