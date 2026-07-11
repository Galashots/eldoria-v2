# Eldoria-V2 Visual Asset Contract

Source references:

- [Executable 2D RPG Visual Design Guide for Eldoria V2](research/visual-design/Executable_2D_RPG_Visual_Design_Guide_for_Eldoria_V2.pdf)
- [Stardew-Caliber Visual Research](research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md)

## 1. Purpose

Eldoria-V2 is a fantasy-learning RPG first. This contract prevents visual drift across sprites, tiles, props, buildings, UI, VFX, source generation, normalization, and runtime integration.

It does not override the product rules in `AGENTS.md`: learning never gates adventure, Grade 2 remains audio-first, stable profile IDs are preserved, and visual work must not silently alter gameplay or saves.

## 2. Production posture

- Current production remains Phaser 4, Vite, TypeScript, and Tiled.
- These rules may inform later engine experiments, but current repository work stays in the existing stack unless explicitly approved.
- Asset status and active milestones belong in `docs/CURRENT_STATE.md`, not in this durable contract.
- Machine-readable target JSON under `docs/visual-targets/` is authoritative for exact geometry, variants, palettes, pivots, layers, and metadata.
- Generated style references and concepts are not automatically production source art.

## 3. Canonical visual baseline

- Style: readable 3/4 top-down family-friendly fantasy pixel art.
- Priority: mobile readability before decoration.
- World tile grammar: `16×16` pixels.
- Standard human actor canvas: `32×48` pixels.
- Standard actor footprint: `16×16` pixels.
- Default pivot: centre-bottom of the footprint unless the target explicitly differs.
- Minimum production directions for actors: front, back, left, and right.
- Eight directions require a justified later scope for combat-critical heroes, bosses, or enemies.
- Runtime export: PNG.
- Preferred editable source: `.aseprite` or `.ase` when available.
- Runtime rendering: nearest/point sampling; avoid smoothing and mipmaps unless specifically justified.
- Larger assets must use clear multiples of the `16×16` grammar and declare canvas, footprint, and pivot.
- Do not mix ad hoc gameplay resolutions or hide unsuitable targets through blurry runtime scaling.

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

- Ground-plane tiles and floors use the established top-down/3/4 projection.
- Anything with height—trees, fences, buildings, standing characters, rocks, and tall props—uses a flattened camera-facing presentation above a grounded footprint.
- Tall objects should read like a grounded “pop-up” form, not true isometric and not true top-down.
- Do not mix true-isometric assets into the farm or village world.
- The declared footprint remains the gameplay footprint even when the visual canvas extends upward.

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

- canvas, footprint, pivot, PPU, and view;
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
- Reuse compatible rigs where possible.
- Differentiate NPCs through costume, props, idle/talk/emote states, and silhouette rather than arbitrary scale drift.

### Armor overlays

- Inherit the base body's canvas, pivot, directions, frame count, timing, and anchor exactly.
- No independent scale, baseline, or frame drift.
- Preserve compatibility with future cape, helm, torso, and weapon layers.

### Weapons

- Declare sockets, view, foreground/background layer, and action timing.
- Motion must align with the owning actor and any gameplay hit window.

### Monsters and bosses

- Give each monster one readable silhouette, one dominant material story, and one accent hue.
- Standard mobs usually occupy `32×32` to `64×64` canvases and declare their footprint separately.
- Bosses prioritize anticipation and telegraphs. Split assets larger than roughly `96×96` when modules improve reuse, culling, collision, or layering.

### Landscape tiles and decals

- Build on `16×16` cells or clear multiples.
- Favour broad readable masses over micro-detail.
- Preserve walkability and interaction readability.
- Keep base terrain quiet; use separate decals for scatter, crops, flowers, lilies, rocks, and similar details.

### Buildings and props

- Match the world projection and upper-left light.
- Ground tall visuals on a declared lower footprint.
- Mark entrances and interaction points clearly.
- Use variable-size targets rather than forcing detail into an undersized cell.

### UI

- Use high-contrast, low-noise panels and icons.
- Prefer reusable nine-slice components where scaling is required.
- Preserve large touch targets, Grade 2 readability, and screen-safe margins.
- Decorative treatment must not obscure interaction state.

### VFX

- Primitive Phaser feedback remains acceptable when it is clear and inexpensive.
- Flipbook VFX normally use `16×16`, `32×32`, or `64×64` cells.
- Effects reinforce readable action; they do not replace animation or blot out actors.
- Avoid permanent particle spam and full-screen effects without profiling.

### Cutscenes and portraits

- Reuse the gameplay palette and lighting unless a deliberate scene override is documented.
- Keep portrait swaps, mouth frames, and overlays separately named.

## 9. Animation rules

| Animation | Production target |
| --- | --- |
| Idle | 4–6 frames |
| Walk | 6–8 frames |
| Light attack | 6–8 frames |
| Heavy attack | 8–12 frames |
| Cast | 6–10 frames |
| Hurt | 2–4 frames |
| Death | 8–12 frames |
| Item idle | 4–6 frames |

- Record intended frame timing, loop behavior, and tag names.
- Attacks identify anticipation, contact, and recovery.
- Combat clips declare gameplay event or hitbox windows.
- Prototype clips may use fewer frames, but the intended production target must remain documented.
- Keep feet and bottom-centre anchors stable to prevent sprite jumping.

## 10. Grounding and shadows

- Every dynamic actor, NPC, monster, and interactive world object renders a soft semi-transparent grounding shadow.
- The shadow anchors under the feet/base and falls slightly down-right to match the upper-left light.
- Engine-drawn shadows normally live on `actors_feet` and remain separate from animation art.
- Placeholder markers are not exempt.
- Do not bake shadows into dynamic or Y-sorted source art.
- A baked shadow is allowed only for a truly static asset whose target explicitly permits it.

## 11. Layering and render order

Canonical order:

```text
background -> terrain -> decals_low -> actors_feet -> actors_body -> actors_head -> armor_overlays -> weapons_front -> vfx_low -> vfx_high -> weather -> world_ui -> screen_ui
```

Use explicit layer groups first, then local offsets or Y-sorting within a group. Assets that cross groups must declare slices or attachment points.

## 12. Source, runtime, and atlas organization

Keep source, manifests, normalized output, and metadata separate.

Current practical folders include:

```text
assets/source/generated/<asset_id>/
assets/manifests/
assets/sprites/
assets/tilesets/
assets/buildings/
```

Future atlas families may include:

```text
characters
combat_fx
environment_farm
environment_village
ui
```

Prefer feature/scene atlases over one mega-atlas. Do not reorganize existing assets merely to satisfy a future folder ideal.

## 13. Terrain blending

Any adjacent terrain types must use authored transitions rather than a hard grid boundary.

Default reduced set per boundary:

- 1 centre;
- 4 edges;
- 4 outer corners;
- 4 inner corners.

That is the full 13-variant set. Use a larger blob set only when a specific boundary proves it is necessary.

Additional rules:

- Generate and approve centre tiles before edges and corners.
- Centre tiles must be seamless in a 3×3 repeat and contain no decorative perimeter.
- Edge/corner assets must preserve the approved centre texture, palette, density, and light.
- Author static map transitions with Tiled terrain/Wangset tools when practical.
- Runtime gameplay states such as dry/wet/seeded soil are same-cell state swaps, not neighbour blending.
- Do not add a runtime autotile dependency without a separate compatibility spike for the project's Phaser version.

## 14. Lighting and atmosphere

- Establish source-art light consistency first.
- Apply one restrained scene atmosphere layer before adding many local lights.
- Local point lights may support torches, windows, spell impacts, magical props, and similar controlled sources.
- Do not build a full day/night or heavy dynamic-lighting system as incidental visual polish.
- Profile on physical iPad before adopting expensive full-screen alpha, shader, or light stacks.

## 15. Feedback and juice

Acceptable techniques include:

- squash and stretch on landing or impact;
- short, restrained camera shake for strong impacts;
- readable hit flashes and projectiles;
- brief particles or decals that leave a visible trace;
- pressed/disabled states on touch controls;
- persistent landmarks after meaningful discovery.

Restrictions:

- feedback must not hide actors, prompts, or navigation;
- no permanent particle spam;
- no glow on every object;
- no rapid flashing that undermines comfort or photosensitivity;
- reduced-motion behavior must remain respected where implemented.

## 16. Asset-status and source-audit rules

Use these terms precisely:

- **STYLE REFERENCE ONLY** — approved direction, not pipeline-ready.
- **APPROVED SOURCE CANDIDATE** — clean source ready for manifest work.
- **NORMALIZED RUNTIME ASSET** — exact validated output exists.
- **RUNTIME-INTEGRATED ASSET** — loaded and browser-verified in the game.
- **REGENERATE** — failed production constraints.
- **CHANGE TARGET SIZE** — target canvas is unsuitable.

The prompting and audit process is defined in `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md`.

## 17. Visual-asset PR checklist

Every visual asset PR should confirm:

- [ ] Canonical `snake_case` ID and valid domain.
- [ ] Declared canvas, footprint, pivot, PPU, layer, and atlas family.
- [ ] Declared palette with locked hex values and upper-left light.
- [ ] Correct perspective for terrain versus tall objects.
- [ ] Readable silhouette at 1x and 3x.
- [ ] Animation tags, timing, events, and loop behavior when relevant.
- [ ] Overlay alignment with the base actor when relevant.
- [ ] Collision, hitbox, hurtbox, interaction, or socket metadata when relevant.
- [ ] Source provenance and explicit source-audit verdict.
- [ ] Manifest normalization and validation pass.
- [ ] Reviewable contact sheet or preview set.
- [ ] Browser screenshots for affected profile/game states.
- [ ] iPad-like landscape viewport evidence for visual/UI changes.
- [ ] Physical-iPad claims are made only after real-device testing.
- [ ] No unrelated runtime, save, curriculum, quest, or economy change.

Current production priorities and implementation status belong in `docs/CURRENT_STATE.md` and the active execution handoff, not in this contract.
