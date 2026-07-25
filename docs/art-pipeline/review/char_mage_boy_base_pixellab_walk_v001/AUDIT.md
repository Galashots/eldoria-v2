# char_mage_boy_base — walk clip (PixelLab) — normalization audit

**Family:** `char_mage_boy_base_pixellab_walk_v001` · **Clip:** `walk` (6 frames x 4 directions)
**Doctrine:** `CHARACTER_PERSPECTIVE_LOCK_V1.md` v2.0 (eye-level cardinal turnaround)
**Verdict:** **HOLD** — `named_next_gate: owner (Leo) visual verdict`

Companion to the accepted idle family (PR #140). Animates the **same accepted character id**, so
identity is preserved by construction rather than re-prompted.

## Scope

Normalization and evidence only. **No runtime integration:** the sheet stays under
`assets/source/generated/`, is not in `assets/sprites/`, is not loaded by any scene, and no
Phaser animation is registered. Wiring the clip into movement is a separate change.

**Runtime output:** `normalized_sheet.png` — 192x192 RGBA, 6 cols x 4 rows of 32x48
SHA-256 `e9e735c98467fcfda5f643a73fcfd2213cf7b38fb20fac6ac89004eb74f395d0`
Rows: 0 = front(S), 1 = back(N), 2 = left(W), 3 = right(E). Columns are frames 0-5.

## The normalization problem, and the construction that solves it

Three approaches were measured; only the third is correct.

| Approach | Feet | Body | Verdict |
|---|---|---|---|
| Per-frame `trim: alpha` | planted | **wobbles up to 2px** horizontally (widths swing 15->20) | rejected |
| One shared rect per direction | **floats up to 5px** (reads as hopping) | stable | rejected |
| **Shared X + per-frame Y** | **planted on row 47** | stable | **adopted** |

Each direction shares one X range across its six frames, while each frame's `sourceRect` bottom
is pinned to that frame's own lowest opaque row. `trim: none`, `fit: fixed`, `scale: 1.0` —
no resampling. The residual head bob (5px south, 3px north, 1px west, 0px east) is inherent to
the generated frames' differing heights and is correct walk behaviour: the body compresses and
extends through the stride while the feet stay down.

## Measured results

| Direction | contact rows | head bob | widths |
|---|---|---|---|
| front(S) | all 47 | 5px | 16-17 |
| back(N) | all 47 | 3px | 15-16 |
| left(W) | all 47 | 1px | 15-19 |
| right(E) | all 47 | 0px | 16-20 |

**All 24 cells grounded at row 47** · **0 semi-alpha pixels** · **0 cells touching a side edge**.

## Two templates, deliberately

South uses the `walking` template; north/west/east use `walk`. `walk` systematically flips the
head on south (reproduced across two seeds). Full rejected-iteration record is in
`GENERATION.json`, including a `walking` north that was generated and rejected for rendering
the chest gem on the character's back.

## Residual observations

- The perspective-trial harness gates a 128x48 four-direction idle sheet and does not apply to a
  6x4 clip; evidence here is per-cell measurement plus the committed sheet, not that harness.
- Frame timing, loop points and Phaser animation registration are not addressed.
- Identity matches the accepted idle (teal tunic, pale chest ornament) — it does not match the
  pre-v2.0 canonical blue-tunic Mage, consistent with the identity change accepted in PR #140.
