# Family audit — `tile_farm_grass_scatter` (`tuft_a`, `tuft_b`, `flower_a`, `pebble_a`)

Date: 2026-07-22
Scope: first mixed anchor/derived recipe pilot of the derive-over-generate production classes
(PR #125). Deterministic recipe painting, machine gates, and family visual audit.
**Source/review work only — no scene integration, no packed runtime sheet.**

Gate authority: the owner explicitly delegated the routine visual-audit gate to the repo agent
(Kimi) for the overnight 2026-07-22 session ("despite any current agent guidance docs"). This
verdict is recorded for owner morning confirmation; escalation rules (art direction, palette,
geometry, production order) are unchanged.

## 1. Verdict

The family passes. All four variants are accepted as **APPROVED RUNTIME MASTERS**; the committed
recipe `scripts/paint-scatter-family.mjs` (grammar `scatter-grammar/v1`) is the canonical source.

- `tuft_a` — **APPROVED RUNTIME MASTER** (anchor). Flat radial grass tuft, upper-left light tips,
  quiet against the approved grass base at 1× and 4× composite.
- `tuft_b` — **APPROVED RUNTIME MASTER** (derived seed sibling of `tuft_a`: identical grammar
  function, seed-only change, recorded in the family report). Distinct draw, same identity.
- `flower_a` — **APPROVED RUNTIME MASTER** (anchor). Small yellow-green bud; quiet; does not
  compete with actors or crop overlays.
- `pebble_a` — **APPROVED RUNTIME MASTER** (anchor) after the §2 spec amendment. Reads as a
  small stone on grass, consistent with the approved `env_farm_rock_medium/rock_a` material.

## 2. Spec finding and amendment (flagged for owner confirmation)

The pre-specified target declared `paletteFamilies: ["forest"]`. In the first audit round the
forest-painted `pebble_a` **failed the identity read**: on grass it rendered as a dark hole /
shadow blob, not a stone. A stone cannot read inside forest greens.

Amendment (recorded in `docs/visual-targets/farm_village_tile_targets.json`):

- `tile_farm_grass_scatter.paletteFamilies` is now `["forest", "metal_stone"]`;
- `pebble_a` paints in `metal_stone` (cream/tan upper-left highlight, mid-tan body, dark olive
  rim, near-black crevices) — the same locked family and lighting story as the approved `rock_a`;
- the locked palette JSON `farm_environment_palette_v1.json` is **unchanged**; no new colours
  were added to the palette lock; `tuft_a`/`tuft_b`/`flower_a` remain forest-only.

This is a palette-family assignment correction inside the already-locked palette, not a palette
change. It is flagged here and in the target notes for owner confirmation; revert path is a
one-line target edit plus one recipe constant.

## 3. Machine gates (recipe-level approval evidence)

From `family-report.json` (schema `scatter-paint-family-report/v1`), produced by the committed
recipe on the real locked inputs:

- locked-input verification: palette hexes are READ from `farm_environment_palette_v1.json`
  (status `locked`; forest 6 swatches, metal_stone 5 swatches); SHA-256 of palette JSON and the
  approved `grass_a` base recorded; tamper tests prove a one-step edit in either family changes
  the recorded hash and the painted output bytes of exactly the affected variants;
- deterministic regeneration: the full family is painted twice in-process; PNG bytes and pixel
  arrays must be identical (tested across complete output trees);
- per-variant gates: runtime `16×16`; occupancy in (1, 40]% (`tuft_a` 10.5%, `tuft_b` 10.9%,
  `flower_a` 3.1%, `pebble_a` 12.9%); zero edge contact; lowest occupied row 14 (pivot band
  13–15); palette exact by construction (test asserts every subject pixel is a locked swatch of
  the variant's declared family, and `pebble_a` specifically is 100% metal_stone);
- applicable-invariant table records seam/adjacency, histogram preservation, and frame continuity
  as explicit `N/A` for static non-tiling decals.

Test suite: `scripts/test-paint-scatter.mjs` — 13/13 (sibling structure, seed determinism,
palette loading and rejection, named gate failures, family integration, byte-identical
regeneration, per-family palette exactness, dual-family tamper loudness). Chained into CI through
`npm run test:asset-pipeline`.

## 4. Visual audit evidence (reviewed 2026-07-22)

- `montage.png` — family contact sheet (isolated 8× checkerboard + 4× composite over the
  approved `grass_a`).
- `<variant>.x8.png` — exact nearest-neighbour 8× on checkerboard.
- `<variant>.grass-x4.png` — 3×3 grass field with the decal centred, 4×.
- `<variant>.approved-runtime-master.png` — the exact approved `16×16` runtime pixels.

Audit reads: both tufts read as grass tufts with light from the upper left; the flower reads as
a small quiet bud; the stone reads as a stone. All four remain clearly quieter than actors and
do not obstruct walkability or interaction reads, per the target's visualRule.

## 5. Cross-stack parity note

The Python skill copy (`eldoria-asset-pipeline/scripts/paint_scatter.py`) received the same
one-pass grammar/palette sync and passes its full lane gates on the same locked inputs. The two
stacks use different seeded RNGs, so individual draws differ; grammar, palette families, gates,
and verdicts are identical. The committed JS recipe is the canonical in-repo source.

## 6. Explicitly not done

- No packed runtime sheet (`assets/tilesets/tile_farm_grass_scatter.png`) and no manifest yet —
  packing in the fixed §5.1 order (`tuft_a, tuft_b, pebble_a, flower_a`) belongs to the
  decor-scatter wiring PR.
- No scene integration. Per `CURRENT_STATE.md`, wiring the merged decor-scatter primitive into
  the Farm scene is the next step and requires in-game density evidence.
