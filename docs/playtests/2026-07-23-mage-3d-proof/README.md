# Mage 3D camera/capture proof — 2026-07-23

**Status:** experimental proof; not approved source art, approved runtime art, or a Phaser migration.

## Objective

Test whether a reusable 3D character proxy under one fixed camera can eliminate cardinal-angle drift before a later pixel-art pass.

## Authorities

- Identity source: `assets/source/generated/char_mage_boy_base_idle_v001/source_sheet.png` (identity only; current camera is transitional).
- Camera/headings: `docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`.
- Geometry: `docs/visual-targets/hero_actor_targets.json` (`char_mage_boy_base`, 32×48, pivot `[16,47]`).

## Proof surface

Open `/tools/mage-3d-proof/` in a served build. The isolated tool provides:

1. fixed 35° orthographic production-camera inspection with strict South/West/North/East actor rotations;
2. free perspective orbit inspection;
3. wireframe, silhouette, ground-marker, and turntable diagnostics;
4. direct 32×48 nearest-neighbour render preview and PNG capture;
5. GLB export from the procedural model;
6. pitch comparison from 25° through 45°.

## Measured model facts

The matching offline-generated GLB used for structural and static-render validation has:

- 32 mesh geometries;
- 1,908 triangles;
- all generated meshes reported watertight by the local GLB validation pass;
- approximate bounds `x [-0.743, 0.743]`, `y [-0.016, 3.260]`, `z [-0.520, 0.529]`;
- empty hands, no staff, no cape, and no hat.

## Verification completed

- deterministic Python generation completed for the matching offline proof;
- GLB reloaded and structurally inspected;
- JavaScript syntax check passed for the model-building module used to construct the self-contained page;
- HTML parsing completed successfully;
- static South/West/North/East, 32×48, and camera-angle evidence visually inspected.

## Verification not completed

- local browser navigation was blocked by the execution environment's administrator policy, so live CDN/WebGL interaction is not claimed;
- no physical-iPad Safari test;
- no child playtest;
- no comparison against a completed artist-authored 3D Mage.

## Current conclusion

The approach is promising as a **camera, heading, pivot, scale, lighting, and equipment-registration scaffold**. The raw 32×48 render is not production-quality Eldoria pixel art: automatic downsampling does not supply intentional pixel clusters, outline design, selective exaggeration, facial readability, or painterly material treatment.

The recommended production hypothesis is therefore hybrid: lock geometry and captures in 3D, then author the final pixel translation rather than treating pixelized screenshots as finished sprites.
