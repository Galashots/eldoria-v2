# `tile_village_shop_door / closed` runtime-master audit

## Verdict

**APPROVED RUNTIME MASTER — ChatGPT formal visual verdict (2026-07-19)**

This exact `16×16` opaque pixel-art cell is approved for the Eldoria Village source kit. It is purpose-authored production art, not a placeholder and not a crop from a mixed reference sheet. It uses only locked farm-environment swatches under the established upper-left key light.

## Deterministic source and round trip

- Approved master: `closed.approved-runtime-master.png` — SHA-256 `901bda834bdb10ab296e06cc994807b093551fba4f1e07602c0e07b0c331e7f7`
- Canonical `1024×1024` source: `assets/source/generated/tile_village_shop_door/closed.png` — exact `64×` nearest-neighbour block replication; SHA-256 `48c4bb01aa7eafed5af9cbb5e3d8ab00c9582f4a45516519a784d3c0bc0124ce`
- Normalized review output: `closed.review-normalized.png` — SHA-256 `901bda834bdb10ab296e06cc994807b093551fba4f1e07602c0e07b0c331e7f7`
- Decoded runtime/source/normalized equality is enforced by `npm run test:village-art`.
- Review report: `review.json`; palette max distance `0`, opaque pixels `256`, partial alpha `0`.

## Visual verdict

This is a facade feature cell rather than a repeated terrain centre; the repeat evidence is retained for diagnostics only.

At exact runtime size and nearest-neighbour enlargement, the cell has a clear silhouette/material read, consistent upper-left highlights and down-right shadow accents, and sufficient contrast without overpowering characters. It belongs to the approved readable shop entrance states family and remains readable at `1×`.

## Scope

Source/review/packed-sheet approval only. No Phaser preload, village map, collision activation, scene code, save, quest, curriculum, reward, physical-iPad validation, or child-validation claim is included.
