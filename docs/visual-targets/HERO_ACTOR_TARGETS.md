# Eldoria-V2 Hero Actor Targets

Source contracts:

- [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)
- [`CHARACTER_PERSPECTIVE_LOCK_V1.md`](CHARACTER_PERSPECTIVE_LOCK_V1.md)
- [`docs/ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md`](../ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md)

## Purpose

Define the first production hero sprite target before generating or replacing art. This specification keeps human and AI asset work aligned to one measurable baseline.

The camera and direction rules in `CHARACTER_PERSPECTIVE_LOCK_V1.md` are binding. Existing direct-to-camera downward facings are transitional and are not an acceptable production reference for future hero, armor, or weapon families.

## Scope

This is a target specification only. It adds no art, runtime behavior, asset loader, atlas implementation, or gameplay change.

The current `32×48` canvas remains the declared trial target. The first four-direction perspective proof must determine whether the elevated projection remains readable at that size. Use **CHANGE TARGET SIZE** rather than forcing important top-plane, face, equipment, or foot information into an unsuitable canvas.

## First Target: `char_mage_boy_base`

`char_mage_boy_base` is the Grade 2 Mage hero base. It must support the audio-first profile with a clear, friendly silhouette and low visual ambiguity at mobile scale.

### Production baseline

- Style: painterly, readable elevated three-quarter fantasy pixel art.
- Camera: one consistent elevated three-quarter projection across every direction and state.
- Canvas: `32×48` pixels for the first proof; subject to a documented **CHANGE TARGET SIZE** verdict before production lock.
- Footprint: `16×16` pixels.
- Pivot: `[16, 47]` in top-left canvas coordinates.
- PPU: `16`.
- Directions: down/front, up/back, left, and right only.
- Down/front rule: foreshortened elevated view with visible top planes; never a direct frontal elevation.
- Left/right rule: three-quarter side views with visible top planes; never pure profiles.
- Runtime export: PNG.
- Preferred editable source: `.aseprite` or `.ase`.
- Rendering: nearest/point sampling.
- Lighting: consistent upper-left key light.
- Atlas family: `characters`.
- Pivot and apparent height: stable across all directions and clips; no per-frame auto-scaling.

### Required animation clips

| Clip | Frames | Loop |
| --- | --- | --- |
| `idle` | 4–6 | Yes |
| `walk` | 6–8 | Yes |
| `cast` | 6–10 | No |
| `hurt` | 2–4 | No |

Each production source must record intended per-frame timing. Armor and weapon overlays added later must match the approved base clip timing, geometry, projection, and sockets exactly.

### Perspective-proof gate

Do not commission the complete animation family first.

Begin with:

- one neutral Mage identity;
- four idle directions;
- no armor variants;
- no elaborate VFX;
- exact `1×` normalization;
- bright Farm and darker Woods context previews;
- baseline/pivot and apparent-height comparison.

Compare a same-sheet generation approach with direction-by-direction generation from one identity anchor when practical. Select the method by exact runtime identity and camera consistency, not high-resolution attractiveness.

### Explicitly deferred

- Light and heavy attack animation.
- Death and special animation.
- Eight-direction animation.
- Armor overlays.
- Weapon overlays beyond the frozen base-action proof.
- Portrait art.
- Any large customization family before perspective, pivots, and timing are frozen.

### Layer and slice compatibility

Future source files must preserve these named layers or slices:

```text
base_body
head
torso
legs
weapon_socket_main
armor_torso
armor_head
cape_back
```

These names reserve compatibility for future armor, helm, cape, and weapon overlays without requiring those assets now.

### Collision and interaction target

- Hurtbox: `[10, 25, 12, 22]`.
- Interaction box: `[8, 30, 16, 18]`.
- Hitboxes: none until attack clips are explicitly scoped.

Character art may extend above the gameplay body. Perspective correction must not silently change gameplay geometry.

### Palette target

- `skin_hair` for body, face, and hair ramps.
- `arcane` for Mage clothing and magic accents.
- `ui_neutral` only for future icon references, not the actor sprite palette.

## Ranger Explorer target sequence

The Grade 5 Ranger Explorer requires a dedicated production target and sheets using the same camera lock.

Before Ranger armor or equipment production:

- approve the four-direction perspective proof;
- preserve practical cloak, bow, and quiver identity;
- prove down-facing foreshortening and three-quarter side views;
- approve `idle`, `walk`, `shoot`, and `hurt` base clips;
- freeze direction-specific weapon occlusion and sockets;
- preserve the stable internal profile ID `grade5-adventurer`.

The current bridge presentation is not a production-art authority.

## Future art PR acceptance checklist

- [ ] Asset ID and frame IDs follow the visual asset naming contract.
- [ ] The base passes `CHARACTER_PERSPECTIVE_LOCK_V1.md`.
- [ ] Canvas, footprint, pivot, PPU, and atlas family match the target or carry an approved **CHANGE TARGET SIZE** decision.
- [ ] Down/front, up/back, left, and right views are complete and aligned.
- [ ] Down/front is elevated and foreshortened, not direct frontal.
- [ ] Left/right are elevated three-quarter side views, not pure profiles.
- [ ] Idle, walk, core action, and hurt clips meet declared ranges and record timing.
- [ ] Silhouette is readable at exact `1×` and enlarged nearest-neighbour scale.
- [ ] Upper-left lighting and declared palette families are consistent in every direction.
- [ ] Apparent height, head/body proportion, baseline, and identity do not drift.
- [ ] Required layers/slices share one canvas and do not drift between frames.
- [ ] Bright Farm and dark Woods screenshots show the sprite belongs to the environment's camera.
- [ ] Hurtbox and interaction metadata match the target; no hitboxes are invented.
- [ ] Grade 2 readability and the existing audio-first experience remain protected.
- [ ] No armor/customization family is included before the base geometry and timing freeze.
- [ ] No unrelated runtime, UI, map, save, quest, curriculum, or mastery changes are included.

The machine-readable source of the current geometry is [`hero_actor_targets.json`](hero_actor_targets.json). The perspective lock is an additional binding human-readable contract; a later approved size or geometry change must update both authorities together.
