# Grade 5 Ranger Explorer Actor Target

Source contract: [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)

## Purpose

Define the technical production target for the Grade 5 Ranger Explorer without inventing final character art. The final silhouette, costume, palette emphasis, seed frame, and image prompt require the planned ChatGPT visual-identity approval before asset generation.

## Target: `char_ranger_boy_base`

- Profile: `grade5-adventurer`.
- Role: Ranger Explorer; older and more self-directed than the Grade 2 Mage.
- Style: readable 3/4 top-down fantasy pixel art.
- Canvas: `32x48` pixels.
- Footprint: `16x16` pixels.
- Pivot: `[16,47]`.
- PPU: `16`.
- Directions: front, back, left, and right.
- Runtime export: PNG with nearest/point sampling.
- Preferred editable source: `.aseprite` or `.ase`.
- Lighting: upper-left.
- Atlas family: `characters`.

## Required Clips

| Clip | Frames | Loop | Purpose |
| --- | --- | --- | --- |
| `idle` | 4-6 | Yes | Default exploration stance. |
| `walk` | 6-8 | Yes | Existing keyboard and joystick traversal. |
| `inspect` | 4-6 | No | Presentation-only ACTION feedback away from targets. |
| `hurt` | 2-4 | No | Development/test preview only; no damage system. |

`inspect` is the Ranger-specific mapping for the runtime controller's generic `action` state. It must not fire projectiles, create hitboxes, grant rewards, or change quests.

## Compatibility

Future source files must preserve these slices:

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

- Hurtbox: `[10,25,12,22]`.
- Interaction box: `[8,30,16,18]`.
- Hitboxes: none.
- Existing Grade 5 saves continue using profile id `grade5-adventurer`.
- Grade 2 Mage art, animations, audio-first prompts, and quest behavior remain unchanged.

## Approval And Acceptance

Before generating a seed frame or animation sheet, ChatGPT must approve the Ranger's visual identity and generation prompt. Asset work then follows the manifest normalization pipeline and must prove:

- stable identity, proportions, palette, and bottom-center anchoring across all frames;
- readable silhouette at 1x and 3x;
- exact four-direction rows and declared frame counts;
- no background, labels, scenery, weapons-in-use, combat effects, or gameplay changes; and
- successful normalization, validation, asset-pipeline tests, and in-engine inspection.

The machine-readable source is [`grade5_ranger_actor_target.json`](grade5_ranger_actor_target.json).
