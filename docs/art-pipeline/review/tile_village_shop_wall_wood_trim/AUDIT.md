# `tile_village_shop_wall / wood_trim` runtime-master audit

## Verdict

**APPROVED RUNTIME MASTER — ChatGPT formal visual verdict (2026-07-19)**

This exact `16×16` opaque pixel-art cell is approved for the Eldoria Village source kit. It is purpose-authored production art, not a placeholder and not a crop from a mixed reference sheet. It uses only locked farm-environment swatches under the established upper-left key light.

## Deterministic source and round trip

- Approved master: `wood_trim.approved-runtime-master.png` — SHA-256 `d55914619af7c9358b9d800bf893ed04a9637f6f2a88548501ea4569782f3f6d`
- Canonical `1024×1024` source: `assets/source/generated/tile_village_shop_wall/wood_trim.png` — exact `64×` nearest-neighbour block replication; SHA-256 `155f1db33dd1160c395d2732b77aed63c40998f901d4c9875ead87c76d56e1d8`
- Normalized review output: `wood_trim.review-normalized.png` — SHA-256 `d55914619af7c9358b9d800bf893ed04a9637f6f2a88548501ea4569782f3f6d`
- Decoded runtime/source/normalized equality is enforced by `npm run test:village-art`.
- Review report: `review.json`; palette max distance `0`, opaque pixels `256`, partial alpha `0`.

## Visual verdict

This is a facade feature cell rather than a repeated terrain centre; the repeat evidence is retained for diagnostics only.

At exact runtime size and nearest-neighbour enlargement, the cell has a clear silhouette/material read, consistent upper-left highlights and down-right shadow accents, and sufficient contrast without overpowering characters. It belongs to the approved modular stone-and-timber shop facade family and remains readable at `1×`.

## Scope

Source/review/packed-sheet approval only. No Phaser preload, village map, collision activation, scene code, save, quest, curriculum, reward, physical-iPad validation, or child-validation claim is included.
