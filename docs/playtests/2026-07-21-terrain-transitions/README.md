# Farm terrain-transition integration — evidence

Bounded integration of the two approved 13-cell blend families
(`tile_farm_path_dirt`, `tile_farm_water_shore`) into the farm Ground
layer, explicitly authorized by the repo owner on 2026-07-21 as a bounded
relaxation of the "wait for the complete Batch A–F kit" recomposition gate,
in direct response to the approved Stardew-caliber visual reference.

- `terrain-pond.png` — the pond now has an organic banked shoreline
  (edges, outer corners) instead of a hard blue rectangle; the vertical
  path segment's edges blend into the grass.
- `terrain-path.png` — the southern path band and vertical spur with
  blended boundaries.

All 24 transition cells come from the packed family sheets on `main`,
whose 12 generated cells each are APPROVED RUNTIME MASTERS. Selection is a
pure deterministic function of Ground-layer terrain categories; cases with
no approved art (dirt-vs-water seams, 1-wide necks, multi-notch diagonals)
keep the approved centre cells. Collision, Decor, objects, saves, and
gameplay semantics are untouched (collision lives on its own layer).

Regression coverage: `scripts/test-terrain-transitions.mjs` (packed-sheet
orientation self-check, resolver unit cases, synthetic-map repaint with
border/idempotency assertions, committed-map consistency), wired into
`npm run test:terrain-blend`.
