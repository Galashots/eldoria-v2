# Grade 2 Mage Starter Equipment Targets

References:

- [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)
- [`char_mage_boy_base`](hero_actor_targets.json)

## Purpose

Define the first Grade 2 Mage starter equipment overlay targets before any art generation or runtime integration.

## Scope

This is a target specification only. The robe, hat, cape, and staff are cosmetic/visual targets and create no gameplay bonuses, equipment mechanics, stats, or inventory behavior.

## Base Inheritance

Every target inherits `char_mage_boy_base` and must match its `32x48` canvas, `16x16` footprint, `[16,47]` pivot, PPU 16, front/back/left/right directions, and per-frame timing for idle, walk, cast, and hurt. Independent overlay timing or positional drift is not permitted.

## Targets

### `armor_mage_starter_robe`

The Starter Mage Robe occupies the body/torso armor slot on `armor_overlays`. It uses `arcane` and `ui_neutral` palette families and the `armor_torso` slice. It must sit over the torso and legs without hiding the face, hands, or interaction-readable silhouette.

### `armor_mage_starter_hat`

The Starter Mage Hat occupies the head/helm armor slot on `armor_overlays`. It uses `arcane` and `ui_neutral` palette families and the `armor_head` slice. It must preserve face readability in front view and remain aligned through walk and cast frames.

### `armor_mage_starter_cape`

The Starter Mage Cape occupies the cape slot on `armor_overlays`. It uses the `arcane` palette family and the `cape_back` slice. It remains behind the body except where a direction needs a visible side silhouette, and it never introduces independent timing drift.

### `weapon_mage_starter_staff`

The Starter Crystal Staff occupies the weapon slot on `weapons_front`. It uses `arcane` and `wood_leather` palette families and aligns to `weapon_socket_main`. It follows idle, walk, cast, and hurt timing exactly; no attack hitboxes are included.

## Future Art PR Acceptance Checklist

- [ ] Uses the correct target ID.
- [ ] Uses the inherited `32x48` canvas and `[16,47]` pivot.
- [ ] Includes front, back, left, and right views.
- [ ] Matches base idle, walk, cast, and hurt frame timing exactly.
- [ ] Uses only the declared palette families and upper-left light direction.
- [ ] Aligns to the required slice/socket with no overlay drift.
- [ ] Preserves face, hand, and interaction readability.
- [ ] Adds no gameplay effect, stats, equipment mechanics, or inventory behavior.
- [ ] Proves alignment against `char_mage_boy_base` before runtime integration.

The machine-readable source is [`mage_starter_equipment_targets.json`](mage_starter_equipment_targets.json).
