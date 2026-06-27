# Practice Slime Production Target

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)

## Purpose

Record the production Practice Slime visual target and acceptance contract for asset and runtime work.

## Current Asset Status

The approved v001 source sheet, normalization manifest, and `192x128` runtime sheet are committed. See [`docs/CURRENT_STATE.md`](../CURRENT_STATE.md) for current runtime-integration status. Combat, AI, stats, and defeat behavior remain undefined.

## Scope

This is a target specification only. It adds no art, runtime behavior, combat implementation, AI, stats, quest logic, or curriculum changes.

## Target: `mob_slime_practice_base`

The Practice Slime is a friendly magical practice target for the current optional learning/combat-bonus loop. It should feel approachable, readable, and clearly non-threatening for a Grade 2 player.

## Canvas And Geometry

- Canvas: `32x32` pixels.
- Footprint: `16x16` pixels.
- Pivot: `[16, 31]` in top-left canvas coordinates.
- PPU: `16`.
- Direction: front only for the current target.

A single front view is sufficient because the current Practice Slime is a simple stationary interaction target. Additional directions require a separately reviewed locomotion or combat need.

## Visual Identity

- Friendly magical practice slime with a rounded, readable silhouette.
- Soft translucent jelly volume using `arcane` and `forest` palette families.
- One clear blue-purple arcane highlight; avoid noisy internal detail.
- Simple, non-scary face or eye marks if those are added later.
- Consistent upper-left key light.
- Readable at 1x and 3x scale.

## Required Animation Clips

| Clip | Frames | Loop |
| --- | --- | --- |
| `idle` | 4-6 | Yes |
| `hop` | 6-8 | Yes |
| `hurt` | 2-4 | No |
| `poof` | 6-8 | No |

Attack, cast, and death clips are deferred. The poof clip is a visual target only and does not add runtime defeat behavior.

## Collision And Interaction

- Body: `[9, 15, 14, 12]`.
- Hurtbox: `[8, 12, 16, 16]`.
- Interaction box: `[6, 10, 20, 20]`.
- Hitboxes: none.

Combat stats, AI behavior, damage, and attack timing remain undefined.

## Atlas And Layers

- Atlas family: `characters`.
- Main render layer: `actors_body`.
- Optional poof residue layer: `vfx_low`.
- Runtime export: PNG.
- Preferred editable source: `.aseprite` or `.ase`.

## Future Art PR Acceptance Checklist

- [ ] Target ID is `mob_slime_practice_base`.
- [ ] Uses a `32x32` canvas, `16x16` footprint, and `[16,31]` pivot.
- [ ] Front view is readable at 1x and 3x.
- [ ] Declares and follows the `arcane` and `forest` palette families.
- [ ] Uses consistent upper-left lighting.
- [ ] Declares idle, hop, hurt, and poof clips within the target frame ranges.
- [ ] Preserves a friendly, non-scary silhouette and facial treatment.
- [ ] Collision and interaction metadata match this specification.
- [ ] Adds no hitboxes or gameplay behavior.
- [ ] Adds no unrelated runtime, UI, map, save, quest, curriculum, or mastery changes.

The machine-readable source is [`practice_slime_target.json`](practice_slime_target.json).
