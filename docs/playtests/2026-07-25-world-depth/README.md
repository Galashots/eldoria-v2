# World-actor depth (y-sort) — before/after evidence, 2026-07-25

Durable evidence for `claude/world-depth-ysort`: world actors now sort by
ground-contact y (`src/systems/worldDepth.ts`) instead of sitting at hardcoded
render depths.

## The sheet

[`world-depth-contact-sheet.png`](world-depth-contact-sheet.png) — 1792×1694,
four columns by four rows. The wide rule separates the profiles; the narrow
rule separates before from after inside each profile.

| | col 1 | col 2 | col 3 | col 4 |
|---|---|---|---|---|
| | **Mage before** | **Mage after** | **Ranger before** | **Ranger after** |
| **row 1** — `slime-north` | hero over slime ❌ | slime over hero ✅ | hero over slime ❌ | slime over hero ✅ |
| **row 2** — `slime-south` | hero in front ✅ | hero in front ✅ | hero in front ✅ | hero in front ✅ |
| **row 3** — `mira-north` | Mira in front ✅ | Mira in front ✅ | Mira in front ✅ | Mira in front ✅ |
| **row 4** — `mira-south` | Mira over hero ❌ | hero over Mira ✅ | Mira over hero ❌ | hero over Mira ✅ |

Rows 2 and 3 are the controls: they were already correct and are expected to
look identical before and after. Rows 1 and 4 are the two orderings this
change repairs — one in each direction, because the old fixed depths put the
hero wrongly *above* the slime and wrongly *below* Mira.

## Capture conditions

- Viewport **1194×834**, the declared minimum supported playtest viewport
  (`src/gameDimensions.ts`), on the Farm map.
- Both profiles: `grade2-mage` and `grade5-adventurer`.
- Each cell is clipped to a 176×168 game-px window around the overlap and
  magnified 2× nearest-neighbour. A full-canvas screenshot buries a ~64px
  occlusion in 960×640 of farm.
- The hero is placed 20 world px up-map or down-map of the actor and 16 px to
  its right, so both sprites stay partly visible through the overlap.
- Recorded camera scroll is **identical** between the two passes for every
  spot, so each pair is the same framing of the same scene with only the code
  changed.

## Measured depths

Read off the live display list at capture time (`depths.json` per pass):

| spot | hero before | hero after | slime |
|---|---|---|---|
| `slime-north` | 3 | 2.62 | 2 → 2.64 |
| `slime-south` | 3 | 2.66 | 2 → 2.64 |
| `mira-north` | 3 | 2.502 | — |
| `mira-south` | 3 | 2.542 | — |

Mira's silhouette moves from a fixed 3.5 to 2.522 (her ground ellipse at world
y 522). The hero's four "after" values are its four ground contacts scaled at
0.001 depth per world pixel from the band floor of 2.

## Reproducing

With a dev server running (note the port — vite falls back off 5173 when
another worktree already holds it):

```bash
ELDORIA_BASE_URL=http://127.0.0.1:5199/ node scripts/capture-world-depth-evidence.mjs after /tmp/world-depth
git checkout <merge-base> -- src/
ELDORIA_BASE_URL=http://127.0.0.1:5199/ node scripts/capture-world-depth-evidence.mjs before /tmp/world-depth
git checkout HEAD -- src/
node scripts/build-world-depth-contact-sheet.mjs /tmp/world-depth docs/playtests/2026-07-25-world-depth/world-depth-contact-sheet.png
```

The sheet builder fails loudly on a missing/stray capture or on a before/after
pair whose pixel dimensions differ, rather than assembling a misaligned sheet.

## Automated gates that replace re-capturing this by hand

This sheet is a one-time before/after record. The ongoing guard is
`tests/world-depth-sorting.spec.ts`, which reads depths off the live display
list of the running game for both profiles and asserts the same two orderings
this sheet photographs, plus exact agreement with `worldActorDepth()` across a
five-position sweep and one arrow-key walk. It was confirmed red on all seven
tests with the three wiring call sites reverted to their old fixed depths.

`tests/unit/worldDepth.test.ts` additionally scans `src/scenes` and
`src/presentation` for any `setDepth()` literal inside `[2, 3.5]`, so nothing
new can be parked inside the actor band.

## What this evidence does not cover

Browser emulation is regression evidence only — it is not physical-iPad or
child validation (`AGENTS.md` rule 10). The Farm is the only map exercised
here; the change is map-independent, but the Village and Woods have no
overlapping actor pairs to photograph.
