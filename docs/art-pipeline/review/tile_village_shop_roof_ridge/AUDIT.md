# `tile_village_shop_roof / ridge` runtime-master audit

## Verdict

**APPROVED RUNTIME MASTER — ChatGPT formal visual verdict (2026-07-19)**

This exact `16×16` opaque pixel-art cell is approved for the Eldoria Village source kit. It is purpose-authored production art, not a placeholder and not a crop from a mixed reference sheet. It uses only locked farm-environment swatches under the established upper-left key light.

## Deterministic source and round trip

- Approved master: `ridge.approved-runtime-master.png` — SHA-256 `4553e51493ccebf9511bcaa28b088622b0271590dcc1c3f024546d5a084c4272`
- Canonical `1024×1024` source: `assets/source/generated/tile_village_shop_roof/ridge.png` — exact `64×` nearest-neighbour block replication; SHA-256 `df3cf81e299710cb414d6c9a2edb0737463003cf204f9bd726462b95fa20703f`
- Normalized review output: `ridge.review-normalized.png` — SHA-256 `4553e51493ccebf9511bcaa28b088622b0271590dcc1c3f024546d5a084c4272`
- Decoded runtime/source/normalized equality is enforced by `npm run test:village-art`.
- Review report: `review.json`; palette max distance `0`, opaque pixels `256`, partial alpha `0`.

## Visual verdict

This is a facade feature cell rather than a repeated terrain centre; the repeat evidence is retained for diagnostics only.

At exact runtime size and nearest-neighbour enlargement, the cell has a clear silhouette/material read, consistent upper-left highlights and down-right shadow accents, and sufficient contrast without overpowering characters. It belongs to the approved warm thatch roof and ridge pieces family and remains readable at `1×`.

## Scope

Source/review/packed-sheet approval only. No Phaser preload, village map, collision activation, scene code, save, quest, curriculum, reward, physical-iPad validation, or child-validation claim is included.
