# Eldoria-V2 Hero Actor Targets

Source contracts:

- [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)
- [`CHARACTER_PERSPECTIVE_LOCK_V1.md`](CHARACTER_PERSPECTIVE_LOCK_V1.md)
- [`docs/ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md`](../ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md)

## Purpose

Define the first production hero sprite target before generating or replacing art. This specification keeps human and AI asset work aligned to one measurable baseline.

The camera and direction rules in `CHARACTER_PERSPECTIVE_LOCK_V1.md` are binding. Earlier wording that required horizontally three-quarter West/East facings is superseded by that lock's strict-cardinal semantics.

## Scope

This is a target specification only. It adds no art, runtime behavior, asset loader, atlas implementation, or gameplay change.

The current `32×48` canvas remains the declared trial target. The first four-direction camera-and-heading proof must determine whether the fixed elevated projection remains readable at that size. Use **CHANGE TARGET SIZE** rather than forcing important top-plane, face, equipment, or foot information into an unsuitable canvas.

## First Target: `char_mage_boy_base`

`char_mage_boy_base` is the Grade 2 Mage hero base. It must support the audio-first profile with a clear, friendly silhouette and low visual ambiguity at mobile scale.

### Production baseline

- Style: painterly, readable family-friendly fantasy pixel art under a fixed elevated orthographic 2.5D camera.
- Camera: one stationary elevated orthographic camera across every direction and state, with an approximately 35-degree downward pitch relative to eye level; approved visual exemplars govern the final visual read.
- Canvas: `32×48` pixels for the first proof; subject to a documented **CHANGE TARGET SIZE** verdict before production lock.
- Footprint: `16×16` pixels.
- Pivot: `[16, 47]` in top-left canvas coordinates.
- PPU: `16`.
- Directions: South/down/front, West/left, North/up/back, and East/right only.
- South rule: direct South heading beneath the elevated camera, with visible top surfaces and vertical foreshortening; never an eye-level front elevation or a Southwest/Southeast diagonal turn.
- West/East rule: exact 90-degree cardinal rotations from South beneath the same stationary elevated camera. Horizontally profile-like silhouettes are valid when visible crown, shoulder, body, and footwear top surfaces prove the camera remains elevated. Never substitute Southwest/Southeast diagonal turns or flatten the camera to eye level.
- North rule: direct North heading beneath the elevated camera, with visible top/rear surfaces and vertical foreshortening; never an eye-level rear elevation or a Northwest/Northeast diagonal turn.
- Neutral Mage base: empty hands, no held staff, no permanent staff pixels, and no cape. Staff-on-back is a later separate equipment layer after the four-direction base and socket rules pass.
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

Each production source must record intended per-frame timing. Armor and weapon overlays added later must match the approved base clip timing, geometry, camera, cardinal headings, and sockets exactly.

### Camera-and-heading proof gate

Do not commission the complete animation family first.

Begin with:

- one neutral Mage identity;
- four cardinal idle directions;
- no armor variants;
- no elaborate VFX;
- exact `1×` normalization;
- bright Farm and darker Woods context previews;
- baseline/pivot and apparent-height comparison.

Use direction-anchored generation when a same-sheet approach causes heading drift. Select the method by exact runtime identity, camera-pitch consistency, and cardinal-heading accuracy, not high-resolution attractiveness.

### Explicitly deferred

- Light and heavy attack animation.
- Death and special animation.
- Eight-direction animation.
- Armor overlays.
- Weapon overlays beyond the frozen base-action proof.
- Portrait art.
- Any large customization family before camera, cardinal headings, pivots, and timing are frozen.

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

These names reserve compatibility for future armor, helm, cape, and weapon overlays without requiring those assets now. The neutral Mage base itself does not include a cape or permanent staff pixels.

### Collision and interaction target

- Hurtbox: `[10, 25, 12, 22]`.
- Interaction box: `[8, 30, 16, 18]`.
- Hitboxes: none until attack clips are explicitly scoped.

Character art may extend above the gameplay body. Camera correction must not silently change gameplay geometry.

### Palette target

- `skin_hair` for body, face, and hair ramps.
- `arcane` for Mage clothing and magic accents.
- `ui_neutral` only for future icon references, not the actor sprite palette.

## Ranger Explorer target sequence

The Grade 5 Ranger Explorer requires a dedicated production target and sheets using the same fixed elevated camera and strict cardinal-heading lock.

Before Ranger armor or equipment production:

- approve the four-direction camera-and-heading proof;
- preserve practical cloak, bow, and quiver identity;
- prove direct South/West/North/East headings beneath one stationary elevated camera;
- prove that West/East are exact cardinal rotations rather than Southwest/Southeast turns while retaining visible top surfaces from the elevated camera;
- approve `idle`, `walk`, `shoot`, and `hurt` base clips;
- freeze direction-specific weapon occlusion and sockets;
- preserve the stable internal profile ID `grade5-adventurer`.

The current bridge presentation is not a production-art authority.

## Future art PR acceptance checklist

- [ ] Asset ID and frame IDs follow the visual asset naming contract.
- [ ] The base passes `CHARACTER_PERSPECTIVE_LOCK_V1.md`.
- [ ] Canvas, footprint, pivot, PPU, and atlas family match the target or carry an approved **CHANGE TARGET SIZE** decision.
- [ ] South/down/front, West/left, North/up/back, and East/right views are complete and aligned.
- [ ] Every direction uses the same stationary elevated orthographic camera and approved visual pitch.
- [ ] South and North are direct cardinal headings with visible top surfaces and vertical foreshortening, not eye-level elevations or diagonal headings.
- [ ] West and East are exact 90-degree cardinal rotations from South with no South or North heading component.
- [ ] A profile-like West/East silhouette is not rejected merely for being profile-like; visible top surfaces must prove the camera remains elevated.
- [ ] West/East are not Southwest/Southeast diagonal turns and are not eye-level side elevations.
- [ ] Mage neutral-base hands are empty, with no permanent staff or cape pixels.
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
