# Mage 3D camera proof

**Status:** experimental camera/capture proof only. This is not approved source art, approved runtime art, or a proposed replacement for the current Phaser renderer.

## Authority separation

- Identity authority: `assets/source/generated/char_mage_boy_base_idle_v001/source_sheet.png`.
- Camera and cardinal-heading authority: `docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`.
- Geometry target: `docs/visual-targets/hero_actor_targets.json` (`char_mage_boy_base`, 32×48, pivot `[16,47]`).

The model preserves the recoverable identity inventory: friendly young boy, dark tousled hair, navy clothing, teal accents, warm brown boots, no hat, no cape, empty hands, and no permanent staff. The proxy does not claim exact facial, hair, costume, or proportion fidelity to the approved 2D source.

## Viewing and capture modes

Open `/tools/mage-3d-proof/` in a served build. The single isolated page provides:

1. a fixed orthographic production camera with strict South, West, North, and East actor rotations;
2. free perspective orbit inspection;
3. a 25°–45° pitch control and orthographic framing control;
4. wireframe, silhouette, ground-marker, and turntable diagnostics;
5. a direct 32×48 nearest-neighbour preview;
6. main-resolution and 32×48 PNG capture;
7. GLB export of the current model.

The page is under `public/`, so Vite copies it unchanged into the built site. It deliberately uses pinned Three.js CDN imports and does not add a package dependency or modify the Phaser runtime.

## What this trial can prove

- one stationary camera can generate every cardinal heading;
- West/East can remain exact 90-degree actor rotations without losing elevated top-plane exposure;
- apparent scale, pivot, light, and framing can be held constant;
- high-resolution captures and runtime-resolution previews can originate from the same model.

## What it cannot prove

- that this rough model matches the approved Mage identity closely enough;
- that automatic pixelization creates production-quality pixel clusters or outlines;
- that one model will support appealing walk, cast, hurt, equipment, and armor animation;
- that the final result fits Eldoria's painterly environment without an authored pixel-art pass.

## Recommended evaluation

Use the tool to select the best camera pitch and framing, export the four strict cardinal views, and compare them against the approved camera exemplars. If heading and top-plane consistency materially improve, advance to one artist-authored 3D Mage and a controlled render-to-pixel experiment. Otherwise, retain 3D only as a camera blockout tool.
