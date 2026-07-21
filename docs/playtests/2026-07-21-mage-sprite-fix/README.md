# Mage sprite scale-consistency and despeckle fix — evidence

Real-iPad play feedback (2026-07-21): the Mage visibly changed size in certain
facing directions, and stray dots appeared around the sprite.

## Root causes (measured, not guessed)

1. **Per-frame contain scaling.** The normalizer alpha-trimmed each frame and
   scaled it independently to fill its 32×48 cell, so each direction row's
   trim extent set its own scale. Measured source scales before the fix:
   idle left 0.132 vs idle right 0.172 (~23% size difference), walk left
   0.188 vs walk right 0.231, and idle→walk transitions also jumped size.
2. **Source-sheet row bleed.** The idle/walk source rows were drawn slightly
   offset, so the right-facing row's hair poked into the cells above it.
   Grid-cell slicing gave the left row a ghost hair fragment at its bottom
   (inflating its trim and floating below the character as "dots") and
   clipped the top of the right row's hair.
3. **AI-source residue.** Semi-transparent anti-aliasing crumbs survived
   background removal (up to ~110 fringe pixels and 8+ isolated stray pixels
   per frame).

## Fix

- `fit: "fixed"` in the normalizer: every frame of a clip renders at an
  explicit manifest-declared scale. A shared 46.7px body height fits all
  idle/walk clips exactly; cast/hurt use their largest feasible per-clip
  scales (cast is up to ~10% smaller only while the wide staff-and-orb pose
  needs the cell).
- Per-sprite `sourceRect`s derived from cleaned connected-component bounds
  (pad 2px) replace blind grid slicing for all four sheets — the ghost
  fragments are excluded and the clipped hair is recovered.
- Source `cleanup` in the normalizer: `alphaFloor: 64` (kills low-alpha
  fringe) and `minComponentPx: 30` (kills stray crumbs; preserves the
  smallest intentional cast sparkle at 33px and the hurt pain stars at
  392+px).

## Files

- `compare-*.png` — old (top) vs new (bottom) runtime sheets at 3×. The old
  idle/walk left rows are visibly smaller; the new rows are uniform and the
  left/right rows regain full hair.
- `mage-fix-idle-*.png` / `mage-fix-walk-*.png` — in-game browser captures
  of all four facings after the fix (Chromium, 1280×720).

Post-fix measured runtime frames: idle/walk trim 20–22×47–48 in every
direction (was 16–23 wide, one row ~23% smaller); isolated stray pixels
0–1 per frame outside intentional sparkles (was up to 8 in walk-left).
