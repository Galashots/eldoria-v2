# Farm terrain-transition integration — evidence

Bounded integration of the two approved 13-cell blend families
(`tile_farm_path_dirt`, `tile_farm_water_shore`) into the farm Ground
layer, explicitly authorized by the repo owner on 2026-07-21 as a bounded
relaxation of the "wait for the complete Batch A–F kit" recomposition gate,
in direct response to the approved Stardew-caliber visual reference.

- `pond-path-before-after.png` — **same-camera before/after at an iPad-like
  1024×768 landscape viewport.** Top: `main`'s flat terrain (hard blue
  rectangle pond). Bottom: this PR (banked, rounded shoreline; softened
  path/grass boundary). Both captured by the identical spec with the
  player at world `(560, 360)`; the only difference is `farm.json` +
  `farm-terrain-proof.png` swapped between `main` and this branch.
- `terrain-pond.png` — the pond's organic banked shoreline (edges, outer
  corners) and the vertical path segment blending into grass (1280×720).
- `terrain-path.png` — the southern path band and vertical spur with
  blended boundaries (1280×720).

## Formal review verdict (Kimi K3, exact head `09fc59f`, 2026-07-21)

**APPROVED visually and technically as a bounded, farm-only,
approved-family transition integration** — explicitly *not* approval of the
final farm recomposition or the Stardew-caliber environment milestone.
Compared against the PR #111/`main` capture at the same iPad-like viewport:
the pond changes from a hard blue rectangle to a clearly banked, rounded
shoreline and the long dirt path gains a materially softer grass boundary —
a real improvement toward the reference composition.

Accepted-but-unfinished (must stay classified as environment work, not
final Wangset/map-composition quality):

- a repeated small sawtooth/zipper rhythm along long path edges;
- a bright continuous pond bank contour.

Both would require additional authored variants/composition rather than a
safe resolver tweak, so they are deferred to the final terrain pass, not
fixed here. The documented grass_a-versus-grass_b/c micro-seam remains an
explicit remaining risk.

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
