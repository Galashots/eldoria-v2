# `tile_village_shop_roof / thatch_moss` runtime-master audit

## Verdict

**APPROVED RUNTIME MASTER — ChatGPT formal visual verdict (2026-07-19)**

This exact `16×16` opaque pixel-art cell is approved for the Eldoria Village source kit. It is purpose-authored production art, not a placeholder and not a crop from a mixed reference sheet. It uses only locked farm-environment swatches under the established upper-left key light.

## Deterministic source and round trip

- Approved master: `thatch_moss.approved-runtime-master.png` — SHA-256 `6e09d61d28bd119d4816997673091ae5fdf5ae397bf74f2d2d9e65e556c0c2b2`
- Canonical `1024×1024` source: `assets/source/generated/tile_village_shop_roof/thatch_moss.png` — exact `64×` nearest-neighbour block replication; SHA-256 `5fd00d637c0bfd5c0c47b064884518137358776e921464917adfd1ade4d24045`
- Normalized review output: `thatch_moss.review-normalized.png` — SHA-256 `6e09d61d28bd119d4816997673091ae5fdf5ae397bf74f2d2d9e65e556c0c2b2`
- Decoded runtime/source/normalized equality is enforced by `npm run test:village-art`.
- Review report: `review.json`; palette max distance `0`, opaque pixels `256`, partial alpha `0`.

## Visual verdict

This cell is intended to repeat; its retained 3x3 and 12x8 evidence was inspected for hard seams and periodic discontinuities.

At exact runtime size and nearest-neighbour enlargement, the cell has a clear silhouette/material read, consistent upper-left highlights and down-right shadow accents, and sufficient contrast without overpowering characters. It belongs to the approved warm thatch roof and ridge pieces family and remains readable at `1×`.

## Scope

Source/review/packed-sheet approval only. No Phaser preload, village map, collision activation, scene code, save, quest, curriculum, reward, physical-iPad validation, or child-validation claim is included.
