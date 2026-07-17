# Grade 2 Mage Starter Equipment Targets

References:

- [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md)
- [`docs/ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md`](../ARMOR_AND_BATTLE_ANIMATION_CONTRACT.md)
- [`char_mage_boy_base`](hero_actor_targets.json)

## Purpose

Define the first Grade 2 Mage starter equipment source components and their compiled runtime outfit package before art generation or runtime integration.

## Scope

This is a target specification only. The robe, hat, cape, and staff are cosmetic visual targets and create no gameplay bonuses, equipment mechanics, stats, shop behavior, or inventory behavior.

## Locked authoring and runtime model

Editable source keeps the robe, hat, cape, staff, and base actor separate. The first runtime implementation does not load the robe, hat, and cape as independently swappable live sprites.

Instead, the armor components compile into one atomic outfit package:

- `armor_mage_starter_outfit_back` for cape portions that render behind the body;
- `armor_mage_starter_outfit_front` for robe, hat, bracers, and visible front details;
- `weapon_mage_starter_staff` remains a separate synchronized weapon overlay.

The back and front sheets switch together as the single `armor_mage_starter_outfit` selection. This preserves source flexibility while reducing runtime drift and layering failures.

## Base inheritance

Every source component and compiled runtime slice inherits `char_mage_boy_base` and must match its `32x48` canvas, `16x16` footprint, `[16,47]` pivot, PPU 16, front/back/left/right directions, and per-frame timing for `idle`, `walk`, `cast`, and `hurt`.

Independent overlay timing, scaling, baseline movement, frame skipping, or positional drift is not permitted. Light attack, heavy attack, death, and special-action frames remain deferred until the base actor and gameplay actions explicitly require them.

## Source-component targets

### `armor_mage_starter_robe`

The Starter Mage Robe occupies the torso source slot. It uses `arcane` and `ui_neutral` palette families and the `armor_torso` slice. It must sit over the torso and legs without hiding the face, hands, feet, or interaction-readable silhouette.

Production role: source component compiled into `armor_mage_starter_outfit_front`; not independently loaded in the first runtime implementation.

### `armor_mage_starter_hat`

The Starter Mage Hat occupies the head source slot. It uses `arcane` and `ui_neutral` palette families and the `armor_head` slice. It must preserve face readability in front view and remain aligned through walk and cast frames.

Production role: source component compiled into `armor_mage_starter_outfit_front`; not independently loaded in the first runtime implementation.

### `armor_mage_starter_cape`

The Starter Mage Cape occupies the cape source slot. It uses the `arcane` palette family and the `cape_back` slice. Its behind-body pixels compile into `armor_mage_starter_outfit_back`; any deliberately visible front or side edge compiles into `armor_mage_starter_outfit_front`.

The cape never owns an independent playback clock.

### `weapon_mage_starter_staff`

The Starter Crystal Staff occupies the weapon slot. It uses `arcane` and `wood_leather` palette families and aligns to `weapon_socket_main`.

The staff remains a separate runtime overlay because its foreground/background relationship may change by direction and cast phase. It follows the base `idle`, `walk`, `cast`, and `hurt` timing exactly. No attack hitboxes are included.

## Compiled runtime package

### `armor_mage_starter_outfit`

- Selection granularity: whole outfit only.
- Back runtime slice: `armor_mage_starter_outfit_back`.
- Front runtime slice: `armor_mage_starter_outfit_front`.
- Back render placement: existing `actors_body` group at a lower local depth than the base body.
- Front render layer: `armor_overlays`.
- Required clips: `idle`, `walk`, `cast`, `hurt`.
- Collision ownership: none.
- Gameplay effect: none.

The first integration must not expose separate robe, hat, or cape toggles. Moving to independent live slots requires the prototype and change-control gate in the armor and animation contract.

## Future art PR acceptance checklist

- [ ] Uses the correct source-component and compiled-package IDs.
- [ ] Uses the inherited `32x48` canvas and `[16,47]` pivot.
- [ ] Includes front, back, left, and right views.
- [ ] Matches base idle, walk, cast, and hurt frame timing exactly.
- [ ] Uses only the declared palette families and upper-left light direction.
- [ ] Proves source-component alignment before compilation.
- [ ] Proves the back/front compiled slices against the base actor frame by frame.
- [ ] Preserves face, hand, foot, and interaction readability.
- [ ] Shows correct cape and staff occlusion in every direction.
- [ ] Adds no gameplay effect, stats, equipment mechanics, shop behavior, or inventory behavior.
- [ ] Includes no deferred attack, death, or special frames.

The machine-readable source is [`mage_starter_equipment_targets.json`](mage_starter_equipment_targets.json).
