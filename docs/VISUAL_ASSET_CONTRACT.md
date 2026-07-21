# Eldoria-V2 Visual Asset Contract

Source references:

- [`ELDORIA_MASTER_PLAN.md`](ELDORIA_MASTER_PLAN.md)
- [`visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`](visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md)
- [Executable 2D RPG Visual Design Guide for Eldoria V2](research/visual-design/Executable_2D_RPG_Visual_Design_Guide_for_Eldoria_V2.pdf)
- [Stardew-Caliber Visual Research](research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md)

## 1. Purpose

Eldoria-V2 is a fantasy-learning RPG first. This contract prevents visual drift across sprites, tiles, props, buildings, UI, VFX, source generation, normalization, and runtime integration.

It does not override the product rules in `AGENTS.md`: learning never gates adventure, Grade 2 remains audio-first, stable profile IDs are preserved, and visual work must not silently alter gameplay or saves.

## 2. Production posture

- Current production remains Phaser 4, Vite, TypeScript, and Tiled.
- These rules may inform later engine experiments, but current repository work stays in the existing stack unless explicitly approved.
- Stable visual direction comes from `ELDORIA_MASTER_PLAN.md`; current production status belongs only in `docs/CURRENT_STATE.md`.
- Machine-readable target JSON under `docs/visual-targets/` is authoritative for exact geometry, variants, palettes, pivots, layers, and metadata.
- `CHARACTER_PERSPECTIVE_LOCK_V1.md` is the additional binding projection authority for characters, NPCs, creatures, equipment, and armor.
- Generated style references and concepts are not automatically production source art.

## 3. Canonical visual baseline

- Style: readable painterly elevated-three-quarter family-friendly fantasy pixel art.
- Priority: mobile readability before decoration.
- World tile grammar: `16×16` pixels.
- Standard human actor proof canvas: `32×48` pixels.
- Standard actor footprint: `16×16` pixels.
- Default pivot: centre-bottom of the footprint unless the target explicitly differs.
- Minimum production directions for actors: down/front, up/back, left, and right.
- Eight directions require a justified later scope for combat-critical heroes, bosses, or enemies.
- Runtime export: PNG.
- Preferred editable source: `.aseprite` or `.ase` when available.
- Runtime rendering: nearest/point sampling; avoid smoothing and mipmaps unless specifically justified.
- Larger assets must use clear multiples of the `16×16` grammar and declare canvas, footprint, and pivot.
- Do not mix ad hoc gameplay resolutions or hide unsuitable targets through blurry runtime scaling.
- Use **CHANGE TARGET SIZE** when the approved projection or identity cannot survive the declared canvas.

## 4. Palette and light

- Aim for a limited master palette of roughly 48–64 colours.
- Every production asset declares a named palette family.
- Common families include `forest`, `water`, `metal_stone`, `wood_leather`, `arcane`, `ruins`, `lava`, `ui_neutral`, and `skin_hair`.
- Lock exact hex values before committing production art for a family.
- The active farm palette source of truth is:
  - `docs/visual-targets/farm_environment_palette_v1.json`
  - `docs/visual-targets/FARM_ENVIRONMENT_PALETTE_V1.md`
- Use a consistent upper-left, slightly front-facing key light. Shadows fall down-right/back.
- Establish silhouette and major colour clusters before shading detail.
- Avoid noisy dithering on actors, combat cues, icons, and UI. Use restrained dithering only on broad environmental surfaces when it improves texture.
- Do not bake a scene-level warm/cool atmosphere wash into individual assets; atmosphere is applied once in code.

## 5. Perspective discipline

### Shared world camera

- Ground-plane tiles and floors use the established elevated top-down/three-quarter projection.
- Anything with height—trees, fences, buildings, standing characters, rocks, creatures, and tall props—uses the same camera pitch above a grounded footprint.
- Tall objects should read like grounded pop-up forms, not true isometric, pure frontal elevation, or true top-down tokens.
- Do not mix true-isometric assets into the Farm, Woods, or Village.
- The declared footprint remains the gameplay footprint even when the visual canvas extends upward.

### Characters and creatures

- Down/front facings are foreshortened elevated views with visible top planes, not direct-to-camera frontal elevations.
- Up/back facings preserve the same camera pitch and apparent height.
- Left/right facings are elevated three-quarter side views, not pure profiles.
- All directions share one body scale, pivot, baseline, lighting direction, and equipment geometry.
- Do not use per-frame auto-scaling that changes apparent character size.
- Horizontal mirroring is acceptable only when lighting, handedness, identity, and asymmetric equipment remain correct.

Apply the complete evidence and rejection rules in `visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`.

## 6. Naming contract

Use lowercase `snake_case` only. Do not use spaces, mixed separators, vague generated names, or engine defaults.

Canonical long-form ID:

```text
<domain>_<entity>_<variant>_<view>_<state>_<part>_<frame>_v###
```

Allowed domains:

```text
char npc armor weapon mob boss env bld ui fx cut port icon tile sfx
```

Animated and directional assets should use the long form. Static assets may omit fields that do not apply but must preserve field order. Metadata remains authoritative.

Examples:

```text
char_mage_boy_front_idle_body_f00_v001
armor_mage_starter_front_walk_torso_f03_v001
weapon_sword_crystal_right_attack_light_blade_f02_v001
mob_slime_practice_front_idle_body_f00_v001
tile_forest_grass_a_base_v001
ui_hud_panel_idle_base_v001
fx_sparkle_gold_loop_core_f03_v001
```

## 7. Metadata contract

Every exported sheet or loose gameplay asset should have machine-readable metadata through a target spec, manifest, sidecar, or equivalent authoritative file.

Coordinates use a top-left canvas origin. A typical actor target:

```json
{
  "id": "char_mage_boy_front_walk",
  "category": "char",
  "canvasPx": [32, 48],
  "footprintPx": [16, 16],
  "pivotPx": [16, 47],
  "palette": "skin_hair",
  "ppu": 16,
  "view": "front",
  "loop": true,
  "tags": ["walk", "front", "base_body"],
  "slices": ["weapon_socket_main", "armor_torso", "armor_head"],
  "collision": {
    "hurtbox": [10, 25, 12, 22],
    "hitboxes": [],
    "interaction": [8, 30, 16, 18]
  },
  "atlasFamily": "characters"
}
```

Declare when relevant:

- canvas, footprint, pivot, PPU, view, and perspective contract;
- variants and directions;
- animation tags, frame timing, loop behavior, and event frames;
- collision body, hurtbox, hitboxes, and interaction rectangle;
- sockets, overlay slices, or attachment points;
- palette family and light direction;
- render layer and atlas family;
- source, manifest, normalized output, and provenance.

## 8. Category rules

### Heroes and NPCs

- Use the standard actor grammar unless a target explicitly justifies a larger canvas.
- Favour chunky readable silhouettes and stable feet alignment.
- Reuse compatible rigs only after the projection, identity, and clip geometry pass.
- Differentiate NPCs through costume, props, idle/talk/emote states, and silhouette rather than arbitrary scale drift.
- Do not treat current bridge sprites or code-drawn silhouettes as production camera authorities.

### Armor overlays

- Do not produce substantial armor families before the perspective-locked base actor is approved and frozen.
- Inherit the base body's projection, canvas, pivot, directions, frame count, timing, sockets, and anchor exactly.
- No independent scale, baseline, projection, or frame drift.
- Preserve compatibility with future cape, helm, torso, and weapon layers.

### Weapons

- Declare sockets, view, foreground/background layer, and action timing.
- Motion must align with the owning actor and any gameplay hit window.
- Preserve the actor's elevated projection in every direction and action.

### Monsters and bosses

- Give each monster one readable silhouette, one dominant material story, and one accent hue.
- Standard mobs usually occupy `32×32` to `64×64` canvases and declare their footprint separately.
- Bosses prioritize anticipation and telegraphs. Split assets larger than roughly `96×96` when modules improve reuse, culling, collision, or layering.
- Creature projection should agree with the environment unless anatomy justifies a documented exception.

### Landscape tiles and decals

- Build on `16×16` cells or clear multiples.
- Favour broad readable masses over micro-detail.
- Preserve walkability and interaction readability.
- Keep base terrain quiet; use separate decals for scatter, crops, flowers, lilies, rocks, and similar details.
- Ground transitions solve boundaries; Decor, structures, canopy, atmosphere, and composition create layered richness.

### Buildings and props

- Match the world projection and upper-left light.
- Ground tall visuals on a declared lower footprint.
- Mark entrances and interaction points clearly.
- Use variable-size targets rather than forcing detail into an undersized cell.

### UI

- Use high-contrast, low-noise panels and icons.
- Prefer reusable nine-slice components where scaling is required.
- Preserve large touch targets, Grade 2 readability, and screen-safe margins.
- Decorative treatment must not obscure interaction state or cover the world unnecessarily.

### VFX

- Primitive Phaser feedback remains acceptable when it is clear and inexpensive.
- Flipbook VFX normally use `16×16`, `32×32`, or `64×64` cells.
- Effects reinforce readable action; they do not replace animation or blot out actors.
