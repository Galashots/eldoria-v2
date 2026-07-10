# Eldoria-V2 Visual Asset Contract

Source reference: [Executable 2D RPG Visual Design Guide for Eldoria V2](research/visual-design/Executable_2D_RPG_Visual_Design_Guide_for_Eldoria_V2.pdf)

Additional source reference (2026-07-10): [Stardew-Caliber Visual Research](research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md), which produced Sections 4a, 8a, and 13-15 below.

## 1. Purpose

Eldoria-V2 is a fantasy-learning RPG first. This contract prevents visual drift and gives Codex, Claude, artists, and asset-generation tools one consistent specification for sprites, tiles, UI, VFX, buildings, and related metadata.

This contract does not override the product rule that learning never gates adventure. It also protects the Grade 2 audio-first experience and keeps the current vertical slice ahead of broad asset expansion.

## 2. Current Production Posture

- Immediate production remains Phaser, Vite, TypeScript, and Tiled.
- These rules are engine-agnostic enough to inform later Godot or Unity planning, but current repo work stays Phaser unless explicitly changed.
- This PR does not rewrite the asset pipeline, add atlas loading, or change runtime behavior.

## 3. Canonical Visual Baseline

- Style: readable 3/4 top-down fantasy pixel-art RPG.
- Presentation: mobile-friendly, low-friction, and readable before decorative.
- World tile grammar: `16x16` pixels.
- Standard human actor canvas: `32x48` pixels.
- Standard actor footprint: `16x16` pixels.
- Pivot: center-bottom of the footprint unless the category contract explicitly differs.
- Directions: front, back, left, and right are the minimum production set.
- Eight directions are a later enhancement for heroes, bosses, or combat-critical enemies only.
- Runtime export: PNG by default.
- Editable source: `.aseprite` or `.ase` when available.
- Gameplay rendering: nearest/point sampling; avoid smoothing and mipmaps unless specifically justified.
- Do not mix ad hoc gameplay sprite resolutions. Larger assets must remain multiples of the `16x16` grammar and declare their canvas, footprint, and pivot.

## 4. Palette And Lighting

- Target one limited master palette of roughly 48-64 colors.
- Declare one named sub-palette for every asset. Initial names are `forest`, `ruins`, `arcane`, `lava`, `ui_neutral`, `metal`, `wood_leather`, and `skin_hair`.
- Use a consistent upper-left, slightly front-facing key light; default shadows fall down-right/back.
- Establish a readable silhouette and major color clusters before adding shading detail.
- Avoid noisy dithering on actors, combat-readable elements, icons, and UI. Reserve restrained dithering for broad environmental surfaces when useful.
- Sub-palette names are a starting point, not the finished contract. Before committing production art in a given sub-palette, lock its actual hex values in a small swatch reference alongside that asset's PR so later assets in the same family cannot silently drift (see the research doc's Finding 3).

## 4a. Perspective Discipline

- The ground plane (tiles, floors) renders as a true top-down/3-4 projection.
- Anything with height — trees, buildings, fences, standing characters, props — is flattened toward the camera rather than drawn in true isometric or true top-down, the same "pop-up book" technique Stardew Valley and comparable top-down RPGs use. This keeps tall objects visually grounded on the tile grid instead of appearing to float or lean incorrectly.
- Do not mix true-isometric art with this flattened style in the same scene; pick the flattened convention for all new environment and building art.

## 5. Asset Naming Contract

Use lowercase `snake_case` only. Do not use spaces, mixed separators, vague generated names, or engine defaults such as `sprite_12`.

Canonical long-form ID:

```text
<domain>_<entity>_<variant>_<view>_<state>_<part>_<frame>_v###
```

Allowed domains:

```text
char npc armor weapon mob boss env bld ui fx cut port icon tile sfx
```

Use the long form for animated or directional assets. Static assets may omit fields that genuinely do not apply, but must preserve field order. Controlled multiword states such as `attack_light` are valid; metadata remains authoritative.

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

## 6. Asset Metadata Contract

Every exported sheet or loose gameplay asset should eventually have a JSON sidecar. Coordinates use a top-left canvas origin; the standard actor pivot below is bottom-center.

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

## 7. Category Rules

- **Hero sprites:** Use the standard actor canvas, footprint, pivot, and four-direction set. Favor a heroic, readable silhouette with chunky forms and stable attachment slices. Reserve eight directions for a justified later pass.
- **NPCs:** Reuse the human actor grammar and compatible rigs where possible. Differentiate NPCs with costume accents, props, idle/emote/talk states, and clear silhouettes.
- **Armor overlays:** Inherit the base body canvas, pivot, direction set, frame count, and per-frame timing exactly. No independent drift is permitted. Layers must remain compatible with future armor, cape, helm, and weapon overlays.
- **Weapons:** Declare hand/holster sockets, view, foreground/background layer, and attack timing. Weapon motion must align with the owning actor and its hit windows.
- **Monsters:** Give each monster one readable silhouette, one dominant material story, and one accent hue. Standard mobs usually occupy `32x32` to `64x64` canvases and declare their footprint separately.
- **Bosses:** Prioritize readable anticipation and telegraphs. Split assets larger than roughly `96x96` into declared modules when that improves reuse, culling, or layering.
- **Landscape tiles:** Build on `16x16` cells or clear multiples. Group by biome, favor large readable masses over micro-detail, and keep walkability and interaction cues visible.
- **Buildings:** Match the world projection and upper-left light. Block from tile modules first, mark entrances clearly, then add trim and limited ambient motion.
- **UI:** Use high-contrast, low-noise panels and icons. Prefer 9-slice panels where scaling is needed. Preserve touch readability and Grade 2 audio-first/non-reading-friendly presentation.
- **VFX:** Current primitive Phaser bursts are acceptable for low-cost feedback. Future flipbook VFX use `16x16`, `32x32`, or `64x64` cells. VFX must reinforce, not replace, readable combat animation.
- **Cutscenes and portraits:** Reuse gameplay palette and light rules unless an intentional scene override is documented. Use `cut` and `port` domains and keep portrait swaps, mouth frames, and overlay effects separately named.

## 8. Animation Rules

| Animation | Production target |
| --- | --- |
| Idle | 4-6 frames |
| Walk | 6-8 frames |
| Light attack | 6-8 frames |
| Heavy attack | 8-12 frames |
| Cast | 6-10 frames |
| Hurt | 2-4 frames |
| Death | 8-12 frames |
| Item idle | 4-6 frames |

- Record intended per-frame timing, loop behavior, and tag names in source/metadata.
- Attacks must identify anticipation, contact, and recovery timing; combat clips must declare hitbox windows.
- Prototype frame counts may be reduced, but the intended production timing and direction set must still be documented.

## 8a. Grounding And Shadows

- Every dynamic actor, NPC, monster, and interactive world object (Mira, the Practice Slime, crop/quest markers, and anything similar) must render a soft, semi-transparent ground shadow anchored under its feet/base, offset down-right to match the upper-left key light.
- This is the cheapest available fix for sprites otherwise reading as flat markers floating over the tile grid (see the research doc's Finding 4); it renders on the existing `actors_feet` layer and requires no new art asset (a drawn ellipse/soft circle is sufficient).
- Placeholder markers (colored circles/diamonds standing in for un-produced art) are not exempt: they still need a shadow so they read as objects in the world rather than UI floating over it.

## 9. Layering And Render Order

Use this canonical order:

```text
background -> terrain -> decals_low -> actors_feet -> actors_body -> actors_head -> armor_overlays -> weapons_front -> vfx_low -> vfx_high -> weather -> world_ui -> screen_ui
```

Use explicit layer groups first, then local offsets or Y-sorting within a group. Assets that cross groups must declare their slices or attachment points.

## 10. Atlas And Folder Direction

Do not implement atlas loading as part of this contract. The future target is feature/scene atlases, not one mega-atlas.

Likely atlas families:

```text
characters
combat_fx
environment_farm
environment_village
ui
```

Keep source, runtime exports, and metadata separate:

```text
assets/art/<category>/<entity>/src/
assets/art/<category>/<entity>/export/
assets/art/<category>/<entity>/meta/
assets/atlases/<family>/
assets/manifests/
```

This is a future folder direction, not a request to move current files.

## 11. Validation Checklist

Every future visual asset PR should confirm:

- [ ] Canonical lowercase `snake_case` name and domain.
- [ ] Declared canvas, footprint, and pivot.
- [ ] Declared palette family and consistent upper-left light.
- [ ] Readable silhouette at 1x and 3x scale.
- [ ] Animation tags, loop behavior, frame counts, and intended timing.
- [ ] Armor/weapon overlays align exactly with the base actor.
- [ ] Collision, hitbox, hurtbox, interaction, or socket metadata when relevant.
- [ ] Declared atlas family.
- [ ] Nearest/point rendering expectation for gameplay pixel art.
- [ ] Ground shadow present for dynamic actors/NPCs/interactive objects (Section 8a).
- [ ] Flattened "pop-up book" perspective for anything with height, not true isometric (Section 4a).
- [ ] Terrain tiles that border another terrain type declare edge/corner blend variants rather than a hard grid boundary (Section 13).
- [ ] No unrelated runtime changes.

## 12. Near-Term Eldoria Application

The next practical visual milestones, each requiring its own reviewed scope, are:

1. Production-spec hero actor target.
2. Matching armor overlay target.
3. Consistent Practice Slime target.
4. Farm/village tile polish.
5. UI panel/icon polish.

None of those assets or runtime changes are implemented by this contract.

## 13. Terrain Blending (Autotiling)

Source: [Stardew-Caliber Visual Research, Finding 1](research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md).

- Any two adjacent terrain tile types (grass/dirt, dirt/water, grass/village-stone, etc.) must be authored with edge and corner blend variants rather than meeting at a hard grid line. This is the single highest-leverage fix identified for the "reads like a development grid" problem.
- Default to a reduced ~13-tile blend set per terrain boundary (1 center + 4 edges + 4 outer corners + 4 inner corners) rather than the full 47-tile blob set, unless a specific boundary is proven to need the full set. `tile_farm_path_dirt` already declares most of this set (center, 4 edges, 4 corners) and should be finished under this rule rather than redesigned.
- Author and paint static terrain blending using Tiled's built-in Terrain Brush / Wangset feature. This requires no plugin or runtime code for tiles that do not change during gameplay.
- Tiles whose state changes at runtime from gameplay (for example `tile_farm_tilled_soil`'s dry/wet/seeded states) are a same-cell sprite swap, not a neighbor blend, and do not need autotiling.
- If a future feature requires tiles that blend based on changing gameplay state (not just static map authoring), evaluate `phaser3-autotile` for runtime Wangset lookups, but first spike its compatibility with this project's Phaser `^4.2.0` — it targets the Phaser 3 API and compatibility is unverified.

## 14. Lighting And Atmosphere

Source: [Stardew-Caliber Visual Research, Finding 5](research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md).

- Phaser's native `this.add.pointlight(x, y, color, radius, intensity, attenuation)` (available in the project's Phaser `^4.2.0`) is the preferred tool for future controlled light sources — torches, windows, spell impacts, muzzle flashes — without needing normal maps or a `Light2D` setup.
- Before any per-light work, apply a single cheap atmosphere layer first: a full-scene, semi-transparent color-tint rectangle (warm gold for daytime; reserve cooler tones for any future evening/interior scene) blended with `MULTIPLY` or `SCREEN`. This is a few lines of Phaser code, not an art asset, and is what makes visually disconnected sprites read as lit by the same light source.
- Do not build a full day/night cycle or weather system as part of this pass; it is explicitly out of scope until the core vertical slice is further along (see the research doc's non-goals).

## 15. Feedback And Juice

Source: [Stardew-Caliber Visual Research, Finding 6](research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md).

- Squash-and-stretch on impact/landing, brief screen shake on impact, and particles/decals that leave a lasting trace (rather than only flying and vanishing) are expected, standard techniques ("juice") for making sprites feel reactive. Eldoria-V2 already uses versions of the first two (the Waking Gate's camera shake, the Practice Slime's squash/hop reaction); keep using and naming this pattern deliberately in future PRs instead of reinventing it ad hoc each time.
- Non-negotiable: juice must echo gameplay that already works. It must never gate, replace, or stand in for an actual gameplay or clarity improvement, and it must never be used in a way that pressures the player (no juice tied to countdowns, streak loss, or punishment). This is the same spirit as the existing "learning never gates adventure" rule and extends it to visual feedback.
