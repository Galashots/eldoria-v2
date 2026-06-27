# Eldoria-V2 Hero Actor Targets

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)

## Purpose

Define the first production hero sprite target before generating or replacing art. This specification keeps future human and AI asset work aligned to one measurable baseline.

## Scope

This is a target specification only. It adds no art, runtime behavior, asset loader, atlas implementation, or gameplay change.

## First Target: `char_mage_boy_base`

`char_mage_boy_base` is the Grade 2 Mage hero base. It must support the audio-first profile with a clear, friendly silhouette and low visual ambiguity at mobile scale.

### Production Baseline

- Style: readable 3/4 top-down fantasy pixel art.
- Canvas: `32x48` pixels.
- Footprint: `16x16` pixels.
- Pivot: `[16, 47]` in top-left canvas coordinates.
- PPU: `16`.
- Directions: front, back, left, and right only.
- Runtime export: PNG.
- Preferred editable source: `.aseprite` or `.ase`.
- Rendering: nearest/point sampling.
- Lighting: consistent upper-left key light.
- Atlas family: `characters`.

### Required Animation Clips

| Clip | Frames | Loop |
| --- | --- | --- |
| `idle` | 4-6 | Yes |
| `walk` | 6-8 | Yes |
| `cast` | 6-10 | No |
| `hurt` | 2-4 | No |

Each production source must record intended per-frame timing. Armor and weapon overlays added later must match the base clip timing exactly.

### Explicitly Deferred

- Light and heavy attack animation.
- Death and special animation.
- Eight-direction animation.
- Armor overlays.
- Weapon overlays.
- Portrait art.

### Layer And Slice Compatibility

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

### Collision And Interaction Target

- Hurtbox: `[10, 25, 12, 22]`.
- Interaction box: `[8, 30, 16, 18]`.
- Hitboxes: none until attack clips are explicitly scoped.

### Palette Target

- `skin_hair` for body, face, and hair ramps.
- `arcane` for Mage clothing and magic accents.
- `ui_neutral` only for future icon references, not the actor sprite palette.

## Future Art PR Acceptance Checklist

- [ ] Asset ID is `char_mage_boy_base` and exported frame IDs follow the visual asset naming contract.
- [ ] Canvas, footprint, pivot, PPU, and atlas family match this target.
- [ ] Front, back, left, and right views are complete and aligned.
- [ ] Idle, walk, cast, and hurt clips meet the declared frame ranges and record timing.
- [ ] Silhouette is readable at 1x and 3x without noisy one-pixel anatomy.
- [ ] Upper-left lighting and declared palette families are consistent in every direction.
- [ ] Required layers/slices share one canvas and do not drift between frames.
- [ ] Hurtbox and interaction metadata match the target; no hitboxes are invented.
- [ ] Grade 2 readability and the existing audio-first experience remain protected.
- [ ] No unrelated runtime, UI, map, save, quest, curriculum, or mastery changes are included.

The machine-readable source of this target is [`hero_actor_targets.json`](hero_actor_targets.json).
