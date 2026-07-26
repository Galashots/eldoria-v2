# Eldoria Village shop structure — review evidence, 2026-07-25

Durable evidence for `claude/village-shop-structure`: the nine approved
shop-facade runtime masters composed into Baker Pell's shop, the Village's first
structure.

**Verdict: `HOLD` — `named_next_gate: owner (Leo) visual verdict + the
render-layer decision below.` Claude does not self-approve art or composition.**

## The sheet

[`village-shop-contact-sheet.png`](village-shop-contact-sheet.png) — 1204×1622,
two columns by four rows. Each cell is a canvas screenshot taken at the declared
minimum supported playtest viewport **1194×834**, point-sampled down by 2 (every
other pixel, no blending) to keep one reviewable file a sane size.

| | col 1 — **Mage** | col 2 — **Ranger Explorer** |
|---|---|---|
| **row 1** `approach-from-the-road` | hero on the road in front of the door, ACTION prompt live | same |
| **row 2** `partly-behind-the-wall` | hero up-map, overlapping the left edge — **the structure draws over it** | same |
| **row 3** `…--as-terrain-layer` | identical framing, structure depth forced to 0 — **the hero draws over the roof** | same |
| **row 4** `blocked-by-the-front-wall` | hero walked north into the solid rows and stopped short | same |

**Rows 2 and 3 are the decision.** They are the same frame with one number
changed. Row 2 is this composition. Row 3 is what
`renderLayer: "terrain"` renders — the hero standing on top of the thatch. That
is not a mock-up: the two differ by exactly the structure's depth value, so
forcing it to 0 in the live scene produces what the alternative actually draws.

## Measured, from the live scene at capture time

Identical for both profiles:

| framing | structure depth | hero depth | ordering |
|---|---|---|---|
| `approach-from-the-road` | 2.32 | 2.432 | hero in front |
| `partly-behind-the-wall` | 2.32 | 2.182 | structure in front |
| `…--as-terrain-layer` | 0 | 2.182 | hero in front (wrong) |
| `blocked-by-the-front-wall` | 2.32 | 2.336 | hero in front, stopped at the wall |

The structure's depth is `worldActorDepth(320)` — its ground line is the bottom
edge of its last row, at world y 320. `blocked-by-the-front-wall` also asserts
the hero's physics body never entered the solid rows; the capture script exits
non-zero if it did.

## Composition

Four cells wide, four tall, at Village tiles (8..11, 1..4):

```
ridge        ridge        ridge        ridge
thatch_base  thatch_moss  thatch_base  thatch_moss
stone_base   wood_trim    window_lit   stone_base
stone_base   door_closed  stone_base   wood_trim
```

Only the bottom two rows are solid. The two roof rows overhang walkable ground —
that overhang is what a hero can be hidden by, and a structure whose sprite
exactly covers its collision footprint can never occlude anything.

Placement is derived rather than chosen freehand: Baker Pell stands at Village
tile (9, 6) on the dirt road, and the shop sits directly up-map of him with its
door in his column, so the shopkeeper stands in front of his own door. A unit
test asserts that relationship, that the footprint is clear of the map's own
Collision layer, and that no Objects entry is buried under it — against the
committed map, not by assumption.

## Observations for the reviewer

- **The ridge row can sit behind the header HUD bar.** The structure's top row
  is at world y 64, and the camera clamps at the map's top edge, so when the
  player is up beside the shop the ridge renders under the header. Moving the
  structure one tile down would fix it but would put the solid rows on the road
  row and place Baker Pell level with the base instead of in front of it. Left
  as-is; the alternative is a one-constant change to `originTile`.
- The shop is the only structure in the Village, so it currently reads as
  isolated rather than as part of a street.
- The `wood_trim` cells are diagonal timber braces; used at the wall corners
  they read as bracing, which is what they appear to be drawn for — but that is
  an art-direction reading, not a fact I can verify.

## Reproducing

```bash
ELDORIA_BASE_URL=http://127.0.0.1:5201/ node scripts/capture-village-shop-evidence.mjs /tmp/village-shop
node scripts/build-village-shop-contact-sheet.mjs /tmp/village-shop docs/playtests/2026-07-25-village-shop/village-shop-contact-sheet.png
```

The sheet builder fails loudly on a missing or stray capture, or on frames that
were not all taken at the same viewport.

## What this evidence does not cover

Browser emulation is regression evidence only — not physical-iPad or child
validation (`AGENTS.md` rule 10). Nothing here validates the art itself; the
nine masters were approved separately in
[`docs/art-pipeline/review/village_top_gaps/AUDIT.md`](../../art-pipeline/review/village_top_gaps/AUDIT.md).
