# Grade 5 Adventurer Actor Targets

References:

- [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)
- Current Grade 5 profile id: `grade5-adventurer`

## Purpose

Define the first Grade 5 production hero actor target before any Grade 5 art generation or runtime integration. The target keeps the older-reader profile visually distinct from the Grade 2 Mage while preserving the same safe vertical-slice gameplay boundaries.

## Scope

This is a target specification only. It adds no art, runtime behavior, loader changes, animation registration, map changes, combat, curriculum, quest logic, save behavior, equipment mechanics, or UI changes.

## First Target: `char_adventurer_grade5_base`

`char_adventurer_grade5_base` is the Grade 5 Adventurer hero base. It should feel older, more capable, and more quest-ready than the Grade 2 Mage without becoming noisy at mobile scale.

### Production Baseline

- Style: readable 3/4 top-down fantasy pixel art.
- Canvas: `32x48` pixels.
- Footprint: `16x16` pixels.
- Pivot: `[16,47]` in top-left canvas coordinates.
- PPU: `16`.
- Directions: front, back, left, and right only.
- Runtime export: PNG.
- Preferred editable source: `.aseprite` or `.ase`.
- Rendering: nearest/point sampling.
- Lighting: consistent upper-left key light.
- Atlas family: `characters`.

### Visual Identity

- Silhouette: young adventurer/warrior-scholar, clearly separate from the Grade 2 Mage.
- Outfit: practical tunic, short cloak or shoulder detail, boots, belt, and light adventuring gear.
- Palette: grounded `wood_leather`, `ui_neutral`, and one restrained `hero_blue` accent family.
- Readability: stronger stance and older proportions than the Grade 2 Mage, but no tiny facial details or noisy gear clusters.

### Required Animation Clips

| Clip | Frames | Loop |
| --- | --- | --- |
| `idle` | 4-6 | Yes |
| `walk` | 6-8 | Yes |
| `cast` | 6-10 | No |
| `hurt` | 2-4 | No |

Each production source must record intended per-frame timing. Future equipment overlays must match the base clip timing exactly.

### Explicitly Deferred

- Light and heavy attack animation.
- Death and special animation.
- Eight-direction animation.
- Equipment overlays.
- Portrait art.
- Combat stats, hitboxes, damage, AI, and progression effects.

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

These names reserve compatibility for future armor, helm, cloak/cape, and weapon overlays without requiring those assets now.

### Collision And Interaction Target

- Hurtbox: `[10, 25, 12, 22]`.
- Interaction box: `[8, 30, 16, 18]`.
- Hitboxes: none until attack clips are explicitly scoped.

### Gameplay Policy

- Learning remains bonus-only.
- Wrong answers and skips must never block quest progress.
- This visual target must not introduce stats, damage, attack gating, inventory, or equipment behavior.
- Grade 2 Mage presentation and audio-first behavior must remain unchanged by any Grade 5 actor PR.

## Future Art PR Acceptance Checklist

- [ ] Asset ID is `char_adventurer_grade5_base` and exported frame IDs follow the visual asset naming contract.
- [ ] Canvas, footprint, pivot, PPU, and atlas family match this target.
- [ ] Front, back, left, and right views are complete and aligned.
- [ ] Idle, walk, cast, and hurt clips meet the declared frame ranges and record timing.
- [ ] Silhouette is readable at 1x and 3x without noisy one-pixel gear details.
- [ ] Upper-left lighting and declared palette families are consistent in every direction.
- [ ] Required layers/slices share one canvas and do not drift between frames.
- [ ] Hurtbox and interaction metadata match the target; no hitboxes are invented.
- [ ] Grade 5 reader-mode remains distinct from Grade 2 audio-first presentation.
- [ ] No unrelated runtime, UI, map, save, quest, curriculum, mastery, combat, or equipment changes are included.

The machine-readable source of this target is [`grade5_actor_targets.json`](grade5_actor_targets.json).
