# `tile_village_shop_wall / stone_base` runtime-master audit

## Verdict

**APPROVED RUNTIME MASTER — ChatGPT formal visual verdict (2026-07-19)**

This exact `16×16` opaque pixel-art cell is approved for the Eldoria Village source kit. It is purpose-authored production art, not a placeholder and not a crop from a mixed reference sheet. It uses only locked farm-environment swatches under the established upper-left key light.

## Deterministic source and round trip

- Approved master: `stone_base.approved-runtime-master.png` — SHA-256 `a977e194c15ca7dde86fa512c733f1b14522664b25f19b6dd7fdf2eb5a2d5021`
- Canonical `1024×1024` source: `assets/source/generated/tile_village_shop_wall/stone_base.png` — exact `64×` nearest-neighbour block replication; SHA-256 `c1cd005b1cdd506dec6358ea70298b40d79224673f911a7b24d7ace7f8e8a367`
- Normalized review output: `stone_base.review-normalized.png` — SHA-256 `a977e194c15ca7dde86fa512c733f1b14522664b25f19b6dd7fdf2eb5a2d5021`
- Decoded runtime/source/normalized equality is enforced by `npm run test:village-art`.
- Review report: `review.json`; palette max distance `0`, opaque pixels `256`, partial alpha `0`.

## Visual verdict

This cell is intended to repeat; its retained 3x3 and 12x8 evidence was inspected for hard seams and periodic discontinuities.

At exact runtime size and nearest-neighbour enlargement, the cell has a clear silhouette/material read, consistent upper-left highlights and down-right shadow accents, and sufficient contrast without overpowering characters. It belongs to the approved modular stone-and-timber shop facade family and remains readable at `1×`.

## Scope

Source/review/packed-sheet approval only. No Phaser preload, village map, collision activation, scene code, save, quest, curriculum, reward, physical-iPad validation, or child-validation claim is included.
